import { randomUUID } from 'crypto';
import { PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBDocumentClient } from '$lib/aws/dynamodbClient';
import type { SimulationReserve } from '@mosiri/shared';
import { env } from '$lib/env';

/**
 * Create new simulation reservation
 */
export const createSimulationReserve = async (
	item: Omit<SimulationReserve, 'id' | 'createDateTime'>
): Promise<{ success: boolean; data: SimulationReserve }> => {
	console.log('createSimulationReserve', item);

	const docClient = getDynamoDBDocumentClient();
	const tableName = env.dynamodb.simulationReserveTable || 'simulation_reserve';

	// Generate ID and timestamp
	const id = randomUUID();
	const createDateTime = Math.floor(Date.now() / 1000);

	const reservationData: SimulationReserve = {
		id,
		createDateTime,
		...item
	};

	const params = {
		TableName: tableName,
		Item: reservationData
	};

	try {
		const command = new PutCommand(params);
		await docClient.send(command);
		return { success: true, data: reservationData };
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

	const docClient = getDynamoDBDocumentClient();
	const tableName = env.dynamodb.simulationReserveTable || 'simulation_reserve';

	const params = {
		TableName: tableName,
		KeyConditionExpression: 'id = :id',
		ExpressionAttributeValues: {
			':id': id
		},
		ConsistentRead: true
	};

	const command = new QueryCommand(params);
	const data = await docClient.send(command);
	const items = makeSimulationReserves(data);
	return items.length > 0 ? items[0] : null;
};

/**
 * Get simulation reservations by user and type
 */
export const getByUserType = async (
	userId: string,
	type: string
): Promise<SimulationReserve[]> => {
	console.log('getByUserType', userId, type);

	const docClient = getDynamoDBDocumentClient();
	const tableName = env.dynamodb.simulationReserveTable || 'simulation_reserve';

	const params = {
		TableName: tableName,
		FilterExpression: '#userId = :userIdValue AND #type = :typeValue',
		ExpressionAttributeNames: {
			'#userId': 'userId',
			'#type': 'type'
		},
		ExpressionAttributeValues: {
			':userIdValue': userId,
			':typeValue': type
		},
		ConsistentRead: true
	};

	const command = new ScanCommand(params);
	const data = await docClient.send(command);
	return makeSimulationReserves(data);
};

/**
 * Update simulation reservation
 */
export const updateSimulationReserve = async (
	id: string,
	updates: Partial<SimulationReserve>
): Promise<boolean> => {
	try {
		const docClient = getDynamoDBDocumentClient();
		const tableName = env.dynamodb.simulationReserveTable || 'simulation_reserve';

		const updateExpressions: string[] = [];
		const expressionAttributeNames: Record<string, string> = {};
		const expressionAttributeValues: Record<string, unknown> = {};

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
			TableName: tableName,
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
 * Format scan/query output to SimulationReserve array
 */
const makeSimulationReserves = (data: { Items?: Record<string, unknown>[] }): SimulationReserve[] => {
	const items =
		data.Items?.map<SimulationReserve>((item) => ({
			id: item.id as string,
			userId: item.userId as string,
			type: item.type as string,
			regionName: item.regionName as string,
			paramName: item.paramName as string,
			status: item.status as string,
			createDateTime: item.createDateTime as number,
			uuid: item.uuid as string | undefined,
			jobId: item.jobId as string | undefined,
			jobArn: item.jobArn as string | undefined,
			statusMessage: item.statusMessage as string | undefined,
			completedAt: item.completedAt as number | undefined,
			logUrl: item.logUrl as string | undefined,
			updatedDateTime: item.updatedDateTime as number | undefined,
			outputPath: item.outputPath as string | undefined,
			outputDir: item.outputDir as string | undefined
		})) ?? [];
	return items;
};
