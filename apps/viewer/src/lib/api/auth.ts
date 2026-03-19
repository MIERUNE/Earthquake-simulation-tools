/**
 * Cognito認証APIクライアント
 * AWS SDK for JavaScriptを直接使用してCognito認証を実装
 */

import {
	CognitoIdentityProviderClient,
	InitiateAuthCommand,
	SignUpCommand,
	ConfirmSignUpCommand,
	ResendConfirmationCodeCommand,
	ForgotPasswordCommand,
	ConfirmForgotPasswordCommand,
	type InitiateAuthCommandInput,
	type SignUpCommandInput,
	type ConfirmSignUpCommandInput
} from '@aws-sdk/client-cognito-identity-provider';
import { awsConfig } from '../aws/config';
import { env } from '../env';
import { AwsError, ValidationError, formatErrorMessage, logError } from '../utils/errors';

/**
 * Cognito認証レスポンス
 */
export interface AuthTokens {
	accessToken: string;
	idToken: string;
	refreshToken: string;
	expiresIn: number;
}

/**
 * ログイン入力
 */
export interface SignInInput {
	username: string;
	password: string;
}

/**
 * サインアップ入力
 */
export interface SignUpInput {
	username: string;
	password: string;
	email: string;
}

/**
 * Cognitoクライアントの取得
 */
const getCognitoClient = (): CognitoIdentityProviderClient => {
	return new CognitoIdentityProviderClient({
		region: awsConfig.region
	});
};

/**
 * ログイン処理
 */
export const signIn = async (input: SignInInput): Promise<AuthTokens> => {
	const clientId = env.cognitoClientId;

	if (!clientId) {
		throw new ValidationError('Cognito設定が不足しています');
	}

	const client = getCognitoClient();

	const params: InitiateAuthCommandInput = {
		AuthFlow: 'USER_PASSWORD_AUTH',
		ClientId: clientId,
		AuthParameters: {
			USERNAME: input.username,
			PASSWORD: input.password
		}
	};

	try {
		const command = new InitiateAuthCommand(params);
		const response = await client.send(command);

		if (!response.AuthenticationResult) {
			throw new AwsError('認証結果が取得できませんでした');
		}

		const { AccessToken, IdToken, RefreshToken, ExpiresIn } = response.AuthenticationResult;

		if (!AccessToken || !IdToken || !RefreshToken) {
			throw new AwsError('トークンが取得できませんでした');
		}

		return {
			accessToken: AccessToken,
			idToken: IdToken,
			refreshToken: RefreshToken,
			expiresIn: ExpiresIn || 3600
		};
	} catch (error) {
		logError(error, 'signIn');
		if (error instanceof AwsError || error instanceof ValidationError) {
			throw error;
		}
		throw new AwsError(formatErrorMessage(error), error as Error);
	}
};

/**
 * サインアップ処理
 */
export const signUp = async (
	input: SignUpInput
): Promise<{
	userConfirmed: boolean;
	codeDeliveryDetails?: { Destination?: string; DeliveryMedium?: string };
	userSub?: string;
}> => {
	const clientId = env.cognitoClientId;

	if (!clientId) {
		throw new ValidationError('Cognito設定が不足しています');
	}

	const client = getCognitoClient();

	const params: SignUpCommandInput = {
		ClientId: clientId,
		Username: input.username,
		Password: input.password,
		UserAttributes: [
			{
				Name: 'email',
				Value: input.email
			}
		]
	};

	try {
		const command = new SignUpCommand(params);
		const response = await client.send(command);

		return {
			userConfirmed: response.UserConfirmed || false,
			codeDeliveryDetails: response.CodeDeliveryDetails
				? {
						Destination: response.CodeDeliveryDetails.Destination,
						DeliveryMedium: response.CodeDeliveryDetails.DeliveryMedium
					}
				: undefined,
			userSub: response.UserSub
		};
	} catch (error) {
		logError(error, 'signUp');
		if (error instanceof ValidationError) {
			throw error;
		}
		throw new AwsError(formatErrorMessage(error), error as Error);
	}
};

/**
 * サインアップ確認（検証コード入力）
 */
