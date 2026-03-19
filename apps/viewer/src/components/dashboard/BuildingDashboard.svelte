<script lang="ts">
	import DashboardMapSimple from './maps/DashboardMapSimple.svelte';
	import LoadingOverlay from './common/LoadingOverlay.svelte';
	import SummaryCards from './cards/SummaryCards.svelte';
	import BuildingControlPanel from './controls/BuildingControlPanel.svelte';
	import { Chart, registerables } from 'chart.js';
	import type { AggregationResult } from '$lib/utils/buildingAggregationDuckDB';

	Chart.register(...registerables);

	import type { ViewerInfoItem } from '$lib/types/viewerInfo';

	// Props
	interface Props {
		cityCode?: string | null;
		simulation?: ViewerInfoItem | null;
	}

	let { cityCode, simulation = null }: Props = $props();

	// マップコンポーネントへの参照
	let mapComponent: DashboardMapSimple | undefined = $state();

	// 集計結果
	let aggregationResults = $state<AggregationResult[]>([]);

	// グラフタイプの切り替え
	let chartType = $state<'bar' | 'pie'>('bar');

	// 計算中フラグ
	let isCalculating = $state(false);

	// 初期化・ローディング中フラグ（DashboardMapSimpleからバインド）
	let isLoading = $state(false);

	// Chart.jsインスタンス（各小学校区ごと）
	let charts: Record<string, Chart> = {};

	// 応急仮設住宅用のChart.jsインスタンス（各小学校区ごと）
	let housingCharts: Record<string, Chart> = {};

	// 半壊・全壊の集計結果（応急仮設住宅計算用）
	let housingResults = $derived.by(() => {
		return aggregationResults.map((result) => {
			// 半壊: 木造半壊(2)、非木造半壊(5)
			const halfCollapsed = (result.counts[2] || 0) + (result.counts[5] || 0);
			// 全壊: 木造全壊(3)、非木造全壊(6)
			const fullCollapsed = (result.counts[3] || 0) + (result.counts[6] || 0);
			const total = halfCollapsed + fullCollapsed;
			// y = 0.2375x + 238.38
			const requiredHousing = Math.round(0.2375 * total + 238.38);

			return {
				districtName: result.districtName,
				halfCollapsed,
				fullCollapsed,
				total,
				requiredHousing
			};
		});
	});

	// サマリー情報の計算
	const summary = $derived.by(() => {
		const total = aggregationResults.reduce(
			(sum, r) =>
				sum +
				(Object.values(r.counts) as number[]).reduce((a, b) => a + b, 0),
			0
		);
		// 被害建物: 木造半壊(2)、木造全壊(3)、非木造半壊(5)、非木造全壊(6)
		const damaged = aggregationResults.reduce(
			(sum, r) => sum + ((r.counts[2] || 0) + (r.counts[3] || 0) + (r.counts[5] || 0) + (r.counts[6] || 0)),
			0
		);
		// 重大被害: 木造全壊(3)、非木造全壊(6)
		const severelyDamaged = aggregationResults.reduce(
			(sum, r) => sum + ((r.counts[3] || 0) + (r.counts[6] || 0)),
			0
		);
		const totalCollapsed = housingResults.reduce((sum, r) => sum + r.total, 0);
		const requiredHousing = housingResults.reduce((sum, r) => sum + r.requiredHousing, 0);

		return {
			total,
			damaged,
			severelyDamaged,
			totalCollapsed,
			requiredHousing
		};
	});

	// Canvas要素への参照を取得するためのヘルパー関数
	const getCanvasElement = (districtName: string): HTMLCanvasElement | null => {
		return document.querySelector(`canvas[data-district="${districtName}"]`);
	};

	// 応急仮設住宅用のCanvas要素への参照を取得するためのヘルパー関数
	const getHousingCanvasElement = (districtName: string): HTMLCanvasElement | null => {
		return document.querySelector(`canvas[data-housing-district="${districtName}"]`);
	};

	// 表示用のタイトルを生成
	const getDisplayTitle = (districtName: string): string => {
		// "フィーチャー1", "Feature 1" などのパターンを「選択エリア」に変換
		if (/^(フィーチャー|Feature)\s*\d+$/i.test(districtName)) {
			const match = districtName.match(/\d+/);
			return match ? `選択エリア ${match[0]}` : districtName;
		}
		// それ以外はそのまま表示
		return districtName;
	};

	// 集計開始を受け取るコールバック
	const handleAggregationStart = () => {
		isCalculating = true;
	};

	// 集計結果を受け取るコールバック
	const handleAggregationComplete = async (results: AggregationResult[]) => {
		console.log('[Dashboard] 集計結果数:', results.length);
		results.forEach((r, i) => {
			const totalBuildings = (Object.values(r.counts) as number[]).reduce((a, b) => a + b, 0);
			console.log(`[Dashboard] 結果 ${i}:`, r.districtName, 'buildings:', totalBuildings);
		});

		try {
			aggregationResults = results;

			// 既存のチャートをクリア
			Object.values(charts).forEach((chart) => chart.destroy());
			charts = {};
			Object.values(housingCharts).forEach((chart) => chart.destroy());
			housingCharts = {};

			// UIが更新されるのを待つ（Svelte 5のリアクティビティでDOMが更新されるまで）
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

			// 非同期でチャートを作成
			await createCharts();
			await createHousingCharts();
		} catch (error) {
			console.error('[Dashboard] Error in handleAggregationComplete:', error);
		} finally {
			// 計算完了（エラーが発生しても必ずフラグをリセット）
			isCalculating = false;
		}
	};

	// チャートタイプ切り替えハンドラー
	const handleChartTypeChange = async (type: 'bar' | 'pie') => {
		chartType = type;

		// 既存のチャートをクリア
		Object.values(charts).forEach((chart) => chart.destroy());
		charts = {};
		Object.values(housingCharts).forEach((chart) => chart.destroy());
		housingCharts = {};

		// UIが更新されるのを待つ
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

		// チャートを再作成
		await createCharts();
		await createHousingCharts();
	};

	// チャートを作成する関数
	const createCharts = async () => {
		console.log('[createCharts] チャート作成開始', {
			resultsCount: aggregationResults.length,
			resultNames: aggregationResults.map((r) => r.districtName)
		});

		try {
			// 全ての小学校区のデータから最大値を計算（棒グラフのY軸を揃えるため）
			let maxCount = 0;
			if (chartType === 'bar') {
				aggregationResults.forEach((result) => {
					const counts = Object.values(result.counts) as number[];
					const localMax = Math.max(...counts);
					if (localMax > maxCount) {
						maxCount = localMax;
					}
				});
			}

			for (const result of aggregationResults) {
				const canvas = getCanvasElement(result.districtName);
				console.log(`[createCharts] ${result.districtName}のcanvas:`, canvas);
				if (!canvas) {
					console.warn(`[createCharts] ${result.districtName}のcanvasが見つかりません`);
					continue;
				}

				const ctx = canvas.getContext('2d');
				if (!ctx) continue;

				// 被害レベルのラベルと色の定義（getParamの定義に基づく）
				const damageLabels: Record<number, { label: string; color: string }> = {
					1: { label: '木造：無被害', color: 'rgba(64, 191, 96, 0.8)' },
					2: { label: '木造：半壊', color: 'rgba(255, 255, 0, 0.8)' },
					3: { label: '木造：全壊', color: 'rgba(255, 128, 128, 0.8)' },
					4: { label: '非木造：無被害', color: 'rgba(64, 96, 191, 0.8)' },
					5: { label: '非木造：半壊', color: 'rgba(231, 182, 110, 0.8)' },
					6: { label: '非木造：全壊', color: 'rgba(255, 0, 0, 0.8)' }
				};

				const labels: string[] = [];
				const data: number[] = [];
				const backgroundColors: string[] = [];

				// countsからデータを取得
				Object.entries(result.counts).forEach(([paramStr, count]) => {
					const param = parseInt(paramStr);
					const damageInfo = damageLabels[param];
					if (damageInfo) {
						labels.push(damageInfo.label);
						data.push(count);
						backgroundColors.push(damageInfo.color);
					}
				});

				const chart = new Chart(ctx, {
					type: chartType,
					data: {
						labels,
						datasets: [
							{
								label: '建物数',
								data,
								backgroundColor: backgroundColors,
								borderColor: backgroundColors.map((color) => color.replace('0.8', '1')),
								borderWidth: 1
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						plugins: {
							legend: {
								display: chartType === 'pie',
								position: 'right'
							},
							tooltip: {
								callbacks: {
									label: (context) => {
										return `${context.parsed.y || context.parsed}棟`;
									}
								}
							}
						},
						...(chartType === 'bar'
							? {
									scales: {
										y: {
											beginAtZero: true,
											max: maxCount > 0 ? maxCount : undefined,
											ticks: {
												callback: (value: string | number) => {
													return Number(value).toLocaleString();
												}
											}
										}
									}
								}
							: {})
					}
				});

				charts[result.districtName] = chart;
				console.log(`[createCharts] ${result.districtName}のチャート作成完了`);
			}

			console.log('[createCharts] 全チャート作成完了', {
				totalCharts: Object.keys(charts).length
			});
		} catch (error) {
			console.error('[createCharts] エラー:', error);
			throw error;
		}
	};

	// 応急仮設住宅用チャートを作成する関数
	const createHousingCharts = async () => {
		console.log('[createHousingCharts] チャート作成開始', {
			resultsCount: housingResults.length
		});

		try {
			// 全ての小学校区のデータから最大値を計算（棒グラフのY軸を揃えるため）
			let maxCount = 0;
			if (chartType === 'bar') {
				housingResults.forEach((result) => {
					const localMax = Math.max(result.halfCollapsed, result.fullCollapsed);
					if (localMax > maxCount) {
						maxCount = localMax;
					}
				});
			}

			for (const result of housingResults) {
				const canvas = getHousingCanvasElement(result.districtName);
				if (!canvas) {
					console.warn(`[createHousingCharts] ${result.districtName}のcanvasが見つかりません`);
					continue;
				}

				const ctx = canvas.getContext('2d');
				if (!ctx) continue;

				const labels = ['半壊', '全壊'];
				const data = [result.halfCollapsed, result.fullCollapsed];
				const backgroundColors = [
					'rgba(255, 182, 110, 0.8)', // オレンジ（半壊）
					'rgba(255, 0, 0, 0.8)' // 赤（全壊）
				];

				const chart = new Chart(ctx, {
					type: chartType,
					data: {
						labels,
						datasets: [
							{
								label: '建物数',
								data,
								backgroundColor: backgroundColors,
								borderColor: backgroundColors.map((color) => color.replace('0.8', '1')),
								borderWidth: 1
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						plugins: {
							legend: {
								display: chartType === 'pie',
								position: 'right'
							},
							tooltip: {
								callbacks: {
									label: (context) => {
										return `${context.parsed.y || context.parsed}棟`;
									}
								}
							}
						},
						...(chartType === 'bar'
							? {
									scales: {
										y: {
											beginAtZero: true,
											max: maxCount > 0 ? maxCount : undefined,
											ticks: {
												callback: (value: string | number) => {
													return Number(value).toLocaleString();
												}
											}
										}
									}
								}
							: {})
					}
				});

				housingCharts[result.districtName] = chart;
				console.log(`[createHousingCharts] ${result.districtName}のチャート作成完了`);
			}

			console.log('[createHousingCharts] 全チャート作成完了', {
				totalCharts: Object.keys(housingCharts).length
			});
		} catch (error) {
			console.error('[createHousingCharts] エラー:', error);
			throw error;
		}
	};
</script>

<!-- 全画面ローディングオーバーレイ -->
<LoadingOverlay isVisible={isLoading} />

<!-- サマリーカード -->
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
	<SummaryCards {summary} />
</div>

<!-- メインコンテンツ -->
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- 左側：地図エリア（2/3幅） -->
		<div class="lg:col-span-2 space-y-6">
			<div class="bg-white rounded-lg shadow-lg p-4">
				<div class="flex justify-between items-center mb-4">
					<h2 class="text-lg font-semibold text-gray-800">建物被害予測マップ（シミュレーション）</h2>
				</div>
				<div class="h-[600px] relative bg-gray-100">
					<DashboardMapSimple
						bind:this={mapComponent}
						bind:isLoading
						onAggregationStart={handleAggregationStart}
						onAggregationComplete={handleAggregationComplete}
						{cityCode}
						{simulation}
					/>
				</div>
			</div>
		</div>

		<!-- 右側：コントロールとグラフエリア（1/3幅） -->
		<div class="space-y-6">
			<!-- コントロールパネル -->
			<BuildingControlPanel
				{chartType}
				{isCalculating}
				hasResults={aggregationResults.length > 0}
				onChartTypeChange={handleChartTypeChange}
			/>

			<!-- 建物被害グラフ -->
			{#each aggregationResults as result}
				<div class="bg-white rounded-lg shadow-lg p-4">
					<h3 class="text-lg font-semibold text-gray-800 mb-4">{getDisplayTitle(result.districtName)}</h3>
					<div class="h-64">
						<canvas data-district={result.districtName}></canvas>
					</div>

					<!-- 集計サマリー -->
					<div class="mt-4 pt-4 border-t border-gray-200">
						<div class="text-sm text-gray-600">
							<div class="flex justify-between">
								<span>総建物数:</span>
								<span class="font-semibold">
									{(Object.values(result.counts) as number[])
										.reduce((a, b) => a + b, 0)
										.toLocaleString()}棟
								</span>
							</div>
						</div>
					</div>
				</div>
			{/each}

			<!-- 応急仮設住宅グラフ -->
			{#each housingResults as result}
				<div class="bg-white rounded-lg shadow-lg p-4">
					<h3 class="text-lg font-semibold text-gray-800 mb-4">
						{getDisplayTitle(result.districtName)} - 仮設住宅
					</h3>
					<div class="h-64">
						<canvas data-housing-district={result.districtName}></canvas>
					</div>

					<!-- 応急仮設住宅の必要数 -->
					<div class="mt-4 pt-4 border-t border-gray-200">
						<div class="text-sm text-gray-600 space-y-2">
							<div class="flex justify-between">
								<span>半壊:</span>
								<span class="font-semibold">
									{result.halfCollapsed.toLocaleString()}棟
								</span>
							</div>
							<div class="flex justify-between">
								<span>全壊:</span>
								<span class="font-semibold">
									{result.fullCollapsed.toLocaleString()}棟
								</span>
							</div>
							<div class="flex justify-between">
								<span>合計:</span>
								<span class="font-semibold">
									{result.total.toLocaleString()}棟
								</span>
							</div>
							<div class="flex justify-between pt-2 border-t border-gray-300">
								<span class="font-semibold text-purple-600">応急仮設住宅必要数:</span>
								<span class="font-bold text-purple-600">
									{result.requiredHousing.toLocaleString()}戸
								</span>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
