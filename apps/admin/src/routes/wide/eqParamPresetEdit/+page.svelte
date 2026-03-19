<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '@mosiri/ui';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import { invalidate } from '$app/navigation';
	import Overlay from '$lib/components/Overlay.svelte';
	import { getPresignedUrl, uploadFileToS3, logFileInfo } from '$lib/utils/s3';
	import { onMount } from 'svelte';

	let isOverlay = $state(false);
	let eqParamName = $state('');

	let filename = $state('');
	let file: File | null = $state(null);

	// デバッグ用のフラグ追加
	let fileSelected = $state(false);

	onMount(() => {
		console.log('ページコンポーネントがマウントされました');
	});

	// ファイル選択のコールバック関数を改善
	const changeFile = (param: any) => {
		console.log('[eqParamPresetEdit] ファイル選択イベント受信:', param);

		// パラメータの型を詳細にログ出力
		if (param === null) {
			console.log('[eqParamPresetEdit] パラメータはnullです');
		} else if (typeof param === 'object') {
			console.log('[eqParamPresetEdit] パラメータはオブジェクト型です');
			console.log(
				'[eqParamPresetEdit] 内容:',
				JSON.stringify({
					has_name: 'name' in param,
					has_file: 'file' in param,
					name_value: param.name,
					file_type: param.file ? typeof param.file : 'null/undefined'
				})
			);
		} else {
			console.log('[eqParamPresetEdit] パラメータの型:', typeof param);
		}

		// オブジェクトパターン（新しい形式）
		if (param && typeof param === 'object' && 'name' in param && 'file' in param) {
			filename = param.name || '';
			file = param.file;
			fileSelected = Boolean(file);

			// ファイル情報の詳細ログ
			if (file) {
				console.log('[eqParamPresetEdit] ファイルオブジェクト受信成功:', {
					name: filename,
					size: file.size,
					type: file.type,
					lastModified: new Date(file.lastModified).toISOString()
				});
			} else {
				console.log('[eqParamPresetEdit] ファイルオブジェクトはnullです');
			}
		}
		// 文字列パターン（古い形式）
		else if (typeof param === 'string') {
			filename = param;
			console.log('[eqParamPresetEdit] ファイル名のみ受信:', filename);
			// 古い形式ではファイルオブジェクトは利用できない
			file = null;
			fileSelected = false;
		}
		// その他の想定外のパターン
		else {
			console.error('[eqParamPresetEdit] 不明なパラメータ形式:', param);
			filename = '';
			file = null;
			fileSelected = false;
		}

		// 状態確認
		console.log('[eqParamPresetEdit] 最終状態:', { filename, fileSelected, fileObject: file });
	};

	const uploadFile = async () => {
		console.log('[eqParamPresetEdit] アップロード開始');

		// ファイル確認
		if (file === null) {
			console.error('[eqParamPresetEdit] ファイルがnullです');
			alert('ファイルが選択されていません。もう一度ファイルを選択してください。');
			return false;
		}

		if (!(file instanceof File)) {
			console.error('[eqParamPresetEdit] fileはFileインスタンスではありません:', typeof file);
			alert('ファイルの形式が不正です。もう一度ファイルを選択してください。');
			return false;
		}

		if (!filename) {
			console.error('[eqParamPresetEdit] ファイル名が空です');
			alert('ファイル名がありません。もう一度ファイルを選択してください。');
			return false;
		}

		// 詳細なファイル情報をログに出力
		logFileInfo(file);

		try {
			// ファイルサイズを確認
			if (file.size === 0) {
				console.error('[eqParamPresetEdit] ファイルサイズが0です');
				alert('ファイルが空です。内容のあるファイルを選択してください。');
				return false;
			}

			// アップロードプロセスを開始
			try {
				console.log('[eqParamPresetEdit] presignedURL取得開始');
				const presignedUrl = await getPresignedUrl(filename);
				console.log('[eqParamPresetEdit] presignedURL取得成功:', presignedUrl);

				console.log('[eqParamPresetEdit] S3アップロード開始');
				await uploadFileToS3(presignedUrl, file);
				console.log('[eqParamPresetEdit] S3アップロード成功');

				return true;
			} catch (urlError) {
				console.error(
					'[eqParamPresetEdit] presignedURLまたはアップロードでエラー:',
					urlError
				);
				alert('ファイルのアップロード中にエラーが発生しました');
				return false;
			}
		} catch (error) {
			console.error('[eqParamPresetEdit] 予期せぬエラー:', error);
			alert('ファイルのアップロードに失敗しました');
			return false;
		}
	};

	const updateEqParam = async () => {
		// 空白の場合は処理しない
		const trimmedName = eqParamName.trim();
		if (!trimmedName) {
			alert('地震動識別名を入力してください');
			return;
		}

		console.log('登録時のファイル状態:', file);
		if (!file) {
			alert('ファイルを選択してください');
			return;
		}

		isOverlay = true;

		try {
			// まずファイルをアップロード
			const uploadSuccess = await uploadFile();
			if (!uploadSuccess) {
				isOverlay = false;
				return;
			}

			// 次にパラメータ情報を更新
			const formData = new FormData();
			formData.append('eqParamName', eqParamName);
			formData.append('filename', filename);

			const encodedActionName = encodeURIComponent('/updateEqParam');
			const response = await fetch(`?${encodedActionName}`, {
				method: 'POST',
				body: formData
			});

			const result = await response.json();
			if (result.type != 'success') {
				throw new Error(result.error || 'Unknown error occurred');
			} else {
				// リストに戻る
				await goto('eqParamPresetList');
			}
		} catch (error) {
			if (error instanceof Error) {
				console.error('Error processing response:', error.message);
				alert(`エラーが発生しました: ${error.message}`);
			} else {
				console.error('Error processing response:', error);
				alert('エラーが発生しました');
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
<h1 class="p-10 text-2xl font-semibold">地震動データの登録</h1>
<div class="pt-6">
	<div class="ml-10">
		<div class="mt-10 flex flex-row">
			<label
				for="earthquake-name"
				class="inline-block w-48 basis-1/4 text-left text-base font-bold"
			>
				地震動識別名
			</label>
			<input
				type="text"
				name="earthquake-name"
				maxlength="255"
				bind:value={eqParamName}
				class="ml-5 inline-block h-10 w-[600px] rounded-md border border-solid border-primary pl-2 text-left"
			/>
		</div>
		<div class="mt-10 flex flex-row">
			<span class="inline-block w-48 basis-1/4 text-left text-base font-bold">
				地震動ファイルの選択
			</span>
			<FileUpload {filename} onchange={changeFile} />
		</div>
		{#if fileSelected}
			<div class="ml-48 mt-2 text-green-600">ファイルが選択されています: {filename}</div>
		{/if}
		<div class="mt-6 flex justify-center space-x-6 text-center">
			<Button onclick={() => handlePath('eqParamPresetList')}>戻る</Button>
			<Button onclick={updateEqParam}>登録</Button>
		</div>
	</div>
</div>
