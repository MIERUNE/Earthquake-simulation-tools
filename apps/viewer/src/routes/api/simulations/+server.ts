/**
 * シミュレーション一覧取得・予約作成API（サーバーサイド）
 * - GET: DynamoDB viewer_infoテーブルとsimulation_reserve（完了分）からデータを取得
 * - POST: DynamoDB simulation_reserveテーブルに予約を作成
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ScanCommand, GetCommand, type ScanCommandInput, PutCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBDocumentClient } from '$lib/aws/dynamodbClient';
import { env } from '$lib/env';
import type {
	ViewerInfoItem,
	SimulationListFilter,
	SimulationListSortOrder
} from '$lib/types/viewerInfo';
import { AwsError, formatErrorMessage, logError } from '$lib/utils/errors';
import type { SimulationData, SimulationReservation } from '$lib/types/simulation';
import { randomUUID } from 'crypto';
import { submitWideSimulationBatch } from '$lib/server/batchJob';
import { generateWideDppContent } from '$lib/utils/dppGenerator';
import { executeSimulationApi } from '$lib/server/simulationApi';
import { updateSimulationReserve } from '$lib/server/simulationReserve';
import { getCsvFileNameForPreset } from '$lib/data/earthquakePresetMapping';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// simulation_reserveのステータス定義
const SIMULATION_STATUS = {
	PENDING: '0',      // 予約待ち
	RUNNING: '1',      // 実行中
	VISUALIZING: '2',  // 可視化処理中
	ERROR: '3',        // エラー
	COMPLETED: '4'     // 完了
} as const;

type SimulationStatusValue = typeof SIMULATION_STATUS[keyof typeof SIMULATION_STATUS];

// S3バケット名（シミュレーション結果格納先 - 環境変数から取得）
const WIDE_SIMULATION_S3_BUCKET = process.env.WIDE_SIMULATION_S3_BUCKET || '';

// シミュレーション予約の推定値定数
const ESTIMATED_START_DELAY_MINUTES = 30; // 開始までの推定時間（分）
const ESTIMATED_DURATION_MINUTES = 120; // 実行時間の推定値（分）

// DynamoDBのItem型定義（viewer_info用）
interface DynamoDBViewerItem {
	id?: string;
	regionName?: string;
	region?: string;
	cityCode?: string;
	simulationDataName?: string;
	parameter?: string;
	createDateTime?: string;
	datetime?: string;
	requiresLogin?: boolean;
	status?: string;
	createdAt?: string;
	updatedAt?: string;
	userId?: string;
	simulationDataFilePath?: string;
	dataPath?: string;
}

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
	// 日本時間（JST, UTC+9）に変換
	const datetime = new Date(createDateTimeMs).toLocaleString('ja-JP', {
		timeZone: 'Asia/Tokyo',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	}).replace(/\//g, '-').replace(',', '');

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
 * simulation_reserveテーブルから完了・処理中のシミュレーションを取得
 */
const fetchSimulationReserveItems = async (
	client: ReturnType<typeof getDynamoDBDocumentClient>,
	includeProcessing: boolean = true
): Promise<ViewerInfoItem[]> => {
	const tableName = env.dynamodb.simulationReserveTable || 'simulation_reserve';

	// 完了（status=4）と、オプションで処理中（status=1,2）のデータを取得
	const statusValues: SimulationStatusValue[] = includeProcessing
		? [SIMULATION_STATUS.COMPLETED, SIMULATION_STATUS.RUNNING, SIMULATION_STATUS.VISUALIZING, SIMULATION_STATUS.PENDING]
		: [SIMULATION_STATUS.COMPLETED];

	const params: ScanCommandInput = {
		TableName: tableName,
		FilterExpression: '#type = :typeValue',
		ExpressionAttributeNames: {
			'#type': 'type'
		},
		ExpressionAttributeValues: {
			':typeValue': 'wide'
		}
	};

	const command = new ScanCommand(params);
	const response = await client.send(command);

	if (!response.Items) {
		return [];
	}

	// ステータスでフィルタリングしてViewerInfoItem形式に変換
	return response.Items
		.filter((item: DynamoDBSimulationReserveItem) =>
			statusValues.includes((item.status || '0') as SimulationStatusValue)
		)
		.map((item: DynamoDBSimulationReserveItem) => convertReserveToViewerItem(item));
};

