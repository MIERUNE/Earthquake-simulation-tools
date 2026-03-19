/**
 * 環境変数アクセスヘルパー
 *
 * サーバーサイド（Lambda）では process.env を使用し、
 * クライアントサイドでは import.meta.env を使用する
 */

/**
 * 環境変数を取得
 * サーバーサイド: process.env を優先
 * クライアントサイド: import.meta.env を使用
 */
const getEnvValue = (key: string): string | undefined => {
	// サーバーサイドでは process.env を優先
	if (typeof process !== 'undefined' && process.env) {
		const processValue = process.env[key];
		if (processValue) {
			return processValue;
		}
	}
	// import.meta.env にフォールバック（ビルド時に埋め込まれた値）
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (import.meta.env as Record<string, string | undefined>)[key];
};

/**
 * 必須の環境変数を取得
 * 環境変数が設定されていない場合はエラーをスロー
 */
export const getRequiredEnv = (key: keyof ImportMetaEnv): string => {
	const value = getEnvValue(String(key));
	if (!value) {
		throw new Error(`環境変数 ${String(key)} が設定されていません`);
	}
	return value;
};

/**
 * オプショナルな環境変数を取得
 * 環境変数が設定されていない場合はデフォルト値を返す
 */
const getOptionalEnv = (key: keyof ImportMetaEnv, defaultValue: string): string => {
	return getEnvValue(String(key)) || defaultValue;
};

/**
 * AWS関連の環境変数
 */
export const env = {
	// AWS基本設定
	awsRegion: getOptionalEnv('VITE_AWS_REGION', 'ap-northeast-1'),
	mode: getOptionalEnv('VITE_MODE', 'development'),
	useRemoteDynamoDB: getOptionalEnv('VITE_USE_REMOTE_DYNAMODB', 'false') === 'true',

	// Cognito設定
	cognitoUserPoolId: getOptionalEnv('VITE_COGNITO_USER_POOL_ID', ''),
	cognitoClientId: getOptionalEnv('VITE_COGNITO_CLIENT_ID', ''),

	// AWS設定
	aws: {
		region: getOptionalEnv('VITE_AWS_REGION', 'ap-northeast-1')
	},

	// DynamoDB テーブル名
	dynamodb: {
		viewerInfoTable: getOptionalEnv('VITE_DYNAMODB_VIEWER_INFO_TABLE', 'viewer_info'),
		presetInfoTable: getOptionalEnv('VITE_DYNAMODB_PRESET_INFO_TABLE', 'preset_info'),
		simulationReserveTable: getOptionalEnv(
			'VITE_DYNAMODB_SIMULATION_RESERVE_TABLE',
			'simulation_reserve'
		)
	},

	// DynamoDBテーブル名（互換性のため）
	dynamodbTables: {
		presetInfo: getOptionalEnv('VITE_DYNAMODB_PRESET_INFO_TABLE', 'preset_info')
	},

	// S3バケット名
	s3BucketName: getOptionalEnv('VITE_S3_BUCKET_NAME', ''),

	// シミュレーションAPI設定
	simulationApi: {
		endpoint: getOptionalEnv('VITE_SIMULATION_API_ENDPOINT', ''),
		apiKey: getOptionalEnv('VITE_SIMULATION_API_KEY', '')
	},

	// APIエンドポイント
	apiEndpoint: getOptionalEnv('VITE_API_ENDPOINT', '')
} as const;

/**
 * 開発環境かどうかを判定
 */
export const isDevelopment = (): boolean => env.mode === 'development';

/**
 * 本番環境かどうかを判定
 */
export const isProduction = (): boolean => env.mode === 'production';

/**
 * Docker環境かどうかを判定
 */
export const isDocker = (): boolean => env.mode === 'docker';
