/**
 * ビューワー設定関連の型定義
 * 
 * @note deck.glとmaplibre-glの型は各アプリで個別にインポートする
 */

/**
 * settings.json
 */
export interface Settings {
	title: string;
	background_color: string;
	tooltip_background_color: string;
}

/**
 * backgrounds.json
 */
export interface Backgrounds {
	[key: string]: {
		name: string;
		source: any; // RasterSourceSpecification
	};
}

/**
 * initial_view.json
 */
export interface InitialView {
	map: {
		center: [number, number];
		zoom: number;
		bearing: number;
		pitch: number;
	};
}

export interface Disaster {
	text: string;
	value: string;
}

/**
 * disasters.json
 */
export interface Disasters {
	default: number;
	data: Disaster[];
}

/**
 * 複数の設定ファイルJSONを読み込んだ結果を格納するデータ型
 */
export interface Preferences {
	settings: Settings;
	menu: Menu;
	config: Config;
	backgrounds: Backgrounds;
	initialView: InitialView;
}

type DataType =
	| 'raster'
	| 'vector'
	| 'polygon'
	| 'line'
	| 'point'
	| 'building'
	| 'icon'
	| 'transaction'
	| 'pointcloud'
	| 'personflow';

/**
 * menu.json直下のFolderがもつレイヤー定義
 */
export interface Data {
	title: string;
	type: DataType;
	lng: number;
	lat: number;
	zoom: number;
	id: string[];
	checked: boolean;
	color?: string;
	icon?: string;
	download_url?: string;
}

/**
 * menu.json直下の各要素
 */
export interface Folder {
	category: string;
	url?: string;
	open?: boolean;
	data: Data[];
}

/**
 * menu.jsonの構造と一致する型
 */
export type Menu = Folder[];

type LayerConfigType =
	| 'raster'
	| 'mvt'
	| 'geojson'
	| 'geojsonicon'
	| 'icon'
	| 'bus_trip'
	| '3dtiles'
	| 'Scatterplot'
	| 'Arc'
	| 'temporal_polygon'
	| 'temporal_polygon_shape'
	| 'temporal_polygon_area'
	| 'temporal_line'
	| 'gltf'
	| 'trips_json'
	| 'trips_drm'
	| 'text'
	| 'temporal_displacement'
	| 'mvt_emergency_road'
	| 'pmtiles';

interface LayerConfigGenericProps {
	id: string;
	source: string;
	type: LayerConfigType;
	minzoom?: number;
	maxzoom?: number;
	opacity?: number;
	visible?: boolean;
	icon?: {
		url: string;
		width: number;
		height: number;
		anchorY: number;
	};
}

interface RasterLayerConfig extends LayerConfigGenericProps {
	type: 'raster';
}

interface MvtLayerConfig extends LayerConfigGenericProps {
	type: 'mvt';
	getFillColor: any; // Color type
	getLineColor?: any; // Color type
}

export interface GeojsonLayerConfig extends LayerConfigGenericProps {
	type: 'geojson';
	getLineColor?: any; // Color type
	lineWidthMinPixels: number;
	getFillColor?: any; // Color type
	sizeScale?: number;
	iconSizeScale?: number;
	pointType?: string;
}

export interface GeojsonIconLayerConfig extends LayerConfigGenericProps {
	type: 'geojsonicon';
	stroked: boolean;
	filled: boolean;
	icon: {
		url: string;
		width: number;
		height: number;
		anchorY: number;
	};
	iconSizeScale: number;
}

interface IconLayerConfig extends LayerConfigGenericProps {
	type: 'icon';
	coords: [number, number, number];
	color: any; // Color type
}

interface BustripLayerConfig extends LayerConfigGenericProps {
	type: 'bus_trip';
	iconUrl: string;
}

interface Tile3dLayerConfig extends LayerConfigGenericProps {
	type: '3dtiles';
	pointsize: number;
}

interface ScatterplotLayerConfig extends LayerConfigGenericProps {
	type: 'Scatterplot';
	id: string;
	data: string;
	getLineColor: any; // Color type
	getFillColor: any; // Color type
	minzoom: number;
	maxzoom: number;
	visible: boolean;
}

interface ArcLayerConfig extends LayerConfigGenericProps {
	type: 'Arc';
	id: string;
	data: string;
	width: number;
	sourceColor: any; // Color type
	targetColor: any; // Color type
	minzoom: number;
	maxzoom: number;
	visible: boolean;
}

interface TemporalPolygonLayerConfig extends LayerConfigGenericProps {
	type: 'temporal_polygon';
	values: [number, number];
	colors: [any, any]; // [Color, Color]
	heights?: [number, number];
	colorScale: number;
}

interface TemporalPolygonShapeLayerConfig extends LayerConfigGenericProps {
	type: 'temporal_polygon_shape';
	values: [number, number];
	colors: [any, any]; // [Color, Color]
	heights?: [number, number];
	colorScale: number;
}

interface TemporalPolygonAreaLayerConfig extends LayerConfigGenericProps {
	type: 'temporal_polygon_area';
	values: [number, number];
	colors: [any, any]; // [Color, Color]
	heights?: [number, number];
	colorScale: number;
}

interface TemporalLineLayerConfig extends LayerConfigGenericProps {
	type: 'temporal_line';
	values: [number, number];
	colors: [any, any]; // [Color, Color]
	widths: [number, number];
}

interface GltfLayerConfig extends LayerConfigGenericProps {
	type: 'gltf';
	coords: [number, number, number];
	color: any; // Color type
	orientation: [number, number, number];
}

interface TripsJsonLayerConfig extends LayerConfigGenericProps {
	type: 'trips_json';
	color: any; // Color type
	trailLength: number;
}

interface TripsDrmLayerConfig extends LayerConfigGenericProps {
	type: 'trips_drm';
	values: [number, number];
	colors: [any, any]; // [Color, Color]
	step: number;
}

interface TextLayerConfig extends LayerConfigGenericProps {
	type: 'text';
	getSize: number;
	getAngle: number;
	label: string;
}

interface TemporalDisplacement extends LayerConfigGenericProps {
	type: 'temporal_displacement';
	values: [number, number];
	colors: [any, any]; // [Color, Color]
}

interface EmergencyLayerConfig extends LayerConfigGenericProps {
	type: 'mvt_emergency_road';
	getLineColor?: any; // Color type
	buffer: number;
	bufferMeter?: number;
}

interface PmtilesLayerConfig extends LayerConfigGenericProps {
	type: 'pmtiles';
}

export type LayerConfig =
	| RasterLayerConfig
	| MvtLayerConfig
	| GeojsonLayerConfig
	| GeojsonIconLayerConfig
	| IconLayerConfig
	| BustripLayerConfig
	| Tile3dLayerConfig
	| ScatterplotLayerConfig
	| ArcLayerConfig
	| TemporalPolygonLayerConfig
	| TemporalPolygonShapeLayerConfig
	| TemporalPolygonAreaLayerConfig
	| TemporalLineLayerConfig
	| GltfLayerConfig
	| TripsJsonLayerConfig
	| TripsDrmLayerConfig
	| TextLayerConfig
	| TemporalDisplacement
	| EmergencyLayerConfig
	| PmtilesLayerConfig;

export interface Config {
	layers: LayerConfig[];
}