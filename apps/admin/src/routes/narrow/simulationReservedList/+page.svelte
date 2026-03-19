<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '@mosiri/ui';
	import { Table, TableHeader, TableRow } from '$lib/components/simulationTable';
	import Overlay from '$lib/components/Overlay.svelte';

	let { data } = $props();

	let isOverlay = $state(false);

	const handlePath = async (path: string) => {
		isOverlay = true;
		await goto(path);
	};
</script>

<Overlay {isOverlay} />
<div class="p-10 text-2xl font-semibold">地震動シミュレーション実行状況確認</div>
<div class="flex flex-col gap-10 p-10">
	<div class="w-full">
		<Table>
			{#snippet header()}
				<TableHeader
					headerItems={['建物', '解析モデルデータ', '登録日時', 'ステータス', '']}
				/>
			{/snippet}
			{#if !data.simulationReserveList?.length}
				<div class="flex h-[calc(100vh-64px)] items-center justify-center">
					<p>データがありません</p>
				</div>
			{:else}
				{#each data.simulationReserveList as simulationReserveData}
					<TableRow
						regionName={simulationReserveData?.regionName ?? ''}
						presetName={simulationReserveData?.paramName ?? ''}
						time={simulationReserveData?.createDateTime ?? ''}
						status={simulationReserveData?.status ?? ''}
						detailPath={'/narrow/simulationReservedDetail/' + simulationReserveData.id}
					/>
				{/each}
			{/if}
		</Table>
	</div>
	<div class="flex justify-center">
		<Button onclick={() => handlePath('menu')}>戻る</Button>
	</div>
</div>
