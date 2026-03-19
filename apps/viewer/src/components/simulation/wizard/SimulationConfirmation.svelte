<script lang="ts">
  import { onMount } from 'svelte';
  import { simulationStore } from '../../../lib/stores/simulationStore.svelte';
  import { regionsStore } from '../../../lib/stores/regionsStore.svelte';
  import { fetchEarthquakePresets } from '$lib/api/earthquakePresets.client';
  import type { EarthquakePreset } from '../../../routes/api/earthquake-presets/+server';

  interface Props {
    estimatedTime?: number;
    onConfirm?: () => void;
    onEdit?: (step: number) => void;
  }

  let { estimatedTime = 120, onConfirm = () => {}, onEdit = (step: number) => {} }: Props = $props();

  let simulationData = $derived(simulationStore.formData);
  let earthquakePresets = $state<EarthquakePreset[]>([]);

  onMount(async () => {
    // 地震動プリセット一覧を取得
    try {
      const response = await fetchEarthquakePresets();
      earthquakePresets = response.presets;
    } catch (error) {
      console.error('[SimulationConfirmation] Failed to load earthquake presets:', error);
    }
  });

  // 実際の地域データから名前を取得
  let regionName = $derived.by(() => {
    if (!simulationData.region) return '未選択';
    if (regionsStore.selectedPrefecture && regionsStore.selectedMunicipality) {
      return `${regionsStore.selectedPrefecture.name} ${regionsStore.selectedMunicipality.name}`;
    }
    return simulationData.regionName || simulationData.region;
  });

  // メッシュコードは実際のコードをそのまま表示
  let meshCodes = $derived(simulationData.meshCodes || []);

  // 選択された地震動プリセット
  let selectedPreset = $derived(earthquakePresets.find(p => p.id === simulationData.selectedScenarioId));

  const formatEstimatedTime = (minutes: number): string => {
    if (minutes < 60) {
      return `約${minutes}分`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `約${hours}時間${mins}分` : `約${hours}時間`;
  };
</script>

<div class="space-y-6">
  <div class="bg-gray-50 rounded-lg p-6 space-y-4">
    <div>
      <h3 class="text-lg font-semibold text-gray-900 mb-3">入力内容の確認</h3>
      <div class="bg-blue-100 border border-blue-300 rounded-lg p-4 text-center">
        <div class="text-sm text-blue-700 mb-1">推定実行時間</div>
        <div class="text-2xl font-bold text-blue-900">{formatEstimatedTime(estimatedTime)}</div>
      </div>
    </div>

    <div class="space-y-4 text-sm">
      <div class="border-b pb-3">
        <div class="flex items-center justify-between">
          <span class="font-medium text-gray-700">対象地域</span>
          <button
            onclick={() => onEdit(1)}
            class="text-blue-600 hover:text-blue-700 text-xs"
          >
            編集
          </button>
        </div>
        <p class="mt-1 text-gray-900">{regionName}</p>
      </div>

      <div class="border-b pb-3">
        <div class="flex items-center justify-between">
          <span class="font-medium text-gray-700">メッシュコード</span>
          <button
            onclick={() => onEdit(2)}
            class="text-blue-600 hover:text-blue-700 text-xs"
          >
            編集
          </button>
        </div>
        <div class="mt-1">
          {#if meshCodes.length > 0}
            <p class="text-gray-900 mb-2">{meshCodes.length}個のメッシュコードを選択</p>
            <div class="flex flex-wrap gap-2">
              {#each meshCodes as code}
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  {code}
                </span>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500">未選択</p>
          {/if}
        </div>
      </div>

      <div class="border-b pb-3">
        <div class="flex items-center justify-between">
          <span class="font-medium text-gray-700">地震動プリセット</span>
          <button
            onclick={() => onEdit(3)}
            class="text-blue-600 hover:text-blue-700 text-xs"
          >
            編集
          </button>
        </div>
        <div class="mt-1 space-y-1 text-gray-900">
          {#if selectedPreset}
            <p class="font-medium">{selectedPreset.presetName}</p>
            {#if selectedPreset.regionName}
              <p class="text-sm text-gray-600">対象地域: {selectedPreset.regionName}</p>
            {/if}
            {#if selectedPreset.description}
              <p class="text-sm text-gray-600">{selectedPreset.description}</p>
            {/if}
          {:else}
            <p class="text-gray-500">未選択</p>
          {/if}
        </div>
      </div>

      <div class="border-b pb-3">
        <div class="flex items-center justify-between">
          <span class="font-medium text-gray-700">ログイン要否</span>
        </div>
        <div class="mt-2">
          <label class="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={simulationData.requiresLogin}
              onchange={(e) => simulationStore.updateFormData({ requiresLogin: e.currentTarget.checked })}
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span class="ml-2 text-sm text-gray-900">
              結果の閲覧にログインを必要とする
            </span>
          </label>
          <p class="mt-1 text-xs text-gray-500">
            チェックを入れると、シミュレーション結果の閲覧に認証が必要になります
          </p>
        </div>
      </div>
    </div>
  </div>

  <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
    <div class="flex">
      <svg class="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div class="text-sm text-yellow-800">
        <p class="font-medium">実行前の確認事項</p>
        <ul class="mt-1 ml-4 list-disc space-y-1">
          <li>シミュレーションの実行には{formatEstimatedTime(estimatedTime)}程度かかります</li>
          <li>実行開始後のキャンセルはできません</li>
          <li>結果はメールで通知されます</li>
        </ul>
      </div>
    </div>
  </div>
</div>