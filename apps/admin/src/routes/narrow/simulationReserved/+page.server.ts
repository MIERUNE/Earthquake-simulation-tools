import { createSimulationReserve, updateSimulationReserve } from '$lib/server/simulationReserve';
import { getByUserTypeJob } from '$lib/server/presetInfo';
import type { SimulationReserve } from '$lib/types/index.js';
import { v4 as uuidv4 } from 'uuid';
import { JobType, SimulationStatus, SimulationType } from '$lib/utils/getName.js';
import { getUnixTimestamp } from '$lib/utils/common';
import type { PageServerLoad, Actions } from './$types';

export const actions: Actions = {
	addSimulationBooking: async ({ request, locals, fetch }) => {
		console.log('addSimulationBooking.......');
		
		// Check authentication
		if (!locals.user) {
			return {
				type: 'error',
				error: 'Unauthorized'
			};
		}

		const formData = await request.formData();
		const buildingName = formData.get('buildingName');
		const simModelName = formData.get('simModelName');
		
		if (!buildingName || !simModelName) {
			return {
				type: 'error',
				error: 'Missing required fields'
			};
		}

		const simulationReserve: SimulationReserve = {
			id: uuidv4(),
			userId: locals.user.userId,
			type: SimulationType.Narrow,
			regionName: buildingName as string,
			paramName: simModelName as string,
			status: SimulationStatus.reservation,
			createDateTime: getUnixTimestamp(Date.now()),
			uuid: uuidv4() // Add UUID for webhook tracking
		};

		try {
			// シミュレーション予約情報を登録
			const result = await createSimulationReserve(simulationReserve, locals.user);
			
			if (!result.success) {
				throw new Error('Failed to create simulation reservation');
			}

			console.log('simulationReserve.id:', simulationReserve.id);

			// Submit batch job via API
			const batchResponse = await fetch('/api/batch/narrow', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					simulationId: simulationReserve.id
				})
			});
			
			if (!batchResponse.ok) {
				const error = await batchResponse.json();
				throw new Error(error.error || 'Failed to submit batch job');
			}
			
			const batchResult = await batchResponse.json();
			console.log('Batch job submitted:', batchResult);
			
			// Update simulation reservation with job info
			if (batchResult.jobId) {
				await updateSimulationReserve(
					simulationReserve.id,
					{
						jobId: batchResult.jobId,
						jobArn: batchResult.jobArn,
						status: SimulationStatus.calculating
					},
					locals.user
				);
			}

			console.log('buildingName:', buildingName);
			console.log('simModelName:', simModelName);
			
			return {
				type: 'success',
				data: {
					simulationId: simulationReserve.id,
					jobId: batchResult.jobId
				}
			};
			
		} catch (error) {
			console.error('Failed to create simulation booking:', error);
			return {
				type: 'error',
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}
};

// 地域プリセットと地震動プリセットの読み込み
export const load: PageServerLoad = async ({ locals }) => {
	// Check authentication
	if (!locals.user) {
		return {
			buildingPresets: [],
			simModelPresets: []
		};
	}

	try {
		// 建物プリセットを取得
		const buildingPresets = await getByUserTypeJob(
			locals.user.userId,
			SimulationType.Narrow,
			JobType.Building,
			locals.user
		);
		
		// 解析モデルプリセットを取得
		const simModelPresets = await getByUserTypeJob(
			locals.user.userId,
			SimulationType.Narrow,
			JobType.Analysis_model,
			locals.user
		);

		return {
			buildingPresets: buildingPresets,
			simModelPresets: simModelPresets
		};
	} catch (error) {
		console.error('Failed to load presets:', error);
		return {
			buildingPresets: [],
			simModelPresets: []
		};
	}
};
