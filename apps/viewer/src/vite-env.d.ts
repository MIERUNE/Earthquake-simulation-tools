/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_AWS_REGION?: string;
	readonly VITE_MODE?: string;
	readonly VITE_COGNITO_USER_POOL_ID?: string;
	readonly VITE_COGNITO_CLIENT_ID?: string;
	readonly VITE_DYNAMODB_VIEWER_INFO_TABLE?: string;
	readonly VITE_DYNAMODB_PRESET_INFO_TABLE?: string;
	readonly VITE_DYNAMODB_SIMULATION_RESERVE_TABLE?: string;
	readonly VITE_S3_BUCKET_NAME?: string;
	readonly VITE_API_ENDPOINT?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
