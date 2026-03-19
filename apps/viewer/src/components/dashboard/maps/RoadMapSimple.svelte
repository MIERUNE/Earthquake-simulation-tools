<script lang="ts">
	import { MapLibre, NavigationControl, ScaleControl, Marker, Popup } from 'svelte-maplibre-gl';
	import { DeckGLOverlay } from '@svelte-maplibre-gl/deckgl';
	import { PMTilesProtocol } from '@svelte-maplibre-gl/pmtiles';
	import type { Map } from 'maplibre-gl';
	import type { Layer } from '@deck.gl/core';
	import { onMount, onDestroy } from 'svelte';
	import { loadJSON } from '$lib/utils/dataLoader';
	import { makeDeckLayers, getParam, type DeckLayerConfig } from '$lib/utils/DeckLayerFactory';
	import { MVTLayer } from '@deck.gl/geo-layers';
	import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
	import type { Feature } from 'geojson';

	import { initializeDuckDB, createBufferPolygonsBatch, getIntersection } from '$lib/utils/duckdb';
	import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
	import {
		calculateRoadBlockageWithDuckDB,
		joinRoadBlockageWithEmergencyRoads,
		evaluateShelterAccessibility
	} from '$lib/utils/roadBlockageDuckDB';
	import {
		ROAD_BLOCKAGE_COLORS,
		SHELTER_COLORS,
		EMERGENCY_ROAD_COLORS_RGBA
	} from '$lib/constants/roadColors';
	import RoadMapLegends from '../legends/RoadMapLegends.svelte';
	import { dashboardDataStore } from '$lib/stores/dashboardDataStore';
	import { DEFAULT_CITY_CODE } from '$lib/constants/cityConstants';
	import type { ViewerInfoItem } from '$lib/types/viewerInfo';
	import { adaptConfigForSimulation } from '$lib/utils/simulationConfigAdapter';

	// デバッグモード（開発時のみtrueに設定）
	const DEBUG_MODE = false;

	interface Config {
		layers: DeckLayerConfig[];
	}

	interface FilterState {
		emergencyRoadTypes: string[];
		blockageRanges: string[];
		showOnlyEmergencyRoads: boolean;
	}

	interface ShelterAccessibilitySummary {
		good: number;
		warning: number;
		difficult: number;
	}

	let {
		bufferDistance = 30,
		statistics = $bindable({
			totalLength: 0,
			passableLength: 0,
			blockedLength: 0,
			isolatedPoints: 0
		}),
		filters = {
			emergencyRoadTypes: [],
			blockageRanges: [],
			showOnlyEmergencyRoads: false
		},
		shelterAccessibility = $bindable({
			good: 0,
			warning: 0,
			difficult: 0
		}),
		isCalculating = $bindable(false),
		isLoading = $bindable(false),
		cityCode = null,
		simulation = null
	}: {
		bufferDistance?: number;
		statistics?: RoadStatistics;
		filters?: FilterState;
		shelterAccessibility?: ShelterAccessibilitySummary;
		isCalculating?: boolean;
		isLoading?: boolean;
		cityCode?: string | null;
		simulation?: ViewerInfoItem | null;
	} = $props();

	let mapInstance: Map | undefined;
	let config: Config | undefined;
	let emergencyRoadConfig: DeckLayerConfig | undefined;
	let buildingDamageConfig: DeckLayerConfig | undefined;
	let deckLayers = $state<Layer[]>([]);
	let buildingDamageLayer: MVTLayer | undefined;
	let emergencyRoadLayer: MVTLayer | undefined;

	// DuckDB コネクションの保持
	let duckDBConn: AsyncDuckDBConnection | undefined;

	// MapLibreの表示範囲（bbox）
	let viewportBbox: [number, number, number, number] | undefined;

	// クリップ処理のキャッシュ
	const clipProcessingCache = new Map<string, boolean>();
	const clippedResultsCache = new Map<string, Map<number, Feature[]>>();

	// バッファーキャッシュ（タイルIDごとに生成済みバッファーを保存）
	const bufferCache = new Map<string, Feature[]>();

	// 道路フィーチャーと建物数のマッピング（タイルID -> 道路インデックス -> 建物数）
	const roadBuildingCountCache = new Map<string, Map<number, number>>();

	// 初期化状態の管理
	let isInitializing = $state(true);

	// initial_view.jsonから読み込んだ設定
	let initialView = $state<{
		map: {
			center?: [number, number];
			zoom: number;
			bearing?: number;
			pitch?: number;
		};
	} | null>(null);

	// cities.jsonから読み込んだ都市情報
	interface CityInfo {
		code: string;
		name: string;
		prefecture: string;
		center: {
			lat: number;
			lng: number;
		};
	}
	let citiesData = $state<CityInfo[]>([]);

	// 地図の中心座標（initial_view.jsonのcenterを優先、なければcities.jsonから取得）
	const mapCenter = $derived.by(() => {
		// initial_view.jsonにcenterがあればそれを使用
		if (initialView?.map?.center) {
			return initialView.map.center;
		}
		// cities.jsonから取得
		const effectiveCityCode = cityCode || DEFAULT_CITY_CODE;
		const city = citiesData.find((c) => c.code === effectiveCityCode);
		if (city) {
			return [city.center.lng, city.center.lat] as [number, number];
		}
		// まだ読み込まれていない場合は初期値を返す
		return [0, 0] as [number, number];
	});

	// 地図のズームレベル
	const mapZoom = $derived.by(() => {
		return initialView?.map?.zoom || 17;
	});

	// isLoadingをisInitializingと同期（計算中は含めない）
	$effect(() => {
		const newLoadingState = isInitializing;
		if (isLoading !== newLoadingState) {
			isLoading = newLoadingState;
		}
	});

	// 道路閉塞率計算用の状態管理
	let isCalculatingBlockage = $state(false);
	let roadBlockageLayer: GeoJsonLayer | undefined;
	let roadBlockageResults: Feature[] = $state([]);

	// 緊急輸送道路との重ね合わせ結果用のレイヤー
	let emergencyRoadOverlayLayer: GeoJsonLayer | undefined;
	let emergencyRoadOutlineLayer: GeoJsonLayer | undefined; // 緊急輸送道路の外側の白い線
	let emergencyRoadOverlayResults: Feature[] = $state([]);

	// 避難所データ
	let shelterFeatures: Feature[] = $state([]);
	let shelterLayer: ScatterplotLayer | undefined;

	// 避難所周辺道路状況評価結果の詳細データ（避難所ID -> アクセス性ステータス）
	let shelterAccessibilityDetails = $state<
		Map<number, { status: 'good' | 'warning' | 'difficult'; score: number }>
	>(new Map());

	// 選択された避難所の情報
	let selectedShelter = $state<{
		name: string;
		address: string;
		capacity: number;
		coordinates: [number, number];
		accessibilityStatus?: 'good' | 'warning' | 'difficult';
		accessibilityScore?: number;
	} | null>(null);

	// 選択された道路の情報
	let selectedRoad = $state<{
		name: string;
		type: string;
		emergencyType?: string;
		blockageRate: number;
		length: number;
		roadWidth?: string;
		coordinates: [number, number];
	} | null>(null);

	// 統計情報（親コンポーネントに渡すためにexport）
	interface RoadStatistics {
		totalLength: number; // 総道路延長 (km)
		passableLength: number; // 予測通行可能延長 (km)
		blockedLength: number; // 予測通行不可延長 (km)
		isolatedPoints: number; // 予測孤立地点数
		byType?: Record<string, { totalLength: number; passableLength: number; blockedLength: number }>; // 緊急輸送道路種別ごとの統計
	}

	let roadStatistics = $state<RoadStatistics>({
		totalLength: 0,
		passableLength: 0,
		blockedLength: 0,
		isolatedPoints: 0
	});

	// 道路延長の統計情報を計算する関数（各フィーチャーのプロパティから集計）
	const calculateRoadStatistics = (features: Feature[]): RoadStatistics => {
		let totalLength = 0;
		let passableLength = 0;
		let blockedLength = 0;

		for (const feature of features) {
			const roadLengthKm = feature.properties?.roadLengthKm || 0;
			const blockagePercent = feature.properties?.blockagePercent || 0;

			totalLength += roadLengthKm;

			// 閉塞率50%以上を通行不可とする
			if (blockagePercent >= 50) {
				blockedLength += roadLengthKm;
			} else {
				passableLength += roadLengthKm;
			}
		}

		return {
			totalLength,
			passableLength,
			blockedLength,
			isolatedPoints: 0 // 後で実装
		};
	};

	// 建物数に基づく色分け関数（フィルターUIと統一）
	const getColorRoadBlockagePercent = (count: number): [number, number, number, number] => {
		if (count <= 10) {
			return ROAD_BLOCKAGE_COLORS.PASSABLE;
		} else if (count > 10 && count <= 50) {
			return ROAD_BLOCKAGE_COLORS.WARNING;
		} else if (count > 50 && count <= 100) {
			return ROAD_BLOCKAGE_COLORS.DIFFICULT;
		} else {
			return ROAD_BLOCKAGE_COLORS.DEFAULT;
		}
	};

	// 避難所周辺道路状況ステータスに基づく色分け関数
	const getShelterColor = (shelterId: number): [number, number, number, number] => {
		const accessibility = shelterAccessibilityDetails.get(shelterId);
		if (!accessibility) {
			return SHELTER_COLORS.DEFAULT;
		}

		switch (accessibility.status) {
			case 'good':
				return SHELTER_COLORS.GOOD;
			case 'warning':
				return SHELTER_COLORS.WARNING;
			case 'difficult':
				return SHELTER_COLORS.DIFFICULT;
			default:
				return SHELTER_COLORS.DEFAULT;
		}
	};

	// 避難所レイヤーを更新する関数
	const updateShelterLayer = () => {
		if (shelterFeatures.length === 0) {
			return;
		}

		// updateTriggersのための一意な値（タイムスタンプ）
		const updateTrigger = Date.now();

		shelterLayer = new ScatterplotLayer({
			id: 'shelter-layer',
			data: shelterFeatures,
			pickable: true,
			opacity: 0.9,
			stroked: true,
			filled: true,
			radiusScale: 1,
			radiusMinPixels: 8,
			radiusMaxPixels: 20,
			lineWidthMinPixels: 2,
			getPosition: (d: Feature) => {
				const coords = d.geometry?.type === 'Point' ? d.geometry.coordinates : [0, 0];
				return coords as [number, number];
			},
			getRadius: 12,
			getFillColor: (d: Feature) => {
				const shelterId = d.properties?.NO || 0;
				return getShelterColor(shelterId);
			},
			getLineColor: [255, 255, 255, 255], // 白い縁取り
			getLineWidth: 2,
			// クリックイベントの処理
			onClick: (info: any) => {
				if (info.object) {
					const props = info.object.properties;
					const shelterId = props.NO || 0;
					const accessibility = shelterAccessibilityDetails.get(shelterId);

					selectedShelter = {
						name: props['名称'] || '不明',
						address: props['住所'] || '不明',
						capacity: props['想定収容人数'] || 0,
						coordinates: info.object.geometry.coordinates as [number, number],
						accessibilityStatus: accessibility?.status,
						accessibilityScore: accessibility?.score
					};
				}
			},
			// updateTriggersを追加して色の更新を強制
			updateTriggers: {
				getFillColor: updateTrigger
			}
		});

		// レイヤーリストを更新（避難所レイヤーを最上位に）
		const otherLayers = deckLayers.filter((layer) => layer.id !== 'shelter-layer');
		deckLayers = [...otherLayers, shelterLayer];
	};

	// MapLibreのビューポートからbboxを取得
	const updateViewportBbox = () => {
		if (!mapInstance) return;

		const bounds = mapInstance.getBounds();
		viewportBbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];

		if (DEBUG_MODE) {
		}
	};

	// フィーチャーがbbox内にあるかチェック
	const isFeatureInBbox = (feature: Feature, bbox: [number, number, number, number]): boolean => {
		if (!feature.geometry || !('coordinates' in feature.geometry)) {
			return false;
		}

		const [west, south, east, north] = bbox;

		// LineString の場合
		if (feature.geometry.type === 'LineString') {
			const coords = feature.geometry.coordinates as [number, number][];
			return coords.some(
				([lng, lat]) => lng >= west && lng <= east && lat >= south && lat <= north
			);
		}

		// MultiLineString の場合
		if (feature.geometry.type === 'MultiLineString') {
			const coords = feature.geometry.coordinates as [number, number][][];
			return coords.some((lineCoords) =>
				lineCoords.some(([lng, lat]) => lng >= west && lng <= east && lat >= south && lat <= north)
			);
		}

		// Polygon の場合
		if (feature.geometry.type === 'Polygon') {
			const coords = feature.geometry.coordinates as [number, number][][];
			return coords[0].some(
				([lng, lat]) => lng >= west && lng <= east && lat >= south && lat <= north
			);
		}

		// MultiPolygon の場合
		if (feature.geometry.type === 'MultiPolygon') {
			const coords = feature.geometry.coordinates as [number, number][][][];
			return coords.some((polygonCoords) =>
				polygonCoords[0].some(
					([lng, lat]) => lng >= west && lng <= east && lat >= south && lat <= north
				)
			);
		}

		return false;
	};

	// フィーチャー配列をbboxでフィルタリング
	const clipFeaturesByBbox = (
		features: Feature[],
		bbox: [number, number, number, number]
	): Feature[] => {
		return features.filter((feature) => isFeatureInBbox(feature, bbox));
	};

	// バッファー生成（DuckDBを使用）
	const createBuffers = async (tiles: Feature[], bufferMeter: number): Promise<Feature[]> => {
		// DuckDBコネクションが初期化されていない場合は空配列を返す
		if (!duckDBConn) {
			console.warn('DuckDB connection not initialized');
			return [];
		}

		// bboxが設定されていない場合は空配列を返す
		if (!viewportBbox) {
			if (DEBUG_MODE) {
				console.warn('Viewport bbox not set, skipping buffer generation');
			}
			return [];
		}

		try {
			// bboxで道路中心線をクリップ
			const clippedTiles = clipFeaturesByBbox(tiles, viewportBbox);

			if (DEBUG_MODE) {
			}

			// クリップされたデータが空の場合は空配列を返す
			if (clippedTiles.length === 0) {
				return [];
			}

			// DuckDBのバッチ処理でバッファーを生成
			const bufferedFeatures = await createBufferPolygonsBatch(
				duckDBConn,
				clippedTiles,
				bufferMeter
			);

			// ポリゴンのインデックスをpropertiesに追加
			const featuresWithIndex = bufferedFeatures.map((feature, index) => ({
				...feature,
				properties: {
					...feature.properties,
					polygonIndex: index,
					roadIndex: index // 道路インデックスも設定
				}
			}));

			return featuresWithIndex;
		} catch (error) {
			console.error('Failed to create buffers with DuckDB:', error);
			return [];
		}
	};

	onMount(async () => {
		try {
			// 設定ファイルのパスを決定（citycodeが指定されていればそのディレクトリ、なければ共通ファイル）
			const configPath = cityCode ? `/${cityCode}/config.json` : '/config.json';
			const initialViewPath = cityCode ? `/${cityCode}/initial_view.json` : '/initial_view.json';
			console.log(`[RoadMapSimple] Loading config from: ${configPath}, initial view from: ${initialViewPath}`);

			// DuckDB初期化、config、initial_view、cities.json読み込みを並行実行
			const [duckDBInstance, loadedConfig, loadedInitialView, loadedCities] = await Promise.all([
				initializeDuckDB(),
				loadJSON<Config>(configPath).catch(() => loadJSON<Config>('/config.json')),
				loadJSON<{ map: { center?: [number, number]; zoom: number; bearing?: number; pitch?: number } }>(initialViewPath).catch(() =>
					loadJSON<{ map: { center?: [number, number]; zoom: number; bearing?: number; pitch?: number } }>('/initial_view.json')
				),
				loadJSON<{ cities: CityInfo[] }>('/cities.json')
			]);

			duckDBConn = duckDBInstance.conn;

			// cities.jsonのデータを適用
			if (loadedCities?.cities) {
				citiesData = loadedCities.cities;
				console.log(`[RoadMapSimple] Loaded cities data:`, citiesData.length, 'cities');
			}

			// initial_view.jsonの設定を適用
			if (loadedInitialView) {
				initialView = loadedInitialView;
				console.log(`[RoadMapSimple] Loaded initial view:`, initialView);
			}

			// 避難所データの読み込み
			try {
				const shelterResponse = await fetch('/shelter.geojson');
				if (shelterResponse.ok) {
					const shelterData = await shelterResponse.json();
					shelterFeatures = shelterData.features || [];
				}
			} catch (error) {
				console.error('避難所データの読み込みに失敗しました:', error);
			}

			if (DEBUG_MODE) {
				console.log('Config loaded from:', configPath, loadedConfig);
			}

			// シミュレーションIDがある場合はconfigを更新（building_damageタイルURLを動的に設定）
			config = adaptConfigForSimulation(loadedConfig, simulation);

			// emergency_roadとbuilding_damageの設定を取得
			emergencyRoadConfig = config.layers.find((layer) => layer.id === 'emergency_road');
			buildingDamageConfig = config.layers.find((layer) => layer.id === 'building_damage');

			if (DEBUG_MODE) {
				console.log('Emergency road config:', emergencyRoadConfig);
				console.log('Building damage config:', buildingDamageConfig);
			}

			// Deck.glレイヤーを作成
			const layerConfigs = [buildingDamageConfig, emergencyRoadConfig].filter(
				Boolean
			) as DeckLayerConfig[];
			const baseLayers = makeDeckLayers(layerConfigs, {}, undefined, undefined, undefined, cityCode);

			// buildingDamageLayerへの参照を保存
			buildingDamageLayer = baseLayers.find((layer) => layer.id === 'building_damage') as
				| MVTLayer
				| undefined;

			// emergencyRoadLayerへの参照を保存
			emergencyRoadLayer = baseLayers.find((layer) => layer.id === 'emergency_road') as
				| MVTLayer
				| undefined;

			// RdCLレイヤーを追加（国土地理院の道路中心線）
			// 注: このレイヤーは道路閉塞率計算のデータソースとして使用されますが、
			// 計算前は非表示にして、計算後の結果レイヤーのみを表示します
			const rdclLayer = new MVTLayer({
				id: 'rdcl-buffer-layer',
				data: 'https://cyberjapandata.gsi.go.jp/xyz/optimal_bvmap-v1/{z}/{x}/{y}.pbf',
				pickable: true,
				loadOptions: {
					mvt: {
						layers: ['RdCL']
					}
				},
				visible: false, // 計算のデータソースとして使用するが、表示はしない
				stroked: true,
				filled: false,
				getLineColor: [128, 128, 128, 255], // グレー
				getLineWidth: 2,
				lineWidthMinPixels: 1,
				minZoom: 8,
				maxZoom: 14
			});

			// 道路閉塞率計算結果用のGeoJSONレイヤー（初期状態は空）
			roadBlockageLayer = new GeoJsonLayer({
				id: 'road-blockage-layer',
				data: {
					type: 'FeatureCollection',
					features: []
				},
				filled: false,
				stroked: true,
				getLineWidth: 8,
				getLineColor: (d: any) => d.properties.blockageColor || [128, 128, 128, 180],
				pickable: true,
				onClick: (info: any) => {
					if (info.object) {
						const props = info.object.properties;
						const coords = info.object.geometry.coordinates;
						const centerCoord = Array.isArray(coords[0])
							? (coords[Math.floor(coords.length / 2)] as [number, number])
							: (coords as [number, number]);

						selectedRoad = {
							name: props['N05_002'] || props['N05_003'] || '不明',
							type: props['道路種別'] || props['N05_001'] || '一般道路',
							blockageRate: props.blockagePercent || 0,
							length: props.roadLengthM || 0,
							roadWidth: props.roadWidth,
							coordinates: centerCoord
						};
						selectedShelter = null;
					}
				}
			});

			deckLayers = [...baseLayers, rdclLayer, roadBlockageLayer];

			// 避難所レイヤーを追加（deckLayers初期化後）
			if (shelterFeatures.length > 0) {
				updateShelterLayer();
			}

			if (DEBUG_MODE) {
				console.log('Deck.gl layers created:', deckLayers.length);
			}

			// 初期化完了
			isInitializing = false;
		} catch (error) {
			console.error('Failed to load config:', error);
			// エラーが発生しても初期化完了とする
			isInitializing = false;
		}
	});

	// 背景地図の種類
	type BaseMapType = 'aerial' | 'std' | 'pale';
	let selectedBaseMap = $state<BaseMapType>('aerial');

	// 地理院タイルのスタイル定義
	const baseMapStyles: Record<BaseMapType, { name: string; url: string }> = {
		aerial: {
			name: '航空写真',
			url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'
		},
		std: {
			name: '標準地図',
			url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'
		},
		pale: {
			name: '淡色地図',
			url: 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'
		}
	};

	// 背景地図を変更する関数
	export const changeBaseMap = (mapType: BaseMapType) => {
		selectedBaseMap = mapType;
		if (mapInstance) {
			// 既存のソースとレイヤーがあれば削除
			if (mapInstance.getLayer('raster-layer')) {
				mapInstance.removeLayer('raster-layer');
			}
			if (mapInstance.getSource('raster-tiles')) {
				mapInstance.removeSource('raster-tiles');
			}

			// 新しいソースとレイヤーを追加
			mapInstance.addSource('raster-tiles', {
				type: 'raster',
				tiles: [baseMapStyles[mapType].url],
				tileSize: 256,
				attribution:
					'<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>'
			});

			// 最下層に配置（既存レイヤーの前に挿入）
			const firstLayerId = mapInstance.getStyle().layers[0]?.id;
			mapInstance.addLayer(
				{
					id: 'raster-layer',
					type: 'raster',
					source: 'raster-tiles',
					paint: {}
				},
				firstLayerId
			);
		}
	};

	// 地図がロードされた時の処理
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function handleMapLoad(e: any) {
		mapInstance = e.detail || e.target?.map || e.target;
		if (DEBUG_MODE) {
			console.log('RoadMapSimple - Map loaded:', mapInstance);
		}

		// 初期背景地図を設定（航空写真）
		changeBaseMap('aerial');

		// 初回のbboxを設定
		updateViewportBbox();

		// 地図の移動・ズームイベントでbboxを更新
		if (mapInstance) {
			mapInstance.on('moveend', updateViewportBbox);
			mapInstance.on('zoomend', updateViewportBbox);
		}
	}

	// フィルター変更時に呼び出される関数（外部から呼び出し可能）
	export const applyFilters = () => {
		if (roadBlockageResults.length === 0 && emergencyRoadOverlayResults.length === 0) {
			return; // データがない場合は何もしない
		}

		// 閉塞率範囲の定義
		const blockageRangeDefinitions: Record<string, { min: number; max: number }> = {
			low: { min: 0, max: 10 },
			medium: { min: 11, max: 50 },
			high: { min: 51, max: 100 }
		};

		// 閉塞率フィルタリング用の関数
		const matchesBlockageFilter = (blockagePercent: number): boolean => {
			if (filters.blockageRanges.length === 0) {
				return true; // フィルターが選択されていない場合はすべて表示
			}

			return filters.blockageRanges.some((range) => {
				const rangeDef = blockageRangeDefinitions[range];
				if (!rangeDef) return false;
				return blockagePercent >= rangeDef.min && blockagePercent <= rangeDef.max;
			});
		};

		// 通常の道路閉塞率結果をフィルタリング
		let filteredRoadBlockageFeatures = roadBlockageResults;
		if (filters.blockageRanges.length > 0) {
			filteredRoadBlockageFeatures = roadBlockageResults.filter((feature) => {
				const blockagePercent = feature.properties?.blockagePercent || 0;
				return matchesBlockageFilter(blockagePercent);
			});
		}

		// 緊急輸送道路のフィルタリング
		let filteredEmergencyRoadFeatures = emergencyRoadOverlayResults;
		if (filters.showOnlyEmergencyRoads && filters.emergencyRoadTypes.length > 0) {
			filteredEmergencyRoadFeatures = emergencyRoadOverlayResults.filter((feature) => {
				const roadType = feature.properties?.emergencyRoadType;
				return filters.emergencyRoadTypes.includes(roadType);
			});
		}

		// 閉塞率フィルターも緊急輸送道路に適用
		if (filters.blockageRanges.length > 0) {
			filteredEmergencyRoadFeatures = filteredEmergencyRoadFeatures.filter((feature) => {
				const blockagePercent = feature.properties?.blockagePercent || 0;
				return matchesBlockageFilter(blockagePercent);
			});
		}

		// 通常の道路閉塞率レイヤー
		const shouldShowNormalLayer = !filters.showOnlyEmergencyRoads;

		// 道路閉塞率レイヤーを更新
		roadBlockageLayer = new GeoJsonLayer({
			id: 'road-blockage-layer',
			data: {
				type: 'FeatureCollection',
				features: filteredRoadBlockageFeatures
			},
			filled: false,
			stroked: true,
			getLineWidth: 6,
			getLineColor: (d: any) => d.properties.blockageColor || [128, 128, 128, 180],
			pickable: true,
			opacity: 0.7,
			visible: shouldShowNormalLayer,
			onClick: (info: any) => {
				console.log('Road layer clicked (normal):', info);
				if (info.object) {
					const props = info.object.properties;
					console.log('Road properties:', props);
					const coords = info.object.geometry.coordinates;
					const centerCoord = Array.isArray(coords[0])
						? (coords[Math.floor(coords.length / 2)] as [number, number])
						: (coords as [number, number]);

					selectedRoad = {
						name: props['N05_002'] || props['N05_003'] || '不明',
						type: props['道路種別'] || props['N05_001'] || '一般道路',
						blockageRate: props.blockagePercent || 0,
						length: props.roadLengthM || 0,
						roadWidth: props.roadWidth,
						coordinates: centerCoord
					};
					selectedShelter = null; // 避難所選択をクリア
					console.log('Selected road:', selectedRoad);
				}
			}
		});

		// 緊急輸送道路重ね合わせレイヤーを更新（外側の白い線）
		emergencyRoadOutlineLayer = new GeoJsonLayer({
			id: 'emergency-road-outline-layer',
			data: {
				type: 'FeatureCollection',
				features: filteredEmergencyRoadFeatures
			},
			filled: false,
			stroked: true,
			getLineWidth: 12, // 外側の線を太く
			getLineColor: [255, 255, 255, 255], // 白色
			lineWidthMinPixels: 4,
			pickable: false,
			opacity: 1.0,
			visible: filteredEmergencyRoadFeatures.length > 0
		});

		// 緊急輸送道路重ね合わせレイヤーを更新（内側の色付き線）
		emergencyRoadOverlayLayer = new GeoJsonLayer({
			id: 'emergency-road-overlay-layer',
			data: {
				type: 'FeatureCollection',
				features: filteredEmergencyRoadFeatures
			},
			filled: false,
			stroked: true,
			getLineWidth: 8, // 内側の線は細く
			getLineColor: (d: any) => d.properties.emergencyRoadColor || [128, 128, 128, 220],
			lineWidthMinPixels: 3,
			pickable: true,
			opacity: 1.0,
			visible: filteredEmergencyRoadFeatures.length > 0,
			onClick: (info: any) => {
				console.log('Emergency road layer clicked:', info);
				if (info.object) {
					const props = info.object.properties;
					console.log('Emergency road properties:', props);
					const coords = info.object.geometry.coordinates;
					const centerCoord = Array.isArray(coords[0])
						? (coords[Math.floor(coords.length / 2)] as [number, number])
						: (coords as [number, number]);

					selectedRoad = {
						name: props['N05_002'] || props['N05_003'] || '不明',
						type: props['道路種別'] || props['N05_001'] || '一般道路',
						emergencyType: props['第何次'] ? `第${props['第何次']}次緊急輸送道路` : undefined,
						blockageRate: props.blockagePercent || 0,
						length: props.roadLengthM || 0,
						roadWidth: props.roadWidth,
						coordinates: centerCoord
					};
					selectedShelter = null; // 避難所選択をクリア
					console.log('Selected emergency road:', selectedRoad);
				}
			}
		});

		// レイヤーリストを更新（レイヤーの順序：下から道路閉塞レイヤー → 緊急輸送道路アウトラインレイヤー → 緊急輸送道路レイヤー）
		const otherLayers = deckLayers.filter(
			(layer) =>
				layer.id !== 'road-blockage-layer' &&
				layer.id !== 'emergency-road-overlay-layer' &&
				layer.id !== 'emergency-road-outline-layer'
		);

		const newLayers = [...otherLayers];
		// 通常の道路閉塞レイヤーを下に配置
		if (shouldShowNormalLayer) {
			newLayers.push(roadBlockageLayer);
		}
		// 緊急輸送道路レイヤーを一番上に配置（外側→内側の順）
		if (filteredEmergencyRoadFeatures.length > 0) {
			console.log('Adding emergency road layers:', {
				outlineLayer: emergencyRoadOutlineLayer,
				overlayLayer: emergencyRoadOverlayLayer,
				featureCount: filteredEmergencyRoadFeatures.length
			});
			newLayers.push(emergencyRoadOutlineLayer); // 外側の白い線
			newLayers.push(emergencyRoadOverlayLayer); // 内側の色付き線
		} else {
			console.log('No emergency road features to display');
		}

		deckLayers = newLayers;
		console.log(
			'Total deck layers:',
			deckLayers.length,
			deckLayers.map((l) => l.id)
		);
	};

	// 道路閉塞率の計算関数（外部から呼び出し可能）
	export const calculateRoadBlockage = async () => {
		// 最初に即座にローディング状態にする
		isCalculatingBlockage = true;
		isCalculating = true;

		// 次のフレームで実際の処理を開始(UIが更新されるのを待つ)
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

		if (!duckDBConn) {
			console.error('DuckDB connection not initialized');
			isCalculatingBlockage = false;
			isCalculating = false;
			return;
		}

		if (!buildingDamageLayer) {
			console.error('Building damage layer not found');
			isCalculatingBlockage = false;
			isCalculating = false;
			return;
		}

		// 既存の結果がある場合はクリア
		if (roadBlockageResults.length > 0) {
			roadBlockageResults = [];
			// レイヤーをクリア
			roadBlockageLayer = new GeoJsonLayer({
				id: 'road-blockage-layer',
				data: {
					type: 'FeatureCollection',
					features: []
				},
				filled: false,
				stroked: true,
				getLineWidth: 8,
				getLineColor: (d: any) => d.properties.blockageColor || [128, 128, 128, 180],
				pickable: true
			});
			// レイヤーリストを更新
			const otherLayers = deckLayers.filter((layer) => layer.id !== 'road-blockage-layer');
			deckLayers = [...otherLayers, roadBlockageLayer];
		}

		try {
			// 共通データストアから建物データを取得
			const effectiveCityCode = cityCode || DEFAULT_CITY_CODE;
			let allBuildingFeatures = dashboardDataStore.getBuildingData(effectiveCityCode);

			if (!allBuildingFeatures) {
				console.log(
					'[calculateRoadBlockage] 共通データストアにデータなし。MVTレイヤーから取得します'
				);

				// building_damageレイヤーからフィーチャーを取得
				const buildingTileCache = (buildingDamageLayer as any)?.state?.tileset?.tiles;
				if (!buildingTileCache) {
					console.error('Building tile cache not found');
					return;
				}

				allBuildingFeatures = [];
				for (const tile of Object.values(buildingTileCache)) {
					const buildingTile = tile as any;
					const buildingFeatures = buildingTile.dataInWGS84;
					if (buildingFeatures && buildingFeatures.length > 0) {
						allBuildingFeatures.push(...buildingFeatures);
					}
				}

				// 共通データストアに建物データを保存
				dashboardDataStore.setBuildingData(effectiveCityCode, allBuildingFeatures);
			} else {
				console.log(
					'[calculateRoadBlockage] 共通データストアから建物データを取得:',
					allBuildingFeatures.length
				);
			}

			if (DEBUG_MODE) {
			}

			// 共通データストアから道路データを取得
			const roadData = dashboardDataStore.getRoadData(effectiveCityCode);
			let allRoadFeatures: Feature[] = [];
			let allEmergencyRoadFeatures: Feature[] = [];

			if (roadData) {
				console.log('[calculateRoadBlockage] 共通データストアから道路データを取得');
				allRoadFeatures = roadData.roadFeatures;
				allEmergencyRoadFeatures = roadData.emergencyRoadFeatures;
			} else {
				console.log(
					'[calculateRoadBlockage] 共通データストアに道路データなし。MVTレイヤーから取得します'
				);

				// rdclLayerからフィーチャーを取得
				const rdclLayer = deckLayers.find((layer) => layer.id === 'rdcl-buffer-layer') as any;
				if (!rdclLayer) {
					console.error('RdCL layer not found');
					return;
				}

				const rdclTileCache = rdclLayer?.state?.tileset?.tiles;
				if (!rdclTileCache) {
					console.error('RdCL tile cache not found');
					return;
				}

				for (const tile of Object.values(rdclTileCache)) {
					const roadTile = tile as any;
					const roadFeatures = roadTile.dataInWGS84;
					if (roadFeatures && roadFeatures.length > 0) {
						allRoadFeatures.push(...roadFeatures);
					}
				}

				// emergency_roadレイヤーからフィーチャーを取得
				if (emergencyRoadLayer) {
					const emergencyRoadTileCache = (emergencyRoadLayer as any)?.state?.tileset?.tiles;
					if (emergencyRoadTileCache) {
						for (const tile of Object.values(emergencyRoadTileCache)) {
							const emergencyTile = tile as any;
							const emergencyFeatures = emergencyTile.dataInWGS84;
							if (emergencyFeatures && emergencyFeatures.length > 0) {
								allEmergencyRoadFeatures.push(...emergencyFeatures);
							}
						}
					}
				}

				// 共通データストアに道路データを保存
				dashboardDataStore.setRoadData(
					effectiveCityCode,
					allRoadFeatures,
					allEmergencyRoadFeatures
				);
			}

			if (DEBUG_MODE) {
				console.log(`Emergency roads loaded: ${allEmergencyRoadFeatures.length}`);
			}

			// DuckDB空間SQLで道路閉塞率を一括計算
			if (!viewportBbox) {
				console.error('Viewport bbox not available');
				return;
			}
			const clippedRoadFeatures = clipFeaturesByBbox(allRoadFeatures, viewportBbox);
			const clippedBuildingFeatures = clipFeaturesByBbox(allBuildingFeatures, viewportBbox);

			if (DEBUG_MODE) {
				console.log(
					`All features - Roads: ${allRoadFeatures.length}, Buildings: ${allBuildingFeatures.length}`
				);
				console.log(
					`Clipped features - Roads: ${clippedRoadFeatures.length}, Buildings: ${clippedBuildingFeatures.length}`
				);
			}

			// DuckDB空間SQLで一括計算（V2実装）
			const roadBlockageFeatures = await calculateRoadBlockageWithDuckDB(
				duckDBConn,
				clippedRoadFeatures,
				clippedBuildingFeatures,
				bufferDistance // propsから渡されたバッファー距離を使用
			);

			// 緊急輸送道路との空間結合
			let finalRoadBlockageFeatures = roadBlockageFeatures;
			let statsByType:
				| Record<string, { totalLength: number; passableLength: number; blockedLength: number }>
				| undefined;

			if (allEmergencyRoadFeatures.length > 0) {
				const joinResult = await joinRoadBlockageWithEmergencyRoads(
					duckDBConn,
					roadBlockageFeatures,
					allEmergencyRoadFeatures
				);
				finalRoadBlockageFeatures = joinResult.features;
				statsByType = joinResult.statsByType;

				// 緊急輸送道路と重なる道路を保存（重ね合わせレイヤー用）
				emergencyRoadOverlayResults = joinResult.features.map((feature) => ({
					...feature,
					properties: {
						...feature.properties,
						emergencyRoadColor: EMERGENCY_ROAD_COLORS_RGBA[
							feature.properties.emergencyRoadType
						] || [128, 128, 128, 220]
					}
				}));

				if (DEBUG_MODE) {
					console.log(`緊急輸送道路との結合完了: ${finalRoadBlockageFeatures.length}件`);
					console.log('種別ごとの統計:', statsByType);
				}
			} else {
				// 緊急輸送道路がない場合はクリア
				emergencyRoadOverlayResults = [];
			}

			// 結果を保存（全道路の閉塞率結果）
			roadBlockageResults = roadBlockageFeatures;

			// 統計情報を計算
			roadStatistics = calculateRoadStatistics(finalRoadBlockageFeatures);

			// 種別ごとの統計を追加
			if (statsByType) {
				roadStatistics.byType = statsByType;
			}

			// bindable propを更新
			statistics = roadStatistics;

			if (DEBUG_MODE) {
				console.log('Road statistics:', roadStatistics);
			}

			// 避難所周辺道路状況の評価
			if (shelterFeatures.length > 0 && roadBlockageFeatures.length > 0) {
				try {
					const accessibilityResult = await evaluateShelterAccessibility(
						duckDBConn,
						shelterFeatures,
						roadBlockageFeatures,
						500 // 500mバッファー
					);

					// bindable propを更新
					shelterAccessibility = accessibilityResult.summary;

					// 避難所ごとの詳細データをMapに格納
					shelterAccessibilityDetails.clear();
					accessibilityResult.shelterAccessibility.forEach((shelter) => {
						shelterAccessibilityDetails.set(shelter.shelterId, {
							status: shelter.status,
							score: shelter.accessibilityScore
						});
					});

					// 避難所レイヤーを更新
					updateShelterLayer();
				} catch (error) {
					console.error('避難所周辺道路状況評価に失敗しました:', error);
				}
			}

			// 道路閉塞率レイヤーを更新
			roadBlockageLayer = new GeoJsonLayer({
				id: 'road-blockage-layer',
				data: {
					type: 'FeatureCollection',
					features: roadBlockageFeatures
				},
				filled: false,
				stroked: true,
				getLineWidth: 6,
				getLineColor: (d: any) => d.properties.blockageColor || [128, 128, 128, 180],
				pickable: true,
				opacity: 0.7,
				onClick: (info: any) => {
					if (info.object) {
						const props = info.object.properties;
						const coords = info.object.geometry.coordinates;
						const centerCoord = Array.isArray(coords[0])
							? (coords[Math.floor(coords.length / 2)] as [number, number])
							: (coords as [number, number]);

						selectedRoad = {
							name: props['N05_002'] || props['N05_003'] || '不明',
							type: props['道路種別'] || props['N05_001'] || '一般道路',
							blockageRate: props.blockagePercent || 0,
							length: props.roadLengthM || 0,
							roadWidth: props.roadWidth,
							coordinates: centerCoord
						};
						selectedShelter = null;
					}
				}
			});

			// 緊急輸送道路重ね合わせレイヤーを作成
			emergencyRoadOverlayLayer = new GeoJsonLayer({
				id: 'emergency-road-overlay-layer',
				data: {
					type: 'FeatureCollection',
					features: emergencyRoadOverlayResults
				},
				filled: false,
				stroked: true,
				getLineWidth: 10,
				getLineColor: (d: any) => d.properties.emergencyRoadColor || [128, 128, 128, 220],
				pickable: true,
				opacity: 1.0,
				visible: true,
				onClick: (info: any) => {
					if (info.object) {
						const props = info.object.properties;
						const coords = info.object.geometry.coordinates;
						const centerCoord = Array.isArray(coords[0])
							? (coords[Math.floor(coords.length / 2)] as [number, number])
							: (coords as [number, number]);

						selectedRoad = {
							name: props['N05_002'] || props['N05_003'] || '不明',
							type: props['道路種別'] || props['N05_001'] || '一般道路',
							emergencyType: props['第何次'] ? `第${props['第何次']}次緊急輸送道路` : undefined,
							blockageRate: props.blockagePercent || 0,
							length: props.roadLengthM || 0,
							roadWidth: props.roadWidth,
							coordinates: centerCoord
						};
						selectedShelter = null;
					}
				}
			});

			// レイヤーリストを更新（緊急輸送道路重ね合わせを最上位に）
			const otherLayers = deckLayers.filter(
				(layer) => layer.id !== 'road-blockage-layer' && layer.id !== 'emergency-road-overlay-layer'
			);
			deckLayers = [...otherLayers, roadBlockageLayer, emergencyRoadOverlayLayer];

			if (DEBUG_MODE) {
			}
		} catch (error) {
			console.error('Error calculating road blockage:', error);
		} finally {
			isCalculatingBlockage = false;
			isCalculating = false;
		}
	};

	// コンポーネントのクリーンアップ
	onDestroy(async () => {
		try {
			// イベントリスナーの削除
			if (mapInstance) {
				mapInstance.off('moveend', updateViewportBbox);
				mapInstance.off('zoomend', updateViewportBbox);
			}

			// キャッシュのクリーンアップ
			clipProcessingCache.clear();
			clippedResultsCache.clear();
			bufferCache.clear();
			roadBuildingCountCache.clear();
			if (DEBUG_MODE) {
			}
		} catch (error) {
			console.error('Error during cleanup:', error);
		}
	});
