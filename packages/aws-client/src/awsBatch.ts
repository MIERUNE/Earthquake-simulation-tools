import { BatchClient, SubmitJobCommand } from '@aws-sdk/client-batch';

const client = new BatchClient({ region: 'ap-northeast-1' });

export const submitJob = async (id: string): Promise<void> => {
	if (process.env.VITE_MODE === 'production') {
		const params = {
			jobName: process.env.NARROW_JOBNAME, // ジョブ名
			jobQueue: process.env.NARROW_JOBQUEUE, // ジョブキュー
			jobDefinition: process.env.NARROW_JOBDEFINITION, // ジョブ定義 最新を使う
			containerOverrides: {
				environment: [{ name: 'ID', value: id }]
			},
			retryStrategy: {
				attempts: 1
			},
			timeout: {
				attemptDurationSeconds: 1200
			}
		};

		try {
			const command = new SubmitJobCommand(params);
			const response = await client.send(command);
			console.log('ジョブが正常に送信されました:', response);
		} catch (error) {
			console.error('ジョブの送信に失敗しました:', error);
		}
	} else {
		console.log('lcoal:ジョブ送信 dummy');
		return;
	}
};
