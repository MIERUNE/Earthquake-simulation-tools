<script lang="ts">
  import type { ViewerInfoItem } from '../../lib/types/viewerInfo';

  type SortOrder = 'desc' | 'asc';

  export let simulations: ViewerInfoItem[] = [];
  export let sortOrder: SortOrder = "desc";
  export let onSort: () => void = () => {};
  export let onItemClick: (simulation: ViewerInfoItem) => void = (_simulation: ViewerInfoItem) => {};

  // テーブルのカラム数（地域、地震動パラメーター、ステータス、日時、ログイン、操作）
  const COLUMN_COUNT = 6;
</script>

<div class="bg-white rounded-lg shadow-md overflow-hidden">
  <table class="w-full">
    <thead class="bg-gray-50 border-b border-gray-200">
      <tr>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          地域
        </th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          地震動パラメーター
        </th>
        <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
          ステータス
        </th>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          <button
            on:click={() => onSort()}
            class="flex items-center gap-1 hover:text-gray-700 transition-colors"
          >
            日時
            {#if sortOrder === "desc"}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            {:else}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
              </svg>
            {/if}
          </button>
        </th>
        <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
          ログイン
        </th>
        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
          操作
        </th>
      </tr>
    </thead>
    <tbody class="bg-white divide-y divide-gray-200">
      {#each simulations as simulation}
        <tr 
          class="hover:bg-gray-50 transition-colors cursor-pointer"
          on:click={() => onItemClick(simulation)}
        >
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            {simulation.region}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
            {simulation.parameter}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-center">
            {#if simulation.status === 'pending'}
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <svg class="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                予約待ち
              </span>
            {:else if simulation.status === 'processing'}
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <svg class="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                実行中
              </span>
            {:else if simulation.status === 'completed'}
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                完了
              </span>
            {:else if simulation.status === 'failed'}
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                失敗
              </span>
            {/if}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
            {simulation.datetime}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-center">
            {#if simulation.requiresLogin}
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                必要
              </span>
            {:else}
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                不要
              </span>
            {/if}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <button
              on:click|stopPropagation={() => onItemClick(simulation)}
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              ダッシュボードを開く
            </button>
          </td>
        </tr>
      {/each}
      {#if simulations.length === 0}
        <tr>
          <td colspan={COLUMN_COUNT} class="px-6 py-12 text-center text-gray-500">
            該当するシミュレーションデータがありません
          </td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>