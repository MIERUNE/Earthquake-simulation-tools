/**
 * Client-side batch job submission
 */

/**
 * Submit narrow simulation batch job
 */
export const submitNarrowSimulationJob = async (simulationId: string): Promise<void> => {
	try {
		console.log('Submitting narrow simulation job:', simulationId);
		
		const response = await fetch('/api/batch/narrow', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({
				simulationId
			})
		});
		
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || error.message || 'Failed to submit batch job');
		}
		
		const result = await response.json();
		console.log('Batch job submitted:', result);
		
	} catch (error) {
		console.error('Failed to submit batch job:', error);
		throw error;
	}
};