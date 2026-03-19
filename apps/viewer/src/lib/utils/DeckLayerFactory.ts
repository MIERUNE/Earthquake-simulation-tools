import { GeoJsonLayer } from '@deck.gl/layers';
import { MVTLayer } from '@deck.gl/geo-layers';
import { ScenegraphLayer } from '@deck.gl/mesh-layers';
import { PathStyleExtension, DataFilterExtension } from '@deck.gl/extensions';
import type { Layer, PickingInfo } from '@deck.gl/core';
import type { Feature, Geometry } from 'geojson';
import { EMERGENCY_ROAD_COLORS_RGBA } from '../constants/roadColors';
import { getDamageParam, type DamageParam } from '@mosiri/shared';

export interface LayerCallbacks {
	onHover?: (info: PickingInfo) => void;
	onClick?: (info: PickingInfo) => void;
}

export interface BaseLayerConfig {
	id: string;
	type: string;
	visible: boolean;
	sizeScale?: number;
}

export interface GeoJsonLayerConfig extends BaseLayerConfig {
	type: 'geojson';
	source: string;
	getFillColor?: [number, number, number, number];
	getLineColor?: [number, number, number, number];
	getLineWidth?: number;
	lineWidthMinPixels?: number;
}

export interface MVTLayerConfig extends BaseLayerConfig {
	type: 'mvt' | 'mvt_emergency_road';
	source: string;
	getFillColor?: [number, number, number, number];
	getLineColor?: [number, number, number, number];
	getLineWidth?: number;
	lineWidthMinPixels?: number;
	opacity?: number;
	minZoom?: number;
	maxZoom?: number;
}

export interface IconLayerConfig extends BaseLayerConfig {
	type: 'geojsonicon';
	data: string;
	icon?: {
		url?: string;
		width?: number;
		height?: number;
		anchorY?: number;
	};
	getSize?: number;
	iconSizeScale?: number;
}

export interface GLTFLayerConfig extends BaseLayerConfig {
	type: 'gltf';
	source?: string;
	coords?: [number, number, number];
	orientation?: [number, number, number];
	sizeScale?: number;
	_lighting?: 'flat' | 'pbr';
}

export interface TemporalDisplacementLayerConfig extends BaseLayerConfig {
	type: 'temporal_displacement';
	source: string;
	minZoom?: number;
	maxZoom?: number;
}

export interface PMTilesLayerConfig extends BaseLayerConfig {
	type: 'pmtiles';
}

export type DeckLayerConfig =
	| GeoJsonLayerConfig
	| MVTLayerConfig
	| IconLayerConfig
	| GLTFLayerConfig
	| TemporalDisplacementLayerConfig
	| PMTilesLayerConfig;

interface FeatureProperties {
	max_drift?: number;
	_NAME00001?: string;
	_NAME00002?: string;
	_NAME00009?: string;
	_NAME00010?: string;
	_NAME00011?: string;
	_NAME00000?: number;
	shape_dir?: string;
	height?: number;
	N10_002?: number;
	[key: string]: unknown;
}

const displacementDamageColor = (param?: number) => {
	return [
		{
			param: param ? param === 1 : false,
			name: '木造：無被害',
			color: [64, 191, 96, 200]
		},
		{
			param: param ? param === 2 : false,
			name: '木造：半壊',
			color: [255, 255, 0, 200]
		},
		{
			param: param ? param === 3 : false,
			name: '木造：全壊',
			color: [255, 128, 128, 200]
		},
		{
			param: param ? param === 4 : false,
			name: '非木造：無被害',
			color: [64, 96, 191, 200]
		},
		{
			param: param ? param === 5 : false,
			name: '非木造：半壊',
			color: [231, 182, 110, 200]
		},
		{
			param: param ? param === 6 : false,
			name: '非木造：全壊',
			color: [255, 0, 0, 200]
		}
	];
};

const getColorParam = (param: number | undefined) => {
	const colorParamList = displacementDamageColor(param);
	const colorParam = colorParamList.find((colorParam) => colorParam.param);
	return colorParam;
};

