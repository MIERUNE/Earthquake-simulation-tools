/**
 * シミュレーションAPI呼び出し（サーバーサイド）
 */

import type { SimulationReserve } from '@mosiri/shared';
import { env } from '$lib/env';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * APIレスポンスの型定義
 */
export interface SimulationApiResponse {
	uuid: string;
	message: string;
	log_url?: string;
	jobId?: string;
	simulationId?: string;
	status?: string;
	[key: string]: unknown;
}

/**
 * シミュレーションAPIを呼び出す
 * @param simulationReserve シミュレーション予約データ
 * @param dppContent dppファイルの内容
 * @param csvFilePath CSVファイルのパス（オプション）
 * @returns API呼び出し結果
 */
export const executeSimulationApi = async (
	simulationReserve: SimulationReserve,
	dppContent: string,
	csvFilePath?: string
): Promise<{ success: boolean; data?: SimulationApiResponse; error?: string }> => {
	try {
		const dppFileName = `${simulationReserve.id}.dpp`;

		console.log('[SimulationAPI] Executing with:', {
			simulationId: simulationReserve.id,
			type: simulationReserve.type,
			regionName: simulationReserve.regionName,
			paramName: simulationReserve.paramName,
			dppContentPreview: dppContent.substring(0, 200) + '...'
		});

		// DPPコンテンツをBlobに変換
		const dppBlob = new Blob([dppContent], { type: 'text/plain' });

		// FormDataを作成
		const formData = new FormData();
		formData.append('script', dppBlob, dppFileName);

		// CSVファイルが指定されている場合は追加
		if (csvFilePath) {
			try {
				console.log('[SimulationAPI] Reading CSV file:', csvFilePath);
				const csvBuffer = await readFile(csvFilePath);
				const csvBlob = new Blob([csvBuffer], { type: 'text/csv' });
				const csvFileName = csvFilePath.split('/').pop() || 'earthquake.csv';
				formData.append('csv', csvBlob, csvFileName);
				console.log('[SimulationAPI] CSV file added to request:', csvFileName);
			} catch (csvError) {
				console.error('[SimulationAPI] Failed to read CSV file:', csvError);
				throw new Error(`Failed to read CSV file: ${csvFilePath}`);
			}
		}

		// APIエンドポイントとAPIキーを環境変数から取得
		const API_ENDPOINT = env.simulationApi?.endpoint || process.env.VITE_SIMULATION_API_ENDPOINT;
		const API_KEY = env.simulationApi?.apiKey || process.env.VITE_SIMULATION_API_KEY;

		if (!API_ENDPOINT || !API_KEY) {
			console.error('[SimulationAPI] Missing configuration:', {
				hasEndpoint: !!API_ENDPOINT,
				hasApiKey: !!API_KEY
			});
			throw new Error('Simulation API endpoint or API key not configured');
		}

		console.log('[SimulationAPI] Calling API:', { endpoint: API_ENDPOINT });

		// APIを呼び出す
		const response = await fetch(API_ENDPOINT, {
			method: 'POST',
			headers: {
				'X-API-Key': API_KEY
			},
			body: formData
		});

		console.log('[SimulationAPI] Response status:', response.status);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('[SimulationAPI] API error response:', errorText);
			throw new Error(`API error: ${response.status} ${response.statusText}`);
		}

		// レスポンスをパース
		const apiResponse = await response.json();
		console.log('[SimulationAPI] API response:', apiResponse);

		// 応答データを検証
		if (!apiResponse.uuid) {
			throw new Error('Invalid API response: missing uuid field');
		}

		// 内部管理用の情報を追加
		const enrichedResponse: SimulationApiResponse = {
			...apiResponse,
			simulationId: simulationReserve.id,
			jobId: apiResponse.uuid,
			status: 'SUBMITTED'
		};

		if (env.mode === 'development') {
			console.log('[SimulationAPI] API response:', enrichedResponse);
		}

		return {
			success: true,
			data: enrichedResponse
		};
	} catch (error) {
		console.error('[SimulationAPI] Execution failed:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
};
