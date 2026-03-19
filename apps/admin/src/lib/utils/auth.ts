import { Amplify, type ResourcesConfig } from 'aws-amplify';
import {
	signUp,
	signIn,
	signOut,
	getCurrentUser,
	autoSignIn,
	confirmSignUp,
	resetPassword,
	confirmResetPassword,
	resendSignUpCode,
	type SignInInput,
	type ConfirmSignUpInput,
	type ResetPasswordInput,
	type ConfirmResetPasswordInput,
	type ResendSignUpCodeInput
} from 'aws-amplify/auth';
//import { I18n } from 'aws-amplify/utils';
// const addMessage = {
//     ja: {
//         'Your passwords must match': 'パスワードは同じものを入力してください。',
//         'Username should be an email.': 'ユーザ名はメールアドレスで入力してください。',
//         'Enter your Username': 'メールアドレス',
//         'Incorrect username or password.': 'ユーザ名またはパスワードが違います。'
//     }
// };

// //console.log(translations['ja']);

// I18n.putVocabularies(addMessage);
//I18n.setLanguage('ja');

import { type Result, ok, err } from './common';

//import config from './amplifyconfiguration.json';
//Amplify.configure(config);
import amplifyconfig from './amplifyconfiguration.json';
Amplify.configure(amplifyconfig as ResourcesConfig);

type SignUpParameters = {
	username: string;
	password: string;
	// email: string;
	// phone_number: string;
};

// const username = '';
// const confirmationCode = '';
// const newPassword = '';
// let message = '';

const DEBUG = false;

// ユーザー情報取得関数
const currentAuthenticatedUser = async (): Promise<Result<boolean, string>> => {
	try {
		const { username, userId, signInDetails } = await getCurrentUser();
		console.log(`The username: ${username}`);
		console.log(`The userId: ${userId}`);
		console.log(`The signInDetails: ${signInDetails}`);
		return ok(true);
	} catch (error) {
		const errMessage = (error as Error).message;
		console.log(errMessage);
		return err(errMessage);
	}
};

// --------------------------------------------------------
// サインアップ関連の関数
// --------------------------------------------------------
// サインアップ関数
const handleSignUp = async ({
	username,
	password
}: SignUpParameters): Promise<Result<boolean, string>> => {
	if (DEBUG) {
		return ok(false);
	}
	try {
		const { nextStep } = await signUp({
			username,
			password
		});

		switch (nextStep.signUpStep) {
			case 'DONE':
				//alert('サインイン成功');
				return ok(true);
			case 'CONFIRM_SIGN_UP':
				//alert('サインイン成功');
				return ok(true);
			default:
				return err(`unhandled nextStep: ${nextStep.signUpStep}`);
		}
	} catch (error) {
		return err(errorHandling(error as Error));
	}
};

// サインアップ検証コードの確認
const handleConfirmSignUp = async ({
	username,
	confirmationCode
}: ConfirmSignUpInput): Promise<Result<boolean, string>> => {
	if (DEBUG) {
		return ok(false);
	}
	try {
		const { nextStep } = await confirmSignUp({
			username,
			confirmationCode
		});
		switch (nextStep.signUpStep) {
			case 'DONE':
				// TODO: 呼び出し元で通知する
				//alert('サインUP確認成功');
				break;
			case 'CONFIRM_SIGN_UP':
				// TODO: 呼び出し元で通知する
				//alert('サインUP確認成功');
				break;
			default:
				return err(`unhandled nextStep: ${nextStep.signUpStep}`);
		}
	} catch (error) {
		return err(errorHandling(error as Error));
	}

	//Trigger autoSignIn event - will not be triggered automatically
	try {
		const { nextStep } = await autoSignIn();
		switch (nextStep.signInStep) {
			case 'DONE':
				//alert('サインイン成功');
				return ok(true);
			case 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE':
			case 'CONTINUE_SIGN_IN_WITH_MFA_SELECTION':
			case 'CONFIRM_SIGN_IN_WITH_SMS_CODE':
			case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
			case 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP':
			case 'CONFIRM_SIGN_UP':
				//alert('サインイン成功');
				return ok(true);
			case 'RESET_PASSWORD':
			case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
			default:
				return err(`unhandled nextStep: ${nextStep.signInStep}`);
		}
	} catch (error) {
		return err(errorHandling(error as Error));
	}
};

//サインアップの確認コードの送信
const handleResendSignUpCode = async ({
	username
}: ResendSignUpCodeInput): Promise<Result<boolean, string>> => {
	if (DEBUG) {
		return ok(false);
	}
	try {
		await resendSignUpCode({
			username
		});
		return ok(true);
	} catch (error) {
		return err(errorHandling(error as Error));
	}
};

