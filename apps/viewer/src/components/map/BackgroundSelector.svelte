<script lang="ts" module>
	export interface Props {
		backgrounds: BackgroundsMap;
		style: StyleSpecification | undefined;
		className?: string;
	}
</script>

<script lang="ts">
	import type { BackgroundsMap } from '../../lib/types/dataset';
	import { cn } from '$lib/utils/cn';
	import { getBackgroundStyle } from '$lib/utils/MapUtils';
	import type { EventHandler } from 'svelte/elements';
	import type { StyleSpecification } from 'maplibre-gl';

	let { backgrounds, style = $bindable(), className = '' }: Props = $props();
	let selectedBackgroundId: string = $state(Object.keys(backgrounds)[0]);

	const handleChangeBackground: EventHandler<Event, HTMLSelectElement> = (e) => {
		style = getBackgroundStyle(backgrounds, e.currentTarget.value);
	};
</script>

<div
	class={cn('flex flex-col items-center gap-1 rounded bg-white px-1 py-2 text-black', className)}
>
	<p class="text-xs font-bold">背景</p>
	<select
		bind:value={selectedBackgroundId}
		onchange={handleChangeBackground}
		class="rounded border border-black px-1 py-0.5"
	>
		{#each Object.entries(backgrounds) as [key, value]}
			<option value={key}>{value.name}</option>
		{/each}
	</select>
</div>
