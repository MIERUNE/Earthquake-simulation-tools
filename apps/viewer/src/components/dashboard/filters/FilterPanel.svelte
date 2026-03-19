<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { districts, damageTypes, buildingTypes } from '../../../lib/shizuokaSimulationData.js';

  type DistrictId = 'aoi' | 'suruga' | 'shimizu';
  type BuildingTypeKey = 'residential' | 'commercial' | 'public' | 'industrial';
  type DamageLevel = 0 | 1 | 2 | 3 | 4;

  interface FilterChangeDetail {
    districts: DistrictId[];
    damageLevels: DamageLevel[];
    buildingTypes: BuildingTypeKey[];
  }

  const dispatch = createEventDispatcher<{
    filterChange: FilterChangeDetail;
  }>();

  let selectedDistricts: DistrictId[] = [];
  let selectedDamageLevels: string[] = [];
  let selectedBuildingTypes: BuildingTypeKey[] = [];

  const handleFilterChange = (): void => {
    dispatch('filterChange', {
      districts: selectedDistricts,
      damageLevels: selectedDamageLevels.map(Number) as DamageLevel[],
      buildingTypes: selectedBuildingTypes
    });
  };

  const toggleDistrict = (districtId: DistrictId): void => {
    if (selectedDistricts.includes(districtId)) {
      selectedDistricts = selectedDistricts.filter(d => d !== districtId);
    } else {
      selectedDistricts = [...selectedDistricts, districtId];
    }
    handleFilterChange();
  };

  const toggleDamageLevel = (level: string): void => {
    if (selectedDamageLevels.includes(level)) {
      selectedDamageLevels = selectedDamageLevels.filter(l => l !== level);
    } else {
      selectedDamageLevels = [...selectedDamageLevels, level];
    }
    handleFilterChange();
  };

  const toggleBuildingType = (type: BuildingTypeKey): void => {
    if (selectedBuildingTypes.includes(type)) {
      selectedBuildingTypes = selectedBuildingTypes.filter(t => t !== type);
    } else {
      selectedBuildingTypes = [...selectedBuildingTypes, type];
    }
    handleFilterChange();
  };

  const clearFilters = (): void => {
    selectedDistricts = [];
    selectedDamageLevels = [];
    selectedBuildingTypes = [];
    handleFilterChange();
  };
</script>

<div class="bg-white rounded-lg shadow-lg p-4">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-gray-800">フィルター設定</h3>
    <button
      on:click={clearFilters}
      class="text-sm text-blue-600 hover:text-blue-800 transition-colors"
    >
      すべてクリア
    </button>
  </div>
  
  <div class="space-y-4">
    <!-- 地区フィルター -->
    <div>
      <h4 class="text-sm font-medium text-gray-700 mb-2">地区</h4>
      <div class="flex flex-wrap gap-2">
        {#each districts as district}
          <button
            on:click={() => toggleDistrict(district.id)}
            class="px-3 py-1 rounded-full text-sm font-medium transition-all
              {selectedDistricts.includes(district.id) 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          >
            {district.name}
          </button>
        {/each}
      </div>
    </div>
    
    <!-- 被害レベルフィルター -->
    <div>
      <h4 class="text-sm font-medium text-gray-700 mb-2">被害レベル</h4>
      <div class="flex flex-wrap gap-2">
        {#each Object.entries(damageTypes) as [level, type]}
          <button
            on:click={() => toggleDamageLevel(level)}
            class="px-3 py-1 rounded-full text-sm font-medium transition-all flex items-center gap-1
              {selectedDamageLevels.includes(level) 
                ? 'ring-2 ring-offset-1' 
                : ''}"
            style="background-color: {type.color}; color: white; 
              {selectedDamageLevels.includes(level) ? `ring-color: ${type.color}` : ''}"
          >
            {type.label}
          </button>
        {/each}
      </div>
    </div>
    
    <!-- 建物タイプフィルター -->
    <div>
      <h4 class="text-sm font-medium text-gray-700 mb-2">建物タイプ</h4>
      <div class="flex flex-wrap gap-2">
        {#each Object.entries(buildingTypes) as [key, type]}
          <button
            on:click={() => toggleBuildingType(key)}
            class="px-3 py-1 rounded-full text-sm font-medium transition-all
              {selectedBuildingTypes.includes(key) 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          >
            {type.icon} {type.label}
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>