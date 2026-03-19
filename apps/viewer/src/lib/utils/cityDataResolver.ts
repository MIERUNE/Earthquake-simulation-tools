/**
 * 市区町村コードから適切なデータファイルのパスとメタデータを解決するユーティリティ
 */

import { DEFAULT_CITY_CODE } from '../constants/cityConstants';

export interface CityDataConfig {
	/** 市区町村コード (例: '22100', '11224') */
	code: string;
	/** 市区町村名 */
	name: string;
	/** メッシュデータのファイルパス */
	meshDataPath: string;
	/** 中心座標 */
	center: {
		lat: number;
		lng: number;
	};
}

interface CitiesMasterData {
	cities: CityDataConfig[];
	defaultCityCode: string;
}

/**
 * 市区町村マスタデータのキャッシュ
 */
let citiesCache: Record<string, CityDataConfig> | null = null;
let defaultCityCode: string = DEFAULT_CITY_CODE;

/**
 * cities.json から市区町村データを読み込む
 */
const loadCitiesData = async (): Promise<void> => {
	if (citiesCache) return; // 既に読み込み済み

	try {
		const response = await fetch('/cities.json');
		if (!response.ok) {
			throw new Error(`Failed to load cities.json: ${response.statusText}`);
		}
		const data: CitiesMasterData = await response.json();

		// デフォルト市区町村コードを設定
		defaultCityCode = data.defaultCityCode || DEFAULT_CITY_CODE;

		// 配列をマップに変換
		citiesCache = {};
		data.cities.forEach(city => {
			citiesCache[city.code] = city;
		});

		console.log('[cityDataResolver] Loaded cities data:', Object.keys(citiesCache));
	} catch (error) {
		console.error('[cityDataResolver] Failed to load cities.json:', error);
		// フォールバック: デフォルトデータを使用
		citiesCache = {
			[DEFAULT_CITY_CODE]: {
				code: DEFAULT_CITY_CODE,
				name: '静岡市',
				meshDataPath: '/shizuoka-mesh.geojson',
				center: { lat: 34.9769, lng: 138.3831 }
			}
		};
	}
};

/**
 * デフォルトの市区町村設定を取得
 */
const getDefaultCityConfig = (): CityDataConfig => {
	if (!citiesCache) {
		// 同期的に取得できない場合のフォールバック
		return {
			code: DEFAULT_CITY_CODE,
			name: '静岡市',
			meshDataPath: '/shizuoka-mesh.geojson',
			center: { lat: 34.9769, lng: 138.3831 }
		};
	}
	return citiesCache[defaultCityCode] || citiesCache[DEFAULT_CITY_CODE];
};

/**
 * 市区町村コードから設定を取得
 */
export const getCityConfig = async (cityCode: string | null | undefined): Promise<CityDataConfig> => {
	await loadCitiesData();

	if (!cityCode || !citiesCache || !citiesCache[cityCode]) {
		return getDefaultCityConfig();
	}
	return citiesCache[cityCode];
};

/**
 * 市区町村コードから設定を取得（同期版 - 初期化済みの場合のみ使用可能）
 */
export const getCityConfigSync = (cityCode: string | null | undefined): CityDataConfig => {
	if (!cityCode || !citiesCache || !citiesCache[cityCode]) {
		return getDefaultCityConfig();
	}
	return citiesCache[cityCode];
};

/**
 * サポートされている市区町村のコードリストを取得
 */
export const getSupportedCityCodes = async (): Promise<string[]> => {
	await loadCitiesData();
	return citiesCache ? Object.keys(citiesCache) : [DEFAULT_CITY_CODE];
};

/**
 * 市区町村コードが有効かどうかをチェック
 */
export const isValidCityCode = async (cityCode: string | null | undefined): Promise<boolean> => {
	await loadCitiesData();
	return !!cityCode && !!citiesCache && cityCode in citiesCache;
};

/**
 * 地域名から市区町村コードを取得
 */
export const getCityCodeFromRegionName = async (regionName: string): Promise<string | undefined> => {
	await loadCitiesData();

	if (!citiesCache) return undefined;

	// 市区町村名でマッチング
	for (const city of Object.values(citiesCache)) {
		if (regionName.includes(city.name)) {
			return city.code;
		}
	}

	return undefined;
};

/**
 * 市区町村データを事前に読み込む（初期化用）
 */
export const initializeCitiesData = async (): Promise<void> => {
	await loadCitiesData();
};
