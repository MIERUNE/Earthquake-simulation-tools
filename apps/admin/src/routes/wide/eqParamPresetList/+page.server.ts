import { getByUserTypeJob, deleteById } from '$lib/client/presetInfo';
import type { PresetInfo } from '$lib/types';
import { unixTimestampToString } from '$lib/utils/common';
import { JobType, SimulationType } from '$lib/utils/getName';

export const load = async () => {
	try {
		const presetInfos: PresetInfo[] = await getByUserTypeJob(
			'us-east-1:12345678-1234-1234-1234-123456789012',
			SimulationType.Wide,
			JobType.Earthquake
		);

		type TransformedPreset = {
			checked: boolean;
			id: string;
			name: string;
			lastUpdatedDatetime: string;
			rawDateTime: number; // ソート用に元の数値も保持
		};

		const transformPreset = (presetData: PresetInfo): TransformedPreset => ({
			checked: false,
			id: presetData.id,
			name: presetData.presetName,
			lastUpdatedDatetime: unixTimestampToString(presetData.createDateTime),
			rawDateTime: presetData.createDateTime
		});

		const presetInfoList = presetInfos
			.map(transformPreset)
			// 日付の新しい順（降順）にソート
			.sort((a, b) => b.rawDateTime - a.rawDateTime);

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
	deleteEqPreset: async ({ request }) => {
		const formData = await request.formData();
		const idCsv = formData.get('id');
		const ids = idCsv ? idCsv.toString().split(',') : [];

		// 各regionNameに対してdeleteByAreaNameを実行し、成功/失敗を収集
		const results = await Promise.all(
			ids.map(async (idValue) => {
				try {
					await deleteById(idValue);
					return { regionName: idValue, success: true };
				} catch (error) {
					console.error(`Failed to delete: ${idValue}`, error);
					return { regionName: idValue, success: false, error };
				}
			})
		);
		return { success: true, results };
	}
};
