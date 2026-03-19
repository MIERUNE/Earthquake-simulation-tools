/**
 * User roles for authorization
 */
export enum UserRole {
	Admin = 'admin',
	Operator = 'operator',
	Viewer = 'viewer'
}

/**
 * User information from JWT token
 */
export interface AuthUser {
	userId: string;
	email: string;
	role: UserRole;
	organization?: string;
}

/**
 * Session data stored in server
 */
export interface Session {
	user: AuthUser;
	accessToken: string;
	idToken: string;
	refreshToken?: string;
	expiresAt: number;
}

/**
 * Route permission configuration
 */
export interface RoutePermission {
	allowedRoles: UserRole[];
	requireAuth: boolean;
	redirectTo?: string;
}

/**
 * Resource access permission
 */
export interface ResourcePermission {
	canRead: boolean;
	canWrite: boolean;
	canDelete: boolean;
}