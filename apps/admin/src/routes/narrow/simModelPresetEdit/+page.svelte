<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { Button } from '@mosiri/ui';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import Overlay from '$lib/components/Overlay.svelte';

	let isOverlay = $state(false);
	let analysisModelName = $state('');

	let filename1 = '';
	let filename2 = '';
	let filename3 = '';
	let filename4 = '';
	const changeFile1 = () => {};
	const changeFile2 = () => {};
	const changeFile3 = () => {};
	const changeFile4 = () => {};

	const updateAnalysisModel = async () => {
		// 空白の場合は処理しない
		const trimmedName = analysisModelName.trim();
		if (!trimmedName) {
			return;
		}
		isOverlay = true;

		const formData = new FormData();
		formData.append('analysisModelName', analysisModelName);

		const encodedActionName = encodeURIComponent('/updateAnalysisModel');
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
				await goto('simModelPresetList');
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

<Overlay {isOverlay} />
<div class="p-10 text-2xl font-semibold">解析モデルの登録</div>
<div class="pt-6">
	<div class="ml-10">
		<div class="mt-10 flex flex-row">
			<label
				for="earthquake-name"
				class="inline-block w-48 basis-1/4 text-left text-base font-bold"
			>
				解析モデル識別名
			</label>
			<input
				type="text"
				name="earthquake-name"
				maxlength="255"
				bind:value={analysisModelName}
				class="ml-5 inline-block h-10 w-[600px] rounded-md border border-solid border-primary pl-2 text-left"
			/>
		</div>
		<div class="mt-10 flex flex-row">
			<span class="inline-block w-48 basis-1/4 text-left text-base font-bold">
				解析モデルファイルの選択
			</span>
			<FileUpload filename={filename1} onchange={changeFile1} />
		</div>
		<div class="mt-10 flex flex-row">
			<span class="inline-block w-48 basis-1/4 text-left text-base font-bold">
				パラメータファイルの選択
			</span>
			<FileUpload filename={filename2} onchange={changeFile2} />
		</div>
		<div class="mt-10 flex flex-row">
			<span class="inline-block w-48 basis-1/4 text-left text-base font-bold">
				外力条件ファイルの選択
			</span>
			<FileUpload filename={filename3} onchange={changeFile3} />
		</div>
		<div class="mt-10 flex flex-row">
			<span class="inline-block w-48 basis-1/4 text-left text-base font-bold">
				計算条件ファイルの選択
			</span>
			<FileUpload filename={filename4} onchange={changeFile4} />
		</div>
		<div class="mt-6 flex justify-center space-x-6 text-center">
			<Button onclick={() => handlePath('simModelPresetList')}>戻る</Button>
			<Button onclick={updateAnalysisModel}>解析モデルの登録</Button>
		</div>
	</div>
</div>
