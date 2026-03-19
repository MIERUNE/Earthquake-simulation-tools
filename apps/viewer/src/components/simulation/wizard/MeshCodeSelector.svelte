<script lang="ts">
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import type { Map } from 'maplibre-gl';
  import { meshCodesByMunicipality } from '../../../lib/mockData/regionData';
  import { simulationStore } from '../../../lib/stores/simulationStore.svelte';

  interface MeshCodeData {
    code: string;
    name: string;
    bounds: [number, number, number, number];
  }

  let searchQuery = $state<string>('');
  let mapContainer = $state<HTMLDivElement>();
  let map = $state<Map | undefined>(undefined);
  let showMap = $state<boolean>(false);

  // 選択された市区町村からメッシュコードを取得
  let availableMeshCodes: MeshCodeData[] = $derived((() => {
    const region = simulationStore.formData.region;
    console.log('MeshCodeSelector - region:', region);
    if (!region) return [];

    // region は "prefecture_municipality" の形式
    const [_, municipalityId] = region.split('_');
    console.log('MeshCodeSelector - municipalityId:', municipalityId);
    const meshCodes = meshCodesByMunicipality[municipalityId] || meshCodesByMunicipality.default || [];
    console.log('MeshCodeSelector - availableMeshCodes:', meshCodes);
    return meshCodes;
  })());

  let filteredMeshCodes: MeshCodeData[] = $derived(
    availableMeshCodes.filter(mesh =>
      mesh.code.includes(searchQuery) ||
      mesh.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  onMount(() => {
    return () => {
      if (map) map.remove();
    };
  });

  const toggleMeshCode = (code: string): void => {
    const currentCodes = simulationStore.formData.meshCodes || [];
    const newSelection = currentCodes.includes(code)
      ? currentCodes.filter(c => c !== code)
      : [...currentCodes, code];

    console.log('Toggling mesh code:', code);
    console.log('New selection:', newSelection);
    simulationStore.updateFormData({ meshCodes: newSelection });
    console.log('After update - formData:', simulationStore.formData);
    console.log('canProceedStep2:', simulationStore.canProceedStep2);
    updateMapSelection();
  };

  const selectAll = (): void => {
    const allCodes = filteredMeshCodes.map(m => m.code);
    simulationStore.updateFormData({ meshCodes: allCodes });
    updateMapSelection();
  };

  const clearSelection = (): void => {
    simulationStore.updateFormData({ meshCodes: [] });
    updateMapSelection();
  };

  const toggleMapView = (): void => {
    showMap = !showMap;
    if (showMap && !map) {
      setTimeout(initializeMap, 100);
    }
  };

  const initializeMap = (): void => {
    if (!mapContainer || map) return;

    map = new maplibregl.Map({
      container: mapContainer,
      style: 'https://gsi-cyberjapan.github.io/gsivectortile-mapbox-gl-js/std.json',
      center: [137.5, 35.5],
      zoom: 6,
      attributionControl: false
    });

    map.on('load', () => {
      if (!map) return;

      availableMeshCodes.forEach(mesh => {
        if (!map) return;

        const [minLng, minLat, maxLng, maxLat] = mesh.bounds;

        map.addSource(`mesh-${mesh.code}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [minLng, minLat],
                [maxLng, minLat],
                [maxLng, maxLat],
                [minLng, maxLat],
                [minLng, minLat]
              ]]
            },
            properties: {
              code: mesh.code,
              name: mesh.name
            }
          }
        });

        const isSelected = simulationStore.formData.meshCodes?.includes(mesh.code);

        map.addLayer({
          id: `mesh-fill-${mesh.code}`,
          type: 'fill',
          source: `mesh-${mesh.code}`,
          paint: {
            'fill-color': isSelected ? '#3B82F6' : '#E5E7EB',
            'fill-opacity': 0.5
          }
        });

        map.addLayer({
          id: `mesh-outline-${mesh.code}`,
          type: 'line',
          source: `mesh-${mesh.code}`,
          paint: {
            'line-color': '#6B7280',
            'line-width': 1
          }
        });

        map.on('click', `mesh-fill-${mesh.code}`, () => {
          toggleMeshCode(mesh.code);
        });

        map.on('mouseenter', `mesh-fill-${mesh.code}`, () => {
          if (!map) return;
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', `mesh-fill-${mesh.code}`, () => {
          if (!map) return;
          map.getCanvas().style.cursor = '';
        });
      });

      fitMapBounds();
    });
  };

  const updateMapSelection = (): void => {
    if (!map) return;

    availableMeshCodes.forEach(mesh => {
      if (!map) return;
      if (map.getLayer(`mesh-fill-${mesh.code}`)) {
        const isSelected = simulationStore.formData.meshCodes?.includes(mesh.code);
        map.setPaintProperty(
          `mesh-fill-${mesh.code}`,
          'fill-color',
          isSelected ? '#3B82F6' : '#E5E7EB'
        );
      }
    });
  };

  const fitMapBounds = (): void => {
    if (!map || availableMeshCodes.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    availableMeshCodes.forEach(mesh => {
      const [minLng, minLat, maxLng, maxLat] = mesh.bounds;
      bounds.extend([minLng, minLat]);
      bounds.extend([maxLng, maxLat]);
    });

    map.fitBounds(bounds, { padding: 50 });
  };
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <label class="block text-sm font-medium text-gray-700">
      メッシュコードを選択
    </label>
    <button
      onclick={toggleMapView}
      class="text-sm text-blue-600 hover:text-blue-700 transition-colors"
    >
      {showMap ? 'リスト表示' : '地図表示'}
    </button>
  </div>

  {#if !showMap}
    <div class="space-y-3">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="コードまたは名前で検索..."
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

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
        <span class="ml-auto text-sm text-gray-600">
          {simulationStore.formData.meshCodes?.length || 0} / {availableMeshCodes.length} 選択中
        </span>
      </div>

      <div class="border rounded-lg max-h-[400px] overflow-y-auto">
        {#each filteredMeshCodes as mesh}
          <label class="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
            <input
              type="checkbox"
              checked={simulationStore.formData.meshCodes?.includes(mesh.code)}
              onchange={() => toggleMeshCode(mesh.code)}
              class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <div class="ml-3 flex-1">
              <div class="font-medium text-gray-900">{mesh.code}</div>
              <div class="text-sm text-gray-600">{mesh.name}</div>
            </div>
          </label>
        {/each}
        {#if filteredMeshCodes.length === 0}
          <div class="px-4 py-8 text-center text-gray-500">
            メッシュコードが見つかりません
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-sm text-gray-600">
          地図上でメッシュコードをクリックして選択
        </span>
        <span class="text-sm text-gray-600">
          {simulationStore.formData.meshCodes?.length || 0} / {availableMeshCodes.length} 選択中
        </span>
      </div>
      
      <div bind:this={mapContainer} class="w-full h-[500px] rounded-lg border border-gray-300"></div>
      
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
  {/if}

  {#if simulationStore.formData.meshCodes && simulationStore.formData.meshCodes.length > 0}
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <h4 class="text-sm font-medium text-blue-900 mb-2">選択中のメッシュコード:</h4>
      <div class="flex flex-wrap gap-2">
        {#each simulationStore.formData.meshCodes as code}
          {@const mesh = availableMeshCodes.find(m => m.code === code)}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {code} {mesh ? `(${mesh.name})` : ''}
            <button
              onclick={() => toggleMeshCode(code)}
              class="ml-1 hover:text-blue-600"
            >
              ×
            </button>
          </span>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.maplibregl-ctrl-attrib) {
    display: none;
  }
</style>