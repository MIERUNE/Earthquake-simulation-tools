<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '@mosiri/ui';
	import { Select } from '@mosiri/ui';
	import type { PageData } from './$types';
	import Overlay from '$lib/components/Overlay.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { addToast } from '@mosiri/ui';
	let isOverlay = $state(false);

	let regionName: string = $state('');
	let presetName: string = $state('');

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let regionNameList = data.regionPresets.map((regionPreset) => regionPreset.regionName);
	let earthquakeDataList = data.earthquakePresets.map(
		(earthquakePreset) => earthquakePreset.presetName
	);
	let isDialogOpen = $state(false);
	const openDialog = () => {
		isDialogOpen = true;
	};
	const closeDialog = () => {
		isDialogOpen = false;
	};

	const addSimulationBooking = async () => {
		if (!regionName || !presetName) {
			addToast({
				data: {
					title: 'Error',
					description: '地域と地震動データを選択してください',
					color: 'error'
				}
			});
			return;
		}
		isOverlay = true;

		const formData = new FormData();
		formData.append('regionName', regionName);
		formData.append('presetName', presetName);

		const encodedActionName = encodeURIComponent('/addSimulationBooking');
		const response = await fetch(`?${encodedActionName}`, {
			method: 'POST',
			body: formData
		});

		try {
			const result = await response.json();
			if (result.type !== 'success') {
				throw new Error(result.error || 'Unknown error occurred');
			} else {
				addToast({
					data: {
						title: 'Success',
						description: 'シミュレーション予約が完了しました',
						color: 'success'
					}
				});
				await goto('simulationReservedList');
			}
		} catch (error) {
			addToast({
				data: {
					title: 'Error',
					description: error instanceof Error ? error.message : '予約処理に失敗しました',
					color: 'error'
				}
			});
			console.error('Error processing response:', error);
		} finally {
			isOverlay = false;
		}
	};

	const handlePath = async (path: string) => {
		isOverlay = true;
		await goto(path);
	};

	// DPPファイルで使われるタイルID表示用の説明を追加
	const getRegionDescription = (regionName: string) => {
		if (!regionName) return '';

		// タイルIDとして表示
		const tiles = regionName.split(',').map((t) => t.trim());
		if (tiles.length > 1) {
			return `タイルID: ${tiles[0]}... (${tiles.length}個のタイル)`;
		}
		return `タイルID: ${regionName}`;
	};
</script>

<!-- 背景を無効化するオーバーレイ -->
<Overlay {isOverlay} />

<!-- 確認ダイアログ -->
<ConfirmDialog open={isDialogOpen} onClose={closeDialog} className="text-lg">
	<p>以下の内容でシミュレーションを実行します。よろしいですか？</p>
	<div class="min-w-96 bg-gray-300 p-10">
		<p>地域：{regionName}</p>
		<p class="text-sm text-gray-600">{getRegionDescription(regionName)}</p>
		<p>地震動データ：{presetName}</p>
	</div>
	<div class="flex gap-4">
		<Button
			onclick={() => {
				addSimulationBooking();
				closeDialog();
			}}
		>
			実行
		</Button>
		<Button onclick={closeDialog}>キャンセル</Button>
	</div>
</ConfirmDialog>

<h1 class="p-10 text-2xl font-semibold">シミュレーション予約</h1>
<div class="mx-auto flex w-[600px] flex-col gap-10 p-10">
	<div class="flex items-center justify-between">
		<label for="regionName">地域</label>
		<Select options={regionNameList} bind:selectedValue={regionName} />
	</div>
	<div class="flex items-center justify-between">
		<label for="presetname">地震動データ</label>
		<Select options={earthquakeDataList} bind:selectedValue={presetName} />
	</div>
	<Button onclick={openDialog}>シミュレーション実行</Button>
	<Button onclick={() => handlePath('menu')}>戻る</Button>
</div>
