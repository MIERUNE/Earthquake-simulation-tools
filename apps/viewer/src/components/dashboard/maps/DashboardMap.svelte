<script lang="ts">
  import { MapLibre, NavigationControl, ScaleControl, Marker, Popup } from 'svelte-maplibre-gl';
  import { damageTypes, type Building } from '../../../lib/shizuokaSimulationData';
  import { onMount } from 'svelte';
  import { loadJSON } from '$lib/utils/dataLoader';
  import { DEFAULT_CITY_CODE } from '$lib/constants/cityConstants';

  interface Props {
    buildings?: Building[];
    cityCode?: string | null;
  }

  let { buildings = [], cityCode = null }: Props = $props();

  let selectedBuilding: Building | null = $state(null);
  let popupOpen = $state(false);

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

  onMount(async () => {
    // 設定ファイルのパスを決定（citycodeが指定されていればそのディレクトリ、なければ共通ファイル）
    const initialViewPath = cityCode ? `/${cityCode}/initial_view.json` : '/initial_view.json';

    // initial_view、cities.json読み込みを並行実行
    const [loadedInitialView, loadedCities] = await Promise.all([
      loadJSON<{ map: { center?: [number, number]; zoom: number; bearing?: number; pitch?: number } }>(initialViewPath).catch(() =>
        loadJSON<{ map: { center?: [number, number]; zoom: number; bearing?: number; pitch?: number } }>('/initial_view.json')
      ),
      loadJSON<{ cities: CityInfo[] }>('/cities.json')
    ]);

    // cities.jsonのデータを適用
    if (loadedCities?.cities) {
      citiesData = loadedCities.cities;
    }

    // initial_view.jsonの設定を適用
    if (loadedInitialView) {
      initialView = loadedInitialView;
    }
  });

  function handleMarkerClick(building: Building): void {
    selectedBuilding = building;
    popupOpen = true;
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  }
</script>

{#if initialView?.map?.center || citiesData.length > 0}
<MapLibre
  style="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
  center={mapCenter}
  zoom={mapZoom}
  class="h-full w-full"
>
  <NavigationControl position="top-right" />
  <ScaleControl position="bottom-left" />
  
  <!-- 建物マーカーの表示 -->
  {#each buildings as building}
    <Marker 
      lnglat={[building.location.lng, building.location.lat]}
      class="cursor-pointer"
    >
      <div 
        class="w-3 h-3 rounded-full border-2 border-white shadow-md transition-all hover:scale-150"
        style="background-color: {damageTypes[building.damageLevel].color}"
        on:click={() => handleMarkerClick(building)}
        role="button"
        tabindex="0"
        on:keydown={(e) => e.key === 'Enter' && handleMarkerClick(building)}
      ></div>
      
      {#if selectedBuilding?.id === building.id}
        <Popup bind:open={popupOpen} offset={[0, -10]}>
          <div class="p-3 min-w-[250px]">
            <h4 class="font-semibold text-gray-800 mb-2">{building.name}</h4>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">被害レベル:</span>
                <span 
                  class="font-medium px-2 py-0.5 rounded text-white text-xs"
                  style="background-color: {damageTypes[building.damageLevel].color}"
                >
                  {damageTypes[building.damageLevel].label}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">建物タイプ:</span>
                <span class="font-medium">{building.buildingType === 'residential' ? '住宅' : 
                  building.buildingType === 'commercial' ? '商業施設' :
                  building.buildingType === 'public' ? '公共施設' : '工場'}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">階数:</span>
                <span class="font-medium">{building.floors}階</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">延床面積:</span>
                <span class="font-medium">{building.area.toLocaleString()}㎡</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">推定被害額:</span>
                <span class="font-medium text-red-600">
                  {formatCurrency(building.estimatedLoss)}
                </span>
              </div>
            </div>
          </div>
        </Popup>
      {/if}
    </Marker>
  {/each}
</MapLibre>
{/if}

<!-- 凡例 -->
<div class="absolute bottom-10 right-4 bg-white rounded-lg shadow-lg p-4">
  <h4 class="text-sm font-semibold text-gray-800 mb-2">被害レベル</h4>
  <div class="space-y-1">
    {#each Object.entries(damageTypes) as [_, type]}
      <div class="flex items-center gap-2">
        <div 
          class="w-4 h-4 rounded-full border border-gray-300"
          style="background-color: {type.color}"
        ></div>
        <span class="text-xs text-gray-700">{type.label}</span>
      </div>
    {/each}
  </div>
</div>