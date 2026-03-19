import { getByUserTypeJob, deleteByRegionNameTypeJob } from '$lib/server/presetInfo';
import type { PresetInfo } from '$lib/types';
import { unixTimestampToString } from '$lib/utils/common';
import { JobType, SimulationType } from '$lib/utils/getName';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		return await getPresetInfos(locals.user);
	} catch (error) {
		console.error('Failed to get presetInfos:', error);
		return {
			presetInfos: []
		};
	}
};

const getPresetInfos = async (user: App.Locals['user']) => {
	try {
		if (!user) {
			return { presetInfos: [] };
		}
		
		const presetInfos: PresetInfo[] = await getByUserTypeJob(
			user.userId,
			SimulationType.Wide,
			JobType.Area,
			user
		);

		// 地域ごとにグループ化
		const groupedByRegion = presetInfos.reduce(
			(acc, item) => {
				const { id, regionName, meshCode, createDateTime } = item;
				if (!acc[regionName]) {
					// 初めて見つけたregionNameの場合、初期値をセット
					acc[regionName] = {
						checked: false,
						id,
						regionName,
						meshCodeCount: meshCode.length,
						createDateTime: unixTimestampToString(createDateTime)
					};
				} else {
					// すでにregionNameがある場合、meshCodeの数を加算し、最新データを更新
					acc[regionName].meshCodeCount += meshCode.length;
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
					meshCodeCount: number;
					createDateTime: string;
				}
			>
		);

		// 結果をリスト化し、日付の新しい順（降順）でソート
		const presetInfoList = Object.values(groupedByRegion).sort((a, b) =>
			b.createDateTime.localeCompare(a.createDateTime)
		);

		return {
			presetInfos: presetInfoList // コンポーネントに渡すデータ
		};
	} catch (error) {
		console.error('Failed to get presetInfos:', error);
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
	deleteAreaPreset: async ({ request, locals }) => {
		const formData = await request.formData();
		const regionNameCsv = formData.get('regionName');
		const regionNames = regionNameCsv ? regionNameCsv.toString().split(',') : [];

		// 各regionNameに対してdeleteByAreaNameを実行し、成功/失敗を収集
		const results = await Promise.all(
			regionNames.map(async (regionName) => {
				try {
					await deleteByRegionNameTypeJob(
						regionName, 
						SimulationType.Wide, 
						JobType.Area,
						locals.user || undefined
					);
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
