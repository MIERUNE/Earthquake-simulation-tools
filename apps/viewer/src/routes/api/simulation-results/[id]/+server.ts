/**
 * シミュレーション結果取得API（サーバーサイド）
 * S3からシミュレーション結果ファイルを取得
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { awsConfig, LOCAL_DYNAMODB_CONFIG } from '$lib/aws/config';
import { env, isDevelopment, isDocker } from '$lib/env';
import type { SimulationResultResponse, SimulationResult } from '$lib/types/simulationResult';

/**
 * S3クライアントを取得
 */
const getS3Client = (): S3Client => {
	const mode = env.mode;

	// 開発環境またはDocker環境の場合
	if (mode === 'development' || mode === 'docker') {
		console.log('[S3] Development/Docker mode - using local credentials');
		// MinIOまたはローカルS3を使用する場合の設定
		return new S3Client({
			region: LOCAL_DYNAMODB_CONFIG.region,
			credentials: LOCAL_DYNAMODB_CONFIG.credentials,
			endpoint: mode === 'docker' ? 'http://minio:9000' : 'http://localhost:9000',
			forcePathStyle: true // MinIO uses path-style URLs
		});
	}

	// 本番環境
	console.log('[S3] Production mode');
	return new S3Client({
		region: awsConfig.region
	});
};

/**
 * S3からJSONファイルを取得
 */
const getObjectFromS3 = async (bucket: string, key: string): Promise<unknown> => {
	const client = getS3Client();

	try {
		console.log(`[S3] Getting object: s3://${bucket}/${key}`);

		const command = new GetObjectCommand({
			Bucket: bucket,
			Key: key
		});

		const response = await client.send(command);

		if (!response.Body) {
			throw new Error('Empty response body from S3');
		}

		// Stream to string
		const bodyString = await response.Body.transformToString();
		return JSON.parse(bodyString);
	} catch (err) {
		console.error('[S3] Error getting object:', err);
		throw err;
	}
};

/**
 * S3パスからバケット名とキーを抽出
 * 例: "s3://bucket-name/path/to/file.json" -> { bucket: "bucket-name", key: "path/to/file.json" }
 */
const parseS3Path = (
	s3Path: string
): { bucket: string; key: string } | { error: string } => {
	if (!s3Path) {
		return { error: 'S3 path is required' };
	}

	// s3:// プレフィックスを削除
	const path = s3Path.replace(/^s3:\/\//, '');

	// バケット名とキーに分割
	const parts = path.split('/');
	if (parts.length < 2) {
		return { error: 'Invalid S3 path format' };
	}

	const bucket = parts[0];
	const key = parts.slice(1).join('/');

	return { bucket, key };
};

/**
 * GET /api/simulation-results/[id]
 * シミュレーション結果を取得
 */
export const GET: RequestHandler = async ({ params, url }) => {
	const { id } = params;

	if (!id) {
		throw error(400, 'Simulation ID is required');
	}

	try {
		// URLパラメータからS3パスを取得（オプション）
		const dataPath = url.searchParams.get('dataPath');

		if (!dataPath) {
			throw error(400, 'dataPath parameter is required');
		}

		// S3パスをパース
		const parsed = parseS3Path(dataPath);
		if ('error' in parsed) {
			throw error(400, parsed.error);
		}

		const { bucket, key } = parsed;

		// S3からデータを取得
		const data = await getObjectFromS3(bucket, key);

		// レスポンスを構築
		const result: SimulationResult = {
			id,
			...(data as Omit<SimulationResult, 'id'>)
		};

		const response: SimulationResultResponse = {
			success: true,
			data: result
		};

		return json(response);
	} catch (err) {
		console.error('[API] Error fetching simulation result:', err);

		const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

		// 開発環境でS3が利用できない場合は、404を返す（500ではなく）
		// クライアント側でモックデータにフォールバックできるようにする
		if (env.mode === 'development' && errorMessage.includes('Access Key')) {
			console.warn('[API] S3 not available in development mode - client will use mock data');
			throw error(404, 'S3 data not available in development mode');
		}

		throw error(500, errorMessage);
	}
};