// --------------------------------------------------------
// サインイン関連の関数
// --------------------------------------------------------
// 自動サインイン関数
const handleAutoSignIn = async (): Promise<Result<boolean, string>> => {
	if (DEBUG) {
		return ok(false);
	}
	try {
		const signInOutput = await autoSignIn();
		if (signInOutput) {
			return ok(true);
		} else {
			return err('Unknown error');
		}
	} catch (error) {
		return err(errorHandling(error as Error));
	}
};

// サインイン関数
const handleSignIn = async ({
	username,
	password
}: SignInInput): Promise<Result<boolean, string>> => {
	if (DEBUG) {
		return ok(false);
	}
	// 一旦サインアウト処理
	await handleSignOut();
	try {
		const { isSignedIn, nextStep } = await signIn({ username, password });
		console.log('isSignedIn', isSignedIn);
		switch (nextStep.signInStep) {
			case 'DONE':
				//alert('サインイン成功');
				return ok(true);
			case 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE':
			case 'CONTINUE_SIGN_IN_WITH_MFA_SELECTION':
			case 'CONFIRM_SIGN_IN_WITH_SMS_CODE':
			case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
			case 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP':
			case 'CONFIRM_SIGN_UP':
				//alert('サインアップ後の確認が必要');
				return err('CONFIRM_SIGN_UP');
			case 'RESET_PASSWORD':
			case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
			default:
				return err(`unhandled nextStep: ${nextStep.signInStep}`);
		}
	} catch (error) {
		return err(errorHandling(error as Error));
	}
};

// --------------------------------------------------------
// サインアウト関連の関数
// --------------------------------------------------------
// サインアウト関数
const handleSignOut = async (): Promise<Result<boolean, string>> => {
	if (DEBUG) {
		return ok(false);
	}
	try {
		await signOut();
		return ok(true);
	} catch (error) {
		return err(errorHandling(error as Error));
	}
};

// --------------------------------------------------------
// パスワードリセット関連の関数
// --------------------------------------------------------
// パスワードリセット用確認コードの送信
const handleResetPassword = async ({
	username
}: ResetPasswordInput): Promise<Result<boolean, string>> => {
	if (DEBUG) {
		return ok(false);
	}
	try {
		const { isPasswordReset, nextStep } = await resetPassword({
			username
		});
		if (!isPasswordReset) {
			switch (nextStep.resetPasswordStep) {
				case 'DONE':
					return ok(true);
				case 'CONFIRM_RESET_PASSWORD_WITH_CODE':
					return ok(true);
				default:
					return err(`unhandled nextStep: ${nextStep.resetPasswordStep}`);
			}
		} else {
			return err('Unknown error');
		}
	} catch (error) {
		return err(errorHandling(error as Error));
	}
};

// パスワードリセット要求
const handleConfirmResetPassword = async ({
	username,
	newPassword,
	confirmationCode
}: ConfirmResetPasswordInput): Promise<Result<boolean, string>> => {
	if (DEBUG) {
		return ok(false);
	}

	try {
		await confirmResetPassword({
			username,
			newPassword,
			confirmationCode
		});
		//alert('パスワードリセット成功');
		return ok(true);
	} catch (error) {
		return err(errorHandling(error as Error));
	}
};

// エラーハンドリング
const errorHandling = (error: Error): string => {
	switch (error.name) {
		case 'NotAuthorizedException':
			//Incorrect username or password.
			return `エラーが発生しました。 ${error.message}`;
		case 'UsernameExistsException':
			// User already exists
			return `エラーが発生しました。 ${error.message}`;
		case 'InvalidPasswordException':
			//Password did not conform with policy: Password not long enough
			return `エラーが発生しました。 ${error.message}`;
		case 'LimitExceededException':
			//Attempt limit exceeded, please try after some time.
			return `リクエストが制限を超えました。 ${error.message}`;
		case 'InvalidParameterException':
			//  1 validation error detected: Value at 'password' failed to satisfy constraint: Member must satisfy regular expression pattern: ^[\S]+.*[\S]+$
			return `エラーが発生しました。 ${error.message}`;
		case 'CodeMismatchException':
			//Invalid verification code provided, please try again.
			return `エラーが発生しました。 ${error.message}`;
		case 'ExpiredCodeException':
			//'Invalid code provided, please request a code again.'
			return `エラーが発生しました。 ${error.message}`;
		default:
			return 'エラーが発生しました。';
	}
};

export {
	handleSignUp,
	handleSignIn,
	handleSignOut,
	handleConfirmSignUp,
	handleResetPassword,
	handleConfirmResetPassword,
	handleAutoSignIn,
	currentAuthenticatedUser,
	handleResendSignUpCode
};
