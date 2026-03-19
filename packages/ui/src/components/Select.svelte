<script lang="ts" module>
	export interface Props {
		className?: string | undefined;
		options: Array<string>;
		selectedValue?: string;
	}
</script>

<script lang="ts">
	import { Icon, ChevronDown } from 'svelte-hero-icons';
	import { createSelect } from '@melt-ui/svelte';
	import { fade } from 'svelte/transition';
	import { twMerge } from 'tailwind-merge';
	import { onMount } from 'svelte';

	let { className = '', options, selectedValue = $bindable() }: Props = $props();

	onMount(() => {
		selectedValue = $selectedLabel;
	});

	$effect(() => {
		selectedValue = $selectedLabel;
	});

	const {
		elements: { trigger, menu, option },
		states: { selectedLabel, open }
	} = createSelect<string>({
		forceVisible: true,
		positioning: {
			placement: 'bottom',
			fitViewport: true,
			sameWidth: true
		}
	});
</script>

<div class={twMerge('flex w-fit flex-col gap-1', className)}>
	<button
		class="flex h-10 min-w-[220px] items-center justify-between rounded-lg border bg-white px-3 py-2 transition-opacity hover:opacity-90 focus:border-primary"
		{...$trigger}
		use:trigger
	>
		<span>
			{$selectedLabel}
		</span>
		<Icon src={ChevronDown} class="size-5" />
	</button>
	{#if $open}
		<div
			class=" z-10 flex max-h-[300px] flex-col overflow-y-auto rounded-lg bg-white p-1 shadow-xl focus:!ring-0"
			{...$menu}
			use:menu
			transition:fade={{ duration: 150 }}
		>
			{#each options as optionValue}
				<div
					class="relative cursor-pointer rounded-lg py-1 pl-8 pr-4 hover:bg-primary/10 data-[disabled]:opacity-50"
					{...$option({ value: optionValue, label: optionValue })}
					use:option
				>
					{optionValue}
				</div>
			{/each}
		</div>
	{/if}
</div>