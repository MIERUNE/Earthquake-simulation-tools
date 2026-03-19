import { simulationReserve } from '$lib/client';
import { unixTimestampToString } from '$lib/utils/common';
import { getSimulationStatusName, TYPE_NARROW } from '$lib/utils/getName';
import type { SimulationReserve } from '$lib/types';

export const load = async () => {
	try {
		const simulationReserves: SimulationReserve[] = await simulationReserve.getByUserType(
			'us-east-1:12345678-1234-1234-1234-123456789012',
			TYPE_NARROW
		);

		console.log('Fetched simulation reserves:', simulationReserves);

		const simulationReserveList = await Promise.all(
			simulationReserves.map(async (item: SimulationReserve) => {
				const statusName = await getSimulationStatusName(item.status);
				return {
					id: item.id,
					regionName: item.regionName,
					paramName: item.paramName,
					status: statusName,
					createDateTime: unixTimestampToString(item.createDateTime),
					rawCreateDateTime: item.createDateTime // ソート用に元のタイムスタンプを保存
				};
			})
		);

		// 日付の新しい順（降順）に並べ替え
		simulationReserveList.sort((a, b) => b.rawCreateDateTime - a.rawCreateDateTime);

		return {
			simulationReserveList: simulationReserveList // コンポーネントに渡すデータ
		};
	} catch {
		return {
			simulationReserveList: []
		};
	}
};
