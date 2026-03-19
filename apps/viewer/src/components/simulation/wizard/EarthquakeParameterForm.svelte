<script lang="ts">
  import { onMount } from 'svelte';
  import { simulationStore } from '../../../lib/stores/simulationStore.svelte';
  import { fetchEarthquakePresets } from '$lib/api/earthquakePresets.client';
  import type { EarthquakePreset } from '../../../routes/api/earthquake-presets/+server';

  // 地震動プリセット一覧
  let presets = $state<EarthquakePreset[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  // 選択されたプリセットID
  let selectedPresetId = $state<string | null>(null);

  onMount(async () => {
    await loadPresets();
  });

  const loadPresets = async (): Promise<void> => {
    isLoading = true;
    error = null;

    try {
      const response = await fetchEarthquakePresets();
      presets = response.presets;

      // すでに選択されているプリセットIDがあれば復元
      if (simulationStore.formData.selectedScenarioId) {
        selectedPresetId = simulationStore.formData.selectedScenarioId;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : '地震動プリセットの取得に失敗しました';
      console.error('[EarthquakeParameterForm] Failed to load presets:', err);
    } finally {
      isLoading = false;
    }
  };

  const selectPreset = (presetId: string): void => {
    selectedPresetId = presetId;

    // 選択されたプリセットの名前を取得
    const selectedPreset = presets.find(p => p.id === presetId);
    const presetName = selectedPreset?.presetName || presetId;

    // ストアを更新（プリセットIDと名前を保存）
    simulationStore.updateFormData({
      selectedScenarioId: presetId,
      selectedScenarioName: presetName,
      parameters: null // パラメータはバックエンドで取得
    });
  };
</script>

<div class="space-y-6">
  <div>
    <h3 class="text-lg font-medium text-gray-900 mb-4">地震動プリセットを選択</h3>

    {#if isLoading}
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">読み込み中...</span>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex">
          <svg class="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div class="text-sm font-medium text-red-800">エラーが発生しました</div>
            <div class="text-sm text-red-700 mt-1">{error}</div>
          </div>
        </div>
        <button
          onclick={loadPresets}
          class="mt-3 text-sm text-red-600 hover:text-red-800 underline"
        >
          再試行
        </button>
      </div>
    {:else if presets.length === 0}
      <div class="text-center py-8 text-gray-500">
        <svg class="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p>地震動プリセットが登録されていません</p>
        <p class="text-sm mt-1">管理画面から地震動プリセットを作成してください</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each presets as preset}
          <label class="block cursor-pointer">
            <div class="border rounded-lg p-4 hover:bg-gray-50 transition-colors {
              selectedPresetId === preset.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }">
              <div class="flex items-start">
                <input
                  type="radio"
                  name="preset"
                  value={preset.id}
                  checked={selectedPresetId === preset.id}
                  onchange={() => selectPreset(preset.id)}
                  class="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div class="ml-3 flex-1">
                  <div class="font-medium text-gray-900">
                    {preset.presetName}
                  </div>
                  {#if preset.regionName}
                    <div class="text-sm text-gray-600 mt-1">
                      対象地域: {preset.regionName}
                    </div>
                  {/if}
                  {#if preset.description}
                    <div class="text-sm text-gray-500 mt-1">
                      {preset.description}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </label>
        {/each}
      </div>
    {/if}
  </div>
</div>
