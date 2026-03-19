/**
 * 地震動プリセットAPI（サーバーサイド）
 * DynamoDB preset_infoテーブルから地震動プリセット（job="job2"）を取得
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBDocumentClient } from '$lib/aws/dynamodbClient';
import { env } from '$lib/env';
import type { PresetInfo } from '@mosiri/shared';
import { mockEarthquakePresets } from '$lib/mockData';

/**
 * 地震動プリセットレスポンス型
 */
export interface EarthquakePreset {
	id: string;
	presetName: string;
	regionName: string;
	description?: string;
}

export interface EarthquakePresetsResponse {
	presets: EarthquakePreset[];
	totalCount: number;
}

/**
 * GET /api/earthquake-presets
 * 地震動プリセット一覧を取得
 *
 * クエリパラメータ:
 * - regionName: 地域名でフィルタ（オプション）
 * - limit: 取得件数（デフォルト: 100）
 */
export const GET: RequestHandler = async ({ url }) => {
	const regionName = url.searchParams.get('regionName');
	const limit = parseInt(url.searchParams.get('limit') || '100', 10);

	try {

		const client = getDynamoDBDocumentClient();
		const tableName = env.dynamodbTables?.presetInfo || 'preset_info';

		if (env.mode === 'development') {
			console.log('[API] Fetching earthquake presets from DynamoDB table:', tableName);
		}

		// job="job2" で地震動プリセットをフィルタリング
		const filterExpressions: string[] = ['job = :jobType'];
		const expressionAttributeNames: Record<string, string> = {};
		const expressionAttributeValues: Record<string, string> = {
			':jobType': 'job2'
		};

		// regionNameが指定されている場合は追加フィルタ
		if (regionName) {
			filterExpressions.push('regionName = :regionName');
			expressionAttributeValues[':regionName'] = regionName;

			if (env.mode === 'development') {
				console.log('[API] Filtering by regionName:', regionName);
			}
		}

		const scanParams: {
			TableName: string;
			FilterExpression: string;
			ExpressionAttributeNames?: Record<string, string>;
			ExpressionAttributeValues: Record<string, string>;
			Limit: number;
		} = {
			TableName: tableName,
			FilterExpression: filterExpressions.join(' AND '),
			ExpressionAttributeValues: expressionAttributeValues,
			Limit: limit
		};

		// ExpressionAttributeNamesが空でない場合のみ追加
		if (Object.keys(expressionAttributeNames).length > 0) {
			scanParams.ExpressionAttributeNames = expressionAttributeNames;
		}

		const command = new ScanCommand(scanParams);

		const response = await client.send(command);
		const items = (response.Items as PresetInfo[]) || [];

		// UIで表示する最小限の情報のみ抽出
		const presets: EarthquakePreset[] = items.map((item) => ({
			id: item.id,
			presetName: item.presetName,
			regionName: item.regionName,
			description: item.additionalInfo || undefined
		}));

		if (env.mode === 'development') {
			console.log(`[API] Found ${presets.length} earthquake presets`);
		}

		const result: EarthquakePresetsResponse = {
			presets,
			totalCount: presets.length
		};

		return json(result);
	} catch (err) {
		if (env.mode === 'development') {
			console.error('[API] Error fetching earthquake presets:', err);
		}

		const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

		// 開発環境でDynamoDBが利用できない場合は、モックデータを返す
		if (env.mode === 'development') {
			console.warn(
				'[API] DynamoDB not available in development mode - returning mock data'
			);

			// regionNameでフィルタリング（モックデータに対しても）
			let filteredPresets = mockEarthquakePresets;
			if (regionName) {
				filteredPresets = mockEarthquakePresets.filter(
					(preset) => preset.regionName === regionName
				);
			}

			const result: EarthquakePresetsResponse = {
				presets: filteredPresets.slice(0, limit),
				totalCount: filteredPresets.length
			};
			return json(result);
		}

		throw error(500, errorMessage);
	}
};
