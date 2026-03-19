/**
 * DynamoDBクライアントの初期化
 * シングルトンパターンで単一のクライアントインスタンスを提供
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { awsConfig, LOCAL_DYNAMODB_CONFIG, DYNAMODB_ENDPOINTS } from './config';

let client: DynamoDBClient | undefined = undefined;
let docClient: DynamoDBDocumentClient | undefined = undefined;

/**
 * DynamoDB低レベルクライアントを取得
 */
export const getDynamoDBClient = (): DynamoDBClient => {
	if (client) {
		return client;
	}

	const { mode, region } = awsConfig;

	if (mode === 'production') {
		// 本番環境: AWS認証情報を使用
		console.log('[DynamoDB] Production mode - using AWS credentials');
		console.log('[DynamoDB] AWS_ACCESS_KEY_ID exists:', !!process.env.AWS_ACCESS_KEY_ID);
		console.log('[DynamoDB] AWS_SECRET_ACCESS_KEY exists:', !!process.env.AWS_SECRET_ACCESS_KEY);
		console.log('[DynamoDB] AWS_SESSION_TOKEN exists:', !!process.env.AWS_SESSION_TOKEN);
		console.log('[DynamoDB] AWS_REGION:', process.env.AWS_REGION);
		console.log('[DynamoDB] region from config:', region);

		// 環境変数からAWS認証情報を明示的に取得
		const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
		const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
		const sessionToken = process.env.AWS_SESSION_TOKEN;

		if (accessKeyId && secretAccessKey) {
			console.log('[DynamoDB] Using explicit credentials from environment');
			client = new DynamoDBClient({
				region,
				credentials: {
					accessKeyId,
					secretAccessKey,
					sessionToken
				}
			});
		} else {
			console.log('[DynamoDB] Using default credential provider chain');
			client = new DynamoDBClient({
				region
			});
		}
	} else {
		// Docker環境またはローカル開発環境
		// リモート接続フラグがある場合はリモートAWSに接続
		if (awsConfig.useRemoteDynamoDB) {
			console.log('[DynamoDB] Development mode (Remote) - using AWS credentials');
			client = new DynamoDBClient({
				region: awsConfig.region
			});
		} else {
			// 通常のローカル/Dockerモード
			const endpoint = mode === 'docker' ? DYNAMODB_ENDPOINTS.docker : DYNAMODB_ENDPOINTS.local;
			console.log('[DynamoDB] Local/Docker mode:', { mode, endpoint, region: LOCAL_DYNAMODB_CONFIG.region });

			client = new DynamoDBClient({
				region: LOCAL_DYNAMODB_CONFIG.region,
				endpoint,
				credentials: {
					accessKeyId: LOCAL_DYNAMODB_CONFIG.credentials.accessKeyId,
					secretAccessKey: LOCAL_DYNAMODB_CONFIG.credentials.secretAccessKey
				},
				// デバッグ用：リクエストとレスポンスをログ出力
				logger: {
					debug: (...args) => console.log('[AWS SDK Debug]', ...args),
					info: (...args) => console.log('[AWS SDK Info]', ...args),
					warn: (...args) => console.warn('[AWS SDK Warn]', ...args),
					error: (...args) => console.error('[AWS SDK Error]', ...args)
				}
			});

			console.log('[DynamoDB] Client created with endpoint:', endpoint);
		}
	}

	return client;
};

/**
 * DynamoDB DocumentClientを取得（高レベルAPI）
 * JavaScript形式のオブジェクトを直接扱える
 */
export const getDynamoDBDocumentClient = (): DynamoDBDocumentClient => {
	if (docClient) {
		return docClient;
	}

	const lowLevelClient = getDynamoDBClient();
	docClient = DynamoDBDocumentClient.from(lowLevelClient, {
		marshallOptions: {
			removeUndefinedValues: true,
			convertEmptyValues: false
		},
		unmarshallOptions: {
			wrapNumbers: false
		}
	});

	return docClient;
};

/**
 * クライアントを破棄（主にテスト用）
 */
export const destroyDynamoDBClient = (): void => {
	if (client) {
		client.destroy();
		client = undefined;
	}
	docClient = undefined;
};
