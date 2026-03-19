import type { PageLoad } from './$types';
import { DEFAULT_CITY_CODE } from '$lib/constants/cityConstants';
import type { CityDataConfig } from '$lib/utils/cityDataResolver';

export const load: PageLoad = async ({ url, fetch }) => {
	const cityCode = url.searchParams.get('city');

	// cities.jsonを読み込み
	let cityConfig: CityDataConfig;

	try {
		const response = await fetch('/cities.json');
		const data: { cities: CityDataConfig[]; defaultCityCode: string } = await response.json();

		// 市区町村コードに対応する設定を検索
		const targetCityCode = cityCode || data.defaultCityCode || DEFAULT_CITY_CODE;
		const foundCity = data.cities.find(city => city.code === targetCityCode);

		cityConfig = foundCity || data.cities.find(city => city.code === DEFAULT_CITY_CODE) || {
			code: DEFAULT_CITY_CODE,
			name: '静岡市',
			meshDataPath: '/shizuoka-mesh.geojson',
			center: { lat: 34.9769, lng: 138.3831 }
		};
	} catch (error) {
		console.error('[Dashboard] Failed to load cities.json:', error);
		// フォールバック
		cityConfig = {
			code: DEFAULT_CITY_CODE,
			name: '静岡市',
			meshDataPath: '/shizuoka-mesh.geojson',
			center: { lat: 34.9769, lng: 138.3831 }
		};
	}

	return {
		cityCode,
		cityConfig
	};
};
