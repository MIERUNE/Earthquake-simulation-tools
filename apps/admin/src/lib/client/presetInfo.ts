import * as R from 'ramda';
import type { PresetInfo } from '../types';
import { DeleteCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getClient } from './dynamodb';
import {
	QueryCommand,
	DynamoDBDocumentClient,
	ScanCommand,
	type ScanCommandOutput
} from '@aws-sdk/lib-dynamodb';
import { createUpdateRequest } from '$lib/utils/common';

// DynamoDBからデータを取得する関数 (IDで取得)
const getById = async (id: string): Promise<PresetInfo | null> => {
	console.log('getById', id);
	const client = getClient();
	const docClient = DynamoDBDocumentClient.from(client);
	const params = {
		TableName: 'preset_info',
		KeyConditionExpression: 'id = :id',
		ExpressionAttributeValues: {
			':id': id
		},
		ConsistentRead: true
	};

	const command = new QueryCommand(params);
	const data = await docClient.send(command);
	const presetInfos = _makePresetInfos(data);
	return presetInfos.length > 0 ? presetInfos[0] : null;
};

// DynamoDBからデータを取得する関数 (ユーザーID、type、jobで取得)
const getByUserTypeJob = async (
	userID: string,
	typeId: string,
	jobId: string
): Promise<PresetInfo[]> => {
	console.log('getByUserTypeJob', userID);
	const client = getClient();
	const docClient = DynamoDBDocumentClient.from(client);
	const params = {
		TableName: 'preset_info',
		FilterExpression: '#userId = :userIdValue AND #type = :typeIdValue AND #job = :jobValue',
		ExpressionAttributeNames: {
			'#userId': 'userId', // フィルタリングする非キー項目
			'#type': 'type', // フィルタリングする非キー項目
			'#job': 'job' // フィルタリングする非キー項目
		},
		ExpressionAttributeValues: {
			':userIdValue': userID,
			':typeIdValue': typeId,
			':jobValue': jobId
		},
		ConsistentRead: true
	};

	const command = new ScanCommand(params);
	const data = await docClient.send(command);
	const presetInfos = _makePresetInfos(data);
	return presetInfos;
};

// DynamoDBからメッシュコードを取得する関数 (名前で取得)
const getMeshcodeByPresetName = async (
	userID: string,
	typeId: string,
	jobId: string,
	presetName: string
): Promise<string[] | null> => {
	console.log('getMeshcodeByPresetName', userID);

	const client = getClient();
	const docClient = DynamoDBDocumentClient.from(client);
	const params = {
		TableName: 'preset_info',
		FilterExpression:
			'#userId = :userIdValue AND #type = :typeIdValue AND #job = :jobValue AND #presetName = :presetNameValue',
		ExpressionAttributeNames: {
			'#userId': 'userId', // フィルタリングする非キー項目
			'#type': 'type', // フィルタリングする非キー項目
			'#job': 'job', // フィルタリングする非キー項目
			'#presetName': 'presetName' // フィルタリングする非キー項目
		},
		ExpressionAttributeValues: {
			':userIdValue': userID,
			':typeIdValue': typeId,
			':jobValue': jobId,
			':presetNameValue': presetName
		},
		ConsistentRead: true
	};

	// meshcodeを取得するためにScanを使う
	const command = new ScanCommand(params);
	const data = await docClient.send(command);
	const presetInfos = _makePresetInfos(data);
	return presetInfos.length > 0 ? presetInfos[0].meshCode : null;
};

