import { BatchClient, SubmitJobCommand } from '@aws-sdk/client-batch';
import { env } from '$lib/env';
import { updateSimulationReserve } from './simulationReserve';

/**
 * Create Batch client
 */
const getBatchClient = (): BatchClient => {
	const region = env.aws.region || 'ap-northeast-1';

	return new BatchClient({
		region,
		// Lambda環境では自動的にIAMロールの認証情報が使用される
		// ローカル開発では環境変数から取得
		...(process.env.AWS_ACCESS_KEY_ID && {
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID,
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
			}
		})
	});
};

/**
 * Submit wide simulation batch job
 */
export const submitWideSimulationBatch = async (
	simulationId: string,
	userId?: string
): Promise<{ success: boolean; jobId?: string; jobArn?: string; message?: string }> => {
	try {
		if (!simulationId) {
			throw new Error('Missing simulationId');
		}

		// Get job configuration from environment variables
		const jobName = process.env.WIDE_JOBNAME || `wide-sim-${simulationId}`;
		const jobQueue = process.env.WIDE_JOBQUEUE || 'SimWideBatchJQue';
		const jobDefinition = process.env.WIDE_JOBDEFINITION || 'SimWideBatchJobDef';

		// Skip in development mode
		if (env.mode !== 'production') {
			console.log('Development mode: Skipping batch job submission');

			// Update simulation status to pending
			await updateSimulationReserve(simulationId, {
				status: '1', // 1: 実行中
				jobId: `dev-${simulationId}`,
				updatedDateTime: Math.floor(Date.now() / 1000)
			});

			return {
				success: true,
				jobId: 'dev-' + simulationId,
				message: 'Batch job skipped in development mode'
			};
		}

		// Prepare job parameters
		const params = {
			jobName,
			jobQueue,
			jobDefinition,
			containerOverrides: {
				environment: [
					{ name: 'ID', value: simulationId },
					{ name: 'USER_ID', value: userId || 'anonymous' }
				]
			},
			retryStrategy: {
				attempts: 1
			},
			timeout: {
				attemptDurationSeconds: 3600 // 60 minutes
			}
		};

		// Submit job to AWS Batch
		const client = getBatchClient();
		const command = new SubmitJobCommand(params);
		const response = await client.send(command);

		console.log('Batch job submitted successfully:', response);

		// Update simulation reservation with job info
		await updateSimulationReserve(simulationId, {
			status: '1', // 1: 実行中
			jobId: response.jobId,
			jobArn: response.jobArn,
			updatedDateTime: Math.floor(Date.now() / 1000)
		});

		return {
			success: true,
			jobId: response.jobId,
			jobArn: response.jobArn,
			message: 'Batch job submitted successfully'
		};

	} catch (error) {
		console.error('Failed to submit batch job:', error);
		throw error;
	}
};
