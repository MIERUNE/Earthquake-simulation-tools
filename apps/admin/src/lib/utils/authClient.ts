import { goto } from '$app/navigation';
import { base } from '$app/paths';
import type { Result } from './common';
import {
	handleSignIn as cognitoSignIn,
	handleSignOut as cognitoSignOut,
	handleSignUp as cognitoSignUp,
	handleConfirmSignUp as cognitoConfirmSignUp,
	handleResetPassword as cognitoResetPassword,
	handleConfirmResetPassword as cognitoConfirmResetPassword,
	handleResendSignUpCode as cognitoResendSignUpCode,
	currentAuthenticatedUser
} from './auth';
import type { SignInInput } from 'aws-amplify/auth';

/**
 * Client-side sign in with SSR support
 */
export const signIn = async (params: SignInInput): Promise<Result<boolean, string>> => {
	const result = await cognitoSignIn(params);
	
	if (result.ok) {
		// Get current authenticated user's tokens
		try {
			const authResult = await currentAuthenticatedUser();
			if (authResult.ok) {
				// Send tokens to server to set cookies
				await fetch('/api/auth/session', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					credentials: 'include'
				});
				
				// Redirect to return URL or menu
				const urlParams = new URLSearchParams(window.location.search);
				const returnUrl = urlParams.get('returnUrl') || `${base}/menu`;
				await goto(returnUrl);
			}
		} catch (error) {
			console.error('Failed to set session:', error);
		}
	}
	
	return result;
};

/**
 * Client-side sign out with SSR support
 */
export const signOut = async (): Promise<Result<boolean, string>> => {
	const result = await cognitoSignOut();
	
	if (result.ok) {
		// Clear server-side session
		await fetch('/api/auth/session', {
			method: 'DELETE',
			credentials: 'include'
		});
		
		// Redirect to login
		await goto(`${base}/login`);
	}
	
	return result;
};

// Re-export other auth functions that don't need SSR modifications
export {
	cognitoSignUp as signUp,
	cognitoConfirmSignUp as confirmSignUp,
	cognitoResetPassword as resetPassword,
	cognitoConfirmResetPassword as confirmResetPassword,
	cognitoResendSignUpCode as resendSignUpCode,
	currentAuthenticatedUser
};