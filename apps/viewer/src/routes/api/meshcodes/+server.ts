/**
 * メッシュコードAPI（サーバーサイド）
 * DynamoDB preset_infoテーブルからメッシュコードを取得
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { awsConfig, LOCAL_DYNAMODB_CONFIG } from '$lib/aws/config';
import { env } from '$lib/env';
import type { MeshCodesResponse, MeshCode } from '$lib/types/region';
import type { PresetInfo } from '@mosiri/shared';

/**
 * DynamoDBクライアントを取得
 */
const getDynamoDBClient = (): DynamoDBDocumentClient => {
	const mode = env.mode;

	// 開発環境またはDocker環境の場合
	if (mode === 'development' || mode === 'docker') {
		if (mode === 'development') {
			console.log('[DynamoDB] Development/Docker mode - using local DynamoDB');
		}
		const client = new DynamoDBClient({
			region: LOCAL_DYNAMODB_CONFIG.region,
			credentials: LOCAL_DYNAMODB_CONFIG.credentials,
			endpoint: mode === 'docker' ? 'http://dynamodb:8000' : 'http://localhost:8000'
		});
		return DynamoDBDocumentClient.from(client);
	}

	// 本番環境
	const client = new DynamoDBClient({
		region: awsConfig.region
	});
	return DynamoDBDocumentClient.from(client);
};

/**
 * GET /api/meshcodes
 * メッシュコード一覧を取得
 *
 * クエリパラメータ:
 * - regionName: 地域名でフィルタ（オプション）
 * - limit: 取得件数（デフォルト: 100）
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const regionName = url.searchParams.get('regionName');
		const limit = parseInt(url.searchParams.get('limit') || '100', 10);

		const client = getDynamoDBClient();
		const tableName = env.dynamodbTables?.presetInfo || 'preset_info';

		if (env.mode === 'development') {
			console.log('[API] Fetching mesh codes from DynamoDB table:', tableName);
		}

		let items: PresetInfo[] = [];

		// regionNameが指定されている場合はQueryを使用
		if (regionName) {
			if (env.mode === 'development') {
				console.log('[API] Querying by regionName:', regionName);
			}

			// GSI (Global Secondary Index) を使用してregionNameでクエリ
			const command = new QueryCommand({
				TableName: tableName,
				IndexName: 'regionName-index', // GSI名は実際の設定に合わせる
				KeyConditionExpression: 'regionName = :regionName',
				ExpressionAttributeValues: {
					':regionName': regionName
				},
				Limit: limit
			});

			const response = await client.send(command);
			items = response.Items as PresetInfo[] || [];
		} else {
			// regionNameが指定されていない場合はScanを使用
			if (env.mode === 'development') {
				console.log('[API] Scanning all presets');
			}

			const command = new ScanCommand({
				TableName: tableName,
				Limit: limit
			});

			const response = await client.send(command);
			items = response.Items as PresetInfo[] || [];
		}

		// PresetInfoからメッシュコードを抽出
		const meshCodesMap = new Map<string, MeshCode>();

		for (const item of items) {
			if (item.meshCode && Array.isArray(item.meshCode)) {
				for (const code of item.meshCode) {
					if (!meshCodesMap.has(code)) {
						meshCodesMap.set(code, {
							code,
							regionName: item.regionName || '不明'
							// center と bounds は必要に応じて追加
						});
					}
				}
			}
		}

		const meshCodes = Array.from(meshCodesMap.values());

		if (env.mode === 'development') {
			console.log(`[API] Found ${meshCodes.length} unique mesh codes`);
		}

		const response: MeshCodesResponse = {
			meshCodes,
			totalCount: meshCodes.length
		};

		return json(response);
	} catch (err) {
		if (env.mode === 'development') {
			console.error('[API] Error fetching mesh codes:', err);
		}

		const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

		// 開発環境でDynamoDBが利用できない場合は、空配列を返す
		if (env.mode === 'development') {
			console.warn('[API] DynamoDB not available in development mode - returning empty array');
			const response: MeshCodesResponse = {
				meshCodes: [],
				totalCount: 0
			};
			return json(response);
		}

		throw error(500, errorMessage);
	}
};
