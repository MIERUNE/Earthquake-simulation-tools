import type { RoutePermission } from '$lib/types/auth';
import { UserRole } from '$lib/types/auth';

/**
 * Route permission configurations
 */
export const routePermissions: Record<string, RoutePermission> = {
	// Public routes
	'/': { requireAuth: false, allowedRoles: [] },
	'/login': { requireAuth: false, allowedRoles: [] },
	
	// Protected routes - Wide simulation
	'/wide/menu': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator, UserRole.Viewer]
	},
	'/wide/areaPresetList': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator, UserRole.Viewer]
	},
	'/wide/areaPresetEdit': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator]
	},
	'/wide/areaPresetEditInfo': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator]
	},
	'/wide/eqParamPresetList': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator, UserRole.Viewer]
	},
	'/wide/eqParamPresetEdit': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator]
	},
	'/wide/eqParamPresetEditInfo': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator]
	},
	'/wide/simulationReservedList': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator, UserRole.Viewer]
	},
	'/wide/simulationReserved': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator]
	},
	'/wide/simulationReservedDetail': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator, UserRole.Viewer]
	},
	'/wide/simulationResult': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator, UserRole.Viewer]
	},
	
	// Protected routes - Narrow simulation
	'/narrow/menu': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator, UserRole.Viewer]
	},
	'/narrow/buildingPresetList': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator, UserRole.Viewer]
	},
	'/narrow/buildingPresetEdit': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator]
	},
	'/narrow/buildingPresetEditInfo': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator]
	},
	'/narrow/simModelPresetList': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator, UserRole.Viewer]
	},
	'/narrow/simModelPresetEdit': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator]
	},
	'/narrow/simModelPresetEditInfo': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator]
	},
	'/narrow/simulationReservedList': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator, UserRole.Viewer]
	},
	'/narrow/simulationReserved': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator]
	},
	'/narrow/simulationReservedDetail': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator, UserRole.Viewer]
	},
	'/narrow/simulationResult': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator, UserRole.Viewer]
	},
	
	// Viewer routes - Public
	'/viewerSelect': {
		requireAuth: false,
		allowedRoles: []
	},
	'/viewer': {
		requireAuth: false,
		allowedRoles: []
	},
	
	// General menu
	'/menu': {
		requireAuth: true,
		allowedRoles: [UserRole.Admin, UserRole.Operator, UserRole.Viewer]
	}
};

/**
 * Get permission for a route
 */
export const getRoutePermission = (pathname: string): RoutePermission | null => {
	// Direct match
	if (routePermissions[pathname]) {
		return routePermissions[pathname];
	}
	
	// Check for dynamic routes (e.g., /wide/areaPresetEditInfo/[id])
	const pathSegments = pathname.split('/').filter(Boolean);
	if (pathSegments.length >= 3) {
		// Try to match parent route for dynamic segments
		const parentPath = `/${pathSegments.slice(0, -1).join('/')}`;
		const parentPermission = routePermissions[parentPath];
		
		if (parentPermission) {
			return parentPermission;
		}
	}
	
	return null;
};

/**
 * Check if user has access to route
 */
export const hasRouteAccess = (
	userRole: UserRole | null,
	pathname: string
): boolean => {
	const permission = getRoutePermission(pathname);
	
	// If no permission config, allow access
	if (!permission) {
		return true;
	}
	
	// If route doesn't require auth, allow access
	if (!permission.requireAuth) {
		return true;
	}
	
	// If user is not authenticated, deny access
	if (!userRole) {
		return false;
	}
	
	// Check if user role is allowed
	return permission.allowedRoles.includes(userRole);
};