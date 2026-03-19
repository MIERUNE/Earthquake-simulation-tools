import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getSession, clearAuthCookies } from '$lib/server/auth';
import { hasRouteAccess, getRoutePermission } from '$lib/server/authorization';
import { sequence } from '@sveltejs/kit/hooks';

// Get base path from environment variable
const BASE_PATH = process.env.BASE_PATH || '/admin';

/**
 * Authentication handler
 * Verifies JWT tokens and creates session
 */
const authenticationHandler: Handle = async ({ event, resolve }) => {
	// Get session from cookies
	const session = await getSession(event.cookies);
	
	// Set session in locals
	event.locals.session = session;
	event.locals.user = session?.user || null;
	
	return resolve(event);
};

/**
 * Authorization handler
 * Checks route permissions
 */
const authorizationHandler: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const session = event.locals.session;
	const user = event.locals.user;
	
	// Skip authorization for API routes
	if (pathname.startsWith('/api/')) {
		return resolve(event);
	}
	
	// Check route access
	const hasAccess = hasRouteAccess(user?.role || null, pathname);
	
	if (!hasAccess) {
		const permission = getRoutePermission(pathname);
		
		// If route requires auth but user is not authenticated
		if (permission?.requireAuth && !session) {
			// Clear any invalid cookies
			clearAuthCookies(event.cookies);
			
			// Redirect to login with return URL
			const returnUrl = encodeURIComponent(pathname);
			throw redirect(302, `${BASE_PATH}/login?returnUrl=${returnUrl}`);
		}
		
		// If user is authenticated but doesn't have permission
		if (session && permission?.requireAuth) {
			// Redirect to menu or custom unauthorized page
			throw redirect(302, permission.redirectTo || `${BASE_PATH}/menu`);
		}
	}
	
	return resolve(event);
};

/**
 * Combined handler
 */
export const handle = sequence(authenticationHandler, authorizationHandler);