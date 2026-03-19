/**
 * Client-side S3 utilities that use server-side API
 */

// getPresignedUrl関数: サーバーサイドAPIを使用してpresigned URLを取得
export const getPresignedUrl = async (filename: string): Promise<string> => {
	try {
		console.log('サーバーAPIからPresigned URLを取得中:', filename);
		
		// Determine content type based on file extension
		let contentType = 'application/octet-stream';
		if (filename.toLowerCase().endsWith('.csv')) {
			contentType = 'text/csv';
		} else if (filename.toLowerCase().endsWith('.txt')) {
			contentType = 'text/plain';
		} else if (filename.toLowerCase().endsWith('.json')) {
			contentType = 'application/json';
		}
		
		const response = await fetch('/api/s3/presigned-url', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({
				filename,
				contentType
			})
		});
		
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to get presigned URL');
		}
		
		const data = await response.json();
		console.log('Presigned URL取得成功');
		
		return data.presignedUrl;
	} catch (error) {
		console.error('Presigned URL取得エラー:', error);
		throw error;
	}
};

// uploadFileToS3関数: 実際にファイルをS3にアップロード
export const uploadFileToS3 = async (presignedUrl: string, file: File): Promise<void> => {
	try {
		console.log('S3アップロード - 情報:', {
			url: presignedUrl,
			filename: file.name,
			size: file.size,
			type: file.type
		});

		// Content-Typeを設定
		let contentType = '';
		if (file.name.toLowerCase().endsWith('.csv')) {
			contentType = 'text/csv';
		} else if (file.name.toLowerCase().endsWith('.txt')) {
			contentType = 'text/plain';
		} else {
			contentType = file.type || 'application/octet-stream';
		}

		// fetch APIでアップロード
		console.log('S3へのアップロード開始...');
		const response = await fetch(presignedUrl, {
			method: 'PUT',
			body: file,
			headers: {
				'Content-Type': contentType
			}
		});

		console.log('S3アップロードレスポンス:', response.status, response.statusText);

		if (!response.ok) {
			const errorBody = await response.text().catch(() => 'No response body');
			console.error('S3アップロードエラー詳細:', errorBody);
			throw new Error(`Failed to upload file: ${response.statusText} (${response.status})`);
		}

		console.log('ファイルのアップロードに成功しました');
	} catch (error) {
		console.error('ファイルのアップロードに失敗しました:', error);
		throw error;
	}
};

// デバッグ用ヘルパー関数
export const logFileInfo = (file: File | null): void => {
	if (!file) {
		console.log('ファイル: null');
		return;
	}

	console.log('ファイル情報:', {
		name: file.name,
		size: file.size,
		type: file.type,
		lastModified: new Date(file.lastModified).toISOString()
	});
};