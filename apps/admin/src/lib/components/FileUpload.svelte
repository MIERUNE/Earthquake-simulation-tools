<script lang="ts">
	import { onMount } from 'svelte';

	export let filename: string = '';
	// より具体的な関数型を定義
	export let onchange: (data: { name: string; file: File | null } | string) => void;

	// どのタイミングでファイルが消失するか確認するためのデバッグログ
	let debugLog = (msg: string, obj?: any) => {
		console.log(`[FileUpload] ${msg}`, obj !== undefined ? obj : '');
	};

	let fileInput: HTMLInputElement;
	// 現在選択されているファイルを保持（コンポーネント内でも保持）
	let selectedFile: File | null = null;

	onMount(() => {
		debugLog('コンポーネントがマウントされました');
		return () => {
			debugLog('コンポーネントがアンマウントされます');
		};
	});

	// ファイル選択時のイベントハンドラ
	const handleFileChange = (event: Event) => {
		const input = event.target as HTMLInputElement;
		debugLog('ファイル選択イベント発生', input?.files);

		if (input.files && input.files.length > 0) {
			selectedFile = input.files[0];
			debugLog('ファイルが選択されました', {
				name: selectedFile.name,
				size: selectedFile.size,
				type: selectedFile.type
			});

			// ファイル選択時、イベントから直接値を取得してコールバック
			const fileObject = {
				name: selectedFile.name,
				file: selectedFile
			};

			debugLog('親コンポーネントに通知', fileObject);

			// 通知前に値の検証を行う
			if (!(selectedFile instanceof File)) {
				debugLog('警告: 選択されたオブジェクトはFileインスタンスではありません');
			}

			// 親コンポーネントに通知
			try {
				onchange(fileObject);
			} catch (e) {
				debugLog('親コンポーネントへの通知でエラーが発生しました', e);

				// エラー時は単純な形式でリトライ
				try {
					onchange(selectedFile.name);
				} catch (e2) {
					debugLog('セカンドフォールバックでもエラー', e2);
				}
			}
		} else {
			selectedFile = null;
			debugLog('ファイル選択がキャンセルされました');
			try {
				onchange({
					name: '',
					file: null
				});
			} catch (e) {
				debugLog('ファイル選択キャンセル通知でエラー', e);
			}
		}
	};

	const handleClick = () => {
		debugLog('ファイル選択ボタンがクリックされました');
		fileInput?.click();
	};
</script>

<div class="flex flex-col items-start gap-2">
	<div class="flex items-center gap-4">
		<input
			type="file"
			bind:this={fileInput}
			on:change={handleFileChange}
			class="hidden"
			accept=".csv,.txt"
		/>
		<input
			type="text"
			readonly
			value={filename}
			class="h-10 w-96 rounded-md border border-solid border-primary pl-2"
			placeholder="ファイルを選択してください"
		/>
		<button
			on:click={handleClick}
			class="h-10 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
			data-testid="file-select-button"
		>
			参照
		</button>
	</div>
	{#if selectedFile}
		<div class="text-sm text-green-600">
			ファイルが選択されています（サイズ: {(selectedFile.size / 1024).toFixed(1)} KB）
		</div>
	{/if}
</div>
