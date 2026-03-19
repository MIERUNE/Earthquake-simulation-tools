<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '@mosiri/ui';
	import PresetEditInfo from '$lib/components/PresetEditInfo.svelte';
	import type { PresetInfo } from '$lib/types/index';
	import { submitDynamicForm } from '$lib/utils/common';
	import Overlay from '$lib/components/Overlay.svelte';
	let isOverlay = $state(false);

	interface Props {
		data: PresetInfo;
	}

	let { data = $bindable() }: Props = $props();

	const editEqPreset = async (): Promise<void> => {
		isOverlay = true;
		console.log(data);
		const fields = { idValue: data.id, additionalInfo: data.additionalInfo };
		await submitDynamicForm('/editEqPreset', fields);
	};

	const handlePath = async (path: string) => {
		isOverlay = true;
		await goto(path);
	};
</script>

<!-- 背景を無効化するオーバーレイ -->
<Overlay {isOverlay} />
<h1 class="p-10 text-2xl font-semibold">解析モデルの付帯情報登録</h1>
<div class="text-center">
	<PresetEditInfo
		presetLabel="解析モデル名"
		presetName={data.presetName}
		bind:presetInfo={data.additionalInfo}
	/>
	<div class="mt-6 flex justify-center space-x-6 text-center">
		<Button onclick={() => handlePath('/narrow/simModelPresetList')}>戻る</Button>
		<Button onclick={editEqPreset}>更新</Button>
	</div>
</div>
