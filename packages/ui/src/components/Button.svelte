<script lang="ts" module>
	export interface Props {
		className?: string;
		variant?: 'primary' | 'secondary' | 'outline';
		children?: Snippet;
		onclick?: () => void;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { twMerge } from 'tailwind-merge';

	let { className = '', variant = 'primary', children, onclick }: Props = $props();

	let mergedClass = twMerge(
		'text-white focus:ring-4 font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none',
		variant === 'primary' && 'bg-primary hover:bg-primary-hover',
		variant === 'secondary' && 'bg-secondary hover:bg-secondary-hover',
		variant === 'outline' &&
			'border border-solid border-primary/50 bg-transparent text-primary hover:text-primary-hover',
		className
	);
</script>

<button type="button" {onclick} class={mergedClass}>
	{@render children?.()}
</button>