<script lang="ts">
	import { Button } from '@mosiri/ui';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import PresetInfoCard from '$lib/components/PresetInfoCard.svelte';
	import { unixTimestampToString } from '$lib/utils/common';
	import Overlay from '$lib/components/Overlay.svelte';
	import type { SimulationReserve } from '$lib/types';

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

	// シミュレーションオブジェクトを単一変数として定義
	const simulation = data.simulationReserve as SimulationReserve | null;

	console.log(simulation);

	// ログURLの存在をチェックするアロー関数
	const hasLogUrl = () => {
		return Boolean(simulation?.apiResponse?.log_url) || Boolean(simulation?.logUrl);
	};

	// ログURLを取得するアロー関数
	const getLogUrl = () => {
		return simulation?.apiResponse?.log_url || simulation?.logUrl || '';
	};

	// ログURLを開くアロー関数
	const openLogUrl = () => {
		const url = getLogUrl();
		if (url) {
			window.open(url, '_blank');
		}
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
			<PresetInfoCard presetLabel="地域" presetName={simulationReserve.regionName} />
			<PresetInfoCard presetLabel="地震動データ" presetName={simulationReserve.paramName} />
		</div>
		<div class="mt-20 flex items-center justify-center text-center">
			<div class="flex w-[470px] justify-center text-left">
				<div class="basis-64">
					<span class="my-0 w-[90%] text-left font-bold">ステータス:</span>
					<span class="my-0 w-[90%] text-left">処理中</span>
				</div>
				<div class="basis-64">
					<span class="my-0 w-[90%] text-left font-bold">登録日時:</span>
					<span
						class="my-0 w-[90%] overflow-hidden text-ellipsis whitespace-nowrap text-left"
					>
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

		<!-- シミュレーション情報セクション -->
		<div class="mt-10 flex flex-col items-center">
			<!-- ログURLボタン -->
			{#if hasLogUrl()}
				<div class="log-url-container w-full max-w-2xl">
					<h3 class="mb-3 text-xl font-semibold">シミュレーションログ</h3>
					<button class="log-url-button" onclick={openLogUrl}>ログを表示する</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.log-url-container {
		margin-top: 20px;
		padding: 15px;
		border: 1px solid #eee;
		border-radius: 8px;
		background-color: #f9f9f9;
	}

	.log-url-button {
		background-color: #4285f4;
		color: white;
		padding: 8px 16px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.log-url-button:hover {
		background-color: #3367d6;
	}
</style>
