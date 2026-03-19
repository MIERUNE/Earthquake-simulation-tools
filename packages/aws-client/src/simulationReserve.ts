import { getClient } from './dynamodb';
import type { SimulationReserve } from '$lib/types';
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
	QueryCommand,
	DynamoDBDocumentClient,
	ScanCommand,
	type ScanCommandOutput,
	type QueryCommandOutput
} from '@aws-sdk/lib-dynamodb';
import type { SimulationApiResponse } from './simulationApi';
import { SimulationStatus } from '$lib/utils/getName';

const getById = async (id: string): Promise<SimulationReserve | null> => {
	console.log('getById', id);
	const client = getClient();
	const docClient = DynamoDBDocumentClient.from(client);
	const params = {
		TableName: 'simulation_reserve',
		KeyConditionExpression: 'id = :id',
		ExpressionAttributeValues: {
			':id': id
		},
		ConsistentRead: true
	};

	const command = new QueryCommand(params);
	const data = await docClient.send(command);
	const presetInfos = makeSimulationReserves(data);
	return presetInfos.length > 0 ? presetInfos[0] : null;
};

const getByUserType = async (userId: string, typeId: string): Promise<SimulationReserve[]> => {
	console.log('getByUserType', userId + typeId);
	const client = getClient();
	const docClient = DynamoDBDocumentClient.from(client);
	const params = {
		TableName: 'simulation_reserve',
		FilterExpression: '#userId = :userIdValue AND #type = :typeIdValue',
		ExpressionAttributeNames: {
			'#userId': 'userId', // フィルタリングする非キー項目
			'#type': 'type' // フィルタリングする非キー項目
		},
		ExpressionAttributeValues: {
			':userIdValue': userId,
			':typeIdValue': typeId
		},
		ConsistentRead: true
	};

	const command = new ScanCommand(params);
	const data = await docClient.send(command);
	const presetInfos = makeSimulationReserves(data);
	return presetInfos;
};

const putSimulationReserve = async (item: SimulationReserve): Promise<{ success: boolean }> => {
	const params = {
		TableName: 'simulation_reserve',
		Item: item
	};

	const client = getClient();
	const docClient = DynamoDBDocumentClient.from(client);

	try {
		const command = new PutCommand(params);
		await docClient.send(command);
		return { success: true };
	} catch (error) {
		console.error('Error adding item:', error);
		throw new Error('Failed to add item to DynamoDB');
	}
};

// 型を修正して、QueryCommandOutputとScanCommandOutputの両方を受け入れられるようにする
const makeSimulationReserves = (
	data: ScanCommandOutput | QueryCommandOutput
): SimulationReserve[] => {
	const presetInfos =
		data.Items?.map<SimulationReserve>((item) => ({
			id: item.id,
			userId: item.userId,
			type: item.type,
			paramName: item.paramName,
			createDateTime: item.createDateTime,
			status: item.status,
			regionName: item.regionName,
			apiResponse: item.apiResponse
		})) ?? [];
	return presetInfos;
};

/**
 * シミュレーション予約のステータスを更新する
 * @param id シミュレーション予約ID
 * @param status 新しいステータス
 * @param additionalData 追加データ（APIレスポンスなど）
 * @returns 更新結果
 */
const updateSimulationReserveStatus = async (
	id: string,
	status: string,
	additionalData?: Record<string, any>
): Promise<boolean> => {
	try {
		// DynamoDBクライアントを取得
		const client = getClient();
		const docClient = DynamoDBDocumentClient.from(client);

		// 更新式と属性を準備
		let updateExpression = 'set #status = :status, #updated = :updated';
		const expressionAttributeNames: Record<string, string> = {
			'#status': 'status',
			'#updated': 'updatedDateTime'
		};
		const expressionAttributeValues: Record<string, any> = {
			':status': status,
			':updated': Date.now()
		};

		// 追加データがある場合は更新式を拡張
		if (additionalData && Object.keys(additionalData).length > 0) {
			Object.entries(additionalData).forEach(([key, value], index) => {
				const attrKey = `#attr${index}`;
				const valKey = `:val${index}`;
				updateExpression += `, ${attrKey} = ${valKey}`;
				expressionAttributeNames[attrKey] = key;
				expressionAttributeValues[valKey] = value;
			});
		}

		// 更新コマンドを実行
		const command = new UpdateCommand({
			TableName: 'simulation_reserve',
			Key: { id },
			UpdateExpression: updateExpression,
			ExpressionAttributeNames: expressionAttributeNames,
			ExpressionAttributeValues: expressionAttributeValues,
			ReturnValues: 'ALL_NEW'
		});

		await docClient.send(command);
		return true;
	} catch (error) {
		console.error('Failed to update simulation reserve status:', error);
		return false;
	}
};

/**
 * APIレスポンスを使用してシミュレーション予約を更新する
 * @param simulationId シミュレーションID
 * @param apiResponse APIレスポンス
 * @returns 更新が成功したかどうか
 */