// DynamoDBにデータを追加する汎用関数
const putPresetInfo = async (item: PresetInfo): Promise<{ success: boolean }> => {
	console.log('putPresetInfo', item);
	const params = {
		TableName: 'preset_info',
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

// DynamoDBからデータを削除する関数 (idで削除)
const deleteById = async (id: string): Promise<{ success: boolean }> => {
	console.log('deleteById', id);

	const client = getClient();
	const docClient = DynamoDBDocumentClient.from(client);

	try {
		const deleteParams = {
			TableName: 'preset_info',
			Key: { id: id }
		};

		const deleteCommand = new DeleteCommand(deleteParams);
		await docClient.send(deleteCommand);

		console.log('Deletion completed for id:', id);
		return { success: true };
	} catch {
		throw new Error('Failed to delete items from DynamoDB');
	}
};

// DynamoDBからデータを削除する関数 (regionName、type、jobで削除)
const deleteByRegionNameTypeJob = async (
	regionName: string,
	typeId: string,
	jobId: string
): Promise<{ success: boolean }> => {
	console.log('deleteByRegionName', regionName);

	const client = getClient();
	const docClient = DynamoDBDocumentClient.from(client);

	try {
		// Step 1: Get all items related to the userID
		const scanParams = {
			TableName: 'preset_info',
			FilterExpression:
				'#regionName = :regionNameValue AND #type = :typeIdValue AND #job = :jobValue',
			ExpressionAttributeNames: {
				'#regionName': 'regionName', // フィルタリングする非キー項目
				'#type': 'type', // フィルタリングする非キー項目
				'#job': 'job' // フィルタリングする非キー項目
			},
			ExpressionAttributeValues: {
				':regionNameValue': regionName,
				':typeIdValue': typeId,
				':jobValue': jobId
			}
		};

		const scanCommand = new ScanCommand(scanParams);
		const data = await docClient.send(scanCommand);

		console.log('Items found:', data.Items);

		if (!data.Items || data.Items.length === 0) {
			return { success: false };
		}

		// Step 2: Delete each item
		for (const item of data.Items) {
			if (!item.id) {
				continue;
			}

			const deleteParams = {
				TableName: 'preset_info',
				Key: { id: item.id }
			};

			const deleteCommand = new DeleteCommand(deleteParams);
			await docClient.send(deleteCommand);
		}

		console.log('Deletion completed for regionName:', regionName);
		return { success: true };
	} catch {
		throw new Error('Failed to delete items from DynamoDB');
	}
};

// DynamoDBのデータを更新する関数
const updateMultipleFields = async (id: string, values: Record<string, unknown>) => {
	try {
		const tableName = 'preset_info';
		const key = { id: id };
		const fields = R.keys(values);
		const updateRequest = createUpdateRequest(tableName, key, fields, values);
		console.log('updateRequest:', updateRequest);

		const client = getClient();
		const docClient = DynamoDBDocumentClient.from(client);
		const response = await docClient.send(new UpdateCommand(updateRequest));
		console.log('Updated attributes:', response.Attributes);
	} catch (error) {
		console.error('Update failed:', error);
	}
};

// DynamoDBから取得したデータを整形する関数 Private
const _makePresetInfos = (data: ScanCommandOutput): PresetInfo[] => {
	const presetInfos =
		data.Items?.map<PresetInfo>((item) => ({
			id: item.id,
			userId: item.userId,
			type: item.type,
			job: item.job,
			regionName: item.regionName,
			presetName: item.presetName,
			meshCode: item.meshCode,
			gmlFilePath: item.gmlFilePath,
			wideLongPeriodParamFilePath: item.wideLongPeriodParamFilePath,
			wideNormalParamFilePath: item.wideNormalParamFilePath,
			wideDirectlyParamFilePath: item.wideDirectlyParamFilePath,
			narrowAnalysisModelFilePath: item.narrowAnalysisModelFilePath,
			narrowParamFilePath: item.narrowParamFilePath,
			narrowForceParamFilePath: item.narrowForceParamFilePath,
			narrowCalcParamFilePath: item.narrowCalcParamFilePath,
			additionalInfo: item.additionalInfo,
			createDateTime: item.createDateTime
		})) ?? [];
	return presetInfos;
};

export {
	getById,
	getByUserTypeJob,
	getMeshcodeByPresetName,
	putPresetInfo,
	deleteByRegionNameTypeJob as deleteByRegionName,
	deleteById,
	updateMultipleFields
};
