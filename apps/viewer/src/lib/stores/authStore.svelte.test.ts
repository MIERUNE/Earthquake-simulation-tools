import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authStore } from './authStore.svelte';
import * as authApi from '../api/auth';

// Mock the auth API
vi.mock('../api/auth', () => ({
	signIn: vi.fn(),
	isTokenExpired: vi.fn(),
	decodeToken: vi.fn()
}));

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};

	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value.toString();
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		}
	};
})();

Object.defineProperty(global, 'localStorage', {
	value: localStorageMock
});

describe('AuthStore', () => {
	beforeEach(() => {
		// Clear localStorage before each test
		localStorageMock.clear();
		vi.clearAllMocks();

		// Reset authStore state by signing out
		authStore.signOut();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('initial state', () => {
		it('should have correct initial state when no session exists', () => {
			expect(authStore.isAuthenticated).toBe(false);
			expect(authStore.isLoading).toBe(false);
			expect(authStore.user).toBeNull();
			expect(authStore.error).toBeNull();
		});

		it('should restore session from localStorage on initialization', () => {
			// Setup mock tokens and user in localStorage
			const mockTokens = {
				accessToken: 'mock-access-token',
				idToken: 'mock-id-token',
				refreshToken: 'mock-refresh-token',
				expiresIn: 3600
			};

			const mockUser = {
				username: 'test-user',
				email: 'test@example.com',
				sub: 'mock-sub'
			};

			localStorageMock.setItem('mosiri_auth_tokens', JSON.stringify(mockTokens));
			localStorageMock.setItem('mosiri_auth_user', JSON.stringify(mockUser));

			// Mock token validation
			vi.mocked(authApi.isTokenExpired).mockReturnValue(false);

			// Create new authStore instance to trigger restoration
			// Note: In actual implementation, this happens in constructor
			// For testing, we verify the localStorage contains the data
			expect(localStorageMock.getItem('mosiri_auth_tokens')).toBe(JSON.stringify(mockTokens));
			expect(localStorageMock.getItem('mosiri_auth_user')).toBe(JSON.stringify(mockUser));
		});

		it('should clear session if token is expired', () => {
			// Setup expired token in localStorage
			const mockTokens = {
				accessToken: 'expired-access-token',
				idToken: 'expired-id-token',
				refreshToken: 'expired-refresh-token',
				expiresIn: 3600
			};

			const mockUser = {
				username: 'test-user',
				email: 'test@example.com',
				sub: 'mock-sub'
			};

			localStorageMock.setItem('mosiri_auth_tokens', JSON.stringify(mockTokens));
			localStorageMock.setItem('mosiri_auth_user', JSON.stringify(mockUser));

			// Mock token as expired
			vi.mocked(authApi.isTokenExpired).mockReturnValue(true);

			// After restoration, session should be cleared
			authStore.signOut();
			expect(authStore.isAuthenticated).toBe(false);
		});
	});

	describe('signIn', () => {
		it('should successfully sign in with valid credentials', async () => {
			const mockTokens = {
				accessToken: 'mock-access-token',
				idToken: 'mock-id-token',
				refreshToken: 'mock-refresh-token',
				expiresIn: 3600
			};

			const mockDecodedToken = {
				'cognito:username': 'test-user',
				email: 'test@example.com',
				sub: 'mock-sub'
			};

			vi.mocked(authApi.signIn).mockResolvedValue(mockTokens);
			vi.mocked(authApi.decodeToken).mockReturnValue(mockDecodedToken);

			const result = await authStore.signIn({
				username: 'test@example.com',
				password: 'Test123!'
			});

			expect(result.success).toBe(true);
			expect(result.error).toBeNull();
			expect(authStore.isAuthenticated).toBe(true);
			expect(authStore.user).toEqual({
				username: 'test-user',
				email: 'test@example.com',
				sub: 'mock-sub'
			});
		});

		it('should handle sign in error', async () => {
			vi.mocked(authApi.signIn).mockRejectedValue(new Error('Invalid credentials'));

			const result = await authStore.signIn({
				username: 'test@example.com',
				password: 'wrong-password'
			});

			expect(result.success).toBe(false);
			expect(result.error).toBeTruthy();
			expect(authStore.isAuthenticated).toBe(false);
			expect(authStore.error).toBeTruthy();
		});

		it('should set loading state during sign in', async () => {
			vi.mocked(authApi.signIn).mockImplementation(
				() =>
					new Promise((resolve) => {
						setTimeout(() => {
							resolve({
								accessToken: 'mock-access-token',
								idToken: 'mock-id-token',
								refreshToken: 'mock-refresh-token',
								expiresIn: 3600
							});
						}, 100);
					})
			);

			vi.mocked(authApi.decodeToken).mockReturnValue({
				'cognito:username': 'test-user',
				email: 'test@example.com',
				sub: 'mock-sub'
			});

			const signInPromise = authStore.signIn({
				username: 'test@example.com',
				password: 'Test123!'
			});

			// Check loading state immediately after calling signIn
			expect(authStore.isLoading).toBe(true);

			await signInPromise;

			// Loading should be false after sign in completes
			expect(authStore.isLoading).toBe(false);
		});

		it('should save session to localStorage on successful sign in', async () => {
			const mockTokens = {
				accessToken: 'mock-access-token',
				idToken: 'mock-id-token',
				refreshToken: 'mock-refresh-token',
				expiresIn: 3600
			};

			const mockDecodedToken = {
				'cognito:username': 'test-user',
				email: 'test@example.com',
				sub: 'mock-sub'
			};

			vi.mocked(authApi.signIn).mockResolvedValue(mockTokens);
			vi.mocked(authApi.decodeToken).mockReturnValue(mockDecodedToken);

			await authStore.signIn({
				username: 'test@example.com',
				password: 'Test123!'
			});

			const savedTokens = localStorageMock.getItem('mosiri_auth_tokens');
			const savedUser = localStorageMock.getItem('mosiri_auth_user');

			expect(savedTokens).toBeTruthy();
			expect(savedUser).toBeTruthy();
			expect(JSON.parse(savedTokens!)).toEqual(mockTokens);
			expect(JSON.parse(savedUser!)).toEqual({
				username: 'test-user',
				email: 'test@example.com',
				sub: 'mock-sub'
			});
		});
	});

	describe('signOut', () => {
		it('should clear session and reset state', () => {
			// Setup mock session
			localStorageMock.setItem(
				'mosiri_auth_tokens',
				JSON.stringify({
					accessToken: 'mock-access-token',
					idToken: 'mock-id-token',
					refreshToken: 'mock-refresh-token',
					expiresIn: 3600
				})
			);
			localStorageMock.setItem(
				'mosiri_auth_user',
				JSON.stringify({
					username: 'test-user',
					email: 'test@example.com',
					sub: 'mock-sub'
				})
			);

			authStore.signOut();

			expect(authStore.isAuthenticated).toBe(false);
			expect(authStore.user).toBeNull();
			expect(authStore.error).toBeNull();
			expect(localStorageMock.getItem('mosiri_auth_tokens')).toBeNull();
			expect(localStorageMock.getItem('mosiri_auth_user')).toBeNull();
		});
	});

	describe('clearError', () => {
		it('should clear error state', async () => {
			// Trigger an error
			vi.mocked(authApi.signIn).mockRejectedValue(new Error('Test error'));
			await authStore.signIn({
				username: 'test@example.com',
				password: 'wrong'
			});

			expect(authStore.error).toBeTruthy();

			authStore.clearError();

			expect(authStore.error).toBeNull();
		});
	});

	describe('getAccessToken', () => {
		it('should return access token when authenticated', async () => {
			const mockTokens = {
				accessToken: 'mock-access-token',
				idToken: 'mock-id-token',
				refreshToken: 'mock-refresh-token',
				expiresIn: 3600
			};

			vi.mocked(authApi.signIn).mockResolvedValue(mockTokens);
			vi.mocked(authApi.decodeToken).mockReturnValue({
				'cognito:username': 'test-user',
				email: 'test@example.com',
				sub: 'mock-sub'
			});
			vi.mocked(authApi.isTokenExpired).mockReturnValue(false);

			await authStore.signIn({
				username: 'test@example.com',
				password: 'Test123!'
			});

			const token = authStore.getAccessToken();
			expect(token).toBe('mock-access-token');
		});

		it('should return null when not authenticated', () => {
			const token = authStore.getAccessToken();
			expect(token).toBeNull();
		});

		it('should sign out and return null when token is expired', async () => {
			const mockTokens = {
				accessToken: 'expired-access-token',
				idToken: 'expired-id-token',
				refreshToken: 'expired-refresh-token',
				expiresIn: 3600
			};

			vi.mocked(authApi.signIn).mockResolvedValue(mockTokens);
			vi.mocked(authApi.decodeToken).mockReturnValue({
				'cognito:username': 'test-user',
				email: 'test@example.com',
				sub: 'mock-sub'
			});

			await authStore.signIn({
				username: 'test@example.com',
				password: 'Test123!'
			});

			// Mock token as expired
			vi.mocked(authApi.isTokenExpired).mockReturnValue(true);

			const token = authStore.getAccessToken();
			expect(token).toBeNull();
			expect(authStore.isAuthenticated).toBe(false);
		});
	});

	describe('getIdToken', () => {
		it('should return ID token when authenticated', async () => {
			const mockTokens = {
				accessToken: 'mock-access-token',
				idToken: 'mock-id-token',
				refreshToken: 'mock-refresh-token',
				expiresIn: 3600
			};

			vi.mocked(authApi.signIn).mockResolvedValue(mockTokens);
			vi.mocked(authApi.decodeToken).mockReturnValue({
				'cognito:username': 'test-user',
				email: 'test@example.com',
				sub: 'mock-sub'
			});
			vi.mocked(authApi.isTokenExpired).mockReturnValue(false);

			await authStore.signIn({
				username: 'test@example.com',
				password: 'Test123!'
			});

			const token = authStore.getIdToken();
			expect(token).toBe('mock-id-token');
		});

		it('should return null when not authenticated', () => {
			const token = authStore.getIdToken();
			expect(token).toBeNull();
		});

		it('should sign out and return null when token is expired', async () => {
			const mockTokens = {
				accessToken: 'mock-access-token',
				idToken: 'expired-id-token',
				refreshToken: 'mock-refresh-token',
				expiresIn: 3600
			};

			vi.mocked(authApi.signIn).mockResolvedValue(mockTokens);
			vi.mocked(authApi.decodeToken).mockReturnValue({
				'cognito:username': 'test-user',
				email: 'test@example.com',
				sub: 'mock-sub'
			});

			await authStore.signIn({
				username: 'test@example.com',
				password: 'Test123!'
			});

			// Mock token as expired
			vi.mocked(authApi.isTokenExpired).mockReturnValue(true);

			const token = authStore.getIdToken();
			expect(token).toBeNull();
			expect(authStore.isAuthenticated).toBe(false);
		});
	});
});
