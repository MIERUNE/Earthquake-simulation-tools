<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { Button } from '@mosiri/ui';
	import { Select } from '@mosiri/ui';
	import type { PageData } from './$types';
	import Overlay from '$lib/components/Overlay.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { addToast } from '@mosiri/ui';
	let isOverlay = $state(false);

	let buildingName: string = $state('');
	let simModelName: string = $state('');

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let buildingList = data.buildingPresets.map((buildingPreset) => buildingPreset.regionName);
	let simModelDataList = data.simModelPresets.map((simModelPreset) => simModelPreset.presetName);
	let isDialogOpen = $state(false);
	const openDialog = () => {
		if (!buildingName || !simModelName) {
			return;
		}
		isDialogOpen = true;
	};
	const closeDialog = () => {
		isDialogOpen = false;
	};

	const addSimulationBooking = async () => {
		isOverlay = true;

		const formData = new FormData();
		formData.append('buildingName', buildingName);
		formData.append('simModelName', simModelName);

		const encodedActionName = encodeURIComponent('/addSimulationBooking');
		const response = await fetch(`?${encodedActionName}`, {
			method: 'POST',
			body: formData
		});

		try {
			const result = await response.json();
			if (result.type != 'success') {
				throw new Error(result.error || 'Unknown error occurred');
			} else {
				await goto('simulationReservedList');
			}
		} catch (error) {
			if (error instanceof Error) {
				console.error('Error processing response:', error.message);
			} else {
				console.error('Error processing response:', error);
			}
		}

		// 必要に応じてページのデータを再取得
		await invalidate('/current-page-url');
		isOverlay = false;
		addToast({
			data: {
				title: 'Success',
				description: 'シミュレーション予約が完了しました',
				color: 'success'
			}
		});
	};

	const handlePath = async (path: string) => {
		isOverlay = true;
		await goto(path);
	};
</script>

<!-- 背景を無効化するオーバーレイ -->
<Overlay {isOverlay} />

<!-- 確認ダイアログ -->
<ConfirmDialog open={isDialogOpen} onClose={closeDialog} className="text-lg">
	<p>以下の内容でシミュレーションを実行します。よろしいですか？</p>
	<div class="min-w-96 bg-gray-300 p-10">
		<p>建物：{buildingName}</p>
		<p>解析モデル：{simModelName}</p>
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
		<label for="buildingName">建物</label>
		<Select options={buildingList} bind:selectedValue={buildingName} />
	</div>
	<div class="flex items-center justify-between">
		<label for="simModelName">解析モデル</label>
		<Select options={simModelDataList} bind:selectedValue={simModelName} />
	</div>
	<Button onclick={openDialog}>シミュレーション実行</Button>
	<Button onclick={() => handlePath('menu')}>戻る</Button>
</div>
