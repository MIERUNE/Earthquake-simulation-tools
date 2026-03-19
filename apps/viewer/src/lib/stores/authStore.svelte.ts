/**
 * 認証状態管理Store
 * Svelte 5のrunesを使用した認証状態管理
 *
 * ⚠️ セキュリティに関する注意:
 * このストアはlocalStorageに認証トークンを保存します。
 * localStorageはXSS攻撃に対して脆弱です。
 *
 * 本番環境での推奨事項:
 * - httpOnly cookieの使用（SvelteKitへの移行が必要）
 * - Content Security Policy (CSP) の設定
 * - XSS対策の実装
 *
 * 現在の制限:
 * このアプリは純粋なSPA（Vite）のため、httpOnly cookieは使用できません。
 * SvelteKitへ移行することで、サーバーサイドでのセッション管理が可能になります。
 */

import { signIn as apiSignIn, isTokenExpired, decodeToken, type AuthTokens, type SignInInput } from '../api/auth';
import { withErrorHandling } from '../utils/errors';

/**
 * ユーザー情報
 */
export interface User {
	username: string;
	email: string;
	sub: string; // Cognito User ID
}

/**
 * 認証状態
 */
interface AuthState {
	isAuthenticated: boolean;
	isLoading: boolean;
	user: User | null;
	tokens: AuthTokens | null;
	error: string | null;
}

/**
 * LocalStorageのキー
 */
const STORAGE_KEYS = {
	TOKENS: 'mosiri_auth_tokens',
	USER: 'mosiri_auth_user'
} as const;

/**
 * 認証ストアクラス
 */
class AuthStore {
	private state = $state<AuthState>({
		isAuthenticated: false,
		isLoading: false,
		user: null,
		tokens: null,
		error: null
	});

	constructor() {
		// 初期化時にLocalStorageから認証情報を復元
		this.restoreSession();
	}

	/**
	 * 認証状態を取得
	 */
	get isAuthenticated(): boolean {
		return this.state.isAuthenticated;
	}

	get isLoading(): boolean {
		return this.state.isLoading;
	}

	get user(): User | null {
		return this.state.user;
	}

	get error(): string | null {
		return this.state.error;
	}

	/**
	 * セッションの復元
	 */
	private restoreSession(): void {
		// SSR環境ではlocalStorageは利用できない
		if (typeof window === 'undefined') {
			return;
		}

		try {
			const tokensStr = localStorage.getItem(STORAGE_KEYS.TOKENS);
			const userStr = localStorage.getItem(STORAGE_KEYS.USER);

			if (!tokensStr || !userStr) {
				return;
			}

			const tokens = JSON.parse(tokensStr) as AuthTokens;
			const user = JSON.parse(userStr) as User;

			// トークンの有効期限チェック
			if (isTokenExpired(tokens.idToken)) {
				this.clearSession();
				return;
			}

			this.state.isAuthenticated = true;
			this.state.user = user;
			this.state.tokens = tokens;
		} catch (error) {
			console.error('Failed to restore session:', error);
			this.clearSession();
		}
	}

	/**
	 * セッションの保存
	 */
	private saveSession(tokens: AuthTokens, user: User): void {
		// SSR環境ではlocalStorageは利用できない
		if (typeof window === 'undefined') {
			return;
		}

		try {
			localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
			localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
		} catch (error) {
			console.error('Failed to save session:', error);
		}
	}

	/**
	 * セッションのクリア
	 */
	private clearSession(): void {
		// SSR環境ではlocalStorageは利用できない
		if (typeof window !== 'undefined') {
			try {
				localStorage.removeItem(STORAGE_KEYS.TOKENS);
				localStorage.removeItem(STORAGE_KEYS.USER);
			} catch (error) {
				console.error('Failed to clear session:', error);
			}
		}

		this.state.isAuthenticated = false;
		this.state.user = null;
		this.state.tokens = null;
	}

	/**
	 * ユーザー情報をトークンから抽出
	 */
	private extractUser(idToken: string): User {
		const decoded = decodeToken(idToken);

		// トークンクレームの検証
		const username =
			decoded && typeof decoded === 'object' && typeof decoded['cognito:username'] === 'string'
				? decoded['cognito:username']
				: '';
		const email =
			decoded && typeof decoded === 'object' && typeof decoded.email === 'string'
				? decoded.email
				: '';
		const sub =
			decoded && typeof decoded === 'object' && typeof decoded.sub === 'string'
				? decoded.sub
				: '';

		return {
			username,
			email,
			sub
		};
	}

	/**
	 * ログイン
	 */
	async signIn(input: SignInInput): Promise<{ success: boolean; error: string | null }> {
		this.state.isLoading = true;
		this.state.error = null;

		const result = await withErrorHandling(async () => {
			const tokens = await apiSignIn(input);
			const user = this.extractUser(tokens.idToken);

			this.state.isAuthenticated = true;
			this.state.user = user;
			this.state.tokens = tokens;

			this.saveSession(tokens, user);

			return { success: true };
		}, 'AuthStore.signIn');

		this.state.isLoading = false;

		if (result.error) {
			this.state.error = result.error;
			return { success: false, error: result.error };
		}

		return { success: true, error: null };
	}

	/**
	 * ログアウト
	 */
	signOut(): void {
		this.clearSession();
		this.state.error = null;
	}

	/**
	 * エラーをクリア
	 */
	clearError(): void {
		this.state.error = null;
	}

	/**
	 * アクセストークンを取得
	 */
	getAccessToken(): string | null {
		if (!this.state.tokens) {
			return null;
		}

		// トークンの有効期限チェック
		if (isTokenExpired(this.state.tokens.idToken)) {
			this.signOut();
			return null;
		}

		return this.state.tokens.accessToken;
	}

	/**
	 * IDトークンを取得
	 */
	getIdToken(): string | null {
		if (!this.state.tokens) {
			return null;
		}

		// トークンの有効期限チェック
		if (isTokenExpired(this.state.tokens.idToken)) {
			this.signOut();
			return null;
		}

		return this.state.tokens.idToken;
	}
}

/**
 * 認証ストアのシングルトンインスタンス
 */
export const authStore = new AuthStore();