/**
 * 建物の被害パラメータを計算
 * 共通定数ファイルから閾値を取得して判定
 * _NAMEで始まるすべてのプロパティから構造種別を検索
 * @param d フィーチャーオブジェクト
 * @param useCityAttributes 市区町村コード指定時かどうか（_NAME00001と_NAME00002を使用するか）
 */
export const getParam = (d: any, useCityAttributes: boolean = false): DamageParam => {
	const drift = d.properties['max_drift'];
	return getDamageParam(drift, d.properties, useCityAttributes);
};

/**
 * レイヤー設定からDeck.glレイヤーを生成
 */
export const makeDeckLayers = (
	layerConfigs: DeckLayerConfig[],
	callbacks: LayerCallbacks = {},
	showTooltip?: (info: PickingInfo) => void,
	onDistrictClick?: (info: PickingInfo) => void,
	onIFCClick?: (info: PickingInfo) => void,
	cityCode?: string | null
): Layer[] => {
	const { onHover, onClick } = callbacks;
	const layers: Layer[] = [];
	const useCityAttributes = !!cityCode;

	for (const config of layerConfigs) {
		if (!config.visible) continue;

		switch (config.type) {
			case 'geojson': {
				const { type: _type, source, visible: _visible, id, ...otherConfig } = config;

				// 相対パスを絶対パスに変換（./で始まる場合は/に変換）
				const dataPath = source.startsWith('./') ? source.replace('./', '/') : source;

				console.log('Creating geojson layer:', {
					id: id,
					originalSource: source,
					convertedSource: dataPath
				});

				layers.push(
					new GeoJsonLayer({
						id: id,
						data: source,
						visible: true,
						pickable: true,
						autoHighlight: true,
						onClick: config.id === 'shizuoka-branch' ? onDistrictClick : showTooltip || onClick,
						getFillColor: (d: { properties?: { fillColor?: [number, number, number, number] } }) =>
							d.properties?.fillColor || [0, 0, 0, 255],
						lineWidthUnits: 'pixels',
						...otherConfig
					})
				);
				break;
			}

			case 'mvt': {
				// 建物の高さを計算する関数
				const calculateElevation = (d: any) => {
					// shape_dirの有無で属性名を切り替え
					const hasShapeDir = '_NAME00009' in d.properties;
					const heightAttr = hasShapeDir ? '_NAME00000' : 'height';

					// 高さ属性がある場合
					if (heightAttr in d.properties) {
						const heightValue = d.properties[heightAttr];
						// _NAME00000が-9999の場合はデフォルト値を使用
						if (heightValue === -9999) {
							return 2 * 3;
						}
						return heightValue;
					}
					// bui_floor属性（階数）がある場合は階数×3メートルで高さを計算
					if ('bui_floor' in d.properties) {
						return (d.properties.bui_floor || 2) * 3;
					}
					// どちらもない場合はデフォルト値（2階建て相当の6メートル）
					return 2 * 3;
				};

				layers.push(
					new MVTLayer({
						id: config.id,
						data: config.source,
						pickable: true,
						filled: true,
						stroked: true,
						getFillColor: (d) => {
							return getColorParam(getParam(d, useCityAttributes))?.color as [number, number, number, number];
						},
						getLineColor: config.getLineColor || [200, 200, 200, 200],
						opacity: config.opacity || 0.8,
						minZoom: config.minZoom || 0,
						maxZoom: config.maxZoom || 22,
						// 3D表示のためのプロパティを追加
						extruded: true,
						getElevation: calculateElevation,
						// 3D建物の側面も同じ色で塗りつぶす
						material: {
							ambient: 0.35,
							diffuse: 0.6,
							shininess: 32,
							specularColor: [30, 30, 30]
						},
						// max_drift属性を持たない地物をフィルタリング
						extensions: [new DataFilterExtension({ filterSize: 1 })],
						getFilterValue: (d) => {
							return d.properties.max_drift !== 0 ? -9999 : 0;
						},
						filterRange: [-9999, -9999],
						onHover: onHover,
						onClick: onClick
					})
				);
				break;
			}

			case 'geojsonicon': {
				// 相対パスを絶対パスに変換（./で始まる場合は/に変換）
				const dataPath = config.data.startsWith('./')
					? config.data.replace('./', '/')
					: config.data;

				// アイコンURLも同様に変換（./で始まるか、絶対パスでない場合は/を付ける）
				let iconUrl = config.icon?.url || 'images/marker-red.png';
				if (iconUrl.startsWith('./')) {
					iconUrl = iconUrl.replace('./', '/');
				} else if (!iconUrl.startsWith('/') && !iconUrl.startsWith('http')) {
					iconUrl = '/' + iconUrl;
				}

				console.log('Creating geojsonicon layer:', {
					id: config.id,
					originalData: config.data,
					convertedData: dataPath,
					originalIconUrl: config.icon?.url,
					iconUrl: iconUrl,
					iconSizeScale: config.iconSizeScale
				});

				// GeoJsonLayerをpointType: 'icon'で使用（元の実装と同じ方式）
				layers.push(
					new GeoJsonLayer({
						id: config.id,
						data: dataPath,
						visible: true,
						pickable: true,
						pointType: 'icon',
						getIcon: () => ({
							url: iconUrl,
							width: config.icon?.width || 32,
							height: config.icon?.height || 32,
							anchorY: config.icon?.anchorY || 32,
							mask: false
						}),
						getIconSize: config.getSize || 10,
						iconSizeScale: 4,
						parameters: {
							depthTest: false
						},
						onHover: onHover,
						onClick: onClick
					})
				);

				console.log(`GeoJsonLayer (icon) for ${config.id} added with data: ${dataPath}`);
				break;
			}

			case 'mvt_emergency_road': {
				// 緊急輸送道路用の特殊なMVTレイヤー（破線スタイル）
				layers.push(
					new MVTLayer({
						id: config.id,
						data: config.source,
						pickable: true,
						getLineColor: (d: Feature<Geometry, FeatureProperties>) => {
							const roadType = (d.properties as FeatureProperties)?.N10_002;
							// roadColors.tsの定数を使用
							const colorKey = String(roadType);
							return EMERGENCY_ROAD_COLORS_RGBA[colorKey] || [200, 200, 200, 255]; // デフォルトはグレー
						},
						getLineWidth: config.getLineWidth || 8, // 太めの線にして目立たせる
						lineWidthMinPixels: config.lineWidthMinPixels || 4,
						// PathStyleExtensionを使用して破線を実現
						extensions: [new PathStyleExtension({ dash: true })],
						getDashArray: () => [8, 4], // 破線パターン：8ピクセルの線、4ピクセルの空白
						minZoom: config.minZoom || 0,
						maxZoom: config.maxZoom || 22,
						onHover: onHover,
						onClick: onClick
					})
				);
				break;
			}

			case 'gltf': {
				// GLTFモデルを使った3D表示
				// edefense-rcまたはedefense-sの場合はIFCビューアーを開くハンドラーを使用
				const isEdefenseModel = config.id === 'edefense-rc' || config.id === 'edefense-s';
				const gltfOnClick = isEdefenseModel && onIFCClick ? onIFCClick : onClick;
				const gltfOnHover = isEdefenseModel ? onHover : undefined;

				layers.push(
					new ScenegraphLayer({
						id: config.id,
						data: [null],
						visible: true,
						scenegraph: config.source,
						getPosition: () => config.coords as [number, number, number],
						getOrientation: () => config.orientation || [0, 0, 0],
						pickable: true,
						autoHighlight: isEdefenseModel,
						onClick: gltfOnClick,
						onHover: gltfOnHover,
						updateTriggers: {
							getColor: [128, 0, 0]
						},
						_animations: {
							'*': { speed: 1 }
						},
						_lighting: config._lighting || 'pbr',
						sizeScale: config.sizeScale || 1
					})
				);
				break;
			}

			case 'temporal_displacement':
			case 'pmtiles':
				// temporal_displacementは後で実装
				// pmtilesはMapLibreネイティブレイヤーとして実装されているためスキップ
				if (config.type === 'temporal_displacement') {
					console.info(
						`Layer type "${config.type}" is not yet implemented, skipping layer: ${config.id}`
					);
				}
				break;

			default:
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				console.warn(`Unsupported layer type: ${(config as any).type}`);
		}
	}

	return layers;
};
