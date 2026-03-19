/**
 * AWS関連のエクスポート
 */

export { awsConfig } from './config';
export type { AwsConfig, AwsMode } from './config';
export { getDynamoDBClient, getDynamoDBDocumentClient, destroyDynamoDBClient } from './dynamodbClient';
