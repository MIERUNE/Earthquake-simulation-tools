<script lang="ts">
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import type { Map, MapMouseEvent, GeoJSONSource } from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { simulationStore } from '../../../lib/stores/simulationStore.svelte';
  import { regionsStore } from '$lib/stores/regionsStore.svelte';

  interface Mesh {
    id: string;
    code: string;
    bounds: [number, number][];
    center: [number, number];
  }

  interface RegionInfo {
    prefecture: string;
    municipality: string;
  }

  type CenterCoordinates = Record<string, [number, number]>;

  let mapContainer: HTMLDivElement | undefined = $state();
  let map: Map | undefined = $state();
  let selectedMeshes: Set<string> = $state(new Set());
  let isSelecting: boolean = $state(false);
  let selectionStart: [number, number] | null = $state(null);
  let selectionBox: [number, number][] | null = $state(null);
  let meshGrid: Mesh[] = $state([]);
  let previousRegion: string | null = $state(null);
  // メッシュコードと選択状態のマッピング（地域変更時も選択を維持するため）
  let selectedMeshCodes: Set<string> = $state(new Set());
  // ローディング状態
  let isGeneratingMesh: boolean = $state(false);
  // デバウンス用タイマー
  let meshGenerationTimer: number | null = null;
  // 地域変更中フラグ（デバウンスをスキップするため）
  let isRegionChanging: boolean = $state(false);

  // 選択された地域情報を取得（simulationStoreから）
  const regionInfo = $derived.by((): RegionInfo | null => {
    const region = simulationStore.formData.region;
    if (!region) return null;
    const [prefecture, municipality] = region.split('_');
    return { prefecture, municipality };
  });

  // 地域が変更されたら地図の中心を更新してメッシュグリッドをリセット
  $effect(() => {
    if (map && regionInfo && map.isStyleLoaded()) {
      const currentRegion = simulationStore.formData.region;

      // 地域が実際に変更された場合のみ処理
      // previousRegionがnullの場合は初回マウント直後なので処理しない
      if (currentRegion !== previousRegion && previousRegion !== null) {
        // 選択状態をクリア（地域変更時のみ）
        selectedMeshes.clear();
        selectedMeshCodes.clear();
        selectedMeshes = new Set(selectedMeshes);
        selectedMeshCodes = new Set(selectedMeshCodes);

        // ストアも更新
        simulationStore.updateFormData({ meshCodes: [] });

        // 地域変更中フラグを立てる
        isRegionChanging = true;

        // 地図の中心を移動
        setMapCenter();
      }

      // previousRegionを更新
      previousRegion = currentRegion;
    }
  });

  // 選択状態が変更されたら色を更新
  $effect(() => {
    if (map && map.isStyleLoaded()) {
      // selectedMeshesの変更を監視
      selectedMeshes.size;
      updateSelection();
    }
  });

  onMount(() => {
    // ストアから選択済みメッシュコードを復元
    const savedMeshCodes = simulationStore.formData.meshCodes || [];
    selectedMeshCodes = new Set(savedMeshCodes);

    // 現在の地域を previousRegion に設定（初回表示時に地域変更と誤判定されないように）
    previousRegion = simulationStore.formData.region || null;

    initializeMap();

    return () => {
      if (map) map.remove();
    };
  });

  const initializeMap = (): void => {
    if (!mapContainer) return;

    // 地図の初期化
    map = new maplibregl.Map({
      container: mapContainer,
      style: 'https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json',
      center: [139.75, 35.68], // デフォルトは東京
      zoom: 12,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl(), 'bottom-right');

    map.on('load', () => {
      // 範囲選択機能を設定
      setupRangeSelection();

      // 地域が選択されている場合のみ、中心座標とメッシュグリッドを設定
      if (regionInfo) {
        // 初回ロード時も地域変更フラグを立てる
        isRegionChanging = true;
        setMapCenter();
        // メッシュ生成はmoveendイベントで行われる
      }
    });

    // 地図の移動完了後、メッシュグリッドを再生成（選択状態は維持）
    map.on('moveend', () => {
      if (!map) return;

      // スタイルがロードされていない場合は、ロード完了を待つ
      const processMoveEnd = () => {
        // 地域変更中の場合は即座にメッシュ生成（デバウンスなし）
        if (isRegionChanging) {
          isRegionChanging = false;

          // 既存のデバウンスタイマーをクリア
          if (meshGenerationTimer !== null) {
            clearTimeout(meshGenerationTimer);
            meshGenerationTimer = null;
          }

          // 即座にメッシュ生成
          generateMeshGrid();
          return;
        }

        // 地域が選択されている場合のみメッシュを生成（通常のパン・ズーム操作）
        if (regionInfo) {
          // 既存のタイマーをクリア
          if (meshGenerationTimer !== null) {
            clearTimeout(meshGenerationTimer);
          }

          // デバウンス: 300ms後にメッシュ生成
          meshGenerationTimer = window.setTimeout(() => {
            generateMeshGrid();
            meshGenerationTimer = null;
          }, 300);
        }
      };

      if (map.isStyleLoaded()) {
        processMoveEnd();
      } else {
        map.once('styledata', () => {
          if (map && map.isStyleLoaded()) {
            processMoveEnd();
          }
        });
      }
    });
  };

  const setMapCenter = (): void => {
    if (!regionInfo || !map) return;

    const municipalityData = regionsStore.selectedMunicipality;

    let center: [number, number];

    if (municipalityData?.center) {
      // 市区町村の中心座標がある場合
      center = [municipalityData.center.lng, municipalityData.center.lat];
    } else {
      // デフォルト（東京）
      center = [139.75, 35.68];
      console.warn(`[AreaSelector] No center coordinates for municipality, using default Tokyo`);
    }

    map.flyTo({
      center: center,
      zoom: 13,
      duration: 1000
    });
  };

  const generateMeshGrid = (): void => {
    if (!map) {
      return;
    }

    // 既に生成中の場合はスキップ
    if (isGeneratingMesh) {
      return;
    }

    isGeneratingMesh = true;

    try {
      // 現在の地図範囲を取得
      const bounds = map.getBounds();
      const west = bounds.getWest();
      const south = bounds.getSouth();
      const east = bounds.getEast();
      const north = bounds.getNorth();

      const meshes: Mesh[] = [];
      const meshCodeSet = new Set<string>(); // 重複防止

      // 3次メッシュのサイズ（約1km x 1km）
      const latStep = 30 / 3600; // 30秒 = 0.008333度
      const lngStep = 45 / 3600; // 45秒 = 0.0125度

      // 表示範囲の南西角が含まれるメッシュを起点にする
      const startMeshCode = generateMeshCode(south, west);
      const startBounds = getMeshBoundsFromCode(startMeshCode);
      if (!startBounds) {
        isGeneratingMesh = false;
        return;
      }

      // 必要なメッシュの数を計算
      const latCount = Math.ceil((north - startBounds.south) / latStep) + 1;
      const lngCount = Math.ceil((east - startBounds.west) / lngStep) + 1;

      // メッシュコードの1次・2次・3次部分を抽出
      const code1st = startMeshCode.substring(0, 4); // 1次メッシュ（4桁）
      const code2nd_lat = parseInt(startMeshCode.substring(4, 5)); // 2次メッシュ緯度（1桁）
      const code2nd_lng = parseInt(startMeshCode.substring(5, 6)); // 2次メッシュ経度（1桁）
      const code3rd_lat = parseInt(startMeshCode.substring(6, 7)); // 3次メッシュ緯度（1桁）
      const code3rd_lng = parseInt(startMeshCode.substring(7, 8)); // 3次メッシュ経度（1桁）

      // メッシュグリッドを生成（メッシュコードを直接インクリメント）
      for (let i = 0; i < latCount; i++) {
        for (let j = 0; j < lngCount; j++) {
          // 3次メッシュコードを計算（0-9の範囲）
          let lat3 = code3rd_lat + i;
          let lng3 = code3rd_lng + j;
          let lat2 = code2nd_lat;
          let lng2 = code2nd_lng;
          let mesh1st = code1st;

          // 3次メッシュが10を超えたら2次メッシュに繰り上げ
          if (lng3 >= 10) {
            lng2 += Math.floor(lng3 / 10);
            lng3 = lng3 % 10;
          }
          if (lat3 >= 10) {
            lat2 += Math.floor(lat3 / 10);
            lat3 = lat3 % 10;
          }

          // 2次メッシュが8を超えたら1次メッシュに繰り上げ（実装は簡略化）
          if (lng2 >= 8 || lat2 >= 8) {
            // 1次メッシュをまたぐ場合は複雑なのでスキップ
            continue;
          }

          const meshCode = `${mesh1st}${lat2}${lng2}${lat3}${lng3}`;

          // 重複チェック
          if (meshCodeSet.has(meshCode)) continue;
          meshCodeSet.add(meshCode);

          const meshBounds = getMeshBoundsFromCode(meshCode);
          if (!meshBounds) continue;

          // 表示範囲外のメッシュはスキップ
          if (meshBounds.north < south || meshBounds.south > north ||
              meshBounds.east < west || meshBounds.west > east) {
            continue;
          }

          const mesh: Mesh = {
            id: `mesh_${meshCode}`,
            code: meshCode,
            bounds: [
              [meshBounds.west, meshBounds.south],
              [meshBounds.east, meshBounds.south],
              [meshBounds.east, meshBounds.north],
              [meshBounds.west, meshBounds.north],
              [meshBounds.west, meshBounds.south]
            ],
            center: [
              (meshBounds.west + meshBounds.east) / 2,
              (meshBounds.south + meshBounds.north) / 2
            ]
          };
          meshes.push(mesh);
        }
      }

      meshGrid = meshes;

      // 次のフレームでメッシュを描画（MapLibre GLのレンダリングサイクルと同期）
      requestAnimationFrame(() => {
        drawMeshGrid();
      });
    } finally {
      isGeneratingMesh = false;
    }
  };

  const generateMeshCode = (lat: number, lng: number): string => {
    // 日本標準地域メッシュ（JIS X 0410）の3次メッシュコード（8桁）を生成

    // 1次メッシュ（約80km四方）
    const lat1 = Math.floor(lat * 1.5); // 緯度を1.5倍して整数部分
    const lng1 = Math.floor(lng - 100); // 経度から100を引いて整数部分

    // 2次メッシュ（約10km四方）
    const latRem1 = (lat * 1.5 - lat1) * 8; // 1次メッシュ内の緯度位置を8分割
    const lngRem1 = ((lng - 100) - lng1) * 8; // 1次メッシュ内の経度位置を8分割
    const lat2 = Math.floor(latRem1);
    const lng2 = Math.floor(lngRem1);

    // 3次メッシュ（約1km四方）
    const latRem2 = (latRem1 - lat2) * 10; // 2次メッシュ内の緯度位置を10分割
    const lngRem2 = (lngRem1 - lng2) * 10; // 2次メッシュ内の経度位置を10分割
    const lat3 = Math.floor(latRem2);
    const lng3 = Math.floor(lngRem2);

    // 8桁のメッシュコードを生成: AABBCCDD
    // AA: 1次メッシュの緯度コード
    // BB: 1次メッシュの経度コード
    // C: 2次メッシュの緯度コード
    // C: 2次メッシュの経度コード
    // D: 3次メッシュの緯度コード
    // D: 3次メッシュの経度コード
    const meshCode =
      lat1.toString().padStart(2, '0') +
      lng1.toString().padStart(2, '0') +
      lat2.toString() +
      lng2.toString() +
      lat3.toString() +
      lng3.toString();

    return meshCode;
  };

  const getMeshBoundsFromCode = (meshCode: string): { south: number; west: number; north: number; east: number } | null => {
    // 8桁のメッシュコードから境界座標を逆算
    if (meshCode.length !== 8) return null;

    // メッシュコードを分解: AABBCCDD
    const lat1 = parseInt(meshCode.substring(0, 2), 10); // 1次メッシュ緯度
    const lng1 = parseInt(meshCode.substring(2, 4), 10); // 1次メッシュ経度
    const lat2 = parseInt(meshCode.substring(4, 5), 10); // 2次メッシュ緯度
    const lng2 = parseInt(meshCode.substring(5, 6), 10); // 2次メッシュ経度
    const lat3 = parseInt(meshCode.substring(6, 7), 10); // 3次メッシュ緯度
    const lng3 = parseInt(meshCode.substring(7, 8), 10); // 3次メッシュ経度

    // 1次メッシュの基準点（南西角）を計算
    const lat1Base = lat1 / 1.5; // 緯度
    const lng1Base = lng1 + 100; // 経度

    // 2次メッシュのオフセット
    const lat2Offset = lat2 / 8 / 1.5; // 2次メッシュは1次を8分割
    const lng2Offset = lng2 / 8;

    // 3次メッシュのオフセット
    const lat3Offset = lat3 / 80 / 1.5; // 3次メッシュは2次を10分割（= 1次を80分割）
    const lng3Offset = lng3 / 80;

    // メッシュの南西角の座標
    const south = lat1Base + lat2Offset + lat3Offset;
    const west = lng1Base + lng2Offset + lng3Offset;

    // メッシュのサイズ
    const latStep = 30 / 3600; // 30秒 = 1/120度
    const lngStep = 45 / 3600; // 45秒 = 1/80度

    // メッシュの北東角の座標
    const north = south + latStep;
    const east = west + lngStep;

    return { south, west, north, east };
  };

  const drawMeshGrid = (): void => {
    if (!map) {
      return;
    }

    // isStyleLoaded()のチェックを削除し、強制的に描画を試みる
    // MapLibre GL内部でスタイルが準備できていれば描画される

    try {
      // スタイルが取得できない場合は早期リターン
      const style = map.getStyle();
      if (!style) {
        console.warn('[AreaSelector] Map style not available');
        return;
      }

      // 既存のメッシュレイヤーをすべて削除
      const layers = style.layers;
      if (layers) {
        const meshLayers = layers.filter(l => l.id.startsWith('mesh-fill-') || l.id.startsWith('mesh-outline-'));
        meshLayers.forEach((layer) => {
          map.removeLayer(layer.id);
        });
      }

      // 既存のメッシュソースをすべて削除
      const sources = Object.keys(style.sources);
      const meshSources = sources.filter(s => s.startsWith('mesh-'));
      meshSources.forEach((sourceId) => {
        map.removeSource(sourceId);
      });

      // 選択状態を復元（メッシュコードベース）
      const newSelectedMeshes = new Set<string>();
      meshGrid.forEach(mesh => {
        if (selectedMeshCodes.has(mesh.code)) {
          newSelectedMeshes.add(mesh.id);
        }
      });
      selectedMeshes = newSelectedMeshes;

      // 新しいメッシュを描画
      let successCount = 0;
      let errorCount = 0;

      meshGrid.forEach((mesh, index) => {
        const isSelected = selectedMeshes.has(mesh.id);

        try {
          map.addSource(`mesh-${mesh.id}`, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [mesh.bounds]
              },
              properties: {}
            }
          });

          map.addLayer({
            id: `mesh-fill-${mesh.id}`,
            type: 'fill',
            source: `mesh-${mesh.id}`,
            paint: {
              'fill-color': isSelected ? '#3B82F6' : '#ffffff',
              'fill-opacity': isSelected ? 0.4 : 0.1
            }
          });

          map.addLayer({
            id: `mesh-outline-${mesh.id}`,
            type: 'line',
            source: `mesh-${mesh.id}`,
            paint: {
              'line-color': '#6B7280',
              'line-width': 0.5,
              'line-opacity': 0.5
            }
          });

          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`[AreaSelector] Error drawing mesh ${index}/${meshGrid.length}`, mesh.code, mesh.id, error);
        }
      });

      // レンダリングが完了するのを待ってから再描画
      map.once('idle', () => {
        if (!map) return;

        // すべてのメッシュレイヤーの不透明度を一度変更して元に戻す
        // これによりMapLibreに強制的に再レンダリングさせる
        meshGrid.forEach(mesh => {
          const layerId = `mesh-fill-${mesh.id}`;
          if (map.getLayer(layerId)) {
            const currentOpacity = map.getPaintProperty(layerId, 'fill-opacity');
            map.setPaintProperty(layerId, 'fill-opacity', currentOpacity);
          }
        });

      });
    } catch (error) {
      console.error('[AreaSelector] Error in drawMeshGrid:', error);
    }
  };

  const setupRangeSelection = (): void => {
    if (!map) return;

    // マウスダウンで範囲選択開始
    map.on('mousedown', (e: MapMouseEvent) => {
      if (!map) return;
      if (e.originalEvent.shiftKey || e.originalEvent.ctrlKey) return;

      isSelecting = true;
      selectionStart = [e.lngLat.lng, e.lngLat.lat];

      // 選択ボックスを初期化
      if (map.getLayer('selection-box')) {
        map.removeLayer('selection-box');
        map.removeSource('selection-box');
      }
    });

    // マウス移動で選択範囲を更新
    map.on('mousemove', (e: MapMouseEvent) => {
      if (!map || !isSelecting || !selectionStart) return;

      const current: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      // 選択ボックスを描画
      const minLng = Math.min(selectionStart[0], current[0]);
      const maxLng = Math.max(selectionStart[0], current[0]);
      const minLat = Math.min(selectionStart[1], current[1]);
      const maxLat = Math.max(selectionStart[1], current[1]);

      selectionBox = [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat]
      ];

      // 選択ボックスを表示
      const source = map.getSource('selection-box') as GeoJSONSource | undefined;
      if (source) {
        source.setData({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [selectionBox]
          },
          properties: {}
        });
      } else {
        map.addSource('selection-box', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [selectionBox]
            },
            properties: {}
          }
        });

        map.addLayer({
          id: 'selection-box',
          type: 'fill',
          source: 'selection-box',
          paint: {
            'fill-color': '#3B82F6',
            'fill-opacity': 0.2
          }
        });
      }
    });

    // マウスアップで範囲選択終了
    map.on('mouseup', (e: MapMouseEvent) => {
      if (!map || !isSelecting) return;

      isSelecting = false;

      // 選択範囲内のメッシュを選択
      if (selectionBox) {
        selectMeshesInBox();
      }

      // 選択ボックスを削除
      if (map.getLayer('selection-box')) {
        map.removeLayer('selection-box');
        map.removeSource('selection-box');
      }

      selectionStart = null;
      selectionBox = null;
    });

    // クリックして個別選択/解除（Shiftキーは範囲選択を無効化するため）
    map.on('click', (e: MapMouseEvent) => {
      if (!map) return;

      // Shiftキーが押されている場合は何もしない（範囲選択モード）
      if (e.originalEvent.shiftKey) return;

      const features = map.queryRenderedFeatures(e.point);
      const meshFeature = features.find(f => f.layer.id.startsWith('mesh-fill-'));

      if (meshFeature) {
        const meshId = meshFeature.layer.id.replace('mesh-fill-', '');
        toggleMesh(meshId);
      }
    });
  };

  const selectMeshesInBox = (): void => {
    if (!selectionBox) return;

    const [minLng, minLat] = selectionBox[0];
    const [maxLng, maxLat] = selectionBox[2];

    let selectedCount = 0;
    meshGrid.forEach(mesh => {
      const [centerLng, centerLat] = mesh.center;

      if (centerLng >= minLng && centerLng <= maxLng &&
          centerLat >= minLat && centerLat <= maxLat) {
        selectedMeshes.add(mesh.id);
        selectedMeshCodes.add(mesh.code);
        selectedCount++;
      }
    });

    selectedMeshes = new Set(selectedMeshes);
    selectedMeshCodes = new Set(selectedMeshCodes);
    updateSelection();
  };

  const toggleMesh = (meshId: string): void => {
    const mesh = meshGrid.find(m => m.id === meshId);
    if (!mesh) {
      console.warn('[AreaSelector] toggleMesh: mesh not found', meshId);
      return;
    }

    if (selectedMeshes.has(meshId)) {
      selectedMeshes.delete(meshId);
      selectedMeshCodes.delete(mesh.code);
    } else {
      selectedMeshes.add(meshId);
      selectedMeshCodes.add(mesh.code);
    }

    selectedMeshes = new Set(selectedMeshes);
    selectedMeshCodes = new Set(selectedMeshCodes);
    updateSelection();
  };

  const selectAll = (): void => {
    meshGrid.forEach(mesh => {
      selectedMeshes.add(mesh.id);
      selectedMeshCodes.add(mesh.code);
    });

    selectedMeshes = new Set(selectedMeshes);
    selectedMeshCodes = new Set(selectedMeshCodes);
    updateSelection();
  };

  const clearSelection = (): void => {
    selectedMeshes.clear();
    selectedMeshCodes.clear();
    selectedMeshes = new Set(selectedMeshes);
    selectedMeshCodes = new Set(selectedMeshCodes);
    updateSelection();
  };

  const updateSelection = (): void => {
    if (!map) return;

    // 選択状態を更新
    meshGrid.forEach(mesh => {
      if (map.getLayer(`mesh-fill-${mesh.id}`)) {
        const isSelected = selectedMeshes.has(mesh.id);
        map.setPaintProperty(
          `mesh-fill-${mesh.id}`,
          'fill-color',
          isSelected ? '#3B82F6' : '#ffffff'
        );
        map.setPaintProperty(
          `mesh-fill-${mesh.id}`,
          'fill-opacity',
          isSelected ? 0.4 : 0.1
        );
      }
    });

    // ストアを更新（selectedMeshCodesを直接配列に変換）
    const selectedCodes = Array.from(selectedMeshCodes);

    simulationStore.updateFormData({ meshCodes: selectedCodes });
  };
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <label class="block text-sm font-medium text-gray-700">
      地区を選択
    </label>
    <div class="flex gap-2">
      <button
        onclick={selectAll}
        class="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
      >
        すべて選択
      </button>
      <button
        onclick={clearSelection}
        class="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
      >
        選択解除
      </button>
    </div>
  </div>
  
  <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
    <div class="font-medium mb-1">操作方法</div>
    <ul class="space-y-1 text-xs">
      <li>• ドラッグで範囲選択</li>
      <li>• Shiftキー + クリックで個別選択/解除</li>
      <li>• マウスホイールでズーム</li>
      <li>• 右クリックドラッグで地図移動</li>
    </ul>
  </div>

  <div class="relative">
    <div bind:this={mapContainer} class="w-full h-[500px] rounded-lg border border-gray-300"></div>

    {#if isGeneratingMesh}
      <div class="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center rounded-lg">
        <div class="bg-white rounded-lg shadow-lg px-6 py-4 flex items-center gap-3">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <div class="text-sm font-medium text-gray-700">
            メッシュグリッドを生成中...
          </div>
        </div>
      </div>
    {/if}

    {#if selectedMeshes.size > 0}
      <div class="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2">
        <div class="text-sm font-medium text-gray-700">
          選択中: {selectedMeshes.size}個の地区
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(.maplibregl-canvas) {
    cursor: crosshair;
  }
  
  :global(.maplibregl-canvas.maplibregl-drag-pan) {
    cursor: grabbing;
  }
</style>