<script lang="ts" module>
	export interface Props {
		presetLabel: string;
		presetName: string;
	}
</script>

<script lang="ts">
	import { Button } from '@mosiri/ui';
	import NarrowMeshMap from './NarrowMeshMap.svelte';

	let { presetLabel, presetName = $bindable() }: Props = $props();
	let mapOpen = $state(false);
	let selectedCodes: Array<string | number> = $state([]);
	let latitude = $state('');
	let longitude = $state('');

	const handleSelected = (lng: number, lat: number) => {
		longitude = lng.toString();
		latitude = lat.toString();
	};
</script>

<div class="mt-10 flex justify-center">
	<div class="space-y-4">
		<div class="flex items-center">
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
		<div class="flex items-center">
			<label for="latitude" class="inline-block w-24 text-left text-base font-bold">
				緯度
			</label>
			<input
				type="number"
				name="latitude"
				class="inline-block h-10 w-[600px] rounded-md border border-solid border-primary pl-2 text-left"
				bind:value={latitude}
				step="any"
				min="-90"
				max="90"
			/>
		</div>
		<div class="flex items-center">
			<label for="longitude" class="inline-block w-24 text-left text-base font-bold">
				経度
			</label>
			<input
				type="number"
				name="longitude"
				class="inline-block h-10 w-[600px] rounded-md border border-solid border-primary pl-2 text-left"
				bind:value={longitude}
				step="any"
				min="-180"
				max="180"
			/>
		</div>
	</div>
</div>
<div class="mt-6 flex flex-row items-start justify-center">
	<NarrowMeshMap
		bind:isOpen={mapOpen}
		onSelect={handleSelected}
		lng={parseFloat(longitude)}
		lat={parseFloat(latitude)}
	/>
	<Button onclick={() => (mapOpen = true)}>地図から場所を決定</Button>
</div>
