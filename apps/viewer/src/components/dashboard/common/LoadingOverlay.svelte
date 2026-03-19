<script lang="ts">
	// Props
	interface Props {
		isVisible?: boolean;
		title?: string;
		message?: string;
	}

	let {
		isVisible = false,
		title = '初期化中...',
		message = '地図データを読み込んでいます'
	}: Props = $props();
</script>

{#if isVisible}
	<div
		class="fixed inset-0 bg-white bg-opacity-60 backdrop-blur-[2px] z-[9999] flex items-center justify-center"
	>
		<div class="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-200">
			<div class="flex flex-col items-center space-y-6">
				<!-- スピナー -->
				<div class="relative">
					<div class="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-600"></div>
					<div class="absolute inset-0 flex items-center justify-center">
						<div class="w-12 h-12 bg-white rounded-full"></div>
					</div>
				</div>

				<!-- メッセージ -->
				<div class="text-center space-y-2">
					<h3 class="text-xl font-bold text-gray-800">{title}</h3>
					<p class="text-gray-600">{message}</p>
				</div>

				<!-- プログレスバー風のアニメーション -->
				<div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
					<div class="bg-blue-600 h-2 rounded-full animate-pulse" style="width: 70%"></div>
				</div>
			</div>
		</div>
	</div>
{/if}