import { getByUserTypeJob, deleteByRegionName } from '$lib/client/presetInfo';
import type { PresetInfo } from '$lib/types';
import { unixTimestampToString } from '$lib/utils/common';
import { JobType, SimulationType } from '$lib/utils/getName';

export const load = async () => {
	try {
		return await getPresetInfos();
	} catch {
		return {
			presetInfos: []
		};
	}
};

const getPresetInfos = async () => {
	try {
		const presetInfos: PresetInfo[] = await getByUserTypeJob(
			'us-east-1:12345678-1234-1234-1234-123456789012',
			SimulationType.Narrow,
			JobType.Building
		);

		// 地域ごとにグループ化
		const groupedByRegion = presetInfos.reduce(
			(acc, item) => {
				const { id, regionName, createDateTime } = item;
				if (!acc[regionName]) {
					// 初めて見つけたregionNameの場合、初期値をセット
					acc[regionName] = {
						checked: false,
						id,
						regionName,
						createDateTime: unixTimestampToString(createDateTime)
					};
				} else {
					if (unixTimestampToString(createDateTime) > acc[regionName].createDateTime) {
						acc[regionName].createDateTime = unixTimestampToString(createDateTime);
					}
				}
				return acc;
			},
			{} as Record<
				string,
				{
					checked: boolean;
					id: string;
					regionName: string;
					createDateTime: string;
				}
			>
		);

		// 結果をリスト化
		const presetInfoList = Object.values(groupedByRegion);

		// 日付の新しい順に並べ替え
		presetInfoList.sort((a, b) => {
			return a.createDateTime > b.createDateTime ? -1 : 1;
		});

		return {
			presetInfos: presetInfoList // コンポーネントに渡すデータ
		};
	} catch {
		return {
			presetInfos: []
		};
	}
};

// https://kit.svelte.jp/docs/form-actions
// SvelteKitのactionsはフォーム送信を前提にしており、
// デフォルトではapplication/x-www-form-urlencodedやmultipart/form-dataに限定されています。
// ただし、fetchを使用すればapplication/jsonや他のContent-Typeも問題なく扱うことが可能です。
export const actions = {
	deleteBuildingPreset: async ({ request }) => {
		const formData = await request.formData();
		const regionNameCsv = formData.get('regionName');
		const regionNames = regionNameCsv ? regionNameCsv.toString().split(',') : [];

		// 各regionNameに対してdeleteByAreaNameを実行し、成功/失敗を収集
		const results = await Promise.all(
			regionNames.map(async (regionName) => {
				try {
					await deleteByRegionName(regionName, SimulationType.Narrow, JobType.Building);
					return { regionName, success: true };
				} catch (error) {
					console.error(`Failed to delete: ${regionName}`, error);
					return { regionName, success: false, error };
				}
			})
		);
		return { success: true, results };
	}
};
