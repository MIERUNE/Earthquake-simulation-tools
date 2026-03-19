<script lang="ts">
  import type { Prefecture, Municipality } from '$lib/types/region';
  import { regionsStore } from '$lib/stores/regionsStore.svelte';
  import { simulationStore } from '../../../lib/stores/simulationStore.svelte';
  import { onMount } from 'svelte';

  type RegionName = '北海道' | '東北' | '関東' | '中部' | '近畿' | '中国' | '四国' | '九州';

  // 状態管理
  let prefectureSearchQuery = $state<string>('');
  let municipalitySearchQuery = $state<string>('');
  let isPrefectureDropdownOpen = $state<boolean>(false);
  let isMunicipalityDropdownOpen = $state<boolean>(false);

  // cities.jsonから取得する利用可能な都道府県と市区町村
  let availablePrefectures = $state<Set<string>>(new Set());
  let availableMunicipalities = $state<Set<string>>(new Set());
  // cities.jsonから都道府県名ごとの市区町村リスト
  let citiesByPrefecture = $state<Map<string, Municipality[]>>(new Map());

  // cities.jsonを読み込んで利用可能な地域を抽出
  onMount(async () => {
    try {
      const response = await fetch('/cities.json');
      const data: { cities: Array<{ code: string; prefecture: string; name: string; center: { lat: number; lng: number } }> } = await response.json();

      const prefSet = new Set<string>();
      const muniSet = new Set<string>();
      const byPref = new Map<string, Municipality[]>();

      data.cities.forEach((city) => {
        prefSet.add(city.prefecture);
        muniSet.add(city.name);

        // 都道府県IDを取得
        const pref = regionsStore.prefectures.find(p => p.name === city.prefecture);
        if (pref) {
          if (!byPref.has(city.prefecture)) {
            byPref.set(city.prefecture, []);
          }
          byPref.get(city.prefecture)!.push({
            id: `${pref.id}-${city.code}`,
            name: city.name,
            prefectureId: pref.id,
            code: city.code,
            center: city.center,
            hasPlateauData: true
          });
        }
      });

      availablePrefectures = prefSet;
      availableMunicipalities = muniSet;
      citiesByPrefecture = byPref;
    } catch (error) {
      console.error('Failed to load cities.json:', error);
    }
  });

  // 地域ごとに都道府県をグループ化（cities.jsonに存在するもののみ）
  const regions = $derived.by((): Record<RegionName, Prefecture[]> => {
    return {
      '北海道': regionsStore.prefectures.filter(p => p.region === '北海道' && availablePrefectures.has(p.name)),
      '東北': regionsStore.prefectures.filter(p => p.region === '東北' && availablePrefectures.has(p.name)),
      '関東': regionsStore.prefectures.filter(p => p.region === '関東' && availablePrefectures.has(p.name)),
      '中部': regionsStore.prefectures.filter(p => p.region === '中部' && availablePrefectures.has(p.name)),
      '近畿': regionsStore.prefectures.filter(p => p.region === '近畿' && availablePrefectures.has(p.name)),
      '中国': regionsStore.prefectures.filter(p => p.region === '中国' && availablePrefectures.has(p.name)),
      '四国': regionsStore.prefectures.filter(p => p.region === '四国' && availablePrefectures.has(p.name)),
      '九州': regionsStore.prefectures.filter(p => p.region === '九州' && availablePrefectures.has(p.name))
    };
  });

  // フィルタリングされた都道府県（cities.jsonに存在するもののみ）
  const filteredPrefectures = $derived(
    regionsStore.prefectures.filter(pref =>
      availablePrefectures.has(pref.name) &&
      pref.name.toLowerCase().includes(prefectureSearchQuery.toLowerCase())
    )
  );

  // フィルタリングされた市区町村（cities.jsonに存在するもののみ）
  const filteredMunicipalities = $derived(
    regionsStore.municipalities.filter(muni =>
      availableMunicipalities.has(muni.name) &&
      muni.name.toLowerCase().includes(municipalitySearchQuery.toLowerCase())
    )
  );

  // 都道府県を選択
  const selectPrefecture = (prefecture: Prefecture): void => {
    regionsStore.selectPrefecture(prefecture);

    // cities.jsonのデータで市区町村リストを上書き
    const munis = citiesByPrefecture.get(prefecture.name) || [];
    regionsStore.municipalities = munis;

    isPrefectureDropdownOpen = false;
    prefectureSearchQuery = '';

    // 市区町村が1つしかない場合は自動選択
    if (regionsStore.municipalities.length === 1) {
      selectMunicipality(regionsStore.municipalities[0]);
    }
  };

  // 市区町村を選択
  const selectMunicipality = (municipality: Municipality): void => {
    regionsStore.selectMunicipality(municipality);
    isMunicipalityDropdownOpen = false;
    municipalitySearchQuery = '';

    // ストアを更新
    if (regionsStore.selectedPrefecture && regionsStore.selectedMunicipality) {
      // 地域名を構築（例: "静岡市・葵区"）
      const regionName = `${regionsStore.selectedPrefecture.name}・${municipality.name}`;
      simulationStore.updateFormData({
        region: `${regionsStore.selectedPrefecture.id}_${municipality.id}`,
        regionName: regionName,
        meshCodes: [],
        parameters: null,
        selectedScenarioId: undefined,
        selectedScenarioName: undefined
      });
    }
  };

  // ドロップダウンの開閉
  const togglePrefectureDropdown = (): void => {
    isPrefectureDropdownOpen = !isPrefectureDropdownOpen;
    if (isPrefectureDropdownOpen) {
      setTimeout(() => {
        document.getElementById('prefecture-search')?.focus();
      }, 100);
    }
  };

  const toggleMunicipalityDropdown = (): void => {
    if (regionsStore.selectedPrefecture && regionsStore.municipalities.length > 0) {
      isMunicipalityDropdownOpen = !isMunicipalityDropdownOpen;
      if (isMunicipalityDropdownOpen) {
        setTimeout(() => {
          document.getElementById('municipality-search')?.focus();
        }, 100);
      }
    }
  };

  // クリック外側でドロップダウンを閉じる
  const handleClickOutside = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    if (!target.closest('.prefecture-selector-container')) {
      isPrefectureDropdownOpen = false;
    }
    if (!target.closest('.municipality-selector-container')) {
      isMunicipalityDropdownOpen = false;
    }
  };
