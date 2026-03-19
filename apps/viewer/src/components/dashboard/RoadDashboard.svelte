<script>
	console.log('RoadDashboard component loading...');
	import RoadMapSimple from './maps/RoadMapSimple.svelte';
	import LoadingOverlay from './common/LoadingOverlay.svelte';
	import RoadSummaryCards from './cards/RoadSummaryCards.svelte';
	import RoadBlockageChart from './charts/RoadBlockageChart.svelte';
	import AccessibilityChart from './charts/AccessibilityChart.svelte';
	import RoadFilterPanel from './filters/RoadFilterPanel.svelte';
	import RoadMapLegends from './legends/RoadMapLegends.svelte';

	// Props (simulation can be ViewerInfoItem | null)
	let { cityCode = null, simulation = null } = $props();

	// 定数定義
	const METERS_PER_KM = 1000; // 1キロメートルは1000メートル（km→m変換時に乗算）

	// データの状態管理
	let roadStats = $state({
		totalLength: 0,
		passableLength: 0,
		blockedLength: 0,
		passableRate: 0,
		blockedCount: 0,
		isolatedPoints: 0
	});
	let selectedFilters = $state({
		emergencyRoadTypes: [],
		blockageRanges: [],
		showOnlyEmergencyRoads: false
	});

	// バッファ距離の選択肢と状態管理
	const bufferDistanceOptions = [10, 20, 30, 40, 50];
	let selectedBufferDistance = $state(30);
	let mapComponent = $state();

	// 背景地図の選択状態
	let selectedBaseMap = $state('aerial'); // デフォルトは航空写真

	// 計算開始ハンドラー
	async function handleCalculateClick() {
		if (!mapComponent) return;

		// ボタン要素とボディ全体のカーソルを即座に変更
		const bodyElement = document.body;
		const rootElement = document.documentElement;

		bodyElement.style.cursor = 'wait';
		rootElement.style.cursor = 'wait';

		// 少し待ってから計算を開始（カーソルが確実に変わるのを待つ）
		await new Promise((resolve) => requestAnimationFrame(resolve));

		try {
			await mapComponent.calculateRoadBlockage();
		} finally {
			// カーソルを元に戻す
			bodyElement.style.cursor = '';
			rootElement.style.cursor = '';
		}
	}

	// RoadMapSimpleから統計情報を取得（bindable prop）
	let mapStatistics = $state({
		totalLength: 0,
		passableLength: 0,
		blockedLength: 0,
		isolatedPoints: 0
	});

	// RoadMapSimpleから避難所周辺道路状況を取得（bindable prop）
	let shelterAccessibility = $state({
		good: 0,
		warning: 0,
		difficult: 0
	});

	// RoadMapSimpleから計算中の状態を取得（bindable prop）
	let isCalculating = $state(false);

	// RoadMapSimpleから初期化・計算中の状態を取得（bindable prop）
	let isLoading = $state(false);

	// mapStatisticsが更新されたらroadStatsに変換
	$effect(() => {
		if (mapStatistics && mapStatistics.totalLength > 0) {
			roadStats = {
				totalLength: mapStatistics.totalLength * METERS_PER_KM, // km -> m
				passableLength: mapStatistics.passableLength * METERS_PER_KM, // km -> m
				passableRate: (mapStatistics.passableLength / mapStatistics.totalLength) * 100,
				blockedLength: mapStatistics.blockedLength * METERS_PER_KM, // km -> m
				blockedCount: 0, // 道路区間数は後で実装
				isolatedPoints: mapStatistics.isolatedPoints,
				byType: mapStatistics.byType // 緊急輸送道路種別ごとの統計を引き継ぐ
			};
		}
	});

	function handleFilterChange(event) {
		selectedFilters = event;
		console.log('Filter changed:', selectedFilters);
		// フィルターを適用
		if (mapComponent && mapComponent.applyFilters) {
			mapComponent.applyFilters();
		}
	}
</script>

<!-- 全画面ローディングオーバーレイ -->
<LoadingOverlay isVisible={isLoading} />

<!-- サマリーカード -->
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
	<RoadSummaryCards stats={roadStats} />
</div>

