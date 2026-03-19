<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { simulationsListStore } from '../lib/stores/simulationsListStore.svelte';
  import SearchFilter from '../components/common/SearchFilter.svelte';
  import SimulationList from '../components/simulation/SimulationList.svelte';
  import Pagination from '../components/common/Pagination.svelte';
  import LoginDialog from '../components/common/LoginDialog.svelte';
  import type { SimulationListFilter, ViewerInfoItem } from '../lib/types/viewerInfo';
  import { getCityCodeFromRegionName } from '../lib/utils/cityDataResolver';

  // デバッグモードの検出
  let isDebugMode = $state(false);

  // フィルター条件
  let keyword = $state('');
  let startDate = $state('');
  let endDate = $state('');
  let loginFilter = $state<'all' | 'required' | 'notRequired'>('all');

  // ログインダイアログの状態
  let showLoginDialog = $state(false);
  let selectedSimulation = $state<ViewerInfoItem | null>(null);

  // Storeから状態を取得
  const displayedSimulations = $derived(simulationsListStore.displayedSimulations);
  const filteredSimulations = $derived(simulationsListStore.filteredSimulations);
  const currentPage = $derived(simulationsListStore.currentPage);
  const totalPages = $derived(simulationsListStore.totalPages);
  const sortOrder = $derived(simulationsListStore.sortOrder);
  const isLoading = $derived(simulationsListStore.isLoading);
  const error = $derived(simulationsListStore.error);

  onMount(() => {
    // デバッグモードの検出
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      isDebugMode = params.get('debug') === 'true';
    }

    // 初回データ取得
    simulationsListStore.fetchSimulations();
  });

  const applyFilters = () => {
    const filter: SimulationListFilter = {
      keyword: keyword || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      loginFilter: loginFilter === 'all' ? undefined : loginFilter
    };
    simulationsListStore.applyFilter(filter);
  };

  const handleSearch = (value: string) => {
    keyword = value;
    applyFilters();
  };

  const handleDateRangeChange = (start: string, end: string) => {
    startDate = start;
    endDate = end;
    applyFilters();
  };

  const handleLoginFilterChange = (value: 'all' | 'required' | 'notRequired') => {
    loginFilter = value;
    applyFilters();
  };

  const handleSort = () => {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    simulationsListStore.setSortOrder(newOrder);
  };

  const handlePageChange = (page: number) => {
    simulationsListStore.setPage(page);
  };

  const handleItemClick = (simulation: ViewerInfoItem) => {
    if (simulation.requiresLogin) {
      selectedSimulation = simulation;
      showLoginDialog = true;
    } else {
      navigateToDashboard(simulation);
    }
  };

  const handleLoginSuccess = (data: { simulation: ViewerInfoItem | null | undefined }) => {
    showLoginDialog = false;
    if (data.simulation) {
      navigateToDashboard(data.simulation);
    }
  };

  const handleLoginClose = () => {
    showLoginDialog = false;
  };

  const navigateToDashboard = async (simulation: ViewerInfoItem) => {
    // セッションストレージにも保存（後方互換性のため）
    sessionStorage.setItem('selectedSimulation', JSON.stringify(simulation));

    // シミュレーションIDベースのURLに遷移
    const url = `/dashboard/${simulation.id}`;
    goto(url);
  };
</script>

<div class="min-h-screen bg-gray-50">
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-800">建物振動シミュレーション</h1>
        <a href="/" class="text-blue-600 hover:text-blue-700 font-medium">
          ← トップへ戻る
        </a>
      </div>
    </div>
  </header>

  <main class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <div class="flex items-center gap-3 mb-2">
        <h2 class="text-3xl font-bold text-gray-800">過去のシミュレーション一覧</h2>
        {#if isDebugMode}
          <span class="px-3 py-1 bg-yellow-100 border border-yellow-400 text-yellow-800 text-sm font-semibold rounded-full">
            デバッグモード
          </span>
        {/if}
      </div>
      <p class="text-gray-600">保存されたシミュレーション結果を検索・閲覧できます</p>
      {#if isDebugMode}
        <p class="mt-2 text-sm text-yellow-700">
          モックデータを表示しています（バックエンド接続なし）
        </p>
      {/if}
    </div>

    <SearchFilter
      onSearch={handleSearch}
      onDateRangeChange={handleDateRangeChange}
      onLoginFilterChange={handleLoginFilterChange}
    />

    {#if error}
      <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-red-800">{error}</p>
        <button
          onclick={() => simulationsListStore.clearError()}
          class="mt-2 text-sm text-red-600 hover:text-red-800"
        >
          閉じる
        </button>
      </div>
    {/if}

    {#if isLoading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p class="ml-4 text-gray-600">読み込み中...</p>
      </div>
    {:else}
      <div class="mb-4 text-sm text-gray-600">
        {filteredSimulations.length} 件の結果が見つかりました
      </div>

      <SimulationList
        simulations={displayedSimulations}
        {sortOrder}
        onSort={handleSort}
        onItemClick={handleItemClick}
      />

      {#if totalPages > 1}
        <div class="mt-6">
          <Pagination
            {currentPage}
            {totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      {/if}
    {/if}
  </main>

  <LoginDialog
    bind:isOpen={showLoginDialog}
    {selectedSimulation}
    onClose={handleLoginClose}
    onLoginSuccess={handleLoginSuccess}
  />
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
