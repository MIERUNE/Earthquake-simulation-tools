import { describe, it, expect } from 'vitest';
import { env, isDevelopment, isProduction, isDocker } from './env';

describe('env', () => {
	it('should have all required environment variables', () => {
		expect(env).toBeDefined();
		expect(env.awsRegion).toBeDefined();
		expect(env.mode).toBeDefined();
		expect(env.cognitoUserPoolId).toBeDefined();
		expect(env.cognitoClientId).toBeDefined();
		expect(env.dynamodb).toBeDefined();
		expect(env.s3BucketName).toBeDefined();
		expect(env.apiEndpoint).toBeDefined();
	});

	it('should have correct DynamoDB table names', () => {
		expect(env.dynamodb.viewerInfoTable).toBe('viewer_info');
		expect(env.dynamodb.presetInfoTable).toBe('preset_info');
		expect(env.dynamodb.simulationReserveTable).toBe('simulation_reserve');
	});

	it('should have default AWS region', () => {
		expect(env.awsRegion).toBe('ap-northeast-1');
	});

	it('should have mode set to development by default', () => {
		expect(env.mode).toBe('development');
	});
});

describe('environment helper functions', () => {
	it('isDevelopment should return true for development mode', () => {
		expect(isDevelopment()).toBe(env.mode === 'development');
	});

	it('isProduction should return false for non-production mode', () => {
		expect(isProduction()).toBe(env.mode === 'production');
	});

	it('isDocker should return false for non-docker mode', () => {
		expect(isDocker()).toBe(env.mode === 'docker');
	});
});
