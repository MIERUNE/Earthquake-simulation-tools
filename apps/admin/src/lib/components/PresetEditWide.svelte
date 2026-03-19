<script lang="ts" module>
	export interface Props {
		presetLabel: string;
		presetName: string;
		meshCodes: Array<string | number>;
	}
</script>

<script lang="ts">
	import { Button } from '@mosiri/ui';
	import WideMeshMap from './WideMeshMap.svelte';

	let { presetLabel, presetName = $bindable(), meshCodes = $bindable() }: Props = $props();
	let mapOpen = $state(false);
	let selectedCodes: Array<string | number> = $state([]);

	const handleSelected = (selected: Array<string | number>) => {
		selectedCodes = selected;
		meshCodes = selected;
	};
</script>

<div class="mt-10">
	<label for="region-name" class="inline-block w-24 text-left text-base font-bold">
		{presetLabel}
	</label>
	<input
		type="text"
		name="region-name"
		maxlength="255"
		class="inline-block h-10 w-[600px] rounded-md border border-solid border-primary pl-2 text-left"
		bind:value={presetName}
	/>
</div>
<div class="mt-6 flex flex-row items-start justify-center">
	<WideMeshMap bind:selectedCodes bind:isOpen={mapOpen} onSelect={handleSelected} />
	<Button onclick={() => (mapOpen = true)}>地図からメッシュコードを追加</Button>
	<div class="ml-14 h-60 w-96 overflow-auto break-words bg-slate-200 p-5 text-left">
		{selectedCodes}
	</div>
</div>
