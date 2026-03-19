/**
 * シミュレーション情報取得API
 * DynamoDBからシミュレーション情報を取得
 * - まずviewer_infoテーブルを検索
 * - 見つからない場合はsimulation_reserveテーブルを検索
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { awsConfig, LOCAL_DYNAMODB_CONFIG, DYNAMODB_ENDPOINTS } from '$lib/aws/config';
import { env } from '$lib/env';
import type { ViewerInfoItem } from '$lib/types/viewerInfo';

// simulation_reserveのステータス定義
const SIMULATION_STATUS = {
	PENDING: '0',
	RUNNING: '1',
	VISUALIZING: '2',
	ERROR: '3',
	COMPLETED: '4'
} as const;

// S3バケット名（シミュレーション結果格納先 - 環境変数から取得）
const WIDE_SIMULATION_S3_BUCKET = process.env.WIDE_SIMULATION_S3_BUCKET || '';

// DynamoDBのItem型定義（simulation_reserve用）
interface DynamoDBSimulationReserveItem {
	id?: string;
	userId?: string;
	type?: string;
	regionName?: string;
	paramName?: string;
	status?: string;
	createDateTime?: number;
	updatedDateTime?: number;
	requiresLogin?: boolean;
	outputPath?: string;
	outputDir?: string;
	uuid?: string;
	jobId?: string;
	completedAt?: number;
}

/**
 * DynamoDBクライアントを取得
 */
const getDynamoDBClient = (): DynamoDBDocumentClient => {
	const mode = env.mode;

	let client: DynamoDBClient;

	if (mode === 'development') {
		// ローカルDynamoDB
		client = new DynamoDBClient({
			...LOCAL_DYNAMODB_CONFIG,
			endpoint: DYNAMODB_ENDPOINTS.local
		});
	} else if (mode === 'docker') {
		// Docker環境のDynamoDB
		client = new DynamoDBClient({
			...LOCAL_DYNAMODB_CONFIG,
			endpoint: DYNAMODB_ENDPOINTS.docker
		});
	} else {
		// 本番環境
		client = new DynamoDBClient({
			region: awsConfig.region
		});
	}

	return DynamoDBDocumentClient.from(client);
};

/**
 * simulation_reserveのステータスをViewerInfoItemのステータスに変換
 */
const convertReserveStatus = (status: string): ViewerInfoItem['status'] => {
	switch (status) {
		case SIMULATION_STATUS.PENDING:
			return 'pending';
		case SIMULATION_STATUS.RUNNING:
		case SIMULATION_STATUS.VISUALIZING:
			return 'processing';
		case SIMULATION_STATUS.COMPLETED:
			return 'completed';
		case SIMULATION_STATUS.ERROR:
			return 'failed';
		default:
			return 'pending';
	}
};

/**
 * simulation_reserveのデータをViewerInfoItem形式に変換
 */
const convertReserveToViewerItem = (item: DynamoDBSimulationReserveItem): ViewerInfoItem => {
	const createDateTimeMs = item.createDateTime ? item.createDateTime * 1000 : Date.now();
	const datetime = new Date(createDateTimeMs).toISOString().replace('T', ' ').substring(0, 19);

	// タイルデータへのS3パスを生成（完了時のみ）
	let dataPath: string | undefined;
	if (item.status === SIMULATION_STATUS.COMPLETED && item.id) {
		// outputPathが設定されている場合はそれを使用、なければデフォルトパス
		if (item.outputPath) {
			dataPath = `s3://${WIDE_SIMULATION_S3_BUCKET}/output/${item.outputPath}`;
		} else {
			dataPath = `s3://${WIDE_SIMULATION_S3_BUCKET}/output/${item.id}/tiles`;
		}
	}

	return {
		id: item.id || '',
		region: item.regionName || '',
		parameter: item.paramName || '',
		datetime,
		requiresLogin: item.requiresLogin ?? false,
		status: convertReserveStatus(item.status || '0'),
		createdAt: new Date(createDateTimeMs).toISOString(),
		updatedAt: item.updatedDateTime
			? new Date(item.updatedDateTime * 1000).toISOString()
			: undefined,
		userId: item.userId,
		dataPath
	};
};

/**
 * GET /api/simulations/[id]
 * シミュレーション情報を取得
 */
export const GET: RequestHandler = async ({ params }) => {
	const { id } = params;

	if (!id) {
		throw error(400, 'Simulation ID is required');
	}

	try {
		const client = getDynamoDBClient();

		// 1. まずviewer_infoテーブルから検索
		const viewerInfoTableName = awsConfig.dynamodb.viewerInfoTable;
		console.log(`[API] Getting simulation: ${id} from table: ${viewerInfoTableName}`);

		const viewerInfoCommand = new GetCommand({
			TableName: viewerInfoTableName,
			Key: { id }
		});

		const viewerInfoResponse = await client.send(viewerInfoCommand);

		if (viewerInfoResponse.Item) {
			const simulation = viewerInfoResponse.Item as ViewerInfoItem;
			return json({
				success: true,
				simulation
			});
		}

		// 2. viewer_infoに見つからない場合、simulation_reserveテーブルから検索
		const simulationReserveTableName = env.dynamodb.simulationReserveTable || 'simulation_reserve';
		console.log(`[API] Not found in viewer_info, trying simulation_reserve: ${id}`);

		const reserveCommand = new GetCommand({
			TableName: simulationReserveTableName,
			Key: { id }
		});

		const reserveResponse = await client.send(reserveCommand);

		if (reserveResponse.Item) {
			const reserveItem = reserveResponse.Item as DynamoDBSimulationReserveItem;
			const simulation = convertReserveToViewerItem(reserveItem);

			return json({
				success: true,
				simulation
			});
		}

		// 両方のテーブルで見つからない場合
		throw error(404, 'Simulation not found');
	} catch (err) {
		console.error('[API] Error fetching simulation:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}

		const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
		throw error(500, errorMessage);
	}
};
