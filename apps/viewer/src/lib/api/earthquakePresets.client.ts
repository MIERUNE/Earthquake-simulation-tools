/**
 * 地震動プリセットAPIクライアント
 */

import type { EarthquakePresetsResponse } from '../../routes/api/earthquake-presets/+server';

/**
 * 地震動プリセット一覧を取得
 * @param options - クエリオプション
 * @returns 地震動プリセット一覧
 */
export const fetchEarthquakePresets = async (options?: {
	regionName?: string;
	limit?: number;
}): Promise<EarthquakePresetsResponse> => {
	const params = new URLSearchParams();

	if (options?.regionName) {
		params.append('regionName', options.regionName);
	}

	if (options?.limit) {
		params.append('limit', options.limit.toString());
	}

	const url = `/api/earthquake-presets${params.toString() ? `?${params.toString()}` : ''}`;

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Failed to fetch earthquake presets: ${response.statusText}`);
	}

	return response.json();
};
