import * as R from 'ramda';
import type { PresetInfo } from '../types';
import { DeleteCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getDocumentClient } from './dynamodb';
import {
	QueryCommand,
	ScanCommand,
	type ScanCommandOutput
} from '@aws-sdk/lib-dynamodb';
import { createUpdateRequest } from '$lib/utils/common';
import { checkResourcePermission } from './auth';
import type { AuthUser } from '$lib/types/auth';

// DynamoDBからデータを取得する関数 (IDで取得)
export const getById = async (id: string): Promise<PresetInfo | null> => {
	console.log('getById', id);
	const docClient = getDocumentClient();
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
export const getByUserTypeJob = async (
	userID: string,
	typeId: string,
	jobId: string,
	currentUser?: AuthUser
): Promise<PresetInfo[]> => {
	console.log('getByUserTypeJob', userID);
	const docClient = getDocumentClient();
	
	// Admin and Operator can see all data, Viewer can only see their own
	const shouldFilterByUser = currentUser && currentUser.role === 'viewer';
	
	const filterExpression = shouldFilterByUser
		? '#userId = :userIdValue AND #type = :typeIdValue AND #job = :jobValue'
		: '#type = :typeIdValue AND #job = :jobValue';
	
	const expressionAttributeValues: Record<string, any> = {
		':typeIdValue': typeId,
		':jobValue': jobId
	};
	
	if (shouldFilterByUser) {
		expressionAttributeValues[':userIdValue'] = currentUser.userId;
	}
	
	const params = {
		TableName: 'preset_info',
		FilterExpression: filterExpression,
		ExpressionAttributeNames: {
			'#userId': 'userId',
			'#type': 'type',
			'#job': 'job'
		},
		ExpressionAttributeValues: expressionAttributeValues,
		ConsistentRead: true
	};

	const command = new ScanCommand(params);
	const data = await docClient.send(command);
	const presetInfos = _makePresetInfos(data);
	return presetInfos;
};

// DynamoDBからメッシュコードを取得する関数 (名前で取得)
export const getMeshcodeByPresetName = async (
	userID: string,
	typeId: string,
	jobId: string,
	presetName: string
): Promise<string[] | null> => {
	console.log('getMeshcodeByPresetName', userID);

	const docClient = getDocumentClient();
	const params = {
		TableName: 'preset_info',
		FilterExpression:
			'#userId = :userIdValue AND #type = :typeIdValue AND #job = :jobValue AND #presetName = :presetNameValue',
		ExpressionAttributeNames: {
			'#userId': 'userId',
			'#type': 'type',
			'#job': 'job',
			'#presetName': 'presetName'
		},
		ExpressionAttributeValues: {
			':userIdValue': userID,
			':typeIdValue': typeId,
			':jobValue': jobId,
			':presetNameValue': presetName
		},
		ConsistentRead: true
	};

	const command = new ScanCommand(params);
	const data = await docClient.send(command);
	const presetInfos = _makePresetInfos(data);
	return presetInfos.length > 0 ? presetInfos[0].meshCode : null;
};

// DynamoDBにデータを追加する汎用関数
export const putPresetInfo = async (
	item: PresetInfo,
	currentUser?: AuthUser
): Promise<{ success: boolean }> => {
	console.log('putPresetInfo', item);
	
	// Check write permission
	if (currentUser) {
		const permission = checkResourcePermission(currentUser, item.userId);
		if (!permission.canWrite) {
			throw new Error('Permission denied: Cannot write this resource');
		}
	}
	
	const params = {
		TableName: 'preset_info',
		Item: item
	};

	const docClient = getDocumentClient();

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
export const deleteById = async (
	id: string,
	currentUser?: AuthUser
): Promise<{ success: boolean }> => {
	console.log('deleteById', id);

	const docClient = getDocumentClient();
	
	// Get the item first to check permissions
	if (currentUser) {
		const item = await getById(id);
		if (item) {
			const permission = checkResourcePermission(currentUser, item.userId);
			if (!permission.canDelete) {
				throw new Error('Permission denied: Cannot delete this resource');
			}
		}
	}

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
export const deleteByRegionNameTypeJob = async (
	regionName: string,
	typeId: string,
	jobId: string,
	currentUser?: AuthUser
): Promise<{ success: boolean }> => {
	console.log('deleteByRegionName', regionName);

	const docClient = getDocumentClient();

	try {
		// Step 1: Get all items related to the regionName
		const scanParams = {
			TableName: 'preset_info',
			FilterExpression:
				'#regionName = :regionNameValue AND #type = :typeIdValue AND #job = :jobValue',
			ExpressionAttributeNames: {
				'#regionName': 'regionName',
				'#type': 'type',
				'#job': 'job'
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

		// Step 2: Check permissions and delete each item
		for (const item of data.Items) {
			if (!item.id) {
				continue;
			}
			
			// Check delete permission for each item
			if (currentUser) {
				const permission = checkResourcePermission(currentUser, item.userId);
				if (!permission.canDelete) {
					console.log(`Skipping deletion of item ${item.id} - no permission`);
					continue;
				}
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
export const updateMultipleFields = async (
	id: string,
	values: Record<string, unknown>,
	currentUser?: AuthUser
) => {
	try {
		// Get the item first to check permissions
		if (currentUser) {
			const item = await getById(id);
			if (item) {
				const permission = checkResourcePermission(currentUser, item.userId);
				if (!permission.canWrite) {
					throw new Error('Permission denied: Cannot update this resource');
				}
			}
		}
		
		const tableName = 'preset_info';
		const key = { id: id };
		const fields = R.keys(values);
		const updateRequest = createUpdateRequest(tableName, key, fields, values);
		console.log('updateRequest:', updateRequest);

		const docClient = getDocumentClient();
		const response = await docClient.send(new UpdateCommand(updateRequest));
		console.log('Updated attributes:', response.Attributes);
	} catch (error) {
		console.error('Update failed:', error);
		throw error;
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