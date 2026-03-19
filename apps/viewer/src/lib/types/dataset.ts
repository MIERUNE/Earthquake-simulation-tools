import type { FillPaint, SourceSpecification } from 'maplibre-gl';

/**
 * 統一されたデータセット型
 */
export interface Dataset {
	id: string; // 一意のID
	name: string; // 表示名
	category: string; // カテゴリー (damage, road, facility等)
	type: 'pmtiles' | 'geojson' | 'deckgl' | 'temporal_displacement';
	checked: boolean; // 初期表示状態
	description?: string; // 説明
	legend?: LegendItem[]; // 凡例
	count?: number; // データ件数

	// レイヤー設定
	layerIds?: string[]; // 複数レイヤーIDのサポート
	layerConfigs?: LayerConfig[]; // config.jsonのレイヤー設定

	// データ
	data?: unknown; // GeoJSONやその他のデータ

	// 表示位置
	lng?: number;
	lat?: number;
	zoom?: number;

	// ダウンロードリンク
	downloadUrl?: string; // ダウンロードURL
}

/**
 * 凡例アイテム
 */
export interface LegendItem {
	label: string;
	color: string;
}

/**
 * レイヤー設定 (config.json由来)
 */
export interface LayerConfig {
	id: string;
	type: string;
	source?: string;
	sourceLayer?: string;
	paint?: Record<string, unknown>;
	visible?: boolean;
	[key: string]: unknown;
}

/**
 * PMTiles設定
 */
export interface PMTilesConfig {
	id: string;
	url: string;
	sourceLayer: string;
	paint: FillPaint | undefined;
}

/**
 * メニューカテゴリー (menu.json)
 */
export interface MenuCategory {
	category: string;
	data: MenuItem[];
	requiresLogin?: boolean; // カテゴリー全体のログイン要否（デフォルト: false）
}

/**
 * メニューアイテム (menu.json)
 */
export interface MenuItem {
	id: string[];
	title: string;
	checked: boolean;
	type?: string;
	color?: string;
	lng?: number;
	lat?: number;
	zoom?: number;
	download_url?: string; // スネークケース（後方互換性）
	downloadUrl?: string; // キャメルケース
	requiresLogin?: boolean; // ログイン要否（デフォルト: false）
}

/**
 * コンフィグデータ (config.json)
 */
export interface ConfigData {
	layers: LayerConfig[];
	[key: string]: unknown;
}

/**
 * 背景地図データ (backgrounds.json)
 */
export interface BackgroundData {
	name: string;
	source: SourceSpecification;
}

/**
 * 背景地図マップ
 */
export interface BackgroundsMap {
	[key: string]: BackgroundData;
}

/**
 * 初期表示設定 (initial_view.json)
 */
export interface InitialView {
	map?: {
		center: [number, number];
		zoom: number;
		bearing?: number;
		pitch?: number;
	};
}

/**
 * ツールチップデータ
 */
export interface TooltipData {
	layerId: string | undefined;
	properties: Record<string, unknown>;
}

/**
 * ツールチップ位置
 */
export interface TooltipPosition {
	x: number;
	y: number;
}