const updateSimulationWithApiResponse = async (
	simulationId: string,
	apiResponse: SimulationApiResponse
): Promise<boolean> => {
	try {
		// APIレスポンスから更新データを作成
		const updateData: Record<string, any> = {
			apiResponse: apiResponse,
			lastUpdated: Date.now()
		};

		// UUIDが存在する場合は保存 (jobIdとしても保存)
		if (apiResponse.uuid) {
			updateData.uuid = apiResponse.uuid;
			updateData.jobId = apiResponse.uuid;
		} else if (apiResponse.jobId) {
			updateData.jobId = apiResponse.jobId;
		}

		// ログURLがある場合は保存
		if (apiResponse.log_url) {
			updateData.logUrl = apiResponse.log_url;
		}

		// APIレスポンスのステータスまたはメッセージに基づいてシミュレーションステータスを設定
		let newStatus: string;
		if (apiResponse.status) {
			// 明示的なステータスがある場合
			switch (apiResponse.status) {
				case 'SUBMITTED':
				case 'QUEUED':
				case 'STARTING':
					newStatus = SimulationStatus.start; // SimulationStatusはenum型なので.toString()を使用
					break;
				case 'RUNNING':
					newStatus = SimulationStatus.start;
					updateData.executionStartTime = Date.now();
					break;
				case 'SUCCEEDED':
					newStatus = SimulationStatus.complete;
					updateData.completionTime = Date.now();
					break;
				case 'FAILED':
					newStatus = SimulationStatus.error;
					updateData.failedTime = Date.now();
					updateData.error = apiResponse.message || 'API reported failure';
					break;
				default:
					newStatus = SimulationStatus.start;
			}
		} else {
			// メッセージから成功・失敗を判断
			const message = apiResponse.message?.toLowerCase() || '';
			if (message.includes('error') || message.includes('fail')) {
				newStatus = SimulationStatus.error;
				updateData.failedTime = Date.now();
				updateData.error = apiResponse.message;
			} else if (message.includes('success')) {
				newStatus = SimulationStatus.start; // 開始状態とする（完了通知は別途来る想定）
			} else {
				newStatus = SimulationStatus.start; // デフォルトは開始状態
			}
		}

		// 出力場所情報があれば追加
		if (apiResponse.outputLocation) {
			updateData.outputLocation = apiResponse.outputLocation;
		}

		// 成果物情報があれば追加
		if (apiResponse.artifacts) {
			updateData.artifacts = apiResponse.artifacts;
		}

		// 更新を実行
		return await updateSimulationReserveStatus(simulationId, newStatus, updateData);
	} catch (error) {
		console.error('Failed to update simulation with API response:', error);
		return false;
	}
};

/**
 * UUIDを使用してシミュレーションを検索
 * @param uuid シミュレーションUUID
 * @returns シミュレーション予約（見つからない場合はnull）
 */
const findByUuid = async (uuid: string): Promise<SimulationReserve | null> => {
	try {
		const client = getClient();
		const docClient = DynamoDBDocumentClient.from(client);

		// UUIDでフィルタリングしてスキャン
		const params = {
			TableName: 'simulation_reserve',
			FilterExpression: 'uuid = :uuid',
			ExpressionAttributeValues: {
				':uuid': uuid
			}
		};

		const command = new ScanCommand(params);
		const result = await docClient.send(command);

		// 最初の一致するアイテムを返す
		return result.Items && result.Items.length > 0
			? makeSimulationReserves({ Items: [result.Items[0]], $metadata: result.$metadata })[0]
			: null;
	} catch (error) {
		console.error('Failed to find simulation by UUID:', error);
		return null;
	}
};

// ジョブIDを使用する既存の関数も保持（互換性のため）
const findByJobId = async (jobId: string): Promise<SimulationReserve | null> => {
	try {
		// まずUUIDとして検索（新形式）
		const simulationByUuid = await findByUuid(jobId);
		if (simulationByUuid) {
			return simulationByUuid;
		}

		// 旧形式のjobIdとして検索
		const client = getClient();
		const docClient = DynamoDBDocumentClient.from(client);

		const params = {
			TableName: 'simulation_reserve',
			FilterExpression: 'jobId = :jobId',
			ExpressionAttributeValues: {
				':jobId': jobId
			}
		};

		const command = new ScanCommand(params);
		const result = await docClient.send(command);

		if (!result.Items || result.Items.length === 0) {
			return null;
		}

		return makeSimulationReserves({ Items: [result.Items[0]], $metadata: result.$metadata })[0];
	} catch (error) {
		console.error('Failed to find simulation by job ID:', error);
		return null;
	}
};

export {
	getById,
	getByUserType,
	putSimulationReserve,
	updateSimulationReserveStatus,
	updateSimulationWithApiResponse,
	findByJobId,
	findByUuid
};
