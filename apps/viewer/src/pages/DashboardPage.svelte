<script lang="ts">
	import { onMount } from 'svelte';
	import DashboardTabs from '../components/dashboard/DashboardTabs.svelte';
	import BuildingDashboard from '../components/dashboard/BuildingDashboard.svelte';
	import RoadDashboard from '../components/dashboard/RoadDashboard.svelte';
	import InteractiveMapDashboard from '../components/dashboard/InteractiveMapDashboard.svelte';
	import type { ViewerInfoItem } from '../lib/types/viewerInfo';
	import { getCityConfig } from '../lib/utils/cityDataResolver';

	// プロパティ
	interface Props {
		data?: {
			cityCode?: string | null;
			cityConfig: Awaited<ReturnType<typeof getCityConfig>>;
			simulationId?: string;
			simulation?: ViewerInfoItem;
		};
		simulationFromRoute?: ViewerInfoItem | null;
	}

	let { data, simulationFromRoute = null }: Props = $props();

	// 市区町村設定はdataから取得
	const cityConfig = data?.cityConfig;

	let activeTab = $state<'building' | 'road' | 'interactive'>('building');
	let selectedSimulation = $state<ViewerInfoItem | null>(null);

	// シミュレーションステータスを取得
	const simulationStatus = $derived(selectedSimulation?.status || 'completed');
	const canShowResults = $derived(simulationStatus === 'completed');
	const isSimulationPending = $derived(simulationStatus === 'pending');
	const isSimulationProcessing = $derived(simulationStatus === 'processing');
	const isSimulationCompleted = $derived(simulationStatus === 'completed');
	const isSimulationFailed = $derived(simulationStatus === 'failed');

	onMount(() => {
		console.log('[Dashboard] City config loaded:', cityConfig);

		// ルートから渡されたシミュレーション情報を優先的に使用
		if (simulationFromRoute) {
			console.log('[Dashboard] Using simulation from route:', simulationFromRoute.id);
			selectedSimulation = simulationFromRoute;
		} else if (data?.simulation) {
			// ページデータからシミュレーション情報を取得（/dashboard/[id]ルート）
			console.log('[Dashboard] Using simulation from page data:', data.simulation.id);
			selectedSimulation = data.simulation;
		}
		// 注意: シミュレーションIDが指定されていない場合は、sessionStorageからの復元をしない
		// これにより、/dashboard?city=xxx では選択されたシミュレーションなしで表示される
	});

	// URLにcityが含まれている場合はナビゲーションリンクを非表示にする
	let shouldHideNavLinks = $state(false);

	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('city')) {
			shouldHideNavLinks = true;
		}
	});
</script>

<div class="min-h-screen bg-gray-50">
  <!-- ヘッダー -->
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="py-4">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-bold text-gray-900">
                {selectedSimulation ? selectedSimulation.region : (cityConfig?.name || '読み込み中...')} 地震被害シミュレーション
              </h1>
              {#if selectedSimulation}
                <!-- ステータスバッジ -->
                {#if isSimulationPending}
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <svg class="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    予約待ち
                  </span>
                {:else if isSimulationProcessing}
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <svg class="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    実行中
                  </span>
                {:else if isSimulationCompleted}
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    完了
                  </span>
                {:else if isSimulationFailed}
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    失敗
                  </span>
                {/if}
              {/if}
            </div>
            <p class="text-sm text-gray-600 mt-1">
              {#if selectedSimulation}
                {selectedSimulation.parameter} - {selectedSimulation.datetime}
              {:else}
                {activeTab === 'building'
                  ? '震度7クラスの地震による建物被害予測（仮想データ）'
                  : activeTab === 'road'
                  ? '震度7クラスの地震による道路閉塞予測（仮想データ）'
                  : '複数のデータレイヤーを選択して地図上に表示'}
              {/if}
            </p>
          </div>
          {#if !shouldHideNavLinks}
          <div class="flex gap-2">
            <a
              href="/past-simulations"
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← 一覧へ戻る
            </a>
            <a
              href="/"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              トップへ
            </a>
          </div>
          {/if}
        </div>
      </div>
    </div>
  </header>  
	<!-- タブ -->
	<DashboardTabs bind:activeTab />

	<!-- ステータス別表示 -->
	{#if isSimulationPending}
		<!-- 予約待ち状態 -->
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
			<div class="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8 text-center">
				<div class="flex flex-col items-center">
					<svg class="w-16 h-16 text-yellow-600 mb-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
					<h2 class="text-2xl font-bold text-yellow-800 mb-2">シミュレーション予約待ち</h2>
					<p class="text-gray-700 mb-4">
						このシミュレーションは現在実行待ちの状態です。
					</p>
					<div class="bg-white rounded-lg p-4 max-w-md">
						<p class="text-sm text-gray-600 mb-2">推定開始時間: 約30分後</p>
						<p class="text-sm text-gray-600">推定実行時間: 約2時間</p>
					</div>
					<p class="text-xs text-gray-500 mt-4">
						※ 実行が開始されると、自動的にステータスが更新されます
					</p>
				</div>
			</div>
		</div>
	{:else if isSimulationProcessing}
		<!-- 実行中状態 -->
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
			<div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 text-center">
				<div class="flex flex-col items-center">
					<svg class="w-16 h-16 text-blue-600 mb-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
					<h2 class="text-2xl font-bold text-blue-800 mb-2">シミュレーション実行中</h2>
					<p class="text-gray-700 mb-4">
						シミュレーションを実行しています。完了までしばらくお待ちください。
					</p>
					<div class="bg-white rounded-lg p-4 max-w-md">
						<div class="w-full bg-gray-200 rounded-full h-2 mb-2">
							<div class="bg-blue-600 h-2 rounded-full animate-pulse" style="width: 45%"></div>
						</div>
						<p class="text-sm text-gray-600">進行状況: 処理中...</p>
					</div>
					<p class="text-xs text-gray-500 mt-4">
						※ 完了後、結果が自動的に表示されます
					</p>
				</div>
			</div>
		</div>
	{:else if isSimulationFailed}
		<!-- 失敗状態 -->
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
			<div class="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
				<div class="flex flex-col items-center">
					<svg class="w-16 h-16 text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
					<h2 class="text-2xl font-bold text-red-800 mb-2">シミュレーション失敗</h2>
					<p class="text-gray-700 mb-4">
						シミュレーションの実行中にエラーが発生しました。
					</p>
					<div class="bg-white rounded-lg p-4 max-w-md text-left">
						<p class="text-sm font-medium text-gray-700 mb-2">考えられる原因:</p>
						<ul class="text-sm text-gray-600 list-disc list-inside space-y-1">
							<li>入力パラメータの不正</li>
							<li>システムリソースの不足</li>
							<li>計算処理のタイムアウト</li>
						</ul>
					</div>
					<a
						href="/past-simulations"
						class="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						一覧に戻る
					</a>
				</div>
			</div>
		</div>
	{:else if canShowResults}
		<!-- 完了状態 - タブコンテンツを表示 -->
		{#if activeTab === 'building'}
			<BuildingDashboard cityCode={data?.cityCode} simulation={selectedSimulation} />
		{:else if activeTab === 'road'}
			<RoadDashboard cityCode={data?.cityCode} simulation={selectedSimulation} />
		{:else if activeTab === 'interactive'}
			<div class="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
				{#if cityConfig}
					<InteractiveMapDashboard {cityConfig} simulation={selectedSimulation} />
				{:else}
					<div class="flex items-center justify-center h-64">
						<div class="text-gray-600">読み込み中...</div>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>