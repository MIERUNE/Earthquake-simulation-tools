<script lang="ts">
	type ChartType = 'bar' | 'pie';

	interface Props {
		chartType?: ChartType;
		isCalculating?: boolean;
		hasResults?: boolean;
		onChartTypeChange?: (type: ChartType) => void;
	}

	let { chartType = 'bar', isCalculating = false, hasResults = false, onChartTypeChange }: Props =
		$props();

	const handleChartTypeChange = (type: ChartType) => {
		if (onChartTypeChange) {
			onChartTypeChange(type);
		}
	};
</script>

<div class="bg-white rounded-lg shadow-lg p-4">
	<h3 class="text-lg font-semibold text-gray-800 mb-4">建物被害集計</h3>

	<!-- 計算中メッセージ -->
	{#if isCalculating}
		<div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
			<div class="flex items-center gap-3">
				<svg
					class="animate-spin h-6 w-6 text-blue-600"
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
				<div>
					<p class="text-sm font-medium text-blue-800">建物被害を集計中...</p>
					<p class="text-xs text-blue-600 mt-1">初回は数秒かかる場合があります</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- グラフタイプ切り替えボタン -->
	{#if hasResults}
		<div>
			<div class="text-sm font-medium text-gray-700 mb-2">グラフ表示</div>
			<div class="flex gap-2">
				<button
					onclick={() => handleChartTypeChange('bar')}
					class="flex-1 px-3 py-2 text-sm rounded transition-colors {chartType === 'bar'
						? 'bg-blue-600 text-white'
						: 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
				>
					棒グラフ
				</button>
				<button
					onclick={() => handleChartTypeChange('pie')}
					class="flex-1 px-3 py-2 text-sm rounded transition-colors {chartType === 'pie'
						? 'bg-blue-600 text-white'
						: 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
				>
					円グラフ
				</button>
			</div>
		</div>
	{/if}

	<!-- 応急仮設住宅の計算式説明 -->
	{#if hasResults}
		<div class="mt-4 pt-4 border-t border-gray-200">
			<h4 class="text-sm font-semibold text-gray-800 mb-2">応急仮設住宅について</h4>
			<div class="text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded">
				<div class="font-semibold mb-1">判定条件:</div>
				<div>• 半壊: 木造半壊、非木造半壊</div>
				<div>• 全壊: 木造全壊、非木造全壊</div>
				<div class="mt-2 pt-2 border-t border-gray-300">
					<span class="font-semibold">必要戸数計算式:</span> y = 0.2375x + 238.38
				</div>
			</div>
		</div>
	{/if}

	<!-- 結果がない場合のメッセージ -->
	{#if !hasResults && !isCalculating}
		<div class="p-4 bg-gray-50 rounded-lg">
			<p class="text-sm text-gray-600 text-center">
				小学校区またはメッシュを選択すると建物被害が集計されます
			</p>
		</div>
	{/if}
</div>
