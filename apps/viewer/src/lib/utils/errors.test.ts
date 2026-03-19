import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	AppError,
	AwsError,
	NotFoundError,
	ValidationError,
	formatErrorMessage,
	logError,
	withErrorHandling
} from './errors';

describe('Error Classes', () => {
	describe('AppError', () => {
		it('基本的なエラーを作成できること', () => {
			const error = new AppError('テストエラー', 'TEST_ERROR', 400);

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(AppError);
			expect(error.message).toBe('テストエラー');
			expect(error.code).toBe('TEST_ERROR');
			expect(error.statusCode).toBe(400);
			expect(error.name).toBe('AppError');
		});

		it('デフォルトのstatusCodeが500であること', () => {
			const error = new AppError('テストエラー', 'TEST_ERROR');

			expect(error.statusCode).toBe(500);
		});
	});

	describe('AwsError', () => {
		it('AWS固有のエラーを作成できること', () => {
			const originalError = new Error('AWS Error');
			const error = new AwsError('AWSでエラーが発生しました', originalError);

			expect(error).toBeInstanceOf(AppError);
			expect(error).toBeInstanceOf(AwsError);
			expect(error.message).toBe('AWSでエラーが発生しました');
			expect(error.code).toBe('AWS_ERROR');
			expect(error.statusCode).toBe(500);
			expect(error.originalError).toBe(originalError);
		});
	});

	describe('NotFoundError', () => {
		it('NotFoundエラーを作成できること', () => {
			const error = new NotFoundError('ユーザーが見つかりません');

			expect(error).toBeInstanceOf(AppError);
			expect(error).toBeInstanceOf(NotFoundError);
			expect(error.message).toBe('ユーザーが見つかりません');
			expect(error.code).toBe('NOT_FOUND');
			expect(error.statusCode).toBe(404);
		});

		it('デフォルトメッセージを使用できること', () => {
			const error = new NotFoundError();

			expect(error.message).toBe('データが見つかりません');
		});
	});

	describe('ValidationError', () => {
		it('バリデーションエラーを作成できること', () => {
			const errors = { email: '無効なメールアドレスです' };
			const error = new ValidationError('入力内容を確認してください', errors);

			expect(error).toBeInstanceOf(AppError);
			expect(error).toBeInstanceOf(ValidationError);
			expect(error.message).toBe('入力内容を確認してください');
			expect(error.code).toBe('VALIDATION_ERROR');
			expect(error.statusCode).toBe(400);
			expect(error.errors).toEqual(errors);
		});
	});
});

describe('formatErrorMessage', () => {
	it('AppErrorのメッセージをそのまま返すこと', () => {
		const error = new AppError('カスタムエラー', 'CUSTOM_ERROR');
		const result = formatErrorMessage(error);

		expect(result).toBe('カスタムエラー');
	});

	it('AWS SDKエラーをユーザーフレンドリーに変換すること', () => {
		const testCases = [
			{ name: 'ResourceNotFoundException', expected: 'リソースが見つかりませんでした' },
			{ name: 'AccessDeniedException', expected: 'アクセスが拒否されました' },
			{ name: 'ValidationException', expected: '入力内容に誤りがあります' },
			{
				name: 'ThrottlingException',
				expected: 'リクエストが多すぎます。しばらくしてから再度お試しください'
			},
			{ name: 'InternalServerError', expected: 'サーバーエラーが発生しました' }
		];

		testCases.forEach(({ name, expected }) => {
			const error = new Error('AWS SDK Error');
			error.name = name;
			const result = formatErrorMessage(error);

			expect(result).toBe(expected);
		});
	});

	it('通常のErrorメッセージを返すこと', () => {
		const error = new Error('通常のエラー');
		const result = formatErrorMessage(error);

		expect(result).toBe('通常のエラー');
	});

	it('不明なエラーの場合はデフォルトメッセージを返すこと', () => {
		const result = formatErrorMessage('文字列エラー');

		expect(result).toBe('予期しないエラーが発生しました');
	});
});

describe('logError', () => {
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
	});

	it('AppErrorをログに記録すること', () => {
		const error = new AppError('テストエラー', 'TEST_ERROR', 400);
		logError(error);

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining('AppError: テストエラー'),
			expect.objectContaining({
				code: 'TEST_ERROR',
				statusCode: 400
			})
		);
	});

	it('通常のErrorをログに記録すること', () => {
		const error = new Error('通常のエラー');
		logError(error);

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining('Error: 通常のエラー'),
			expect.anything()
		);
	});

	it('コンテキスト付きでログに記録すること', () => {
		const error = new AppError('テストエラー', 'TEST_ERROR');
		logError(error, 'TestContext');

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining('[TestContext]'),
			expect.anything()
		);
	});

	it('不明なエラーをログに記録すること', () => {
		const error = 'string error';
		logError(error);

		expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown error:'), error);
	});
});

describe('withErrorHandling', () => {
	it('正常な処理の結果を返すこと', async () => {
		const testFn = async () => 'success';
		const result = await withErrorHandling(testFn);

		expect(result.data).toBe('success');
		expect(result.error).toBeNull();
	});

	it('エラーをキャッチしてエラーメッセージを返すこと', async () => {
		const testFn = async () => {
			throw new Error('テストエラー');
		};

		const result = await withErrorHandling(testFn);

		expect(result.data).toBeNull();
		expect(result.error).toBe('テストエラー');
	});

	it('コンテキスト付きでエラーをログに記録すること', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const testFn = async () => {
			throw new Error('テストエラー');
		};

		await withErrorHandling(testFn, 'TestContext');

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining('[TestContext]'),
			expect.anything()
		);

		consoleErrorSpy.mockRestore();
	});

	it('AppErrorを正しく処理すること', async () => {
		const testFn = async () => {
			throw new NotFoundError('データが見つかりません');
		};

		const result = await withErrorHandling(testFn);

		expect(result.data).toBeNull();
		expect(result.error).toBe('データが見つかりません');
	});
});
