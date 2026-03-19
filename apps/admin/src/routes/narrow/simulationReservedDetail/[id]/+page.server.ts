import { getById as getSimulationById } from '$lib/client/simulationReserve';
import type { SimulationReserve } from '$lib/types';

export const load = async ({ params }) => {
	try {
		const simulationReserveId = params.id;
		const simulationReserve: SimulationReserve | null =
			await getSimulationById(simulationReserveId);
		if (simulationReserve === null) {
			return {
				simulationReserve: null
			};
		}
		return {
			// コンポーネントに渡すデータ
			simulationReserve: simulationReserve
		};
	} catch {
		// 500エラー処理が必要
		return {
			simulationReserve: null,
			earthQuakePreset: null
		};
	}
};