</script>

<svelte:window onclick={handleClickOutside} />

<div class="space-y-4">
  <!-- 都道府県選択 -->
  <div class="prefecture-selector-container relative">
    <label class="block text-sm font-medium text-gray-700 mb-2">
      都道府県を選択
    </label>
    
    <button
      onclick={togglePrefectureDropdown}
      class="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      aria-haspopup="listbox"
      aria-expanded={isPrefectureDropdownOpen}
    >
      <div class="flex items-center justify-between">
        <span class={regionsStore.selectedPrefecture ? 'text-gray-900' : 'text-gray-500'}>
          {regionsStore.selectedPrefecture ? regionsStore.selectedPrefecture.name : '都道府県を選択してください'}
        </span>
        <svg
          class="w-5 h-5 text-gray-400 transition-transform {isPrefectureDropdownOpen ? 'rotate-180' : ''}"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>

    {#if isPrefectureDropdownOpen}
      <div class="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
        <div class="p-3 border-b sticky top-0 bg-white">
          <input
            id="prefecture-search"
            type="text"
            bind:value={prefectureSearchQuery}
            placeholder="都道府県名で検索..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div class="max-h-80 overflow-y-auto">
          {#if prefectureSearchQuery}
            <!-- 検索結果 -->
            <ul role="listbox">
              {#each filteredPrefectures as prefecture}
                <li>
                  <button
                    onclick={() => selectPrefecture(prefecture)}
                    class="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors {
                      prefecture.id === regionsStore.selectedPrefecture?.id ? 'bg-blue-100 text-blue-700' : ''
                    }"
                    role="option"
                    aria-selected={prefecture.id === regionsStore.selectedPrefecture?.id}
                  >
                    <div class="font-medium">{prefecture.name}</div>
                    <div class="text-xs text-gray-500">{prefecture.region}地方</div>
                  </button>
                </li>
              {/each}
              {#if filteredPrefectures.length === 0}
                <li class="px-4 py-3 text-center text-gray-500">
                  該当する都道府県が見つかりません
                </li>
              {/if}
            </ul>
          {:else}
            <!-- 地域別グループ表示 -->
            {#each Object.entries(regions) as [regionName, regionPrefectures]}
              {#if regionPrefectures.length > 0}
                <div class="border-b last:border-b-0">
                  <div class="px-4 py-2 bg-gray-50 font-medium text-sm text-gray-700">
                    {regionName}地方
                  </div>
                  <ul>
                    {#each regionPrefectures as prefecture}
                      <li>
                        <button
                          onclick={() => selectPrefecture(prefecture)}
                          class="w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors {
                            prefecture.id === regionsStore.selectedPrefecture?.id ? 'bg-blue-100 text-blue-700' : ''
                          }"
                          role="option"
                          aria-selected={prefecture.id === regionsStore.selectedPrefecture?.id}
                        >
                          {prefecture.name}
                        </button>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
            {/each}
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- 市区町村選択 -->
  <div class="municipality-selector-container relative">
    <label class="block text-sm font-medium text-gray-700 mb-2">
      市区町村を選択
    </label>
    
    <button
      onclick={toggleMunicipalityDropdown}
      disabled={!regionsStore.selectedPrefecture || regionsStore.municipalities.length === 0}
      class="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm transition-colors
        {regionsStore.selectedPrefecture && regionsStore.municipalities.length > 0
          ? 'hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          : 'opacity-50 cursor-not-allowed'}"
      aria-haspopup="listbox"
      aria-expanded={isMunicipalityDropdownOpen}
    >
      <div class="flex items-center justify-between">
        <span class={regionsStore.selectedMunicipality ? 'text-gray-900' : 'text-gray-500'}>
          {#if !regionsStore.selectedPrefecture}
            先に都道府県を選択してください
          {:else if regionsStore.municipalities.length === 0}
            この都道府県のデータは準備中です
          {:else if regionsStore.selectedMunicipality}
            {regionsStore.selectedMunicipality.name}
          {:else}
            市区町村を選択してください
          {/if}
        </span>
        <svg
          class="w-5 h-5 text-gray-400 transition-transform {isMunicipalityDropdownOpen ? 'rotate-180' : ''}"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>

    {#if isMunicipalityDropdownOpen}
      <div class="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
        <div class="p-3 border-b sticky top-0 bg-white">
          <input
            id="municipality-search"
            type="text"
            bind:value={municipalitySearchQuery}
            placeholder="市区町村名で検索..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <ul class="max-h-80 overflow-y-auto" role="listbox">
          {#each filteredMunicipalities as municipality}
            <li>
              <button
                onclick={() => selectMunicipality(municipality)}
                class="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors {
                  municipality.id === regionsStore.selectedMunicipality?.id ? 'bg-blue-100 text-blue-700' : ''
                }"
                role="option"
                aria-selected={municipality.id === regionsStore.selectedMunicipality?.id}
              >
                {municipality.name}
              </button>
            </li>
          {/each}
          {#if filteredMunicipalities.length === 0}
            <li class="px-4 py-3 text-center text-gray-500">
              該当する市区町村が見つかりません
            </li>
          {/if}
        </ul>
      </div>
    {/if}
  </div>

  <!-- 選択内容の表示 -->
  {#if regionsStore.selectedPrefecture && regionsStore.selectedMunicipality}
    <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div class="text-sm text-blue-800">
        <div class="font-medium">選択された地域</div>
        <div class="mt-1">
          {regionsStore.selectedPrefecture.name} {regionsStore.selectedMunicipality.name}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .rotate-180 {
    transform: rotate(180deg);
  }
</style>