import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

let documentClient: DynamoDBDocumentClient | undefined = undefined;

/**
 * Get DynamoDB Document Client for server-side operations
 */
export const getDocumentClient = () => {
	if (documentClient) return documentClient;
	
	const mode = process.env.MODE || import.meta.env.MODE;
	const viteMode = process.env.VITE_MODE || import.meta.env.VITE_MODE;
	
	let client: DynamoDBClient;
	
	if (mode === 'production' || viteMode === 'production') {
		console.log('Production DynamoDBClient');
		
		// Use Cognito Identity Pool for production
		const region = process.env.VITE_COGNITO_REGION || import.meta.env.VITE_COGNITO_REGION || 'ap-northeast-1';
		const identityPoolId = process.env.VITE_COGNITO_IDENTITY_POOL_ID || import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID;
		
		if (!identityPoolId) {
			throw new Error('VITE_COGNITO_IDENTITY_POOL_ID is not set');
		}
		
		client = new DynamoDBClient({
			region,
			credentials: fromCognitoIdentityPool({
				clientConfig: { region },
				identityPoolId
			})
		});
	} else if (mode === 'docker' || viteMode === 'docker') {
		console.log('Docker DynamoDBClient');
		client = new DynamoDBClient({
			region: 'us-east-1',
			endpoint: 'http://dynamodb:8000',
			credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' }
		});
	} else {
		const useRemote = process.env.VITE_USE_REMOTE_DYNAMODB === 'true' || import.meta.env.VITE_USE_REMOTE_DYNAMODB === 'true';

		if (useRemote) {
			console.log('Development DynamoDBClient (Remote)');
			const region = process.env.VITE_AWS_REGION || import.meta.env.VITE_AWS_REGION || 'ap-northeast-1';
			client = new DynamoDBClient({
				region
			});
		} else {
			console.log('Development DynamoDBClient (Local)');
			client = new DynamoDBClient({
				region: 'us-east-1',
				endpoint: 'http://localhost:8000',
				credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' }
			});
		}
	}
	
	documentClient = DynamoDBDocumentClient.from(client, {
		marshallOptions: {
			removeUndefinedValues: true
		}
	});
	
	return documentClient;
};