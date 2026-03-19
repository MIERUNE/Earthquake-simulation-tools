import { DEFAULT_CITY_CODE } from '../constants/cityConstants';
import { getCityConfig } from './cityDataResolver';

/**
 * 静的JSONファイルを読み込む
 */
export const loadJSON = async <T = unknown>(path: string): Promise<T> => {
	const response = await fetch(path);
	if (!response.ok) {
		throw new Error(`Failed to load ${path}: ${response.statusText}`);
	}
	return response.json() as Promise<T>;
};

/**
 * 地図設定データを読み込む
 * 市区町村コードが指定されている場合は、該当する市のディレクトリから読み込み、
 * なければ共通ファイルから読み込む
 *
 * @param cityCode - 市区町村コード（例: '11224' for 戸田市, '22100' for 静岡市）
 */
export const loadMapConfig = async (cityCode?: string | null): Promise<{
	backgrounds: unknown;
	config: unknown;
	initialView: unknown;
	menu: unknown;
}> => {
	// 設定ファイルのパスを決定（citycodeが指定されていればそのディレクトリ、なければ共通ファイル）
	const configPath = cityCode ? `/${cityCode}/config.json` : '/config.json';
	const initialViewPath = cityCode ? `/${cityCode}/initial_view.json` : '/initial_view.json';
	const menuPath = cityCode ? `/${cityCode}/menu.json` : '/menu.json';

	console.log('[dataLoader] Loading config from:', configPath, 'initialView from:', initialViewPath, 'menu from:', menuPath, 'cityCode:', cityCode);

	// initial_view.jsonの読み込みを試み、失敗した場合はフォールバックする
	let initialView;
	try {
		initialView = await loadJSON(initialViewPath);
		console.log('[dataLoader] Successfully loaded initial_view from:', initialViewPath, 'data:', initialView);
	} catch (error) {
		console.warn('[dataLoader] Failed to load initial_view.json, trying fallback:', error);
		try {
			// 共通ファイルにフォールバック
			initialView = await loadJSON('/initial_view.json');
			console.log('[dataLoader] Successfully loaded fallback initial_view.json');
		} catch {
			// cities.jsonから市区町村の中心座標を取得してフォールバック
			const effectiveCityCode = cityCode || DEFAULT_CITY_CODE;
			const cityConfig = await getCityConfig(effectiveCityCode);
			initialView = {
				map: {
					center: [cityConfig.center.lng, cityConfig.center.lat],
					zoom: 14.0,
					bearing: 0,
					pitch: 0
				}
			};
			console.log('[dataLoader] Using fallback initial_view from cities.json:', initialView);
		}
	}

	const [backgrounds, config, menu] = await Promise.all([
		loadJSON('/backgrounds.json'),
		loadJSON(configPath).catch(() => loadJSON('/config.json')),
		loadJSON(menuPath).catch(() => loadJSON('/menu.json'))
	]);

	return {
		backgrounds,
		config,
		initialView,
		menu
	};
};
