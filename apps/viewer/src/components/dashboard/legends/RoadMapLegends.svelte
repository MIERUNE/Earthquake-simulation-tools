<script lang="ts">
	// 緊急輸送道路種別の定義（roadColors.tsから移植）
	const EMERGENCY_ROAD_TYPES = {
		'1': { label: '第1次', color: '#9333EA' },
		'2': { label: '第2次', color: '#EC4899' },
		'3': { label: '第3次', color: '#06B6D4' }
	};

	// 道路閉塞状況の定義
	const BLOCKAGE_STATUS = [
		{ label: '通行可能', color: '#3B82F6' },
		{ label: '要注意', color: '#F59E0B' },
		{ label: '通行困難', color: '#EF4444' }
	];

	// 凡例表示位置のプロパティ
	let {
		position = 'inline',
		showEmergencyRoads = true,
		showBlockageStatus = true
	}: {
		position?: 'inline' | 'floating' | 'map-overlay',
		showEmergencyRoads?: boolean,
		showBlockageStatus?: boolean
	} = $props();

	// 地図内表示用のスタイルクラス
	const getContainerClass = () => {
		switch(position) {
			case 'floating':
				return 'absolute bottom-4 right-4 z-10 bg-white';
			case 'map-overlay':
				return 'absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm';
			default:
				return 'bg-white';
		}
	};
</script>

<div class="rounded-lg shadow-lg p-4 {getContainerClass()}">
	<h3 class="text-sm font-semibold text-gray-800 mb-3">凡例</h3>

	<div class="space-y-4">
		{#if showEmergencyRoads}
			<!-- 緊急輸送道路 -->
			<div>
				<h4 class="text-xs font-medium text-gray-700 mb-2">緊急輸送道路</h4>
				<div class="space-y-1.5">
					{#each Object.entries(EMERGENCY_ROAD_TYPES) as [, config]}
						<div class="flex items-center gap-2">
							<div
								class="w-6 h-0.5 border-t-2 border-dashed"
								style="border-color: {config.color}"
							></div>
							<span class="text-xs text-gray-600 whitespace-nowrap">{config.label}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if showBlockageStatus}
			<!-- 道路閉塞状況 -->
			<div>
				<h4 class="text-xs font-medium text-gray-700 mb-2">道路閉塞状況</h4>
				<div class="space-y-1.5">
					{#each BLOCKAGE_STATUS as status}
						<div class="flex items-center gap-2">
							<div
								class="w-5 h-1.5 rounded"
								style="background-color: {status.color}"
							></div>
							<span class="text-xs text-gray-600 whitespace-nowrap">{status.label}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>