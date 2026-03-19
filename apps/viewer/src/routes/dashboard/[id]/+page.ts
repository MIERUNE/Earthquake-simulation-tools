import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { DEFAULT_CITY_CODE } from '$lib/constants/cityConstants';
import type { CityDataConfig } from '$lib/utils/cityDataResolver';
import type { ViewerInfoItem } from '$lib/types/viewerInfo';

export const load: PageLoad = async ({ params, fetch }) => {
	const simulationId = params.id;

	if (!simulationId) {
		throw error(400, 'Simulation ID is required');
	}

	// シミュレーション情報を取得
	let simulation: ViewerInfoItem | null = null;
	let cityConfig: CityDataConfig;

	try {
		// シミュレーション情報をAPIから取得
		const response = await fetch(`/api/simulations/${simulationId}`);

		if (!response.ok) {
			throw error(404, 'Simulation not found');
		}

		const data = await response.json();
		simulation = data.simulation as ViewerInfoItem;

		// cities.jsonを読み込み
		const citiesResponse = await fetch('/cities.json');
		const citiesData: { cities: CityDataConfig[]; defaultCityCode: string } =
			await citiesResponse.json();

		// simulation.regionから市区町村名を抽出（例: "埼玉県・戸田市" → "戸田市"）
		const cityName = simulation.region?.split('・')[1];

		// 市区町村名に対応する設定を検索
		let foundCity: CityDataConfig | undefined;
		if (cityName) {
			foundCity = citiesData.cities.find((city) => city.name === cityName);
		}

		cityConfig = foundCity ||
			citiesData.cities.find((city) => city.code === DEFAULT_CITY_CODE) || {
				code: DEFAULT_CITY_CODE,
				name: '静岡市',
				meshDataPath: '/shizuoka-mesh.geojson',
				center: { lat: 34.9769, lng: 138.3831 }
			};
	} catch (err) {
		console.error('[Dashboard] Failed to load simulation:', err);
		throw error(500, 'Failed to load simulation data');
	}

	return {
		simulationId,
		simulation,
		cityConfig,
		cityCode: cityConfig.code
	};
};
