import { getById, updateMultipleFields } from '$lib/client/presetInfo';
import { redirect } from '@sveltejs/kit';

const BASE_PATH = process.env.BASE_PATH || '/admin';

export const load = async ({ params }) => {
	try {
		const { id } = params; // 'id' を取得
		const presetInfo = await getById(id as string);
		return presetInfo;
	} catch {
		return null;
	}
};

// https://kit.svelte.jp/docs/form-actions
// SvelteKitのactionsはフォーム送信を前提にしており、
// デフォルトではapplication/x-www-form-urlencodedやmultipart/form-dataに限定されています。
// ただし、fetchを使用すればapplication/jsonや他のContent-Typeも問題なく扱うことが可能です。
export const actions = {
	editAreaPreset: async ({ request }) => {
		const formData = await request.formData();
		const idValue = formData.get('idValue');
		const additionalInfo = formData.get('additionalInfo');
		const values = { additionalInfo: additionalInfo };

		await updateMultipleFields(idValue as string, values);
		throw redirect(303, `${BASE_PATH}/wide/areaPresetEditInfo/${idValue}`);
	}
};