<!-- メインコンテンツ -->
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- 左側：地図エリア（2/3幅） -->
		<div class="lg:col-span-2 space-y-6">
			<div class="bg-white rounded-lg shadow-lg p-4">
				<h2 class="text-lg font-semibold text-gray-800 mb-4">
					緊急輸送道路閉塞予測マップ（シミュレーション）
				</h2>
				<div class="h-[600px] relative">
					<RoadMapSimple
						bind:this={mapComponent}
						bind:statistics={mapStatistics}
						bind:shelterAccessibility
						bind:isCalculating
						bind:isLoading
						bufferDistance={selectedBufferDistance}
						filters={selectedFilters}
						{cityCode}
						{simulation}
					/>
				</div>
			</div>

			<!-- フィルターパネル -->
			<RoadFilterPanel onFilterChange={handleFilterChange} />
		</div>

		<!-- 右側：グラフエリア（1/3幅） -->
		<div class="space-y-6">
			<!-- 道路閉塞率計算コントロール -->
			<div class="bg-white rounded-lg shadow-lg p-4">
				<h3 class="text-lg font-semibold text-gray-800 mb-4">道路閉塞率計算</h3>

				<!-- 背景地図選択 -->
				<div class="mb-4">
					<div class="text-sm font-medium text-gray-700 mb-2">背景地図</div>
					<div class="flex gap-2 flex-wrap">
						<button
							on:click={() => {
								selectedBaseMap = 'aerial';
								mapComponent?.changeBaseMap('aerial');
							}}
							class="px-3 py-1.5 text-sm rounded transition-colors {selectedBaseMap === 'aerial'
								? 'bg-blue-600 text-white'
								: 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
						>
							航空写真
						</button>
						<button
							on:click={() => {
								selectedBaseMap = 'std';
								mapComponent?.changeBaseMap('std');
							}}
							class="px-3 py-1.5 text-sm rounded transition-colors {selectedBaseMap === 'std'
								? 'bg-blue-600 text-white'
								: 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
						>
							標準地図
						</button>
						<button
							on:click={() => {
								selectedBaseMap = 'pale';
								mapComponent?.changeBaseMap('pale');
							}}
							class="px-3 py-1.5 text-sm rounded transition-colors {selectedBaseMap === 'pale'
								? 'bg-blue-600 text-white'
								: 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
						>
							淡色地図
						</button>
					</div>
				</div>

				<!-- バッファ距離選択 -->
				<div class="mb-4">
					<div class="text-sm font-medium text-gray-700 mb-2">バッファ距離</div>
					<div class="flex gap-2 flex-wrap">
						{#each bufferDistanceOptions as distance}
							<button
								on:click={() => (selectedBufferDistance = distance)}
								class="px-3 py-1.5 text-sm rounded transition-colors {selectedBufferDistance ===
								distance
									? 'bg-blue-600 text-white'
									: 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
							>
								{distance}m
							</button>
						{/each}
					</div>
				</div>

				<!-- 計算ボタン -->
				<button
					on:click={handleCalculateClick}
					disabled={isCalculating}
					class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
					class:cursor-not-allowed={isCalculating}
					class:cursor-pointer={!isCalculating}
				>
					{#if isCalculating}
						<svg
							class="animate-spin h-5 w-5"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						<span>計算中...</span>
					{:else}
						<span>道路閉塞率を計算</span>
					{/if}
				</button>
			</div>

			<!-- 道路種別閉塞率グラフ -->
			<div class="bg-white rounded-lg shadow-lg p-4">
				<h3 class="text-lg font-semibold text-gray-800 mb-4">道路種別閉塞状況</h3>
				<RoadBlockageChart {roadStats} />
			</div>

			<!-- アクセス可能性グラフ -->
			<div class="bg-white rounded-lg shadow-lg p-4">
				<h3 class="text-lg font-semibold text-gray-800 mb-4">避難所周辺道路状況</h3>
				<AccessibilityChart {shelterAccessibility} />
			</div>

			<!-- 地図の凡例 -->
			<RoadMapLegends
				position="inline"
				showEmergencyRoads={true}
				showBlockageStatus={true}
			/>
		</div>
	</div>
</div>
