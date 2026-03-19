<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '@mosiri/ui';
	import PresetEdit from '$lib/components/PresetEditWide.svelte';
	import { invalidate } from '$app/navigation';
	import Overlay from '$lib/components/Overlay.svelte';
	let isOverlay = $state(false);

	let regionName = $state('');
	let meshCodes = $state<Array<string | number>>([]);

	const updateAreaPreset = async () => {
		// 空白の場合は処理しない
		const trimmedName = regionName.trim();
		if (!trimmedName) {
			return;
		}

		isOverlay = true;
		const formData = new FormData();
		formData.append('regionName', regionName);
		formData.append('meshCodes', JSON.stringify(meshCodes));

		const encodedActionName = encodeURIComponent('/updateAreaPreset');
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
				await goto('areaPresetList');
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
<h1 class="p-10 text-2xl font-semibold">地域プリセットの追加</h1>
<div class="text-center">
	<PresetEdit presetLabel="地域名" bind:presetName={regionName} bind:meshCodes />
	<div class="mt-6 flex justify-center space-x-6 text-center">
		<Button onclick={() => handlePath('areaPresetList')}>戻る</Button>
		<Button onclick={updateAreaPreset}>登録</Button>
	</div>
</div>