</script>

<div class="h-full w-full relative">
	{#if initialView?.map?.center || citiesData.length > 0}
		<MapLibre
			style={{
				version: 8,
				sources: {},
				layers: []
			}}
			center={mapCenter}
			zoom={mapZoom}
			class="h-full w-full"
			onload={handleMapLoad}
		>
		<PMTilesProtocol />
		<NavigationControl position="top-right" />
		<ScaleControl position="bottom-left" />

		<!-- Deck.glレイヤー（building_damage、emergency_road、RdCLバッファー） -->
		<DeckGLOverlay layers={deckLayers} />
	</MapLibre>
	{/if}

	<!-- 避難所情報ポップアップ -->
	{#if selectedShelter}
		<div class="absolute top-4 left-4 bg-white rounded-lg shadow-xl p-4 max-w-sm z-[1000]">
			<div class="flex items-start justify-between mb-3">
				<h3 class="text-base font-semibold text-gray-800 pr-2">{selectedShelter.name}</h3>
				<button
					onclick={() => (selectedShelter = null)}
					class="text-gray-400 hover:text-gray-600 transition-colors"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						></path>
					</svg>
				</button>
			</div>

			<div class="space-y-2 text-sm">
				<div class="flex items-start gap-2">
					<svg
						class="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
						></path>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
						></path>
					</svg>
					<span class="text-gray-600">{selectedShelter.address}</span>
				</div>

				<div class="flex items-center gap-2">
					<svg
						class="w-4 h-4 text-gray-500 flex-shrink-0"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
						></path>
					</svg>
					<span class="text-gray-600"
						>想定収容人数: <span class="font-medium">{selectedShelter.capacity}人</span></span
					>
				</div>

				{#if selectedShelter.accessibilityStatus}
					<div class="pt-2 border-t border-gray-200">
						<div class="flex items-center gap-2">
							<span class="text-xs font-medium text-gray-600">アクセス性:</span>
							{#if selectedShelter.accessibilityStatus === 'good'}
								<span
									class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full"
								>
									<span class="w-2 h-2 rounded-full bg-green-500"></span>
									通行良好
								</span>
							{:else if selectedShelter.accessibilityStatus === 'warning'}
								<span
									class="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full"
								>
									<span class="w-2 h-2 rounded-full bg-orange-500"></span>
									要注意
								</span>
							{:else}
								<span
									class="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full"
								>
									<span class="w-2 h-2 rounded-full bg-red-500"></span>
									通行困難
								</span>
							{/if}
						</div>
						{#if selectedShelter.accessibilityScore !== undefined}
							<div class="mt-2 text-xs text-gray-500">
								周辺道路の通行可能率: {selectedShelter.accessibilityScore.toFixed(1)}%
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- 道路情報ポップアップ -->
	{#if selectedRoad}
		<div class="absolute top-4 right-4 bg-white rounded-lg shadow-xl p-4 max-w-sm z-[1000]">
			<div class="flex items-start justify-between mb-3">
				<h3 class="text-base font-semibold text-gray-800 pr-2">{selectedRoad.name}</h3>
				<button
					onclick={() => (selectedRoad = null)}
					class="text-gray-400 hover:text-gray-600 transition-colors"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						></path>
					</svg>
				</button>
			</div>

			<div class="space-y-2 text-sm">
				<!-- Road Type -->
				<div class="flex items-center gap-2">
					<svg
						class="w-4 h-4 text-gray-500 flex-shrink-0"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 10V3L4 14h7v7l9-11h-7z"
						></path>
					</svg>
					<span class="text-gray-600">{selectedRoad.type}</span>
				</div>

				<!-- Emergency Type (if applicable) -->
				{#if selectedRoad.emergencyType}
					<div class="flex items-center gap-2">
						<svg
							class="w-4 h-4 text-orange-500 flex-shrink-0"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							></path>
						</svg>
						<span class="text-orange-700 font-medium">{selectedRoad.emergencyType}</span>
					</div>
				{/if}

				<!-- Road Length -->
				{#if selectedRoad.length > 0}
					<div class="flex items-center gap-2">
						<svg
							class="w-4 h-4 text-gray-500 flex-shrink-0"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
							></path>
						</svg>
						<span class="text-gray-600"
							>延長: <span class="font-medium">{selectedRoad.length.toFixed(0)}m</span></span
						>
					</div>
				{/if}

				<!-- Road Width -->
				{#if selectedRoad.roadWidth}
					<div class="flex items-center gap-2">
						<svg
							class="w-4 h-4 text-gray-500 flex-shrink-0"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
							></path>
						</svg>
						<span class="text-gray-600"
							>道路幅: <span class="font-medium">{selectedRoad.roadWidth}</span></span
						>
					</div>
				{/if}

				<!-- Blockage Rate -->
				<div class="pt-2 border-t border-gray-200">
					<div class="flex items-center gap-2 mb-2">
						<span class="text-xs font-medium text-gray-600">道路閉塞率:</span>
						{#if selectedRoad.blockageRate <= 10}
							<span
								class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full"
							>
								<span class="w-2 h-2 rounded-full bg-blue-500"></span>
								通行可能
							</span>
						{:else if selectedRoad.blockageRate <= 50}
							<span
								class="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full"
							>
								<span class="w-2 h-2 rounded-full bg-orange-500"></span>
								要注意
							</span>
						{:else}
							<span
								class="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full"
							>
								<span class="w-2 h-2 rounded-full bg-red-500"></span>
								通行困難
							</span>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<div class="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
							<div
								class="h-2 rounded-full transition-all duration-300"
								class:bg-blue-500={selectedRoad.blockageRate <= 10}
								class:bg-orange-500={selectedRoad.blockageRate > 10 &&
									selectedRoad.blockageRate <= 50}
								class:bg-red-500={selectedRoad.blockageRate > 50}
								style="width: {selectedRoad.blockageRate}%"
							></div>
						</div>
						<span class="text-xs font-semibold text-gray-700 min-w-[3rem] text-right">
							{selectedRoad.blockageRate.toFixed(1)}%
						</span>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- 凡例（地図内表示） -->
	<div class="absolute bottom-10 left-4 z-10">
		<RoadMapLegends
			position="map-overlay"
			showEmergencyRoads={true}
			showBlockageStatus={roadBlockageResults.length > 0}
		/>
	</div>
</div>
