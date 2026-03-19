import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UserRole } from '$lib/types/auth';

// S3クライアントの初期化（サーバーサイド）
const getS3Client = () => {
	const region = process.env.AWS_REGION || 'ap-northeast-1';
	
	return new S3Client({
		region,
		// Lambda環境では自動的にIAMロールの認証情報が使用される
		// ローカル開発では環境変数から取得
		...(process.env.AWS_ACCESS_KEY_ID && {
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID,
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
			}
		})
	});
};

/**
 * POST /api/s3/presigned-url
 * Generate a presigned URL for S3 upload
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Check authentication
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		
		// Check authorization - only Admin and Operator can upload
		if (![UserRole.Admin, UserRole.Operator].includes(locals.user.role)) {
			return json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
		}
		
		// Parse request body
		const { filename, contentType, bucket, prefix } = await request.json();
		
		if (!filename) {
			return json({ error: 'Missing filename' }, { status: 400 });
		}
		
		// Set defaults
		const bucketName = bucket || process.env.S3_BUCKET_NAME || '';
		const keyPrefix = prefix || 'earthquake-data';
		const fileContentType = contentType || 'application/octet-stream';
		
		// Generate unique key with user ID and timestamp
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const key = `${keyPrefix}/${locals.user.userId}/${timestamp}/${filename}`;
		
		// Create S3 client and command
		const s3Client = getS3Client();
		const command = new PutObjectCommand({
			Bucket: bucketName,
			Key: key,
			ContentType: fileContentType
		});
		
		// Generate presigned URL
		const presignedUrl = await getSignedUrl(s3Client, command, { 
			expiresIn: 3600 // 1 hour
		});
		
		return json({
			presignedUrl,
			key,
			bucket: bucketName,
			expiresIn: 3600
		});
		
	} catch (error) {
		console.error('Failed to generate presigned URL:', error);
		return json(
			{ error: 'Failed to generate presigned URL' },
			{ status: 500 }
		);
	}
};

/**
 * GET /api/s3/presigned-url
 * Health check endpoint
 */
export const GET: RequestHandler = async () => {
	return json({
		success: true,
		message: 'S3 presigned URL endpoint is active'
	});
};