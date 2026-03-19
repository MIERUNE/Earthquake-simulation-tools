<script lang="ts">
  type EmergencyRoadType = '1' | '2' | '3' | 'all';
  type BlockageRange = 'low' | 'medium' | 'high';

  interface FilterChangeEvent {
    emergencyRoadTypes: string[];
    blockageRanges: string[];
    showOnlyEmergencyRoads: boolean;
  }

  // 緊急輸送道路の種別定義
  const emergencyRoadTypes = {
    'all': { label: 'すべて', color: '#6B7280', borderColor: '#4B5563' },
    '1': { label: '第1次', color: '#FF4B00', borderColor: '#CC3C00' },
    '2': { label: '第2次', color: '#10B981', borderColor: '#059669' },
    '3': { label: '第3次', color: '#3B82F6', borderColor: '#2563EB' }
  };

  // 閉塞率範囲の定義
  const blockageRanges = {
    'low': { label: '通行可能', icon: '✓', color: '#3B82F6', borderColor: '#2563EB', min: 0, max: 10 },
    'medium': { label: '要注意', icon: '!', color: '#F59E0B', borderColor: '#D97706', min: 11, max: 50 },
    'high': { label: '通行困難', icon: '✕', color: '#EF4444', borderColor: '#DC2626', min: 51, max: 100 }
  };

  let {
    onFilterChange
  }: {
    onFilterChange?: (event: FilterChangeEvent) => void;
  } = $props();

  let selectedEmergencyRoadTypes = $state<EmergencyRoadType[]>([]);
  let selectedBlockageRanges = $state<BlockageRange[]>([]);
  let showOnlyEmergencyRoads = $state(false);

  const handleFilterChange = () => {
    if (onFilterChange) {
      onFilterChange({
        emergencyRoadTypes: selectedEmergencyRoadTypes,
        blockageRanges: selectedBlockageRanges,
        showOnlyEmergencyRoads
      });
    }
  };

  const toggleEmergencyRoadType = (type: EmergencyRoadType) => {
    if (type === 'all') {
      selectedEmergencyRoadTypes = selectedEmergencyRoadTypes.includes('all') ? [] : ['all'];
      showOnlyEmergencyRoads = false;
    } else {
      if (selectedEmergencyRoadTypes.includes(type)) {
        selectedEmergencyRoadTypes = selectedEmergencyRoadTypes.filter(t => t !== type);
      } else {
        selectedEmergencyRoadTypes = [...selectedEmergencyRoadTypes.filter(t => t !== 'all'), type];
      }
      showOnlyEmergencyRoads = selectedEmergencyRoadTypes.length > 0 && !selectedEmergencyRoadTypes.includes('all');
    }
    handleFilterChange();
  };

  const toggleBlockageRange = (range: BlockageRange) => {
    if (selectedBlockageRanges.includes(range)) {
      selectedBlockageRanges = selectedBlockageRanges.filter(r => r !== range);
    } else {
      selectedBlockageRanges = [...selectedBlockageRanges, range];
    }
    handleFilterChange();
  };

  const clearFilters = () => {
    selectedEmergencyRoadTypes = [];
    selectedBlockageRanges = [];
    showOnlyEmergencyRoads = false;
    handleFilterChange();
  };
</script>

<div class="bg-white rounded-lg shadow-lg p-4 space-y-4">
  <!-- ヘッダー -->
  <div class="flex items-center justify-between">
    <h3 class="text-base font-semibold text-gray-800">フィルター</h3>
    {#if selectedEmergencyRoadTypes.length > 0 || selectedBlockageRanges.length > 0}
      <button
        onclick={clearFilters}
        class="text-xs px-2 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
      >
        クリア
      </button>
    {/if}
  </div>

  <!-- 緊急輸送道路フィルター -->
  <div>
    <h4 class="text-xs font-medium text-gray-600 mb-2">緊急輸送道路</h4>
    <div class="flex flex-wrap gap-2">
      {#each Object.entries(emergencyRoadTypes) as [key, type]}
        <button
          onclick={() => toggleEmergencyRoadType(key as EmergencyRoadType)}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                 {selectedEmergencyRoadTypes.includes(key as EmergencyRoadType)
                   ? 'text-white shadow-md transform scale-105'
                   : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          style={selectedEmergencyRoadTypes.includes(key as EmergencyRoadType)
            ? `background-color: ${type.color};`
            : ''}
        >
          {#if selectedEmergencyRoadTypes.includes(key as EmergencyRoadType)}
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
            </svg>
          {:else}
            <span class="w-2 h-2 rounded-full" style="background-color: {type.color};"></span>
          {/if}
          <span>{type.label}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- 閉塞率フィルター -->
  <div>
    <h4 class="text-xs font-medium text-gray-600 mb-2">閉塞率</h4>
    <div class="flex flex-wrap gap-2">
      {#each Object.entries(blockageRanges) as [range, info]}
        <button
          onclick={() => toggleBlockageRange(range as BlockageRange)}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                 {selectedBlockageRanges.includes(range as BlockageRange)
                   ? 'text-white shadow-md transform scale-105'
                   : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          style={selectedBlockageRanges.includes(range as BlockageRange)
            ? `background-color: ${info.color};`
            : ''}
        >
          {#if selectedBlockageRanges.includes(range as BlockageRange)}
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
            </svg>
          {:else}
            <span class="w-2 h-2 rounded-full" style="background-color: {info.color};"></span>
          {/if}
          <span>{info.label}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- フィルター適用中の情報表示 -->
  {#if showOnlyEmergencyRoads}
    <div class="pt-2 border-t border-gray-200">
      <div class="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
        <svg class="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
        </svg>
        <p class="text-xs text-blue-700 leading-relaxed">
          選択した道路のみ表示中
        </p>
      </div>
    </div>
  {/if}
</div>
