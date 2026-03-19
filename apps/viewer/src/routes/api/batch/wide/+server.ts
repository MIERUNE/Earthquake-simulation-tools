import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { submitWideSimulationBatch } from '$lib/server/batchJob';
import { env } from '$lib/env';

/**
 * POST /api/batch/wide
 * Submit wide simulation batch job
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		// Parse request body
		const { simulationId, userId } = await request.json();

		if (!simulationId) {
			return json({ error: 'Missing simulationId' }, { status: 400 });
		}

		const result = await submitWideSimulationBatch(simulationId, userId);

		return json({
			success: result.success,
			message: result.message,
			simulationId,
			jobId: result.jobId,
			jobArn: result.jobArn
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
 * GET /api/batch/wide
 * Health check endpoint
 */
export const GET: RequestHandler = async () => {
	return json({
		success: true,
		message: 'Wide batch API endpoint is active',
		environment: {
			hasJobQueue: !!process.env.WIDE_JOBQUEUE,
			hasJobDefinition: !!process.env.WIDE_JOBDEFINITION,
			mode: env.mode
		}
	});
};
