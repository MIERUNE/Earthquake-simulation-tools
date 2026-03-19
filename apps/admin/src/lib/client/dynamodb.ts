import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

let client: DynamoDBClient | undefined = undefined;
const getClient = () => {
	if (client) return client;
	console.log('---------------------------------------');
	console.log('Check Environment Variables');
	console.log('---------------------------------------');
	console.log('MODE=',import.meta.env.MODE);
	console.log('VITE_MODE=',import.meta.env.VITE_MODE);
	console.log('VITE_COGNITO_REGION=',import.meta.env.VITE_COGNITO_REGION);
	console.log('VITE_COGNITO_USER_POOL_ID=',import.meta.env.VITE_COGNITO_USER_POOL_ID);
	console.log('VITE_COGNITO_CLIENT_ID=',import.meta.env.VITE_COGNITO_CLIENT_ID);
	console.log('VITE_COGNITO_IDENTITY_POOL_ID=',import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID);
	console.log('---------------------------------------');
	console.log('VITE_MODE(Server)=',process.env.VITE_MODE);
	console.log('VITE_COGNITO_REGION(Server)=',process.env.VITE_COGNITO_REGION);
	console.log('VITE_COGNITO_USER_POOL_ID(Server)=',process.env.VITE_COGNITO_USER_POOL_ID);
	console.log('VITE_COGNITO_CLIENT_ID(Server)=',process.env.VITE_COGNITO_CLIENT_ID);
	console.log('VITE_COGNITO_IDENTITY_POOL_ID(Server)=',process.env.VITE_COGNITO_IDENTITY_POOL_ID);
	console.log('---------------------------------------');
	
	if ((import.meta.env.MODE == 'production') || (process.env.MODE == 'production')) {
		console.log('Production DynamoDBClient',import.meta.env.MODE);
		client = new DynamoDBClient({
			region: 'ap-northeast-1'
		});
	} else if((import.meta.env.MODE == 'docker')  || (process.env.MODE == 'docker')){
		console.log('Docker DynamoDBClient',import.meta.env.MODE);
		client = new DynamoDBClient({
			region: 'us-east-1',
			endpoint: 'http://dynamodb:8000',
			credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' }
		});
	} else {
		console.log('Etc DynamoDBClient',import.meta.env.MODE);
		client = new DynamoDBClient({
			region: 'us-east-1',
			endpoint: 'http://localhost:8000',
			credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' }
		});
	}
	return client;
};

export { getClient };
