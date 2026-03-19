<script lang="ts" module>
	export interface Props {
		open: boolean;
		onClose: () => void;
		className?: string;
		children?: Snippet;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Icon, XMark } from 'svelte-hero-icons';
	import { twMerge } from 'tailwind-merge';

	let { open, onClose, className = '', children }: Props = $props();

	let mergedClass = twMerge(
		'relative flex flex-col gap-4 h-4/5 w-4/5 items-center justify-center bg-white',
		className
	);
</script>

{#if open}
	<!-- オーバーレイ -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
		<div class={mergedClass}>
			<button onclick={onClose}>
				<Icon src={XMark} class="absolute right-10 top-10 size-10 cursor-pointer" />
			</button>
			{@render children?.()}
		</div>
	</div>
{/if}
