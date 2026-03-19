<script lang="ts">
  console.log('RoadMap component loading...');
  import { MapLibre, NavigationControl, ScaleControl, Marker, Popup } from 'svelte-maplibre-gl';
  import { onMount } from 'svelte';
  import type { Map } from 'maplibre-gl';
  import { roadTypes, blockageLevels } from '../../../lib/shizuokaRoadData';

  interface Road {
    id: string;
    name: string;
    type: 'primary' | 'secondary' | 'tertiary';
    width: number;
    coordinates: [number, number][];
    blockageLevel?: number;
  }

  interface Facility {
    id: string;
    name: string;
    type: string;
    location: {
      lat: number;
      lng: number;
    };
    importance: string;
    accessible?: boolean;
    nearestRoad?: string;
  }

  interface MapFeature {
    type: 'Feature';
    id?: number;
    properties: {
      id: string;
      name: string;
      type: string;
      blockageLevel?: number;
      [key: string]: unknown;
    };
    geometry: {
      type: 'LineString';
      coordinates: [number, number][];
    };
  }

  export let roads: Road[] = [];
  export let facilities: Facility[] = [];

  console.log('RoadMap props received:', { roads, facilities });

  let mapComponent: MapLibre | undefined = undefined;
  let mapInstance: Map | undefined = undefined;
  let mapReady = false;
  let selectedFeature: MapFeature | null = null;
  let selectedRoadIds: Set<string> = new Set();
  let hoveredRoadId: string | null = null;
  let popupOpen = false;
  let popupLngLat: [number, number] = [0, 0];
  
  const shizuokaCenter: [number, number] = [138.383, 34.975];

  onMount(() => {
    console.log('RoadMap mounted');
    // タイマーを使って地図の準備を待つ
    const checkMapInterval = setInterval(() => {
      console.log('Checking for map instance...');
      if (mapComponent && 'getMap' in mapComponent && typeof mapComponent.getMap === 'function') {
        mapInstance = mapComponent.getMap() as Map;
        console.log('Got map instance:', mapInstance);
        if (mapInstance) {
          clearInterval(checkMapInterval);
          addRoadLayers();
        }
      } else if (mapComponent && 'map' in mapComponent) {
        mapInstance = mapComponent.map as Map;
        console.log('Got map instance from .map:', mapInstance);
        if (mapInstance) {
          clearInterval(checkMapInterval);
          addRoadLayers();
        }
      }
    }, 500);

    // 10秒後にタイムアウト
    setTimeout(() => {
      clearInterval(checkMapInterval);
      console.error('Timeout waiting for map');
    }, 10000);
  });
  
  function addRoadLayers(): void {
    const map = mapInstance;
    if (!map) {
      console.error('Map not available yet');
      return;
    }

    console.log('Adding road layers with map:', map);

    // テスト用のシンプルな道路データ
    const testGeoJSON = {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        properties: {
          name: 'Test Road',
          type: 'primary'
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [138.35, 34.95],
            [138.38, 34.97],
            [138.40, 34.98],
            [138.43, 34.99],
            [138.45, 35.00]
          ] as [number, number][]
        }
      }]
    };
    
    try {
      // ソース追加
      map.addSource('test-road', {
        type: 'geojson',
        data: testGeoJSON
      });
      
      // レイヤー追加
      map.addLayer({
        id: 'test-road-line',
        type: 'line',
        source: 'test-road',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#FF0000',
          'line-width': 8
        }
      });
      
      console.log('Test road layer added via timer');
    } catch (error) {
      console.error('Error adding test road via timer:', error);
    }
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleMapLoad(event: any): void {
    // svelte-maplibre-glのイベントからmapオブジェクトを取得
    console.log('handleMapLoad called with event:', event);
    mapInstance = event.detail as Map;
    console.log('Map loaded, event.detail:', mapInstance);

    // デバッグ：道路データの確認
    console.log('Original roads data:', roads);
    console.log('Number of roads:', roads.length);

    const map = mapInstance;
    if (!map) return;

    // MapLibre GL JSのドキュメントに従った実装
    // テスト用のシンプルな道路データ
    const testGeoJSON = {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        properties: {
          name: 'Test Road',
          type: 'primary'
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [138.35, 34.95],
            [138.38, 34.97],
            [138.40, 34.98],
            [138.43, 34.99],
            [138.45, 35.00]
          ] as [number, number][]
        }
      }]
    };
    
    // テスト道路を追加
    try {
      // ソース追加
      map.addSource('test-road', {
        type: 'geojson',
        data: testGeoJSON
      });
      
      // レイヤー追加（MapLibreドキュメントの形式）
      map.addLayer({
        id: 'test-road-line',
        type: 'line',
        source: 'test-road',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#FF0000',
          'line-width': 8
        }
      });
      
      console.log('Test road layer added successfully');
    } catch (error) {
      console.error('Error adding test road:', error);
    }
    
    if (!roads || roads.length === 0) {
      console.error('No road data available');
      return;
    }

    // 道路データをGeoJSON形式に変換
    const roadGeoJSON = {
      type: 'FeatureCollection' as const,
      features: roads.map((road, index) => ({
        type: 'Feature' as const,
        id: index, // MapLibreのfeature-stateのためのID
        properties: {
          ...road,
          id: road.id || `road_${index}`, // プロパティにもIDを保持
          name: road.name || 'Unknown Road',
          type: road.type || 'tertiary',
          blockageLevel: road.blockageLevel || 0
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: road.coordinates || []
        }
      }))
    };
    
    console.log('Generated GeoJSON:', roadGeoJSON);
    
    // 実際の道路データを追加
    try {
      // 道路ソースを追加
      map.addSource('roads', {
        type: 'geojson',
        data: roadGeoJSON
      });
      
      // 道路レイヤーを追加（MapLibreドキュメントの形式）
      map.addLayer({
        id: 'roads-line',
        type: 'line',
        source: 'roads',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'blockageLevel'], 3], '#1F2937', // 通行不可：黒
            ['==', ['get', 'blockageLevel'], 2], '#EF4444', // 困難：赤
            ['==', ['get', 'blockageLevel'], 1], '#F59E0B', // 注意：黄
            '#10B981' // 通行可能：緑
          ],
          'line-width': [
            'case',
            ['==', ['get', 'type'], 'primary'], 8,
            ['==', ['get', 'type'], 'secondary'], 6,
            4
          ]
        }
      });
      console.log('Road layers added successfully');
    } catch (error) {
      console.error('Error adding road layers:', error);
    }
    
    // デバッグ：道路ソースのデータを確認
    try {
      const source = map.getSource('roads');
      if (source) {
        console.log('Road source exists:', source);
      } else {
        console.error('Road source not found');
      }
    } catch (e) {
      console.error('Error checking source:', e);
    }
    
    // クリックイベント
    try {
      map.on('click', 'roads-line', handleRoadClick);
      map.on('mouseenter', 'roads-line', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'roads-line', () => {
        map.getCanvas().style.cursor = '';
      });
      console.log('Event handlers added');
    } catch (error) {
      console.error('Error adding event handlers:', error);
    }
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleRoadClick(e: any): void {
    console.log('Road clicked:', e.features[0]);
    const feature = e.features[0] as MapFeature;
    selectedFeature = feature;
    popupLngLat = e.lngLat.toArray() as [number, number];
    popupOpen = true;
  }

  function clearSelection(): void {
    selectedRoadIds.clear();
    selectedRoadIds = new Set();
  }

  // 施設アイコンの取得
  function getFacilityIcon(type: string): string {
    switch(type) {
      case 'government': return '🏛️';
      case 'hospital': return '🏥';
      case 'port': return '⚓';
      case 'ic': return '🛣️';
      default: return '📍';
    }
  }
