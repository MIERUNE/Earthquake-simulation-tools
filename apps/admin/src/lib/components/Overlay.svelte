<script lang="ts" module>
	export interface Props {
		isOverlay: boolean;
	}
</script>

<script lang="ts">
	let { isOverlay }: Props = $props();
</script>

<!-- 背景を無効化するオーバーレイ -->
{#if isOverlay}
	<!-- オーバーレイ -->
	<div
		class="fixed inset-0 z-50 flex cursor-wait items-center justify-center bg-black bg-opacity-0"
	>
		<!-- プラグインスピナー -->
		<svg
			class="h-10 w-10 animate-spin text-blue-500"
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
				d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
			></path>
		</svg>
	</div>
{/if}