export const confirmSignUp = async (
	username: string,
	code: string
): Promise<{ success: boolean }> => {
	const clientId = env.cognitoClientId;

	if (!clientId) {
		throw new ValidationError('Cognito設定が不足しています');
	}

	const client = getCognitoClient();

	const params: ConfirmSignUpCommandInput = {
		ClientId: clientId,
		Username: username,
		ConfirmationCode: code
	};

	try {
		const command = new ConfirmSignUpCommand(params);
		await client.send(command);

		return { success: true };
	} catch (error) {
		logError(error, 'confirmSignUp');
		if (error instanceof ValidationError) {
			throw error;
		}
		throw new AwsError(formatErrorMessage(error), error as Error);
	}
};

/**
 * 確認コード再送信
 */
export const resendConfirmationCode = async (username: string): Promise<{ success: boolean }> => {
	const clientId = env.cognitoClientId;

	if (!clientId) {
		throw new ValidationError('Cognito設定が不足しています');
	}

	const client = getCognitoClient();

	try {
		const command = new ResendConfirmationCodeCommand({
			ClientId: clientId,
			Username: username
		});
		await client.send(command);

		return { success: true };
	} catch (error) {
		logError(error, 'resendConfirmationCode');
		if (error instanceof ValidationError) {
			throw error;
		}
		throw new AwsError(formatErrorMessage(error), error as Error);
	}
};

/**
 * パスワードリセット要求
 */
export const forgotPassword = async (username: string): Promise<{ success: boolean }> => {
	const clientId = env.cognitoClientId;

	if (!clientId) {
		throw new ValidationError('Cognito設定が不足しています');
	}

	const client = getCognitoClient();

	try {
		const command = new ForgotPasswordCommand({
			ClientId: clientId,
			Username: username
		});
		await client.send(command);

		return { success: true };
	} catch (error) {
		logError(error, 'forgotPassword');
		if (error instanceof ValidationError) {
			throw error;
		}
		throw new AwsError(formatErrorMessage(error), error as Error);
	}
};

/**
 * パスワードリセット確認
 */
export const confirmForgotPassword = async (
	username: string,
	code: string,
	newPassword: string
): Promise<{ success: boolean }> => {
	const clientId = env.cognitoClientId;

	if (!clientId) {
		throw new ValidationError('Cognito設定が不足しています');
	}

	const client = getCognitoClient();

	try {
		const command = new ConfirmForgotPasswordCommand({
			ClientId: clientId,
			Username: username,
			ConfirmationCode: code,
			Password: newPassword
		});
		await client.send(command);

		return { success: true };
	} catch (error) {
		logError(error, 'confirmForgotPassword');
		if (error instanceof ValidationError) {
			throw error;
		}
		throw new AwsError(formatErrorMessage(error), error as Error);
	}
};

/**
 * JWTトークンのデコード（簡易版）
 *
 * ⚠️ セキュリティに関する注意:
 * この実装は署名検証を行っていません。トークンの内容を読み取る目的でのみ使用してください。
 * 本番環境では 'jose' や 'aws-jwt-verify' などの検証ライブラリの使用を推奨します。
 *
 * 現在の用途: ユーザー情報の表示、有効期限チェック
 * トークンの信頼性: AWS Cognitoが発行したトークンのみを使用
 */
export const decodeToken = (token: string): Record<string, unknown> => {
	try {
		// JWTトークンの形式検証 (header.payload.signature)
		const parts = token.split('.');
		if (parts.length !== 3) {
			throw new ValidationError('トークンの形式が不正です (header.payload.signature 形式である必要があります)');
		}

		const base64Url = parts[1];
		if (!base64Url) {
			throw new ValidationError('トークンのペイロード部分が空です');
		}

		// Base64URL -> Base64 変換
		let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

		// Base64パディング復元（4の倍数になるように'='を追加）
		const paddingLength = (4 - (base64.length % 4)) % 4;
		base64 = base64 + '='.repeat(paddingLength);

		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split('')
				.map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
				.join('')
		);
		return JSON.parse(jsonPayload);
	} catch (error) {
		logError(error, 'decodeToken');
		if (error instanceof ValidationError) {
			throw error;
		}
		throw new ValidationError('トークンのデコードに失敗しました');
	}
};

/**
 * トークンの有効期限チェック
 */
export const isTokenExpired = (token: string): boolean => {
	try {
		const decoded = decodeToken(token);
		const exp = decoded.exp as number;

		if (!exp) {
			throw new ValidationError('トークンにexp（有効期限）が含まれていません');
		}

		const now = Math.floor(Date.now() / 1000);
		return now >= exp;
	} catch {
		return true;
	}
};