</script>

<MapLibre 
  bind:this={mapComponent}
  style="https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json"
  center={shizuokaCenter}
  zoom={11}
  class="h-full w-full"
  on:load={handleMapLoad}
  on:ready={(e) => {
    console.log('Map ready event:', e);
    mapReady = true;
  }}
  on:error={(e) => {
    console.error('Map error:', e);
  }}
>
  <NavigationControl position="top-right" />
  <ScaleControl position="bottom-left" />
  
  <!-- 重要拠点マーカー -->
  {#each facilities as facility}
    <Marker lnglat={[facility.location.lng, facility.location.lat]}>
      <div class="relative">
        <div class="bg-white rounded-full shadow-lg p-2 border-2"
             style="border-color: {facility.accessible ? '#10B981' : '#EF4444'}">
          <span class="text-xl">{getFacilityIcon(facility.type)}</span>
        </div>
        {#if !facility.accessible}
          <div class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            ！
          </div>
        {/if}
      </div>
      
      <Popup offset={[0, -20]}>
        <div class="p-3 min-w-[200px]">
          <h4 class="font-semibold text-gray-800">{facility.name}</h4>
          <div class="mt-2 text-sm">
            <div class="flex justify-between">
              <span>アクセス:</span>
              <span class="font-medium {facility.accessible ? 'text-green-600' : 'text-red-600'}">
                {facility.accessible ? '可能' : '困難'}
              </span>
            </div>
            {#if facility.nearestRoad}
              <div class="flex justify-between mt-1">
                <span>最寄道路:</span>
                <span class="font-medium">{facility.nearestRoad}</span>
              </div>
            {/if}
          </div>
        </div>
      </Popup>
    </Marker>
  {/each}
  
  <!-- 道路情報ポップアップ -->
  {#if selectedFeature && popupOpen}
    <Popup lnglat={popupLngLat} bind:open={popupOpen}>
      <div class="p-3 min-w-[250px]">
        <h4 class="font-semibold text-gray-800 mb-2">{selectedFeature.properties.name || '道路'}</h4>
        <div class="space-y-1 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">道路種別:</span>
            <span class="font-medium">{selectedFeature.properties.type || 'Unknown'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">ID:</span>
            <span class="font-medium">{selectedFeature.properties.id || 'N/A'}</span>
          </div>
        </div>
      </div>
    </Popup>
  {/if}
</MapLibre>

<!-- 選択道路情報 -->
{#if selectedRoadIds.size > 0}
  <div class="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
    <div class="flex items-center justify-between mb-2">
      <h4 class="text-sm font-semibold text-gray-800">選択中の道路</h4>
      <button
        on:click={clearSelection}
        class="text-xs text-blue-600 hover:text-blue-800"
      >
        選択解除
      </button>
    </div>
    <p class="text-sm text-gray-600">{selectedRoadIds.size}本の道路を選択中</p>
    <p class="text-xs text-gray-500 mt-1">クリックで道路を選択/解除</p>
  </div>
{/if}

<!-- 凡例 -->
<div class="absolute bottom-10 right-4 bg-white rounded-lg shadow-lg p-4">
  <h4 class="text-sm font-semibold text-gray-800 mb-2">予測道路状態</h4>
  <div class="space-y-1">
    {#each Object.entries(blockageLevels) as [level, info]}
      <div class="flex items-center gap-2">
        <div class="w-12 h-3 rounded" style="background-color: {info.color}"></div>
        <span class="text-xs text-gray-700">{info.label}</span>
      </div>
    {/each}
  </div>
  
  <h4 class="text-sm font-semibold text-gray-800 mt-4 mb-2">道路種別</h4>
  <div class="space-y-1 text-xs text-gray-700">
    <div>━━━ 第1次緊急輸送道路</div>
    <div>━━ 第2次緊急輸送道路</div>
    <div>━ 第3次緊急輸送道路</div>
  </div>
</div>