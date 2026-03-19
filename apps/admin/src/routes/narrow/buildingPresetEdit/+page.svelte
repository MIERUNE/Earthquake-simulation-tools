<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '@mosiri/ui';
	import PresetEdit from '$lib/components/PresetEditNarrow.svelte';
	import { invalidate } from '$app/navigation';
	import Overlay from '$lib/components/Overlay.svelte';
	let isOverlay = $state(false);

	let buildingName = $state('');

	const updateBuildingPreset = async () => {
		// 空白の場合は処理しない
		const trimmedName = buildingName.trim();
		if (!trimmedName) {
			return;
		}
		isOverlay = true;

		const formData = new FormData();
		formData.append('buildingName', buildingName);

		const encodedActionName = encodeURIComponent('/updateBuildingPreset');
		const response = await fetch(`?${encodedActionName}`, {
			method: 'POST',
			body: formData
		});

		try {
			const result = await response.json();
			if (result.type != 'success') {
				throw new Error(result.error || 'Unknown error occurred');
			} else {
				// リストに戻る
				await goto('buildingPresetList');
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
	};

	const handlePath = async (path: string) => {
		isOverlay = true;
		await goto(path);
	};
</script>

<!-- 背景を無効化するオーバーレイ -->
<Overlay {isOverlay} />
<h1 class="p-10 text-2xl font-semibold">建物データの追加</h1>
<div class="text-center">
	<PresetEdit presetLabel="建物名" bind:presetName={buildingName} />
	<div class="mt-6 flex justify-center space-x-6 text-center">
		<Button onclick={() => handlePath('buildingPresetList')}>戻る</Button>
		<Button onclick={updateBuildingPreset}>登録</Button>
	</div>
</div>
