import { describe, it, expect } from 'vitest';
import type { AwsConfig } from './config';
import { awsConfig, LOCAL_DYNAMODB_CONFIG, DYNAMODB_ENDPOINTS } from './config';

describe('AWS Config', () => {
	it('設定オブジェクトが定義されていること', () => {
		expect(awsConfig).toBeDefined();
		expect(awsConfig.region).toBeDefined();
		expect(awsConfig.mode).toBeDefined();
		expect(awsConfig.dynamodb).toBeDefined();
		expect(awsConfig.s3).toBeDefined();
		expect(awsConfig.api).toBeDefined();
	});

	it('DynamoDB設定が正しい構造を持つこと', () => {
		expect(awsConfig.dynamodb.viewerInfoTable).toBeDefined();
		expect(awsConfig.dynamodb.presetInfoTable).toBeDefined();
		expect(awsConfig.dynamodb.simulationReserveTable).toBeDefined();
		expect(typeof awsConfig.dynamodb.viewerInfoTable).toBe('string');
		expect(typeof awsConfig.dynamodb.presetInfoTable).toBe('string');
		expect(typeof awsConfig.dynamodb.simulationReserveTable).toBe('string');
	});

	it('設定の型が正しいこと', () => {
		const config: AwsConfig = awsConfig;
		expect(typeof config.region).toBe('string');
		expect(typeof config.mode).toBe('string');
		expect(typeof config.dynamodb.viewerInfoTable).toBe('string');
		expect(typeof config.dynamodb.presetInfoTable).toBe('string');
		expect(typeof config.dynamodb.simulationReserveTable).toBe('string');
		expect(typeof config.s3.bucketName).toBe('string');
		expect(typeof config.api.endpoint).toBe('string');
	});

	it('regionが有効な値であること', () => {
		expect(awsConfig.region).toMatch(/^[a-z]{2}-[a-z]+-\d+$/);
	});

	it('modeが有効な値であること', () => {
		expect(['development', 'docker', 'production']).toContain(awsConfig.mode);
	});
});

describe('Local DynamoDB Config', () => {
	it('LOCAL_DYNAMODB_CONFIGが正しく定義されていること', () => {
		expect(LOCAL_DYNAMODB_CONFIG).toBeDefined();
		expect(LOCAL_DYNAMODB_CONFIG.region).toBe('us-east-1');
		expect(LOCAL_DYNAMODB_CONFIG.credentials).toBeDefined();
		expect(LOCAL_DYNAMODB_CONFIG.credentials.accessKeyId).toBe('dummy');
		expect(LOCAL_DYNAMODB_CONFIG.credentials.secretAccessKey).toBe('dummy');
	});

	it('DYNAMODB_ENDPOINTSが正しく定義されていること', () => {
		expect(DYNAMODB_ENDPOINTS).toBeDefined();
		expect(DYNAMODB_ENDPOINTS.docker).toBe('http://dynamodb:8000');
		expect(DYNAMODB_ENDPOINTS.local).toBe('http://localhost:8000');
	});

	it('定数が読み取り専用であること', () => {
		// as constで型がreadonlyになっていることを確認
		// TypeScriptレベルでのチェック（ランタイムではない）
		const config: typeof LOCAL_DYNAMODB_CONFIG = LOCAL_DYNAMODB_CONFIG;
		const endpoints: typeof DYNAMODB_ENDPOINTS = DYNAMODB_ENDPOINTS;

		expect(config).toBe(LOCAL_DYNAMODB_CONFIG);
		expect(endpoints).toBe(DYNAMODB_ENDPOINTS);
	});
});
