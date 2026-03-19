/**
 * AWS設定
 * 環境変数からAWS関連の設定を取得
 */

import { env } from '../env';

export type AwsMode = 'development' | 'docker' | 'production';

export interface AwsConfig {
	region: string;
	mode: AwsMode;
	useRemoteDynamoDB: boolean;
	dynamodb: {
		viewerInfoTable: string;
		presetInfoTable: string;
		simulationReserveTable: string;
	};
	s3: {
		bucketName: string;
	};
	api: {
		endpoint: string;
	};
}

/**
 * 環境変数から設定を取得する関数
 */
const getAwsConfig = (): AwsConfig => {
	return {
		region: env.awsRegion,
		mode: env.mode as AwsMode,
		useRemoteDynamoDB: env.useRemoteDynamoDB,
		dynamodb: {
			viewerInfoTable: env.dynamodb.viewerInfoTable,
			presetInfoTable: env.dynamodb.presetInfoTable,
			simulationReserveTable: env.dynamodb.simulationReserveTable
		},
		s3: {
			bucketName: env.s3BucketName
		},
		api: {
			endpoint: env.apiEndpoint
		}
	};
};

export const awsConfig = getAwsConfig();

/**
 * ローカルDynamoDB接続用の共通設定
 * Docker環境と開発環境で使用
 */
export const LOCAL_DYNAMODB_CONFIG = {
	region: 'us-east-1',
	credentials: {
		accessKeyId: 'dummy',
		secretAccessKey: 'dummy'
	}
} as const;

/**
 * DynamoDBエンドポイント設定
 */
export const DYNAMODB_ENDPOINTS = {
	docker: 'http://dynamodb:8000',
	local: 'http://localhost:8000'
} as const;
