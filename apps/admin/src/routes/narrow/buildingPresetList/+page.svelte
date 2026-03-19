<script lang="ts">
	import * as R from 'ramda';
	import { goto } from '$app/navigation';
	import { Button } from '@mosiri/ui';
	import PresetList, { type PresetInfoList } from '$lib/components/PresetList.svelte';
	import { submitDynamicForm } from '$lib/utils/common.js';
	import Overlay from '$lib/components/Overlay.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	const headerItems: string[] = ['選択', '名称', '最新更新日'];

	let { data } = $props();

	let isOverlay = $state(false);
	let presetListRef = $state<ReturnType<typeof PresetList> | null>(null);
	let isDialogOpen = $state(false);
	const openDialog = () => {
		isDialogOpen = true;
	};
	const closeDialog = () => {
		isDialogOpen = false;
	};

	const deleteBuildingPreset = async (): Promise<void> => {
		isOverlay = true;
		const selectedItems = (presetListRef?.getSelectedItems() as PresetInfoList[]) ?? [];
		if (selectedItems.length === 0) return;

		const fields = { regionName: R.pluck('regionName', selectedItems).join(',') };
		await submitDynamicForm('/deleteBuildingPreset', fields);
	};

	// 子コンポーネントからのデータを受け取る関数
	const moveBuildingPreset = async (presetInfoList: PresetInfoList) => {
		console.log('moveAreaPreset', presetInfoList);
		isOverlay = true;
		await goto(`buildingPresetEditInfo/${presetInfoList.id}`);
	};

	const handlePath = async (path: string) => {
		isOverlay = true;
		await goto(path);
	};
</script>

<!-- 背景を無効化するオーバーレイ -->
<Overlay {isOverlay} />

<!-- 確認ダイアログ -->
<ConfirmDialog open={isDialogOpen} onClose={closeDialog}>
	<p class="text-lg">選択されたデータを削除しますか？</p>
	<div class="flex gap-4">
		<Button
			onclick={() => {
				deleteBuildingPreset();
				closeDialog();
			}}
		>
			OK
		</Button>
		<Button onclick={closeDialog}>キャンセル</Button>
	</div>
</ConfirmDialog>

<h1 class="p-10 text-2xl font-semibold">建物データプリセット一覧</h1>
<div class="flex flex-col items-center">
	<div class="flex gap-2">
		<Button onclick={() => handlePath('buildingPresetEdit')}>建物データの追加</Button>
		<Button onclick={openDialog}>選択されたプリセットの削除</Button>
	</div>
	<PresetList
		presetInfos={data.presetInfos}
		{headerItems}
		selectedItemsDisplayNo={2}
		bind:this={presetListRef}
		onMoveAreaPreset={moveBuildingPreset}
	/>
	<Button onclick={() => handlePath('menu')}>戻る</Button>
</div>
