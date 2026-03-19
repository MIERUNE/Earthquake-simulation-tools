<script lang="ts">
	import { Button } from '@mosiri/ui';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import PresetInfoCard from '$lib/components/PresetInfoCard.svelte';
	import { unixTimestampToString } from '$lib/utils/common';
	import Overlay from '$lib/components/Overlay.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const simulationReserve = data.simulationReserve;

	let isOverlay = $state(false);

	const handlePath = async (path: string) => {
		isOverlay = true;
		await goto(path);
	};
</script>

<Overlay {isOverlay} />
<h1 class="p-10 text-2xl font-semibold">シミュレーション予約詳細</h1>
{#if simulationReserve === null}
	<!-- データがなかった場合の仮ページ -->
	<div class="flex h-[calc(100vh-64px)] items-center justify-center">
		<p>データがありません</p>
	</div>
{:else}
	<div class="m-48">
		<div class="mt-4 flex justify-center space-x-6 text-center">
			<PresetInfoCard presetLabel="建物" presetName={simulationReserve.regionName} />
			<PresetInfoCard presetLabel="解析モデル" presetName={simulationReserve.paramName} />
		</div>
		<div class="mt-20 flex items-center justify-center text-center">
			<div class="flex w-[470px] justify-center text-left">
				<div class="basis-64">
					<span class="my-0 w-[90%] text-left font-bold">ステータス:</span>
					<span class="my-0 w-[90%] text-left">処理中</span>
				</div>
				<div class="basis-64">
					<span class="my-0 w-[90%] text-left font-bold">登録日時:</span>
					<span class="my-0 w-[90%] text-left">
						{unixTimestampToString(simulationReserve?.createDateTime)}
					</span>
				</div>
			</div>
			<div class="flex w-[470px] justify-end space-x-6 text-center">
				<Button>計算結果データ</Button>
				<Button>可視化表示</Button>
				<Button onclick={() => handlePath('../simulationReservedList')}>戻る</Button>
			</div>
		</div>
	</div>
{/if}
