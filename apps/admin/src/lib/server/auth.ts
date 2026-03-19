import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { CognitoIdTokenPayload } from 'aws-jwt-verify/jwt-model';
import { dev } from '$app/environment';
import type { AuthUser, Session } from '$lib/types/auth';
import { UserRole } from '$lib/types/auth';
import type { Cookies } from '@sveltejs/kit';

// Token cookie names
const ACCESS_TOKEN_COOKIE = 'access_token';
const ID_TOKEN_COOKIE = 'id_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

// Cookie options
const COOKIE_OPTIONS = {
	httpOnly: true,
	secure: !dev,
	sameSite: 'lax' as const,
	path: '/',
	maxAge: 60 * 60 * 24 * 7 // 7 days
};

// Create JWT verifier for ID tokens
const createIdTokenVerifier = () => {
	const userPoolId = import.meta.env.PUBLIC_AWS_COGNITO_USER_POOL_ID || process.env.PUBLIC_AWS_COGNITO_USER_POOL_ID;
	const clientId = import.meta.env.PUBLIC_AWS_COGNITO_CLIENT_ID || process.env.PUBLIC_AWS_COGNITO_CLIENT_ID;

	if (!userPoolId || !clientId) {
		// In development, return null verifier if Cognito is not configured
		if (dev) {
			console.warn('Cognito configuration is missing - authentication disabled in development');
			return null;
		}
		throw new Error('Cognito configuration is missing');
	}

	return CognitoJwtVerifier.create({
		userPoolId,
		tokenUse: 'id',
		clientId
	});
};

// Create JWT verifier for access tokens
const createAccessTokenVerifier = () => {
	const userPoolId = import.meta.env.PUBLIC_AWS_COGNITO_USER_POOL_ID || process.env.PUBLIC_AWS_COGNITO_USER_POOL_ID;
	const clientId = import.meta.env.PUBLIC_AWS_COGNITO_CLIENT_ID || process.env.PUBLIC_AWS_COGNITO_CLIENT_ID;

	if (!userPoolId || !clientId) {
		// In development, return null verifier if Cognito is not configured
		if (dev) {
			console.warn('Cognito configuration is missing - authentication disabled in development');
			return null;
		}
		throw new Error('Cognito configuration is missing');
	}

	return CognitoJwtVerifier.create({
		userPoolId,
		tokenUse: 'access',
		clientId
	});
};

/**
 * Extract user information from ID token payload
 */
const extractUserFromToken = (payload: CognitoIdTokenPayload): AuthUser => {
	// Get role from custom attribute or default to viewer
	const role = (payload['custom:role'] as UserRole) || UserRole.Viewer;
	const organization = payload['custom:organization'] as string | undefined;

	return {
		userId: payload.sub,
		email: payload.email as string,
		role,
		organization
	};
};

/**
 * Verify and get session from cookies
 */
export const getSession = async (cookies: Cookies): Promise<Session | null> => {
	try {
		const idToken = cookies.get(ID_TOKEN_COOKIE);
		const accessToken = cookies.get(ACCESS_TOKEN_COOKIE);
		const refreshToken = cookies.get(REFRESH_TOKEN_COOKIE);

		if (!idToken || !accessToken) {
			return null;
		}

		// Verify ID token
		const idTokenVerifier = createIdTokenVerifier();
		if (!idTokenVerifier) {
			// In development without Cognito configuration, skip verification
			return null;
		}
		const idTokenPayload = await idTokenVerifier.verify(idToken);

		// Verify access token
		const accessTokenVerifier = createAccessTokenVerifier();
		if (!accessTokenVerifier) {
			// In development without Cognito configuration, skip verification
			return null;
		}
		await accessTokenVerifier.verify(accessToken);

		const user = extractUserFromToken(idTokenPayload);

		return {
			user,
			accessToken,
			idToken,
			refreshToken,
			expiresAt: idTokenPayload.exp * 1000 // Convert to milliseconds
		};
	} catch (error) {
		console.error('Session verification failed:', error);
		return null;
	}
};

/**
 * Set authentication cookies
 */
export const setAuthCookies = (
	cookies: Cookies,
	tokens: {
		accessToken: string;
		idToken: string;
		refreshToken?: string;
	}
) => {
	cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, COOKIE_OPTIONS);
	cookies.set(ID_TOKEN_COOKIE, tokens.idToken, COOKIE_OPTIONS);
	
	if (tokens.refreshToken) {
		cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
			...COOKIE_OPTIONS,
			maxAge: 60 * 60 * 24 * 30 // 30 days for refresh token
		});
	}
};

/**
 * Clear authentication cookies
 */
export const clearAuthCookies = (cookies: Cookies) => {
	cookies.delete(ACCESS_TOKEN_COOKIE, { path: '/' });
	cookies.delete(ID_TOKEN_COOKIE, { path: '/' });
	cookies.delete(REFRESH_TOKEN_COOKIE, { path: '/' });
};

/**
 * Check if user has permission for resource
 */
export const checkResourcePermission = (
	user: AuthUser | null,
	resourceOwnerId: string
): { canRead: boolean; canWrite: boolean; canDelete: boolean } => {
	if (!user) {
		return { canRead: false, canWrite: false, canDelete: false };
	}

	// Admin has full access
	if (user.role === UserRole.Admin) {
		return { canRead: true, canWrite: true, canDelete: true };
	}

	// Viewer can only read
	if (user.role === UserRole.Viewer) {
		return { canRead: true, canWrite: false, canDelete: false };
	}

	// Operator can read all, but write/delete only own resources
	if (user.role === UserRole.Operator) {
		const isOwner = user.userId === resourceOwnerId;
		return {
			canRead: true,
			canWrite: isOwner,
			canDelete: isOwner
		};
	}

	return { canRead: false, canWrite: false, canDelete: false };
};