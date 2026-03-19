<script>
  import LayerDownloadLink from '../common/LayerDownloadLink.svelte';

  let {
    datasets = [],
    selectedDatasets = [],
    onToggleDataset = (id) => {},
    isLoading = false,
  } = $props();

  console.log("MapDataList datasets:", datasets, "isLoading:", isLoading);

  // カテゴリー別にデータセットをグループ化（動的に生成）
  let groupedDatasets = $derived(
    (() => {
      const grouped = [];
      const categoryMap = new Map();

      // datasetsから実際に存在するカテゴリーを抽出してグループ化
      datasets.forEach((dataset) => {
        const category = dataset.category || "その他";

        if (!categoryMap.has(category)) {
          const newGroup = {
            label: category,
            items: []
          };
          categoryMap.set(category, newGroup);
          grouped.push(newGroup);
        }

        categoryMap.get(category).items.push(dataset);
      });

      console.log("Grouped datasets:", grouped);
      return grouped;
    })()
  );

  function handleToggle(datasetId) {
    onToggleDataset(datasetId);
  }

  function isSelected(datasetId) {
    return selectedDatasets.includes(datasetId);
  }
</script>

<div class="h-full bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
  <div class="p-4 border-b bg-gray-50">
    <h3 class="text-lg font-semibold text-gray-800">個別建物の被害予測</h3>
    <p class="text-sm text-gray-600 mt-1">表示するデータを選択してください</p>
    <p class="text-xs text-gray-500 mt-1">データセット数: {datasets.length}</p>
  </div>

  <div class="flex-1 overflow-y-auto">
    {#if isLoading}
      <div class="p-4 text-center text-gray-500">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p class="mt-2">データを読み込んでいます...</p>
      </div>
    {:else if datasets.length === 0}
      <div class="p-4 text-center text-gray-500">データがありません</div>
    {:else}
      {#each groupedDatasets as group}
        {#if group.items.length > 0}
          <div class="border-b">
            <div class="px-4 py-3 bg-gray-50">
              <h4 class="text-sm font-medium text-gray-700">
                {group.label} ({group.items.length}件)
              </h4>
            </div>
            <div class="divide-y">
              {#each group.items as dataset}
              <div class="px-4 py-3 hover:bg-gray-50 transition-colors">
                <label class="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected(dataset.id)}
                    onchange={() => handleToggle(dataset.id)}
                    class="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div class="ml-3 flex-1">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-gray-900">
                          {dataset.name}
                        </span>
                        {#if dataset.downloadUrl}
                          <LayerDownloadLink href={dataset.downloadUrl} class="size-6 sm:size-7" />
                        {/if}
                      </div>
                      {#if dataset.count}
                        <span class="text-xs text-gray-500">
                          {dataset.count.toLocaleString()}件
                        </span>
                      {/if}
                    </div>
                    {#if dataset.description}
                      <p class="text-xs text-gray-600 mt-1">
                        {dataset.description}
                      </p>
                    {/if}
                    {#if dataset.legend}
                      <div class="mt-2 flex items-center space-x-3">
                        {#each dataset.legend as item}
                          <div class="flex items-center">
                            <div
                              class="w-3 h-3 rounded-full mr-1"
                              style="background-color: {item.color}"
                            ></div>
                            <span class="text-xs text-gray-600"
                              >{item.label}</span
                            >
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </label>
              </div>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    {/if}
  </div>

  <div class="p-4 border-t bg-gray-50">
    <div class="text-xs text-gray-600">
      {selectedDatasets.length}個のデータセットを選択中
    </div>
  </div>
</div>

<style>
  input[type="checkbox"] {
    border: 1px solid #d1d5db;
  }

  input[type="checkbox"]:checked {
    background-color: #2563eb;
    border-color: #2563eb;
  }
</style>
