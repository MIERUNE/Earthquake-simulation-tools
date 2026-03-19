import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { BatchClient, SubmitJobCommand } from '@aws-sdk/client-batch';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

export const handler = async function (event: any, context: any) {
	try {
		console.log(' ---------- start ---------- ');
		console.log(event);

		// const client = new DynamoDBClient({
		// 	region: 'us-east-1',
		// 	endpoint: 'http://localhost:8000',
		// 	credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' }
		// });

		const client = new DynamoDBClient({
			region: 'ap-northeast-1'
		});

		const params: {
			TableName: string;
			FilterExpression: string;
			ExpressionAttributeNames: { [key: string]: string };
			ExpressionAttributeValues: { [key: string]: string };
			ExclusiveStartKey?: { [key: string]: any };
		} = {
			TableName: 'simulation_reserve',
			FilterExpression: '#status = :statusValue AND #type = :typeValue',
			ExpressionAttributeNames: {
				'#status': 'status',
				'#type': 'type'
			},
			ExpressionAttributeValues: {
				':statusValue': '1',
				':typeValue': 'wide'
			}
		};

		let lastEvaluatedKey;

		do {
			if (lastEvaluatedKey) {
				params.ExclusiveStartKey = lastEvaluatedKey;
			}

			try {
				const data = await client.send(new ScanCommand(params));
				if (data.Items && data.Items.length > 0) {
					for (const item of data.Items) {
						console.log('Item:', item);
						console.log('paramName:', item.paramName);
						console.log('item.id:', item.id);

						// outputDirからS3パスを取得し、doneファイルが存在するかチェック
						if (item.outputDir) {
							const doneFileExists = await checkDoneFileInS3(item.outputDir);
							if (doneFileExists) {
								console.log(
									`ID: ${item.id} のdoneファイルが確認できたため、バッチを実行します`
								);
								await callBatch(item.id);
							} else {
								console.log(
									`ID: ${item.id} のdoneファイルが見つからないため、スキップします`
								);
							}
						} else {
							console.log(`ID: ${item.id} にoutputDirが設定されていません`);
						}
					}
				} else {
					console.log('data.Items is null');
				}
				lastEvaluatedKey = data.LastEvaluatedKey;
			} catch (err) {
				throw err;
			}
		} while (lastEvaluatedKey);

		console.log(' ---------- end ---------- ');

		return {
			statusCode: 200,
			headers: {},
			body: { message: 'OK' }
		};
	} catch (err) {
		console.error('Error occurred:', err);
		throw err;
	}
};

// S3内にdoneファイルが存在するかチェックする関数
const checkDoneFileInS3 = async (outputDir: string): Promise<boolean> => {
	console.log('S3にdoneファイルが存在するかチェック outputDir:', outputDir);

	// デフォルトのバケット名を環境変数から取得
	const defaultBucketName = process.env.WIDE_SIMULATION_S3_BUCKET || '';
	let bucketName = defaultBucketName;
	let key = '';

	// outputDirがS3 URI形式かどうかをチェック
	const s3UrlPattern = /s3:\/\/([^\/]+)\/?(.*)/;
	const match = outputDir.match(s3UrlPattern);

	if (match) {
		// S3 URIの場合はバケット名とキーを抽出
		bucketName = match[1];
		const prefix = match[2];
		key = prefix ? (prefix.endsWith('/') ? `${prefix}done` : `${prefix}/done`) : 'done';
	} else {
		// S3 URIでない場合は、outputDirをキーとして使用
		key = outputDir.endsWith('/') ? `${outputDir}done` : `${outputDir}/done`;
	}

	console.log(`チェックするバケット: ${bucketName}, キー: ${key}`);

	const s3 = new S3Client({ region: 'ap-northeast-1' });

	try {
		// HeadObjectCommand でdoneファイルの存在チェックを行う
		await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
		console.log(`doneファイル (${bucketName}/${key}) は存在します。`);
		return true;
	} catch (err: any) {
		// エラーの中で httpStatusCode が 404 ならオブジェクトは存在しない
		if (err.$metadata && err.$metadata.httpStatusCode === 404) {
			console.log(`doneファイル (${bucketName}/${key}) は存在しません。`);
			return false;
		} else {
			console.error('S3チェック中にエラーが発生しました:', err);
			throw err;
		}
	}
};

const check_s3 = async (id: string): Promise<boolean> => {
	console.log('S3にファイルが存在するかチェック ID:', id);

	const s3 = new S3Client({ region: 'ap-northeast-1' });

	// 例として、id をキーの一部として利用し、.json ファイルを対象とする場合
	const bucketName = process.env.WIDE_SIMULATION_S3_BUCKET || '';
	const key = `${id}.json`; // オブジェクトのキー。必要に応じて変更してください

	try {
		// HeadObjectCommand でオブジェクトの存在チェックを行う
		await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
		console.log(`ファイル ${key} は存在します。`);
		return true;
	} catch (err: any) {
		// エラーの中で httpStatusCode が 404 ならオブジェクトは存在しない
		if (err.$metadata && err.$metadata.httpStatusCode === 404) {
			console.log(`ファイル ${key} は存在しません。`);
			return false;
		} else {
			console.error('S3チェック中にエラーが発生しました:', err);
			throw err;
		}
	}
};

const callBatch = async (id: string) => {
	console.log('ジョブをサブミット ID:', id);
	const client = new BatchClient({ region: 'ap-northeast-1' });
	const params = {
		jobName: 'call-from-lambda',
		jobDefinition: process.env.WIDE_JOBDEFINITION || '',
		jobQueue: process.env.WIDE_JOBQUEUE || '',
		containerOverrides: {
			environment: [{ name: 'ID', value: id }]
		}
	};

	try {
		const command = new SubmitJobCommand(params);
		const response = await client.send(command);
		console.log('ジョブがサブミットされました。Job ID:', response.jobId);
	} catch (error) {
		console.error('ジョブサブミット時にエラーが発生しました:', error);
		throw error;
	}
};
// const client = new DynamoDBClient({
// 	region: 'ap-northeast-1' // 適切なリージョンに変更してください
// });

// handler({}, {});
// console.log(' ---------- end ---------- ');
