import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { BatchClient, SubmitJobCommand } from '@aws-sdk/client-batch';
import { UserRole } from '$lib/types/auth';

/**
 * Create Batch client
 */
const getBatchClient = () => {
	const region = process.env.AWS_REGION || 'ap-northeast-1';
	
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
 * POST /api/batch/narrow
 * Submit narrow simulation batch job
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Check authentication
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		
		// Check authorization - only Admin and Operator can submit jobs
		if (![UserRole.Admin, UserRole.Operator].includes(locals.user.role)) {
			return json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
		}
		
		// Parse request body
		const { simulationId } = await request.json();
		
		if (!simulationId) {
			return json({ error: 'Missing simulationId' }, { status: 400 });
		}
		
		// Get job configuration from environment variables
		const jobName = process.env.NARROW_JOBNAME || `narrow-sim-${simulationId}`;
		const jobQueue = process.env.NARROW_JOBQUEUE || 'SimNarrowBatchJQue';
		const jobDefinition = process.env.NARROW_JOBDEFINITION || 'SimNarrowBatchJobDef';
		
		// Skip in development mode
		const mode = process.env.MODE || import.meta.env.MODE;
		const viteMode = process.env.VITE_MODE || import.meta.env.VITE_MODE;
		
		if (mode !== 'production' && viteMode !== 'production') {
			console.log('Development mode: Skipping batch job submission');
			return json({
				success: true,
				message: 'Batch job skipped in development mode',
				simulationId,
				jobId: 'dev-' + simulationId,
				mode: mode || viteMode
			});
		}
		
		// Prepare job parameters
		const params = {
			jobName,
			jobQueue,
			jobDefinition,
			containerOverrides: {
				environment: [
					{ name: 'ID', value: simulationId },
					{ name: 'USER_ID', value: locals.user.userId }
				]
			},
			retryStrategy: {
				attempts: 1
			},
			timeout: {
				attemptDurationSeconds: 1200 // 20 minutes
			}
		};
		
		// Submit job to AWS Batch
		const client = getBatchClient();
		const command = new SubmitJobCommand(params);
		const response = await client.send(command);
		
		console.log('Batch job submitted successfully:', response);
		
		return json({
			success: true,
			message: 'Batch job submitted successfully',
			simulationId,
			jobId: response.jobId,
			jobName: response.jobName,
			jobArn: response.jobArn
		});
		
	} catch (error) {
		console.error('Failed to submit batch job:', error);
		
		// Return appropriate error message
		if (error instanceof Error) {
			return json(
				{ 
					error: 'Failed to submit batch job',
					message: error.message 
				},
				{ status: 500 }
			);
		}
		
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};

/**
 * GET /api/batch/narrow
 * Health check endpoint
 */
export const GET: RequestHandler = async () => {
	return json({
		success: true,
		message: 'Narrow batch API endpoint is active',
		environment: {
			hasJobQueue: !!process.env.NARROW_JOBQUEUE,
			hasJobDefinition: !!process.env.NARROW_JOBDEFINITION,
			mode: process.env.MODE || import.meta.env.MODE
		}
	});
};