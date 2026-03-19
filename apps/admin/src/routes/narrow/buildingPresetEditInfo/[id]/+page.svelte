<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '@mosiri/ui';
	import PresetEditInfo from '$lib/components/PresetEditInfo.svelte';
	import type { PresetInfo } from '$lib/types/index';
	import { submitDynamicForm } from '$lib/utils/common.js';
	import Overlay from '$lib/components/Overlay.svelte';
	let isOverlay = $state(false);

	interface Props {
		data: PresetInfo;
	}

	let { data = $bindable() }: Props = $props();

	const editBuildingPreset = async (): Promise<void> => {
		isOverlay = true;
		console.log(data);
		const fields = { idValue: data.id, additionalInfo: data.additionalInfo };
		await submitDynamicForm('/editBuildingPreset', fields);
	};

	const handlePath = async (path: string) => {
		isOverlay = true;
		await goto(path);
	};
</script>

<!-- 背景を無効化するオーバーレイ -->
<Overlay {isOverlay} />
<h1 class="p-10 text-2xl font-semibold">建物データの付帯情報編集</h1>
<div class="text-center">
	<PresetEditInfo
		presetLabel="建物名"
		presetName={data.regionName}
		bind:presetInfo={data.additionalInfo}
	/>
	<div class="mt-6 flex justify-center space-x-6 text-center">
		<Button onclick={() => handlePath('/narrow/buildingPresetList')}>戻る</Button>
		<Button onclick={editBuildingPreset}>更新</Button>
	</div>
</div>
