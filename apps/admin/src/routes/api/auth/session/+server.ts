import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setAuthCookies, clearAuthCookies } from '$lib/server/auth';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

/**
 * POST /api/auth/session
 * Set authentication cookies from Cognito tokens
 */
export const POST: RequestHandler = async ({ cookies }) => {
	try {
		// Get current session from Amplify
		const session = await fetchAuthSession();
		
		if (!session.tokens) {
			return json({ error: 'No valid session' }, { status: 401 });
		}
		
		const { accessToken, idToken } = session.tokens;
		
		if (!accessToken || !idToken) {
			return json({ error: 'Missing tokens' }, { status: 401 });
		}
		
		// Set cookies
		setAuthCookies(cookies, {
			accessToken: accessToken.toString(),
			idToken: idToken.toString(),
			refreshToken: session.tokens.refreshToken?.toString()
		});
		
		return json({ success: true });
	} catch (error) {
		console.error('Failed to set session:', error);
		return json({ error: 'Failed to set session' }, { status: 500 });
	}
};

/**
 * DELETE /api/auth/session
 * Clear authentication cookies
 */
export const DELETE: RequestHandler = async ({ cookies }) => {
	clearAuthCookies(cookies);
	return json({ success: true });
};