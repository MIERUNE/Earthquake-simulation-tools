<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '@mosiri/ui';
	import PresetEditInfo from '$lib/components/PresetEditInfo.svelte';
	import type { PresetInfo } from '$lib/types/index';
	import { submitDynamicForm } from '$lib/utils/common.js';
	import Overlay from '$lib/components/Overlay.svelte';

	interface Props {
		data: PresetInfo;
	}

	let { data = $bindable() }: Props = $props();

	let isOverlay = $state(false);

	const editAreaPreset = async (): Promise<void> => {
		isOverlay = true;
		console.log(data);
		const fields = { idValue: data.id, additionalInfo: data.additionalInfo };
		await submitDynamicForm('/editAreaPreset', fields);
		isOverlay = false;
	};

	const handlePath = async (path: string) => {
		isOverlay = true;
		await goto(path);
	};
</script>

<!-- 背景を無効化するオーバーレイ -->
<Overlay {isOverlay} />
<h1 class="p-10 text-2xl font-semibold">地域プリセットの付帯情報編集</h1>
<div class="text-center">
	<PresetEditInfo
		presetLabel="地域名"
		presetName={data.regionName}
		bind:presetInfo={data.additionalInfo}
	/>
	<div class="mt-6 flex justify-center space-x-6 text-center">
		<Button onclick={() => handlePath('/wide/areaPresetList')}>戻る</Button>
		<Button onclick={editAreaPreset}>更新</Button>
	</div>
</div>