/**
 * 地震動プリセット名をDynamoDBから取得
 */
const getEarthquakePresetName = async (
	client: ReturnType<typeof getDynamoDBDocumentClient>,
	presetId: string
): Promise<string> => {
	try {
		const tableName = env.dynamodb.presetInfoTable || 'preset_info';
		const command = new GetCommand({
			TableName: tableName,
			Key: { id: presetId }
		});
		const response = await client.send(command);
		if (response.Item) {
			return response.Item.presetName || presetId;
		}
	} catch (error) {
		console.warn('[API] Failed to get earthquake preset name:', error);
	}
	return presetId;
};

export const GET: RequestHandler = async ({ url }) => {
	try {
		// デバッグ: 環境変数とAWS設定を確認
		console.log('[API DEBUG] env.mode:', env.mode);
		console.log('[API DEBUG] AWS_ACCESS_KEY_ID exists:', !!process.env.AWS_ACCESS_KEY_ID);
		console.log('[API DEBUG] viewerInfoTable:', env.dynamodb.viewerInfoTable);
		console.log('[API DEBUG] simulationReserveTable:', env.dynamodb.simulationReserveTable);

		// クエリパラメータから取得
		const limitParam = url.searchParams.get('limit');
		const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as SimulationListSortOrder;
		const nextToken = url.searchParams.get('nextToken');

		// フィルターパラメータ
		const status = url.searchParams.get('status');
		const loginFilter = url.searchParams.get('loginFilter');
		const keyword = url.searchParams.get('keyword');
		const startDate = url.searchParams.get('startDate');
		const endDate = url.searchParams.get('endDate');

		const limit = limitParam ? parseInt(limitParam) : 100;

		const filter: SimulationListFilter = {};
		if (status) filter.status = status;
		if (loginFilter) filter.loginFilter = loginFilter as 'all' | 'required' | 'optional';
		if (keyword) filter.keyword = keyword;
		if (startDate) filter.startDate = startDate;
		if (endDate) filter.endDate = endDate;

		const client = getDynamoDBDocumentClient();

		// 1. viewer_infoテーブルからデータを取得
		const viewerInfoTableName = env.dynamodb.viewerInfoTable;
		const viewerInfoParams: ScanCommandInput = {
			TableName: viewerInfoTableName,
			Limit: limit
		};

		// ページネーショントークンがある場合は設定
		if (nextToken) {
			viewerInfoParams.ExclusiveStartKey = JSON.parse(nextToken);
		}

		// フィルター式の構築（viewer_info用）
		const filterExpressions: string[] = [];
		const expressionAttributeNames: Record<string, string> = {};
		const expressionAttributeValues: Record<string, unknown> = {};

		// ログイン要否フィルター
		if (filter.loginFilter && filter.loginFilter !== 'all') {
			const requiresLogin = filter.loginFilter === 'required';
			filterExpressions.push('requiresLogin = :requiresLogin');
			expressionAttributeValues[':requiresLogin'] = requiresLogin;
		}

		// フィルター式を設定
		if (filterExpressions.length > 0) {
			viewerInfoParams.FilterExpression = filterExpressions.join(' AND ');
			viewerInfoParams.ExpressionAttributeNames = expressionAttributeNames;
			viewerInfoParams.ExpressionAttributeValues = expressionAttributeValues;
		}

		const viewerInfoCommand = new ScanCommand(viewerInfoParams);
		const viewerInfoResponse = await client.send(viewerInfoCommand);

		// viewer_infoのデータをViewerInfoItem形式にマッピング
		const viewerInfoItems: ViewerInfoItem[] = (viewerInfoResponse.Items || []).map(
			(item: DynamoDBViewerItem) => ({
				id: item.id || '',
				region: item.regionName || item.region || '',
				cityCode: item.cityCode,
				parameter: item.simulationDataName || item.parameter || '',
				datetime: item.createDateTime
					? new Date(parseInt(item.createDateTime) * 1000).toLocaleString('ja-JP', {
							timeZone: 'Asia/Tokyo',
							year: 'numeric',
							month: '2-digit',
							day: '2-digit',
							hour: '2-digit',
							minute: '2-digit',
							second: '2-digit',
							hour12: false
						}).replace(/\//g, '-').replace(',', '')
					: item.datetime || '',
				requiresLogin: item.requiresLogin ?? false,
				status: (item.status as ViewerInfoItem['status']) || 'completed',
				createdAt: item.createDateTime
					? new Date(parseInt(item.createDateTime) * 1000).toISOString()
					: item.createdAt,
				updatedAt: item.updatedAt,
				userId: item.userId,
				dataPath: item.simulationDataFilePath || item.dataPath
			})
		);

		// 2. simulation_reserveテーブルから完了・処理中のデータを取得
		let simulationReserveItems: ViewerInfoItem[] = [];
		try {
			simulationReserveItems = await fetchSimulationReserveItems(client, true);
			console.log('[API GET] simulation_reserve items count:', simulationReserveItems.length);
			if (simulationReserveItems.length > 0) {
				console.log('[API GET] simulation_reserve first item:', JSON.stringify(simulationReserveItems[0], null, 2));
			}
		} catch (reserveError) {
			console.warn('[API] Failed to fetch simulation_reserve items:', reserveError);
			// simulation_reserveの取得に失敗してもviewer_infoのデータは返す
		}

		// 3. 両方のデータをマージ（IDで重複排除、simulation_reserveを優先）
		const itemMap = new Map<string, ViewerInfoItem>();

		// まずviewer_infoのデータを追加
		for (const item of viewerInfoItems) {
			itemMap.set(item.id, item);
		}

		// simulation_reserveのデータで上書き（より新しい情報）
		for (const item of simulationReserveItems) {
			itemMap.set(item.id, item);
		}

		let items = Array.from(itemMap.values());

		// クライアントサイドでのフィルタリング
		if (filter) {
			// ステータスフィルター
			if (filter.status) {
				items = items.filter((item) => item.status === filter.status);
			}

			// キーワード検索
			if (filter.keyword) {
				const lowerKeyword = filter.keyword.toLowerCase();
				items = items.filter(
					(item) =>
						item.region.toLowerCase().includes(lowerKeyword) ||
						item.parameter.toLowerCase().includes(lowerKeyword)
				);
			}

			// 日付範囲フィルター
			if (filter.startDate || filter.endDate) {
				items = items.filter((item) => {
					const itemDate = item.datetime.split(' ')[0]; // "YYYY-MM-DD HH:mm:ss" から日付部分を取得

					if (filter.startDate && filter.endDate) {
						return itemDate >= filter.startDate && itemDate <= filter.endDate;
					} else if (filter.startDate) {
						return itemDate >= filter.startDate;
					} else if (filter.endDate) {
						return itemDate <= filter.endDate;
					}
					return true;
				});
			}
		}

		// ソート（datetime降順/昇順）
		items.sort((a, b) => {
			const dateA = new Date(a.datetime);
			const dateB = new Date(b.datetime);
			return sortOrder === 'desc'
				? dateB.getTime() - dateA.getTime()
				: dateA.getTime() - dateB.getTime();
		});

		console.log('[API GET] Final items count:', items.length);
		console.log('[API GET] viewer_info count:', viewerInfoItems.length);

		return json({
			items,
			totalCount: items.length,
			nextToken: viewerInfoResponse.LastEvaluatedKey
				? JSON.stringify(viewerInfoResponse.LastEvaluatedKey)
				: undefined
		});
	} catch (error) {
		logError(error, 'api/simulations GET');
		throw new AwsError(formatErrorMessage(error), error as Error);
	}
};

/**
 * POST /api/simulations
 * シミュレーション予約を作成してバッチジョブを実行
 */
export const POST: RequestHandler = async ({ request }) => {
	console.log('[API POST] Creating simulation reservation...');
	try {
		const body: SimulationData & { userId: string; createdAt: string } = await request.json();
		console.log('[API POST] Request body:', JSON.stringify(body, null, 2));

		// バリデーション
		if (!body.region || !body.meshCodes || body.meshCodes.length === 0) {
			return json(
				{ error: '地域とメッシュコードは必須です' },
				{ status: 400 }
			);
		}

		if (!body.selectedScenarioId) {
			return json(
				{ error: '地震動プリセットを選択してください' },
				{ status: 400 }
			);
		}

		const client = getDynamoDBDocumentClient();
		const tableName = env.dynamodb.simulationReserveTable || 'simulation_reserve';

		// 予約IDを生成（UUIDとして使用）
		const reservationId = randomUUID();
		const now = Math.floor(Date.now() / 1000);

		// 出力パスを生成
		const outputPath = `${reservationId}/SHP`;
		const outputDir = `output/${reservationId}/SHP`;

		// 地域名を取得（クライアントから送信された名前を優先）
		const regionName = body.regionName || body.region;
		console.log('[API POST] Region name:', regionName);

		// 地震動プリセット名を取得（クライアントから送信された名前を優先、なければDynamoDBから取得）
		let presetName = body.selectedScenarioName;
		if (!presetName && body.selectedScenarioId) {
			presetName = await getEarthquakePresetName(client, body.selectedScenarioId);
		}
		console.log('[API POST] Preset name:', presetName);

		// DynamoDBに保存するデータ
		const reservationData = {
			id: reservationId,
			userId: body.userId || 'anonymous',
			regionName: regionName,
			paramName: presetName,
			meshCodes: body.meshCodes,
			type: 'wide', // 広域シミュレーション
			status: '0', // 0: 予約待ち
			createDateTime: now,
			outputPath: outputPath,
			outputDir: outputDir,
			priority: body.priority || 'medium',
			requiresLogin: body.requiresLogin ?? false,
			uuid: reservationId // UUIDとしても保存
		};

		const command = new PutCommand({
			TableName: tableName,
			Item: reservationData
		});

		await client.send(command);
		console.log('[API POST] Created simulation reservation:', reservationId);
		console.log('[API POST] Reservation data:', JSON.stringify(reservationData, null, 2));

		// DPPファイルの生成
		let dppContent: string;
		try {
			dppContent = generateWideDppContent(
				body.meshCodes,
				body.selectedScenarioId,
				reservationId
			);

			if (env.mode === 'development') {
				console.log('[API] Generated DPP content:', dppContent.substring(0, 200) + '...');
			}
		} catch (dppError) {
			console.error('[API] Error generating DPP content:', dppError);
			return json(
				{ error: 'DPPファイルの生成に失敗しました' },
				{ status: 500 }
			);
		}

		// CSVファイルパスを取得
		let csvFilePath: string | undefined;
		if (body.selectedScenarioId) {
			const csvFileName = getCsvFileNameForPreset(body.selectedScenarioId);
			// プロジェクトルートからの絶対パスを構築
			// __dirnameは.svelte-kitビルド出力ディレクトリなので、元のソースディレクトリへのパスを構築
			csvFilePath = join(process.cwd(), 'src/lib/data', csvFileName);
			console.log('[API POST] CSV file path:', csvFilePath);
		}

		// シミュレーションAPIの実行
		console.log('[API POST] Calling simulation API...');
		try {
			const apiResult = await executeSimulationApi(
				{
					id: reservationId,
					userId: body.userId || 'anonymous',
					type: 'wide',
					regionName: regionName,
					paramName: presetName,
					status: '0',
					createDateTime: now
				},
				dppContent,
				csvFilePath
			);

			console.log('[API POST] Simulation API result:', JSON.stringify(apiResult, null, 2));

			// APIレスポンスでシミュレーション予約を更新
			if (apiResult.success && apiResult.data) {
				console.log('[API POST] Updating simulation reserve with API response...');
				await updateSimulationReserve(reservationId, {
					uuid: apiResult.data.uuid,
					jobId: apiResult.data.uuid,
					status: '1', // 1: 実行中
					statusMessage: apiResult.data.message,
					logUrl: apiResult.data.log_url,
					updatedDateTime: Math.floor(Date.now() / 1000)
				});
				console.log('[API POST] Simulation reserve updated successfully');
			} else {
				console.warn('[API POST] Simulation API failed:', apiResult.error);
			}
		} catch (apiError) {
			console.error('[API POST] Error calling simulation API:', apiError);
			// APIエラーは記録するが、予約自体は作成されているので続行
		}

		// レスポンスを生成
		const response: SimulationReservation = {
			reservationId,
			estimatedStartTime: new Date(Date.now() + ESTIMATED_START_DELAY_MINUTES * 60 * 1000),
			estimatedMinutes: ESTIMATED_DURATION_MINUTES,
			status: 'pending'
		};

		return json(response, { status: 201 });
	} catch (error) {
		console.error('[API POST] Error creating simulation reservation:', error);
		logError(error, 'api/simulations POST');

		return json(
			{ error: formatErrorMessage(error) },
			{ status: 500 }
		);
	}
};
