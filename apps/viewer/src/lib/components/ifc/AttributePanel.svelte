<script lang="ts">
	import { draggable } from '@neodrag/svelte';
	import IFCGraph from './IFCGraph.svelte';
	import type { IFCElementProperties, IFCDataType } from '$lib/stores/ifcModalStore';

	export let properties: IFCElementProperties;
	export let dataType: IFCDataType;
	export let onClose: () => void;

	const formatDate = (timestamp: number): string => {
		const date = new Date(timestamp * 1000);
		return date.toLocaleString('ja-JP', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	};
</script>

{#if properties}
	<div
		use:draggable={{ bounds: 'parent', handle: '.drag-handle' }}
		class="absolute top-5 left-2 bg-white z-20"
	>
		<div class="drag-handle h-7 w-full bg-[#17a2b8] cursor-move"></div>
		<div class="overflow-y-auto max-h-[400px]">
			<table>
				<tbody>
					<tr>
						<th class="whitespace-normal break-all font-bold border-solid border px-2">ID</th>
						<td class="whitespace-normal break-all w-64 border-solid border px-2">
							{properties.id}
						</td>
					</tr>
					<tr>
						<th class="whitespace-normal break-all font-bold border-solid border px-2">Name</th>
						<td class="whitespace-normal break-all w-64 border-solid border px-2">
							{properties.name}
						</td>
					</tr>
					<tr>
						<th class="whitespace-normal break-all font-bold border-solid border px-2">
							ObjectType
						</th>
						<td class="whitespace-normal break-all w-64 border-solid border px-2">
							{properties.objectType}
						</td>
					</tr>
					<tr>
						<th class="whitespace-normal break-all font-bold border-solid border px-2">
							CreationDate
						</th>
						<td class="whitespace-normal break-all w-64 border-solid border px-2">
							{formatDate(properties.creationDate)}
						</td>
					</tr>
					<tr>
						<th class="whitespace-normal break-all font-bold border-solid border px-2">
							ApplicationFullName
						</th>
						<td class="whitespace-normal break-all w-64 border-solid border px-2">
							{properties.applicationFullName}
						</td>
					</tr>
				</tbody>
			</table>
			<IFCGraph id={properties.id} {dataType} />
		</div>
		<div class="text-right absolute -top-1 right-2 px-1">
			<button class="text-2xl text-white" on:click={onClose}> x </button>
		</div>
	</div>
{/if}
