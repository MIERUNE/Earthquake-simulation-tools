import { simulationReserve } from '$lib/client';
import { unixTimestampToString } from '$lib/utils/common';
import { getSimulationStatusName, SimulationType } from '$lib/utils/getName';
import type { SimulationReserve } from '$lib/types/index';

export const load = async () => {
	try {
		const simulationReserves: SimulationReserve[] = await simulationReserve.getByUserType(
			'us-east-1:12345678-1234-1234-1234-123456789012',
			SimulationType.Wide
		);

		console.log('Fetched simulation reserves:', simulationReserves);

		// 一時的に日付ソート用の元のタイムスタンプも保持
		const simulationReserveWithTimestamp = await Promise.all(
			simulationReserves.map(async (item: SimulationReserve) => {
				const statusName = await getSimulationStatusName(item.status);
				return {
					id: item.id,
					regionName: item.regionName,
					paramName: item.paramName,
					status: statusName,
					createDateTime: unixTimestampToString(item.createDateTime),
					originalTimestamp: item.createDateTime // ソート用に元のタイムスタンプを保持
				};
			})
		);

		// 日付の新しい順（降順）にソート
		const simulationReserveList = simulationReserveWithTimestamp
			.sort((a, b) => b.originalTimestamp - a.originalTimestamp)
			.map(({ originalTimestamp, ...item }) => item); // 表示用データからタイムスタンプを除去

		return {
			simulationReserveList: simulationReserveList // コンポーネントに渡すデータ
		};
	} catch {
		return {
			simulationReserveList: []
		};
	}
};
