import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3クライアントの初期化
const s3Client = new S3Client({
	region: 'ap-northeast-1',
	// 必要に応じて認証情報を設定
	credentials: {
		accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
		secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY
	}
});

// getPresignedUrl関数: AWS SDKのs3-request-presignerを使用してpresigned URLを取得
export const getPresignedUrl = async (filename: string): Promise<string> => {
	try {
		console.log('AWS SDK経由でPresigned URLを取得中:', filename);

		const command = new PutObjectCommand({
			Bucket: import.meta.env.VITE_S3_UPLOAD_BACKET || '',
			Key: `earthquake-data/${filename}`
		});

		const url = await getSignedUrl(s3Client as any, command, { expiresIn: 3600 });
		console.log('Presigned URL取得成功');

		return url;
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
