import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { decodeToken, isTokenExpired, signIn, signUp, confirmSignUp } from './auth';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

// Mock AWS SDK
vi.mock('@aws-sdk/client-cognito-identity-provider');

describe('auth utilities', () => {
	describe('decodeToken', () => {
		it('should decode a valid JWT token', () => {
			// Create a valid JWT token payload
			const payload = {
				sub: '1234567890',
				name: 'Test User',
				email: 'test@example.com',
				exp: Math.floor(Date.now() / 1000) + 3600
			};

			// Encode to base64url
			const base64Payload = btoa(JSON.stringify(payload))
				.replace(/\+/g, '-')
				.replace(/\//g, '_')
				.replace(/=/g, '');

			const token = `header.${base64Payload}.signature`;

			const decoded = decodeToken(token);

			expect(decoded).toEqual(payload);
			expect(decoded.sub).toBe('1234567890');
			expect(decoded.email).toBe('test@example.com');
		});

		it('should throw error for invalid token format', () => {
			expect(() => decodeToken('invalid.token')).toThrow();
		});

		it('should throw error for empty token', () => {
			expect(() => decodeToken('')).toThrow();
		});
	});

	describe('isTokenExpired', () => {
		it('should return false for a valid non-expired token', () => {
			const payload = {
				exp: Math.floor(Date.now() / 1000) + 3600 // Expires in 1 hour
			};

			const base64Payload = btoa(JSON.stringify(payload))
				.replace(/\+/g, '-')
				.replace(/\//g, '_')
				.replace(/=/g, '');

			const token = `header.${base64Payload}.signature`;

			expect(isTokenExpired(token)).toBe(false);
		});

		it('should return true for an expired token', () => {
			const payload = {
				exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
			};

			const base64Payload = btoa(JSON.stringify(payload))
				.replace(/\+/g, '-')
				.replace(/\//g, '_')
				.replace(/=/g, '');

			const token = `header.${base64Payload}.signature`;

			expect(isTokenExpired(token)).toBe(true);
		});

		it('should return true for a token expiring exactly now', () => {
			const payload = {
				exp: Math.floor(Date.now() / 1000) // Expires right now
			};

			const base64Payload = btoa(JSON.stringify(payload))
				.replace(/\+/g, '-')
				.replace(/\//g, '_')
				.replace(/=/g, '');

			const token = `header.${base64Payload}.signature`;

			expect(isTokenExpired(token)).toBe(true);
		});

		it('should handle token without exp claim', () => {
			const payload = {
				sub: '1234567890'
				// No exp field
			};

			const base64Payload = btoa(JSON.stringify(payload))
				.replace(/\+/g, '-')
				.replace(/\//g, '_')
				.replace(/=/g, '');

			const token = `header.${base64Payload}.signature`;

			// Token without exp should be considered expired (throws internally, catches, returns true)
			expect(isTokenExpired(token)).toBe(true);
		});
	});
});

describe('auth API functions', () => {
	beforeEach(() => {
		// Reset all mocks before each test
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Clean up after each test
		vi.restoreAllMocks();
	});

	describe('signIn', () => {
		it('should successfully sign in with valid credentials', async () => {
			const mockSend = vi.fn().mockResolvedValue({
				AuthenticationResult: {
					AccessToken: 'mock-access-token',
					IdToken: 'mock-id-token',
					RefreshToken: 'mock-refresh-token',
					ExpiresIn: 3600
				}
			});

			vi.mocked(CognitoIdentityProviderClient).mockImplementation(
				() =>
					({
						send: mockSend
					}) as any
			);

			const result = await signIn({
				username: 'test@example.com',
				password: 'Test123!'
			});

			expect(result).toEqual({
				accessToken: 'mock-access-token',
				idToken: 'mock-id-token',
				refreshToken: 'mock-refresh-token',
				expiresIn: 3600
			});

			expect(mockSend).toHaveBeenCalledTimes(1);
		});

		it('should throw error when credentials are invalid', async () => {
			const mockSend = vi.fn().mockRejectedValue({
				name: 'NotAuthorizedException',
				message: 'Incorrect username or password'
			});

			vi.mocked(CognitoIdentityProviderClient).mockImplementation(
				() =>
					({
						send: mockSend
					}) as any
			);

			await expect(
				signIn({
					username: 'test@example.com',
					password: 'wrong-password'
				})
			).rejects.toThrow();

			expect(mockSend).toHaveBeenCalledTimes(1);
		});

		it('should throw error when user does not exist', async () => {
			const mockSend = vi.fn().mockRejectedValue({
				name: 'UserNotFoundException',
				message: 'User does not exist'
			});

			vi.mocked(CognitoIdentityProviderClient).mockImplementation(
				() =>
					({
						send: mockSend
					}) as any
			);

			await expect(
				signIn({
					username: 'nonexistent@example.com',
					password: 'Test123!'
				})
			).rejects.toThrow();
		});
	});

	describe('signUp', () => {
		it('should successfully sign up a new user', async () => {
			const mockSend = vi.fn().mockResolvedValue({
				UserConfirmed: false,
				CodeDeliveryDetails: {
					Destination: 't***@example.com',
					DeliveryMedium: 'EMAIL'
				},
				UserSub: 'mock-user-sub'
			});

			vi.mocked(CognitoIdentityProviderClient).mockImplementation(
				() =>
					({
						send: mockSend
					}) as any
			);

			const result = await signUp({
				username: 'test@example.com',
				password: 'Test123!',
				email: 'test@example.com'
			});

			expect(result).toEqual({
				userConfirmed: false,
				codeDeliveryDetails: {
					Destination: 't***@example.com',
					DeliveryMedium: 'EMAIL'
				},
				userSub: 'mock-user-sub'
			});

			expect(mockSend).toHaveBeenCalledTimes(1);
		});

		it('should throw error when username already exists', async () => {
			const mockSend = vi.fn().mockRejectedValue({
				name: 'UsernameExistsException',
				message: 'User already exists'
			});

			vi.mocked(CognitoIdentityProviderClient).mockImplementation(
				() =>
					({
						send: mockSend
					}) as any
			);

			await expect(
				signUp({
					username: 'existing@example.com',
					password: 'Test123!',
					email: 'existing@example.com'
				})
			).rejects.toThrow();
		});

		it('should throw error when password is invalid', async () => {
			const mockSend = vi.fn().mockRejectedValue({
				name: 'InvalidPasswordException',
				message: 'Password does not meet requirements'
			});

			vi.mocked(CognitoIdentityProviderClient).mockImplementation(
				() =>
					({
						send: mockSend
					}) as any
			);

			await expect(
				signUp({
					username: 'test@example.com',
					password: 'weak',
					email: 'test@example.com'
				})
			).rejects.toThrow();
		});
	});

	describe('confirmSignUp', () => {
		it('should successfully confirm sign up with valid code', async () => {
			const mockSend = vi.fn().mockResolvedValue({});

			vi.mocked(CognitoIdentityProviderClient).mockImplementation(
				() =>
					({
						send: mockSend
					}) as any
			);

			const result = await confirmSignUp('test@example.com', '123456');

			expect(result).toEqual({ success: true });
			expect(mockSend).toHaveBeenCalledTimes(1);
		});

		it('should throw error when confirmation code is invalid', async () => {
			const mockSend = vi.fn().mockRejectedValue({
				name: 'CodeMismatchException',
				message: 'Invalid verification code'
			});

			vi.mocked(CognitoIdentityProviderClient).mockImplementation(
				() =>
					({
						send: mockSend
					}) as any
			);

			await expect(confirmSignUp('test@example.com', 'invalid')).rejects.toThrow();
		});

		it('should throw error when confirmation code is expired', async () => {
			const mockSend = vi.fn().mockRejectedValue({
				name: 'ExpiredCodeException',
				message: 'Confirmation code has expired'
			});

			vi.mocked(CognitoIdentityProviderClient).mockImplementation(
				() =>
					({
						send: mockSend
					}) as any
			);

			await expect(confirmSignUp('test@example.com', '123456')).rejects.toThrow();
		});
	});
});
