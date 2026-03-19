/**
 * 地域データAPI クライアント
 * サーバーサイドAPIを呼び出すためのクライアント側ラッパー
 */

import type { MeshCode, MeshCodesResponse } from '$lib/types/region';

/**
 * メッシュコード一覧を取得
 * @param options - クエリオプション
 */
export const fetchMeshCodes = async (options?: {
	regionName?: string;
	limit?: number;
}): Promise<{ meshCodes: MeshCode[]; totalCount: number }> => {
	try {
		const params = new URLSearchParams();
		if (options?.regionName) {
			params.append('regionName', options.regionName);
		}
		if (options?.limit) {
			params.append('limit', options.limit.toString());
		}

		const response = await fetch(`/api/meshcodes?${params.toString()}`);

		if (!response.ok) {
			throw new Error(`Failed to fetch mesh codes: ${response.statusText}`);
		}

		const data: MeshCodesResponse = await response.json();
		return data;
	} catch (error) {
		console.error('[API Client] Error fetching mesh codes:', error);
		throw error;
	}
};
