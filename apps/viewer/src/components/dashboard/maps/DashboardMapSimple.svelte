<script lang="ts">
	import { MapLibre, NavigationControl, ScaleControl } from 'svelte-maplibre-gl';
	import { DeckGLOverlay } from '@svelte-maplibre-gl/deckgl';
	import { PMTilesProtocol } from '@svelte-maplibre-gl/pmtiles';
	import type { Map } from 'maplibre-gl';
	import type { Layer } from '@deck.gl/core';
	import { GeoJsonLayer } from '@deck.gl/layers';
	import { MVTLayer } from '@deck.gl/geo-layers';
	import { onMount, onDestroy, untrack } from 'svelte';
	import { loadJSON } from '$lib/utils/dataLoader';
	import { makeDeckLayers, type DeckLayerConfig } from '$lib/utils/DeckLayerFactory';
	import type { Feature } from 'geojson';
	import { initializeDuckDB } from '$lib/utils/duckdb';
	import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
	import type { PickingInfo } from '@deck.gl/core';
	import {
		aggregateBuildingDamageWithArrow,
		type AggregationResult
	} from '$lib/utils/buildingAggregationDuckDB';
	import {
		generateCacheKey,
		getBatchCachedTileFeatures,
		setBatchCachedTileFeatures
	} from '$lib/utils/geoJSONCache';
	import { dashboardDataStore } from '$lib/stores/dashboardDataStore';
	import { DEFAULT_CITY_CODE } from '$lib/constants/cityConstants';
	import type { ViewerInfoItem } from '$lib/types/viewerInfo';
	import { adaptConfigForSimulation } from '$lib/utils/simulationConfigAdapter';
	import { makeMeshPatches, type MeshPatchFeatureCollection } from '$lib/japanmeshMaker';

	interface Config {
		layers: DeckLayerConfig[];
	}

	// Props
	let {
		onAggregationStart,
		onAggregationComplete,
		cityCode = null,
		simulation = null,
		isLoading = $bindable(false)
	}: {
		onAggregationStart?: () => void;
		onAggregationComplete?: (results: AggregationResult[]) => void;
		cityCode?: string | null;
		simulation?: ViewerInfoItem | null;
		isLoading?: boolean;
	} = $props();

	let mapInstance: Map | undefined;
	let config: Config | undefined;
	let deckLayers = $state<Layer[]>([]);
	let buildingDamageConfig = $state<DeckLayerConfig | undefined>(undefined);
	let shizuokaBranchConfig = $state<DeckLayerConfig | undefined>(undefined);
	let meshConfig = $state<DeckLayerConfig | undefined>(undefined);

	// レイヤー表示タイプ（小学校区 or メッシュ）
	type LayerDisplayType = 'district' | 'mesh';
	let displayLayerType = $state<LayerDisplayType>('district');

	// DuckDB コネクションの保持
	let duckDBConn: AsyncDuckDBConnection | undefined;

	// MapLibreの表示範囲（bbox）
	let viewportBbox: [number, number, number, number] | undefined;

	// 動的に生成されたメッシュデータ
	let dynamicMeshData = $state<MeshPatchFeatureCollection | null>(null);

	// クリップ処理のキャッシュ
	const clipProcessingCache = new Map<string, boolean>();
	const clippedResultsCache = new Map<string, Map<number, Feature[]>>();

	// 選択された小学校区のフィーチャー（最新2つまで）
	let selectedDistricts = $state<Feature[]>([]);

	// 選択されたメッシュのフィーチャー（最新2つまで）
	let selectedMeshes = $state<Feature[]>([]);

	// 集計結果を保存
	let aggregationResults = $state<AggregationResult[]>([]);

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
		return initialView?.map?.zoom || 11;
	});

	// 地図の回転角度
	const mapBearing = $derived.by(() => {
		return initialView?.map?.bearing || 0;
	});

	// 地図の傾き
	const mapPitch = $derived.by(() => {
		return initialView?.map?.pitch || 0;
	});

	// 背景地図の種類
	type BaseMapType = 'aerial' | 'std' | 'pale';
	let selectedBaseMap = $state<BaseMapType>('aerial');

	// UI更新のためのフィーチャー数の閾値
	// const REFRESH_FEATURE_NUMBER = 1000;

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

	// MapLibreのビューポートからbboxを取得し、メッシュを更新
	const updateViewportBbox = () => {
		if (!mapInstance) return;

		const bounds = mapInstance.getBounds();
		viewportBbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];

		// ビューポートに合わせて3次メッシュを生成
		if (viewportBbox) {
			dynamicMeshData = makeMeshPatches('3', viewportBbox);
			console.log('[updateViewportBbox] Generated mesh patches:', dynamicMeshData.features.length);
		}
	};

	// 小学校区がクリックされたときの処理
	const onDistrictClick = (info: PickingInfo<any>) => {
		const { object } = info;
		if (!object) return;

		console.log('[onDistrictClick] Clicked district:', object.properties?.NAME);

		// 最新2つまで保持
		selectedDistricts = [
			object,
			...(selectedDistricts.length > 0 ? [selectedDistricts[0]] : [])
		].slice(0, 2);

		console.log(
			'[onDistrictClick] Updated selectedDistricts:',
			selectedDistricts.map((d) => d.properties?.NAME)
		);
	};

	// メッシュがクリックされたときの処理
	const onMeshClick = (info: PickingInfo<any>) => {
		const { object } = info;
		if (!object) return;

		console.log('[onMeshClick] Clicked mesh:', object.properties);
		console.log('[onMeshClick] Mesh geometry:', object.geometry);
		console.log('[onMeshClick] Full mesh object:', object);

		// 最新2つまで保持
		selectedMeshes = [object, ...(selectedMeshes.length > 0 ? [selectedMeshes[0]] : [])].slice(
			0,
			2
		);

		console.log(
			'[onMeshClick] Updated selectedMeshes:',
			selectedMeshes.map((m) => m.properties)
		);

		// 建物レイヤーの状態確認
		const buildingLayer = deckLayers.find((layer) => layer.id === 'building_damage');
		console.log('[onMeshClick] Building damage layer exists:', !!buildingLayer);
		if (buildingLayer) {
			const tileCache = (buildingLayer as any)?.state?.tileset?.tiles;
			console.log('[onMeshClick] Tile cache exists:', !!tileCache);
			if (tileCache) {
				const tiles = Object.values(tileCache);
				console.log('[onMeshClick] Number of tiles:', tiles.length);
			}
		}
	};

	// selectedDistrictsが変更されたらレイヤーを更新（リアクティブ）
	$effect(() => {
		// selectedDistrictsを最初に読み取ることでリアクティブトラッキングを確立
		const names = selectedDistricts.map((d) => d.properties?.NAME);
		console.log(
			'[$effect] Triggered with selectedDistricts:',
			names,
			'shizuokaBranchConfig:',
			!!shizuokaBranchConfig
		);

		// 初期化前は何もしない
		if (!shizuokaBranchConfig) {
			console.log('[$effect] shizuokaBranchConfig not initialized, skipping layer update');
			return;
		}

		// 小学校区レイヤーを再作成
		const districtLayer = new GeoJsonLayer({
			id: 'shizuoka-branch',
			data: shizuokaBranchConfig.source,
			visible: true,
			pickable: true,
			autoHighlight: true,
			onClick: onDistrictClick,
			getFillColor: (d: any) => {
				const districtName = d.properties?.NAME;
				// 選択されている場合は明るい青色、それ以外は元の色
				if (names.includes(districtName)) {
					return [100, 200, 255, 150]; // 明るい青色（選択状態）
				}
				return shizuokaBranchConfig.getFillColor || [200, 200, 200, 100];
			},
			getLineColor: shizuokaBranchConfig.getLineColor || [100, 100, 100, 255],
			getLineWidth: shizuokaBranchConfig.getLineWidth || 1,
			lineWidthMinPixels: shizuokaBranchConfig.lineWidthMinPixels || 1,
			lineWidthUnits: 'pixels',
			// updateTriggersを使用して選択状態が変わるたびに再レンダリング
			updateTriggers: {
				getFillColor: names
			}
		});

		console.log('[$effect] Created new district layer');

		// untrackでdeckLayersの更新をリアクティブシステムから除外
		untrack(() => {
			const currentLayers = [...deckLayers];
			console.log(
				'[$effect] Current layer IDs:',
				currentLayers.map((l) => l.id)
			);

			const districtLayerIndex = currentLayers.findIndex((layer) => layer.id === 'shizuoka-branch');

			console.log(
				'[$effect] districtLayerIndex:',
				districtLayerIndex,
				'total layers:',
				currentLayers.length
			);

			if (districtLayerIndex !== -1) {
				// 既存の小学校区レイヤーのみを置き換え
				currentLayers[districtLayerIndex] = districtLayer;
				deckLayers = currentLayers;
				console.log('[$effect] Updated deckLayers with new district layer');
			} else {
				console.warn('[$effect] shizuoka-branch layer not found in deckLayers');
			}
		});
	});

	// selectedMeshesまたはdynamicMeshDataが変更されたらレイヤーを更新（リアクティブ）
	$effect(() => {
		// selectedMeshesとdynamicMeshDataを最初に読み取ることでリアクティブトラッキングを確立
		const meshIds = selectedMeshes.map((m) => JSON.stringify(m.properties));
		const meshData = dynamicMeshData;
		console.log(
			'[$effect mesh] Triggered with selectedMeshes:',
			meshIds.length,
			'meshData features:',
			meshData?.features.length || 0,
			'meshConfig:',
			!!meshConfig,
			'displayLayerType:',
			displayLayerType
		);

		// 初期化前は何もしない、またはdisplayLayerTypeがmeshでない場合もスキップ
		if (!meshConfig || displayLayerType !== 'mesh' || !meshData) {
			console.log(
				'[$effect mesh] meshConfig not initialized or not in mesh mode or no mesh data, skipping layer update'
			);
			return;
		}

		// メッシュレイヤーを再作成（動的データを使用）
		const meshLayer = new GeoJsonLayer({
			id: 'mesh',
			data: meshData,
			visible: true,
			pickable: true,
			autoHighlight: true,
			onClick: (info) => {
				console.log('[onMeshClick debug] Click event triggered:', info);
				onMeshClick(info);
			},
			getFillColor: (d: any) => {
				const meshCode = d.properties?.code;
				// 選択されているメッシュのコードと比較
				const isSelected = selectedMeshes.some((m) => m.properties?.code === meshCode);
				if (isSelected) {
					return [100, 200, 255, 150]; // 明るい青色（選択状態）
				}
				return meshConfig.getFillColor || [220, 160, 80, 100];
			},
			getLineColor: meshConfig.getLineColor || [0, 0, 240, 200],
			getLineWidth: meshConfig.getLineWidth || 1,
			lineWidthMinPixels: meshConfig.lineWidthMinPixels || 2,
			lineWidthUnits: 'pixels',
			// updateTriggersを使用して選択状態が変わるたびに再レンダリング
			updateTriggers: {
				getFillColor: meshIds,
				data: meshData
			}
		});

		console.log('[$effect mesh] Created new mesh layer with dynamic data');

		// untrackでdeckLayersの更新をリアクティブシステムから除外
		untrack(() => {
			const currentLayers = [...deckLayers];
			console.log(
				'[$effect mesh] Current layer IDs:',
				currentLayers.map((l) => l.id)
			);

			const meshLayerIndex = currentLayers.findIndex((layer) => layer.id === 'mesh');

			console.log(
				'[$effect mesh] meshLayerIndex:',
				meshLayerIndex,
				'total layers:',
				currentLayers.length
			);

			if (meshLayerIndex !== -1) {
				// 既存のメッシュレイヤーのみを置き換え
				currentLayers[meshLayerIndex] = meshLayer;
				deckLayers = currentLayers;
				console.log('[$effect mesh] Updated deckLayers with new mesh layer');
			} else {
				console.warn('[$effect mesh] mesh layer not found in deckLayers');
			}
		});
	});

	// selectedDistrictsが変更されたら集計を実行
	$effect(() => {
		const districtCount = selectedDistricts.length;
		console.log('[$effect aggregation] selectedDistricts changed:', districtCount, 'districts');

		if (districtCount > 0 && duckDBConn && displayLayerType === 'district') {
			console.log('[$effect aggregation] Triggering aggregation...');
			// 非同期処理を実行（awaitはできないため、Promiseチェーンで処理）
			performAggregation()
				.then((success) => {
					console.log('[$effect aggregation] Aggregation completed:', success);
				})
				.catch((error) => {
					console.error('[$effect aggregation] Aggregation failed:', error);
				});
		} else {
			console.log('[$effect aggregation] Skipping aggregation (no districts or DuckDB not ready)');
		}
	});

	// selectedMeshesが変更されたら集計を実行
	$effect(() => {
		const meshCount = selectedMeshes.length;
		console.log('[$effect aggregation mesh] selectedMeshes changed:', meshCount, 'meshes');

		if (meshCount > 0 && duckDBConn && displayLayerType === 'mesh') {
			console.log('[$effect aggregation mesh] Triggering aggregation...');
			// 非同期処理を実行（awaitはできないため、Promiseチェーンで処理）
			performAggregation()
				.then((success) => {
					console.log('[$effect aggregation mesh] Aggregation completed:', success);
				})
				.catch((error) => {
					console.error('[$effect aggregation mesh] Aggregation failed:', error);
				});
		} else {
			console.log(
				'[$effect aggregation mesh] Skipping aggregation (no meshes or DuckDB not ready)'
			);
		}
	});

	// displayLayerTypeが変更されたときにレイヤーを切り替え
	$effect(() => {
		const currentDisplayType = displayLayerType;
		console.log('[$effect layer switch] displayLayerType changed:', currentDisplayType);

		// 初期化前は何もしない
		if (!buildingDamageConfig || (!shizuokaBranchConfig && !meshConfig)) {
			console.log('[$effect layer switch] Config not initialized, skipping');
			return;
		}

		// untrackでdeckLayersの更新をリアクティブシステムから除外
		untrack(() => {
			if (currentDisplayType === 'district') {
				// 小学校区を表示
				const layerConfigs = [buildingDamageConfig, shizuokaBranchConfig].filter(
					Boolean
				) as DeckLayerConfig[];
				deckLayers = makeDeckLayers(layerConfigs, {}, undefined, onDistrictClick, undefined, cityCode);
				console.log('[$effect layer switch] Switched to district layers');

				// メッシュの選択をクリア
				selectedMeshes = [];
			} else {
				// メッシュを表示（GeoJsonLayerを使用）
				// building_damageレイヤーを作成
				const buildingLayers = makeDeckLayers([buildingDamageConfig], {}, undefined, undefined, undefined, cityCode);

				// 動的メッシュデータがあればメッシュレイヤーを作成
				if (dynamicMeshData) {
					const meshLayer = new GeoJsonLayer({
						id: 'mesh',
						data: dynamicMeshData,
						visible: true,
						pickable: true,
						autoHighlight: true,
						onClick: (info) => {
							console.log('[onClick mesh] Mesh clicked:', info);
							onMeshClick(info);
						},
						getFillColor: meshConfig.getFillColor || [220, 160, 80, 100],
						getLineColor: meshConfig.getLineColor || [0, 0, 240, 200],
						getLineWidth: meshConfig.getLineWidth || 1,
						lineWidthMinPixels: meshConfig.lineWidthMinPixels || 2
					});

					// building_damageレイヤーの後にメッシュレイヤーを配置（上に表示）
					deckLayers = [...buildingLayers, meshLayer];
					console.log('[$effect layer switch] Switched to mesh layers with dynamic data');
				} else {
					// メッシュデータがまだ生成されていない場合は建物レイヤーのみ
					deckLayers = buildingLayers;
					console.log('[$effect layer switch] No mesh data yet, showing building layer only');
				}

				// 小学校区の選択をクリア
				selectedDistricts = [];
			}
		});
	});

	/**
	 * 建物タイルのロード待機
	 * タイルが安定してロードされるまで待機します（最大3秒）
	 */
	const waitForBuildingTiles = async (maxWaitMs: number = 3000): Promise<number> => {
		const startTime = Date.now();
		let lastTileCount = 0;
		let stableChecks = 0;

		while (Date.now() - startTime < maxWaitMs) {
			// untrackを使って現在のdeckLayersから建物被害レイヤーを取得
			const layer = untrack(() => deckLayers.find((l) => l.id === 'building_damage')) as any;

			const tileCache = layer?.state?.tileset?.tiles;
			if (!tileCache) {
				await new Promise<void>((resolve) => setTimeout(() => resolve(), 100));
				continue;
			}

			const tiles = Object.values(tileCache);
			// 重要: dataInWGS84にアクセスすると遅延的にMVT→GeoJSON変換が発生し非常に遅い
			// 代わりにcontentの存在とisLoadedフラグで判定（軽量）
			const loadedTiles = tiles.filter((tile: any) => {
				return tile.content && tile.isLoaded !== false;
			});
			const currentCount = loadedTiles.length;

			// タイル数が安定している場合（3回連続で同じ）
			if (currentCount === lastTileCount && currentCount > 0) {
				stableChecks++;
				if (stableChecks >= 3) {
					return currentCount;
				}
			} else {
				stableChecks = 0;
				lastTileCount = currentCount;
			}

			await new Promise<void>((resolve) => setTimeout(() => resolve(), 100));
		}

		return lastTileCount;
	};

	// 集計処理を実行する関数
	export const performAggregation = async (): Promise<boolean> => {
		const perfStart = performance.now();
		console.log('[Performance] 集計処理開始');

		// 集計開始を通知
		if (onAggregationStart) {
			onAggregationStart();
		}

		// 次のフレームで実際の処理を開始(UIが更新されるのを待つ)
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		console.log(
			`[Performance] requestAnimationFrame完了: ${(performance.now() - perfStart).toFixed(1)}ms`
		);

		// 現在の表示タイプに応じて選択されたフィーチャーを取得
		const selectedFeatures = displayLayerType === 'district' ? selectedDistricts : selectedMeshes;
		const featureTypeName = displayLayerType === 'district' ? '小学校区' : 'メッシュ';

		if (!duckDBConn || selectedFeatures.length === 0) {
			console.warn(`DuckDB未初期化または${featureTypeName}未選択`);
			return false;
		}

		// タイルデータ収集の開始時刻を記録（共通データストアから取得する場合も含めて）
		const tileProcessStart = performance.now();

		// まず共通データストアから建物データを取得を試みる
		const effectiveCityCode = cityCode || DEFAULT_CITY_CODE;
		let allBuildingFeatures = dashboardDataStore.getBuildingData(effectiveCityCode);

		if (allBuildingFeatures) {
			console.log(
				'[performAggregation] 共通データストアから建物データを取得:',
				allBuildingFeatures.length
			);
		} else {
			console.log('[performAggregation] 共通データストアにデータなし。MVTレイヤーから取得します');
		}

		// MVTレイヤーからデータを取得する必要がある場合のみ実行
		if (!allBuildingFeatures) {
			// 建物被害レイヤーからすべてのフィーチャーを取得
			// untrackでリアクティブシステムから除外
			const buildingDamageLayer = untrack(() =>
				deckLayers.find((layer) => layer.id === 'building_damage')
			) as any;
			if (!buildingDamageLayer) {
				console.error(
					'建物被害レイヤーが見つかりません。deckLayers:',
					untrack(() => deckLayers.map((l) => l.id))
				);
				console.error(
					'利用可能なレイヤー:',
					untrack(() => deckLayers)
				);
				return false;
			}

			console.log('[performAggregation] Building damage layer found:', buildingDamageLayer);
			console.log('[performAggregation] Layer state:', buildingDamageLayer?.state);

			// タイルが存在するか確認
			const buildingTileCache = buildingDamageLayer?.state?.tileset?.tiles;
			if (!buildingTileCache) {
				console.error('[performAggregation] No tile cache found!');
				console.error('[performAggregation] Layer state details:', {
					state: buildingDamageLayer?.state,
					tileset: buildingDamageLayer?.state?.tileset,
					tiles: buildingDamageLayer?.state?.tileset?.tiles
				});
				return false;
			}

			// タイルのロードを待つ（タイルが安定するまで待機）
			const tileWaitStart = performance.now();
			const loadedTileCount = await waitForBuildingTiles();
			console.log(
				`[Performance] タイルロード待機完了: ${(performance.now() - tileWaitStart).toFixed(1)}ms (${loadedTileCount}タイル)`
			);

			// タイルとそのキーを取得
			const tileEntries = Object.entries(buildingTileCache);
			const tiles = tileEntries.map(([key, tile]) => tile);
			const tileKeys = tileEntries.map(([key]) => key);

			// 選択されたフィーチャー（小学校区またはメッシュ）のバウンディングボックスを計算
			const featureBounds = selectedFeatures.reduce(
				(bounds, feature) => {
					let coords: number[][] = [];
					if (feature.geometry.type === 'Polygon') {
						coords = feature.geometry.coordinates[0];
					} else if (feature.geometry.type === 'MultiPolygon') {
						// すべてのポリゴンのすべてのリングを結合
						coords = feature.geometry.coordinates.flatMap((polygon: number[][][]) =>
							polygon.flatMap((ring: number[][]) => ring)
						);
					}
					coords.forEach((coord: number[]) => {
						bounds.minLng = Math.min(bounds.minLng, coord[0]);
						bounds.maxLng = Math.max(bounds.maxLng, coord[0]);
						bounds.minLat = Math.min(bounds.minLat, coord[1]);
						bounds.maxLat = Math.max(bounds.maxLat, coord[1]);
					});
					return bounds;
				},
				{ minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity }
			);

			console.log(`[${featureTypeName}Bounds] 計算完了:`, {
				lng: [featureBounds.minLng, featureBounds.maxLng],
				lat: [featureBounds.minLat, featureBounds.maxLat],
				数: selectedFeatures.length,
				名前: selectedFeatures
					.map((f) => f.properties?.NAME || JSON.stringify(f.properties))
					.join(', ')
			});

			// タイルと小学校区の交差判定（簡易的なバウンディングボックスチェック）
			console.log('[タイルフィルタ] 全タイル数:', tiles.length);
			if (tiles.length > 0) {
				const firstTile = tiles[0] as any;
				console.log('[タイルフィルタ] 最初のタイル情報:', {
					index: firstTile.index,
					bbox: firstTile.bbox,
					dataCount: firstTile.dataInWGS84?.length || 0
				});

				// タイルインデックスの詳細を確認
				console.log('[タイル詳細] 各タイルのインデックスと座標:');
				tiles.slice(0, 3).forEach((tile: any, i: number) => {
					const tileKey = tileKeys[i];
					console.log(`[タイル詳細] タイル${i}:`, {
						key: tileKey,
						z: tile.z,
						x: tile.x,
						y: tile.y,
						bbox: tile.bbox,
						hasData: !!tile.dataInWGS84,
						dataLength: tile.dataInWGS84?.length || 0
					});
					// キーの形式を確認
					if (tileKey) {
						console.log(`[タイル詳細] タイル${i}のキー形式:`, typeof tileKey, 'キー内容:', tileKey);
					}
				});
			}

			// TEMPORARY FIX: フィルタを無効化して全てのタイルを使用
			// const relevantTiles = tiles.filter((tile: any) => {
			// 	const tileBbox = tile.bbox;
			// 	if (!tileBbox) {
			// 		return true; // bboxがない場合は含める
			// 	}

			// 	// バウンディングボックスが交差するかチェック
			// 	const intersects = !(
			// 		tileBbox.west > districtBounds.maxLng ||
			// 		tileBbox.east < districtBounds.minLng ||
			// 		tileBbox.south > districtBounds.maxLat ||
			// 		tileBbox.north < districtBounds.minLat
			// 	);

			// 	return intersects;
			// });
			const relevantTiles = tiles; // 全タイルを使用

			console.log('[タイルフィルタ] フィルタ後のタイル数:', relevantTiles.length);
			if (relevantTiles.length > 0) {
				const firstRelevant = relevantTiles[0] as any;
				console.log('[タイルフィルタ] フィルタ後の最初のタイル:', {
					index: firstRelevant.index,
					bbox: firstRelevant.bbox
				});
			}

			// 最適化: IndexedDBキャッシュとdataInWGS84アクセスを組み合わせて高速化
			allBuildingFeatures = [];

			// ステップ1: IndexedDBキャッシュから取得を試みる
			const cacheCheckStart = performance.now();
			// 都市コードを含めたキャッシュキーを生成（都市ごとに別のキャッシュを使用）
			const cacheKeys = relevantTiles.map((tile: any, index: number) => {
				// タイルキーから z/x/y を抽出する
				const tileKey = tileKeys[tiles.indexOf(tile)];
				let z: number | undefined, x: number | undefined, y: number | undefined;

				// タイルのindexプロパティから座標を抽出（形式: {x, y, z}）
				if (tile.index && typeof tile.index === 'object') {
					z = tile.index.z;
					x = tile.index.x;
					y = tile.index.y;
				}

				// それでも取得できない場合は、キー文字列から推測
				if ((z === undefined || x === undefined || y === undefined) && tileKey) {
					console.log(`[キャッシュキー生成] タイルキー解析: ${tileKey}`);
					// キーが "z-x-y" 形式の場合
					const match = tileKey.toString().match(/(\d+)-(\d+)-(\d+)/);
					if (match) {
						z = parseInt(match[1]);
						x = parseInt(match[2]);
						y = parseInt(match[3]);
					}
				}

				// デフォルト値を使用
				if (z === undefined || x === undefined || y === undefined) {
					console.warn(
						`[キャッシュキー生成] タイル座標が取得できません。デフォルト値を使用: tile=${index}, key=${tileKey}`
					);
					z = 14; // デフォルトズームレベル
					x = index % 100; // 仮のx座標
					y = Math.floor(index / 100); // 仮のy座標
				}

				return generateCacheKey(`building_damage_${cityCode}`, z, x, y);
			});
			const cachedTiles = await getBatchCachedTileFeatures(cacheKeys);
			console.log(
				`[Performance] キャッシュチェック完了: ${(performance.now() - cacheCheckStart).toFixed(1)}ms (${cachedTiles.size}/${relevantTiles.length}タイルがヒット)`
			);

			// ステップ2: キャッシュミスのタイルのみMVT→GeoJSON変換を実行
			const uncachedTiles: Array<{
				tile: any;
				index: number;
				cacheKey: string;
			}> = [];

			for (let i = 0; i < relevantTiles.length; i++) {
				const tile = relevantTiles[i] as any;
				const cacheKey = cacheKeys[i];
				const cached = cachedTiles.get(cacheKey);

				if (cached) {
					// キャッシュヒット: 変換済みデータを直接使用
					console.log(`[Cache] タイル ${i} キャッシュヒット:`, cached.length, '件');
					if (cached.length > 0) {
						const sampleGeom = cached[0].geometry;
						console.log(`[Cache] サンプルgeometry:`, sampleGeom);
						console.log(`[Cache] coordinates存在:`, sampleGeom && 'coordinates' in sampleGeom);
						if (sampleGeom && 'coordinates' in sampleGeom) {
							const coords = (sampleGeom as any).coordinates;
							console.log(
								`[Cache] coordinates値タイプ:`,
								Array.isArray(coords) ? 'Array' : typeof coords
							);
							if (Array.isArray(coords) && coords.length > 0) {
								console.log(`[Cache] coordinates[0]サンプル:`, coords[0]);
							}
						}
					}
					allBuildingFeatures.push(...cached);
				} else {
					// キャッシュミス: 後で変換が必要
					console.log(`[Cache] タイル ${i} キャッシュミス - MVT変換が必要`);
					uncachedTiles.push({ tile, index: i, cacheKey });
				}
			}

			// ステップ3: キャッシュミスのタイルを変換してキャッシュに保存
			// 注意: dataInWGS84へのアクセスでMVT→GeoJSON変換が発生し、非常に重い処理となる
			// 特に最初のタイルは初期化オーバーヘッドで100秒以上かかる場合がある
			if (uncachedTiles.length > 0) {
				console.log(`[Performance] ${uncachedTiles.length}タイルの変換を開始...`);
				const conversionStart = performance.now();
				const tilesToCache: Array<{
					cacheKey: string;
					features: Feature[];
					metadata: { tileZ: number; tileX: number; tileY: number };
				}> = [];

				for (let i = 0; i < uncachedTiles.length; i++) {
					const { tile, cacheKey } = uncachedTiles[i];
					// const tileConversionStart = performance.now();

					console.log(`[MVT] タイル ${i} 変換前 - tile.dataInWGS84存在:`, !!tile.dataInWGS84);
					const buildingFeatures = tile.dataInWGS84;
					console.log(
						`[MVT] タイル ${i} 変換後 - features取得:`,
						buildingFeatures?.length || 0,
						'件'
					);

					if (buildingFeatures && buildingFeatures.length > 0) {
						const sampleGeom = buildingFeatures[0].geometry;
						console.log(`[MVT] サンプルgeometry:`, sampleGeom);
						console.log(`[MVT] coordinates存在:`, sampleGeom && 'coordinates' in sampleGeom);
						if (sampleGeom && 'coordinates' in sampleGeom) {
							const coords = (sampleGeom as any).coordinates;
							console.log(
								`[MVT] coordinates値タイプ:`,
								Array.isArray(coords) ? 'Array' : typeof coords
							);
							if (Array.isArray(coords) && coords.length > 0) {
								console.log(`[MVT] coordinates[0]サンプル:`, coords[0]);
							}
						}

						// CRITICAL: geometry.coordinatesは遅延評価されるgetterプロパティのため、
						// 明示的にアクセスして新しいオブジェクトを作成し、coordinatesを実体化する
						const materializedFeatures = buildingFeatures.map((f: any) => {
							const geom = f.geometry;
							if (!geom) return f;

							// coordinatesを明示的にアクセスして実体化
							const coords = geom.coordinates;
							return {
								type: f.type,
								properties: f.properties,
								geometry: {
									type: geom.type,
									coordinates: coords // getterではなく実際の値として保存
								}
							};
						});

						console.log(`[MVT] Materialized ${materializedFeatures.length} features`);
						if (materializedFeatures.length > 0) {
							const testGeom = materializedFeatures[0].geometry;
							console.log(
								`[MVT] Materialized sample - coordinates存在:`,
								testGeom && 'coordinates' in testGeom
							);
							console.log(
								`[MVT] Materialized sample - coordinates値:`,
								testGeom?.coordinates ? 'has value' : 'null/undefined'
							);

							// 建物データの座標範囲を計算
							const coords = testGeom?.coordinates;
							if (coords && Array.isArray(coords) && coords[0] && coords[0][0]) {
								const [lon, lat] = coords[0][0];
								console.log(`[MVT] 最初の建物の座標 [lon, lat]:`, [lon, lat]);
							}
						}

						allBuildingFeatures.push(...materializedFeatures);

						// キャッシュ保存用にデータを記録（実体化されたfeaturesを使用）
						tilesToCache.push({
							cacheKey,
							features: materializedFeatures,
							metadata: {
								tileZ: tile.z,
								tileX: tile.x,
								tileY: tile.y
							}
						});
					}

					// 長時間処理の場合、定期的にUIに制御を返す
					if (i % 3 === 0 && i > 0) {
						await new Promise<void>((resolve) => setTimeout(() => resolve(), 0));
					}
				}

				console.log(
					`[Performance] タイル変換完了: ${(performance.now() - conversionStart).toFixed(1)}ms`
				);
				console.log(
					`[performAggregation] 収集した建物フィーチャー数: ${allBuildingFeatures.length}`
				);

				// 建物フィーチャーのサンプルをログ出力
				if (allBuildingFeatures.length > 0) {
					console.log('[performAggregation] 建物フィーチャーのサンプル:', allBuildingFeatures[0]);

					// 建物データの座標範囲を詳細に確認
					let minLng = Infinity,
						maxLng = -Infinity;
					let minLat = Infinity,
						maxLat = -Infinity;

					allBuildingFeatures.forEach((feature: any) => {
						if (feature.geometry && feature.geometry.coordinates) {
							const coords = feature.geometry.coordinates;
							// Polygonの場合
							if (feature.geometry.type === 'Polygon' && coords[0]) {
								coords[0].forEach((coord: number[]) => {
									minLng = Math.min(minLng, coord[0]);
									maxLng = Math.max(maxLng, coord[0]);
									minLat = Math.min(minLat, coord[1]);
									maxLat = Math.max(maxLat, coord[1]);
								});
							}
						}
					});

					console.log('[建物データ座標範囲確認] 経度:', [minLng, maxLng]);
					console.log('[建物データ座標範囲確認] 緯度:', [minLat, maxLat]);

					// 小学校区データの座標範囲も確認
					if (selectedFeatures.length > 0 && displayLayerType === 'school_district') {
						let distMinLng = Infinity,
							distMaxLng = -Infinity;
						let distMinLat = Infinity,
							distMaxLat = -Infinity;

						selectedFeatures.forEach((feature: any) => {
							if (feature.geometry && feature.geometry.coordinates) {
								const coords = feature.geometry.coordinates;
								if (feature.geometry.type === 'Polygon' && coords[0]) {
									coords[0].forEach((coord: number[]) => {
										distMinLng = Math.min(distMinLng, coord[0]);
										distMaxLng = Math.max(distMaxLng, coord[0]);
										distMinLat = Math.min(distMinLat, coord[1]);
										distMaxLat = Math.max(distMaxLat, coord[1]);
									});
								} else if (feature.geometry.type === 'MultiPolygon') {
									coords.forEach((polygon: any) => {
										if (polygon[0]) {
											polygon[0].forEach((coord: number[]) => {
												distMinLng = Math.min(distMinLng, coord[0]);
												distMaxLng = Math.max(distMaxLng, coord[0]);
												distMinLat = Math.min(distMinLat, coord[1]);
												distMaxLat = Math.max(distMaxLat, coord[1]);
											});
										}
									});
								}
							}
						});

						console.log('[小学校区座標範囲確認] 経度:', [distMinLng, distMaxLng]);
						console.log('[小学校区座標範囲確認] 緯度:', [distMinLat, distMaxLat]);

						// 座標のズレを計算
						const lngOffset = minLng - distMinLng;
						const latOffset = minLat - distMinLat;
						console.log('[座標ズレ] 経度オフセット:', lngOffset);
						console.log('[座標ズレ] 緯度オフセット:', latOffset);
					}
				}

				// バックグラウンドでキャッシュに保存（処理をブロックしない）
				if (tilesToCache.length > 0) {
					setBatchCachedTileFeatures(tilesToCache)
						.then(() => {
							console.log(`[Cache] ${tilesToCache.length}タイルをキャッシュに保存しました`);
						})
						.catch((err: any) => {
							console.error('[Cache] キャッシュ保存エラー:', err);
						});
				}

				// 共通データストアに建物データを保存
				dashboardDataStore.setBuildingData(effectiveCityCode, allBuildingFeatures);
			}
		}

		console.log(
			`[Performance] タイルデータ収集完了: ${(performance.now() - tileProcessStart).toFixed(1)}ms (${allBuildingFeatures.length}建物)`
		);

		// DuckDBで高速集計（Arrow Table形式で2-3倍高速化）
		const duckdbStart = performance.now();

		// 2回目以降の実行時に前回のテーブルが残っている可能性があるためクリーンアップ
		try {
			await duckDBConn.query(`DROP TABLE IF EXISTS districts_temp`);
			await duckDBConn.query(`DROP TABLE IF EXISTS buildings_temp`);
			await duckDBConn.query(`DROP TABLE IF EXISTS districts_geom`);
			await duckDBConn.query(`DROP TABLE IF EXISTS buildings_geom`);
			await duckDBConn.query(`DROP TABLE IF EXISTS aggregation_results`);
		} catch (cleanupError) {
			console.warn('[Performance] テーブルクリーンアップ時の警告:', cleanupError);
		}

		// Svelte 5の$state proxyとMVT lazy loadingを解除して完全なプレーンオブジェクトに変換
		// フィーチャーデータの実体化: geometryとpropertiesを明示的にコピー
		const plainFeatures = selectedFeatures.map((f) => {
			const geom = f.geometry;
			if (!geom) return f;

			// coordinates を明示的にアクセスして実体化
			const coords = geom.type === 'GeometryCollection' ? undefined : (geom as any).coordinates;
			return {
				type: f.type,
				properties: f.properties ? { ...f.properties } : {},
				geometry: coords
					? {
							type: geom.type,
							coordinates: coords
						}
					: geom
			};
		});

		// 建物データの実体化（既に実装済み）
		const plainBuildings = allBuildingFeatures.map((b) => JSON.parse(JSON.stringify(b)));

		// デバッグ: 実体化後のフィーチャーデータを確認
		console.log(`[Performance] 実体化後の${featureTypeName}データ:`, plainFeatures.length, '件');
		if (plainFeatures.length > 0) {
			console.log(`[Performance] 実体化後の${featureTypeName}サンプル:`, {
				type: plainFeatures[0].type,
				properties: plainFeatures[0].properties,
				geometryType: plainFeatures[0].geometry?.type,
				hasCoordinates: !!(plainFeatures[0].geometry as any)?.coordinates
			});

			// メッシュの場合、座標範囲を詳細に確認
			if (displayLayerType === 'mesh' && plainFeatures[0].geometry) {
				const geom = plainFeatures[0].geometry;
				if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
					const bounds = geom.coordinates[0].reduce(
						(acc: any, coord: number[]) => {
							return {
								minLng: Math.min(acc.minLng, coord[0]),
								maxLng: Math.max(acc.maxLng, coord[0]),
								minLat: Math.min(acc.minLat, coord[1]),
								maxLat: Math.max(acc.maxLat, coord[1])
							};
						},
						{ minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity }
					);
					console.log(`[Performance] メッシュの座標範囲:`, bounds);
				}
			}
		}

		const results = await aggregateBuildingDamageWithArrow(
			duckDBConn,
			plainFeatures,
			plainBuildings,
			cityCode
		);
		console.log(`[Performance] DuckDB集計完了: ${(performance.now() - duckdbStart).toFixed(1)}ms`);
		console.log(`[Performance] 合計処理時間: ${(performance.now() - perfStart).toFixed(1)}ms`);

		aggregationResults = results;

		// 親コンポーネントにコールバック
		console.log('[Performance] 集計結果:', results);
		console.log(`[Performance] ${featureTypeName}数:`, selectedFeatures.length);
		console.log('[Performance] 建物Feature数:', allBuildingFeatures.length);
		if (selectedFeatures.length > 0) {
			console.log(`[Performance] ${featureTypeName}サンプル:`, selectedFeatures[0]);
			console.log(
				`[Performance] ${featureTypeName}ジオメトリタイプ:`,
				selectedFeatures[0].geometry?.type
			);
			console.log(
				`[Performance] ${featureTypeName}座標サンプル:`,
				selectedFeatures[0].geometry?.type === 'Polygon'
					? selectedFeatures[0].geometry.coordinates[0]?.slice(0, 2)
					: selectedFeatures[0].geometry?.type === 'MultiPolygon'
						? selectedFeatures[0].geometry.coordinates[0]?.[0]?.slice(0, 2)
						: 'unknown'
			);
		}
		if (allBuildingFeatures.length > 0) {
			console.log('[Performance] 建物サンプル:', allBuildingFeatures[0]);
			console.log('[Performance] 建物ジオメトリタイプ:', allBuildingFeatures[0].geometry?.type);
			const geom = allBuildingFeatures[0].geometry;
			if (geom) {
				if (geom.type === 'Polygon' && geom.coordinates?.[0]) {
					console.log('[Performance] 建物座標サンプル (Polygon):', geom.coordinates[0].slice(0, 2));
				} else if (geom.type === 'MultiPolygon' && geom.coordinates?.[0]?.[0]) {
					console.log(
						'[Performance] 建物座標サンプル (MultiPolygon):',
						geom.coordinates[0][0].slice(0, 2)
					);
				} else if (geom.type === 'Point' && geom.coordinates) {
					console.log('[Performance] 建物座標サンプル (Point):', geom.coordinates);
				} else {
					console.log('[Performance] 建物座標サンプル: unknown type or missing coordinates');
				}
			}
		}
		console.log(
			'[Performance] onAggregationComplete:',
			onAggregationComplete ? '存在する' : '存在しない'
		);
		if (onAggregationComplete) {
			console.log('[Performance] onAggregationCompleteを呼び出します...');
			onAggregationComplete(results);
			console.log('[Performance] onAggregationComplete呼び出し完了');
		} else {
			console.warn('[Performance] onAggregationCompleteコールバックが設定されていません');
		}

		return true;
	};

	onMount(async () => {
		// 初期化開始
		isLoading = true;

		try {
			// 戸田市の場合はIndexedDBキャッシュをクリア（古いデータが残っている可能性があるため）
			// キャッシュキーに都市コードを含めるように変更したので、この処理は初回のみ必要
			if (cityCode === '11224') {
				console.log('[onMount] 戸田市 (cityCode: 11224) のためIndexedDBキャッシュをクリアします');
				try {
					// IndexedDBのtile-featuresデータベースをクリア
					const dbName = 'tile-features';
					const deleteRequest = indexedDB.deleteDatabase(dbName);

					await new Promise((resolve, reject) => {
						deleteRequest.onsuccess = () => {
							console.log('[onMount] IndexedDBキャッシュを正常にクリアしました');
							resolve(undefined);
						};
						deleteRequest.onerror = () => {
							console.warn('[onMount] IndexedDBキャッシュのクリアに失敗:', deleteRequest.error);
							reject(deleteRequest.error);
						};
					});
				} catch (err) {
					console.warn('[onMount] IndexedDBキャッシュのクリア処理でエラー:', err);
				}
			}

			// 設定ファイルのパスを決定（citycodeが指定されていればそのディレクトリ、なければ共通ファイル）
			const configPath = cityCode ? `/${cityCode}/config.json` : '/config.json';
			const initialViewPath = cityCode ? `/${cityCode}/initial_view.json` : '/initial_view.json';
			console.log(`[onMount] Loading config from: ${configPath}, initial view from: ${initialViewPath}`);

			// DuckDB初期化、config、initial_view、cities.json読み込みを並行実行
			const [duckDBInstance, loadedConfig, loadedInitialView, loadedCities] = await Promise.all([
				initializeDuckDB(),
				loadJSON<Config>(configPath).catch(() => loadJSON<Config>('/config.json')),
				loadJSON<{ map: { center?: [number, number]; zoom: number; bearing?: number; pitch?: number } }>(initialViewPath).catch(() =>
					loadJSON<{ map: { center?: [number, number]; zoom: number; bearing?: number; pitch?: number } }>('/initial_view.json')
				),
				loadJSON<{ cities: CityInfo[] }>('/cities.json')
			]);

			// cities.jsonのデータを適用
			if (loadedCities?.cities) {
				citiesData = loadedCities.cities;
				console.log(`[onMount] Loaded cities data:`, citiesData.length, 'cities');
			}

			// initial_view.jsonの設定を適用
			if (loadedInitialView) {
				initialView = loadedInitialView;
				console.log(`[onMount] Loaded initial view:`, initialView);
			}

			duckDBConn = duckDBInstance.conn;

			// シミュレーションIDがある場合はconfigを更新（building_damageタイルURLを動的に設定）
			config = adaptConfigForSimulation(loadedConfig, simulation);

			// shizuoka-branch、building_damage、meshの設定を取得
			shizuokaBranchConfig = config?.layers.find((layer) => layer.id === 'shizuoka-branch');
			buildingDamageConfig = config?.layers.find((layer) => layer.id === 'building_damage');
			meshConfig = config?.layers.find((layer) => layer.id === 'mesh');

			// 小学校区データがない場合はメッシュをデフォルトに
			if (!shizuokaBranchConfig) {
				displayLayerType = 'mesh';
			}

			// Deck.glレイヤーを作成
			// 初期表示は小学校区（displayLayerType === 'district'）、ただし小学校区データがない場合はメッシュ
			const initialLayerConfigs = [buildingDamageConfig, shizuokaBranchConfig].filter(
				Boolean
			) as DeckLayerConfig[];

			// makeDeckLayersを使用してレイヤーを作成
			// onDistrictClickをshizuoka-branchのクリックハンドラーとして渡す
			const baseLayers = makeDeckLayers(initialLayerConfigs, {}, undefined, onDistrictClick, undefined, cityCode);

			deckLayers = baseLayers;
		} catch (error) {
			// エラーハンドリングは省略（仕様書の指示通り）
			console.error('[DashboardMapSimple] Initialization error:', error);
		} finally {
			// 初期化完了
			isLoading = false;
		}
	});

	// 地図がロードされた時の処理
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function handleMapLoad(e: any) {
		mapInstance = e.detail || e.target?.map || e.target;

		// 初期背景地図を設定（航空写真）
		changeBaseMap('aerial');

		// 初回のbboxを設定し、メッシュデータを生成
		updateViewportBbox();

		// 地図の移動・ズームイベントでbboxとメッシュを更新
		if (mapInstance) {
			mapInstance.on('moveend', updateViewportBbox);
			mapInstance.on('zoomend', updateViewportBbox);
		}
	}

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
		} catch (error) {
			// エラーハンドリングは省略（仕様書の指示通り）
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
			bearing={mapBearing}
			pitch={mapPitch}
			class="h-full w-full"
			onload={handleMapLoad}
		>
			<PMTilesProtocol />
			<NavigationControl position="top-right" />
			<ScaleControl position="bottom-left" />

			<!-- Deck.glレイヤー（building_damage、shizuoka-branch） -->
			<DeckGLOverlay layers={deckLayers} />
		</MapLibre>
	{/if}

	<!-- レイヤー切り替えボタン（小学校区データがある場合のみ表示） -->
	{#if shizuokaBranchConfig}
		<div class="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 z-[1000]">
			<div class="flex gap-1">
				<button
					class="px-3 py-2 text-sm font-medium rounded transition-colors {displayLayerType ===
					'district'
						? 'bg-blue-500 text-white'
						: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					onclick={() => (displayLayerType = 'district')}
				>
					小学校区
				</button>
				<button
					class="px-3 py-2 text-sm font-medium rounded transition-colors {displayLayerType === 'mesh'
						? 'bg-blue-500 text-white'
						: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					onclick={() => (displayLayerType = 'mesh')}
				>
					メッシュ
				</button>
			</div>
		</div>
	{/if}

	<!-- 選択された小学校区の表示 -->
	{#if selectedDistricts.length > 0 && displayLayerType === 'district'}
		<div class="absolute top-20 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs z-[1000]">
			<h4 class="text-sm font-semibold text-gray-800 mb-2">選択された小学校区</h4>
			{#each selectedDistricts as district, index}
				<div class="text-xs text-gray-600 mb-1">
					{index + 1}. {district.properties?.NAME || '不明'}
				</div>
			{/each}
		</div>
	{/if}

	<!-- 選択されたメッシュの表示 -->
	{#if selectedMeshes.length > 0 && displayLayerType === 'mesh'}
		<div class="absolute top-20 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs z-[1000]">
			<h4 class="text-sm font-semibold text-gray-800 mb-2">選択されたメッシュ</h4>
			{#each selectedMeshes as mesh, index}
				<div class="text-xs text-gray-600 mb-1">
					{index + 1}. メッシュコード: {mesh.properties?.code || '不明'}
				</div>
			{/each}
		</div>
	{/if}

	<!-- 凡例 -->
	{#if buildingDamageConfig && (shizuokaBranchConfig || meshConfig)}
		<div class="absolute bottom-10 right-4 bg-white rounded-lg shadow-lg p-4 z-999">
			<h4 class="text-sm font-semibold text-gray-800 mb-3">凡例</h4>
			<div class="space-y-2">
				{#if displayLayerType === 'district' && shizuokaBranchConfig && 'getFillColor' in shizuokaBranchConfig && shizuokaBranchConfig.getFillColor}
					<div>
						<h5 class="text-xs font-medium text-gray-700 mb-1">小学校区</h5>
						<div class="flex items-center gap-2">
							<div
								class="w-6 h-6 rounded border border-gray-300"
								style="background-color: rgba({shizuokaBranchConfig
									.getFillColor[0]}, {shizuokaBranchConfig.getFillColor[1]}, {shizuokaBranchConfig
									.getFillColor[2]}, {shizuokaBranchConfig.getFillColor[3] / 255})"
							></div>
							<span class="text-xs text-gray-600">小学校区</span>
						</div>
					</div>
				{/if}
				{#if displayLayerType === 'mesh' && meshConfig && 'getFillColor' in meshConfig && meshConfig.getFillColor}
					<div>
						<h5 class="text-xs font-medium text-gray-700 mb-1">メッシュ</h5>
						<div class="flex items-center gap-2">
							<div
								class="w-6 h-6 rounded border border-gray-300"
								style="background-color: rgba({meshConfig.getFillColor[0]}, {meshConfig
									.getFillColor[1]}, {meshConfig.getFillColor[2]}, {meshConfig.getFillColor[3] /
									255})"
							></div>
							<span class="text-xs text-gray-600">メッシュ</span>
						</div>
					</div>
				{/if}
				{#if buildingDamageConfig && 'getFillColor' in buildingDamageConfig && buildingDamageConfig.getFillColor}
					<div>
						<h5 class="text-xs font-medium text-gray-700 mb-1">建物被害想定</h5>
						<div class="flex items-center gap-2">
							<div
								class="w-6 h-6 rounded border border-gray-300"
								style="background-color: rgba({buildingDamageConfig
									.getFillColor[0]}, {buildingDamageConfig.getFillColor[1]}, {buildingDamageConfig
									.getFillColor[2]}, {buildingDamageConfig.getFillColor[3] / 255})"
							></div>
							<span class="text-xs text-gray-600">建物被害想定</span>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
