import { v4 as uuidv4 } from 'uuid';
import type { SimulationReserve } from '$lib/types';
import { DeleteCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getDocumentClient } from './dynamodb';
import {
	QueryCommand,
	ScanCommand,
	type ScanCommandOutput
} from '@aws-sdk/lib-dynamodb';
import { checkResourcePermission } from './auth';
import type { AuthUser } from '$lib/types/auth';

/**
 * Create new simulation reservation
 */
export const createSimulationReserve = async (
	item: SimulationReserve,
	currentUser?: AuthUser
): Promise<{ success: boolean; data?: SimulationReserve }> => {
	console.log('createSimulationReserve', item);
	
	// Check write permission
	if (currentUser) {
		const permission = checkResourcePermission(currentUser, item.userId);
		if (!permission.canWrite) {
			throw new Error('Permission denied: Cannot create simulation reservation');
		}
	}
	
	const params = {
		TableName: 'simulation_reserve',
		Item: item
	};

	const docClient = getDocumentClient();

	try {
		const command = new PutCommand(params);
		await docClient.send(command);
		return { success: true, data: item };
	} catch (error) {
		console.error('Error adding simulation reservation:', error);
		throw new Error('Failed to add simulation reservation to DynamoDB');
	}
};

/**
 * Get simulation reservation by ID
 */
export const getById = async (id: string): Promise<SimulationReserve | null> => {
	console.log('getSimulationReserveById', id);
	const docClient = getDocumentClient();
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
	const items = _makeSimulationReserves(data);
	return items.length > 0 ? items[0] : null;
};

/**
 * Get simulation reservations by user and type
 */
export const getByUserType = async (
	userId: string,
	type: string,
	currentUser?: AuthUser
): Promise<SimulationReserve[]> => {
	console.log('getByUserType', userId, type);
	const docClient = getDocumentClient();
	
	// Admin and Operator can see all data, Viewer can only see their own
	const shouldFilterByUser = currentUser && currentUser.role === 'viewer';
	
	const filterExpression = shouldFilterByUser
		? '#userId = :userIdValue AND #type = :typeValue'
		: '#type = :typeValue';
	
	const expressionAttributeValues: Record<string, any> = {
		':typeValue': type
	};
	
	if (shouldFilterByUser) {
		expressionAttributeValues[':userIdValue'] = currentUser.userId;
	}
	
	const params = {
		TableName: 'simulation_reserve',
		FilterExpression: filterExpression,
		ExpressionAttributeNames: {
			'#userId': 'userId',
			'#type': 'type'
		},
		ExpressionAttributeValues: expressionAttributeValues,
		ConsistentRead: true
	};

	const command = new ScanCommand(params);
	const data = await docClient.send(command);
	return _makeSimulationReserves(data);
};

/**
 * Update simulation reservation
 */
export const updateSimulationReserve = async (
	id: string,
	updates: Partial<SimulationReserve>,
	currentUser?: AuthUser
): Promise<boolean> => {
	try {
		// Get the item first to check permissions
		if (currentUser) {
			const item = await getById(id);
			if (item) {
				const permission = checkResourcePermission(currentUser, item.userId);
				if (!permission.canWrite) {
					throw new Error('Permission denied: Cannot update this simulation reservation');
				}
			}
		}
		
		const docClient = getDocumentClient();
		const updateExpressions: string[] = [];
		const expressionAttributeNames: Record<string, string> = {};
		const expressionAttributeValues: Record<string, any> = {};
		
		// Build update expression
		Object.entries(updates).forEach(([key, value], index) => {
			if (key !== 'id') {
				const placeholder = `:val${index}`;
				const nameAlias = `#attr${index}`;
				updateExpressions.push(`${nameAlias} = ${placeholder}`);
				expressionAttributeNames[nameAlias] = key;
				expressionAttributeValues[placeholder] = value;
			}
		});
		
		if (updateExpressions.length === 0) {
			return false;
		}
		
		const params = {
			TableName: 'simulation_reserve',
			Key: { id },
			UpdateExpression: `SET ${updateExpressions.join(', ')}`,
			ExpressionAttributeNames: expressionAttributeNames,
			ExpressionAttributeValues: expressionAttributeValues
		};
		
		const command = new UpdateCommand(params);
		await docClient.send(command);
		return true;
		
	} catch (error) {
		console.error('Failed to update simulation reservation:', error);
		throw error;
	}
};

/**
 * Delete simulation reservation
 */
export const deleteById = async (
	id: string,
	currentUser?: AuthUser
): Promise<{ success: boolean }> => {
	console.log('deleteSimulationReserveById', id);

	const docClient = getDocumentClient();
	
	// Get the item first to check permissions
	if (currentUser) {
		const item = await getById(id);
		if (item) {
			const permission = checkResourcePermission(currentUser, item.userId);
			if (!permission.canDelete) {
				throw new Error('Permission denied: Cannot delete this simulation reservation');
			}
		}
	}

	try {
		const deleteParams = {
			TableName: 'simulation_reserve',
			Key: { id: id }
		};

		const deleteCommand = new DeleteCommand(deleteParams);
		await docClient.send(deleteCommand);

		console.log('Deletion completed for id:', id);
		return { success: true };
	} catch {
		throw new Error('Failed to delete simulation reservation from DynamoDB');
	}
};

/**
 * Format scan output to SimulationReserve array
 */
const _makeSimulationReserves = (data: ScanCommandOutput): SimulationReserve[] => {
	const items =
		data.Items?.map<SimulationReserve>((item) => ({
			id: item.id,
			userId: item.userId,
			type: item.type,
			regionName: item.regionName,
			paramName: item.paramName,
			status: item.status,
			createDateTime: item.createDateTime,
			uuid: item.uuid,
			jobId: item.jobId,
			jobArn: item.jobArn,
			statusMessage: item.statusMessage,
			completedAt: item.completedAt,
			logUrl: item.logUrl
		})) ?? [];
	return items;
};