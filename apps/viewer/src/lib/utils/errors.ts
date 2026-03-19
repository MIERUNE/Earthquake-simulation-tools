/**
 * エラーハンドリングユーティリティ
 */

/**
 * カスタムエラー基底クラス
 */
export class AppError extends Error {
	constructor(
		message: string,
		public code: string,
		public statusCode: number = 500
	) {
		super(message);
		this.name = 'AppError';
		Object.setPrototypeOf(this, AppError.prototype);
	}
}

/**
 * AWS関連のエラー
 */
export class AwsError extends AppError {
	constructor(message: string, public originalError?: Error) {
		super(message, 'AWS_ERROR', 500);
		this.name = 'AwsError';
		Object.setPrototypeOf(this, AwsError.prototype);
	}
}

/**
 * データが見つからない場合のエラー
 */
export class NotFoundError extends AppError {
	constructor(message: string = 'データが見つかりません') {
		super(message, 'NOT_FOUND', 404);
		this.name = 'NotFoundError';
		Object.setPrototypeOf(this, NotFoundError.prototype);
	}
}

/**
 * バリデーションエラー
 */
export class ValidationError extends AppError {
	constructor(message: string, public errors?: Record<string, string>) {
		super(message, 'VALIDATION_ERROR', 400);
		this.name = 'ValidationError';
		Object.setPrototypeOf(this, ValidationError.prototype);
	}
}

/**
 * エラーメッセージをユーザーフレンドリーな形式に変換
 */
export const formatErrorMessage = (error: unknown): string => {
	if (error instanceof AppError) {
		return error.message;
	}

	if (error instanceof Error) {
		// AWS SDKエラーの場合、詳細情報を抽出
		switch (error.name) {
			case 'ResourceNotFoundException':
				return 'リソースが見つかりませんでした';
			case 'AccessDeniedException':
				return 'アクセスが拒否されました';
			case 'ValidationException':
				return '入力内容に誤りがあります';
			case 'ThrottlingException':
				return 'リクエストが多すぎます。しばらくしてから再度お試しください';
			case 'InternalServerError':
				return 'サーバーエラーが発生しました';
			default:
				return error.message;
		}
	}

	return '予期しないエラーが発生しました';
};

/**
 * エラーをログに記録
 */
export const logError = (error: unknown, context?: string): void => {
	const timestamp = new Date().toISOString();
	const prefix = context ? `[${context}]` : '';

	if (error instanceof AppError) {
		console.error(`${timestamp} ${prefix} ${error.name}: ${error.message}`, {
			code: error.code,
			statusCode: error.statusCode
		});
	} else if (error instanceof Error) {
		console.error(`${timestamp} ${prefix} ${error.name}: ${error.message}`, error.stack);
	} else {
		console.error(`${timestamp} ${prefix} Unknown error:`, error);
	}
};

/**
 * 非同期処理のエラーハンドリングラッパー
 */
export const withErrorHandling = async <T>(
	fn: () => Promise<T>,
	context?: string
): Promise<{ data: T | null; error: string | null }> => {
	try {
		const data = await fn();
		return { data, error: null };
	} catch (error) {
		logError(error, context);
		const errorMessage = formatErrorMessage(error);
		return { data: null, error: errorMessage };
	}
};
