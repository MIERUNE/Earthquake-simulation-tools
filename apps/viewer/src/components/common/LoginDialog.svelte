<script lang="ts">
	import { authStore } from '../../lib/stores/authStore.svelte';
	import type { ViewerInfoItem } from '../../lib/types/viewerInfo';

	interface Props {
		isOpen?: boolean;
		selectedSimulation?: ViewerInfoItem | null;
		onClose?: () => void;
		onLoginSuccess?: (data: { simulation: ViewerInfoItem | null | undefined }) => void;
	}

	let { isOpen = $bindable(false), selectedSimulation = null, onClose, onLoginSuccess }: Props = $props();

	let email = $state('');
	let password = $state('');
	let dialogRef = $state<HTMLDivElement>();

	// authStoreの状態を取得
	const isLoading = $derived(authStore.isLoading);
	const error = $derived(authStore.error);

	// ダイアログが開いたらフォーカス
	$effect(() => {
		if (isOpen && dialogRef) {
			dialogRef.focus();
		}
	});

	// ログイン成功時の処理
	$effect(() => {
		if (authStore.isAuthenticated && isOpen) {
			isOpen = false;
			email = '';
			password = '';
			onLoginSuccess?.({ simulation: selectedSimulation });
		}
	});

	const handleClose = () => {
		if (!isLoading) {
			isOpen = false;
			email = '';
			password = '';
			authStore.clearError();
			onClose?.();
		}
	};

	const handleBackdropClick = (event: MouseEvent) => {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			handleClose();
		}
	};

	const handleSubmit = async (event: Event) => {
		event.preventDefault();

		if (!email || !password) {
			return;
		}

		await authStore.signIn({
			username: email,
			password
		});
	};
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="presentation"
	>
		<div
			bind:this={dialogRef}
			class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all duration-300"
			role="dialog"
			aria-modal="true"
			aria-labelledby="dialog-title"
			tabindex="-1"
		>
			<!-- ヘッダー -->
			<div class="flex items-center justify-between mb-4">
				<h2 id="dialog-title" class="text-2xl font-bold text-gray-800">
					ログインが必要です
				</h2>
				<button
					onclick={handleClose}
					disabled={isLoading}
					class="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
					aria-label="閉じる"
					type="button"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<!-- 説明文 -->
			{#if selectedSimulation}
				<p class="text-gray-600 mb-6">
					「<span class="font-semibold">{selectedSimulation.region}</span> -
					<span class="font-semibold">{selectedSimulation.parameter}</span>」
					のシミュレーション結果を閲覧するにはログインが必要です。
				</p>
				<p class="text-gray-600 mb-6">
					アカウントをお持ちではない方は、AIGIDアカウントを作成してください。
				</p>
			{/if}

			<!-- エラーメッセージ -->
			{#if error}
				<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
					<div class="flex items-start gap-2">
						<svg
							class="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<p class="text-sm text-red-800">{error}</p>
					</div>
				</div>
			{/if}

			<!-- ログインフォーム -->
			<form onsubmit={handleSubmit} class="space-y-4">
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700 mb-1">
						メールアドレス
					</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						disabled={isLoading}
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
						placeholder="example@email.com"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700 mb-1">
						パスワード
					</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						disabled={isLoading}
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
						placeholder="••••••••"
					/>
				</div>

				<!-- ボタン -->
				<div class="flex flex-col gap-3 mt-6">
					<button
						type="submit"
						disabled={isLoading}
						class="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
					>
						{#if isLoading}
							<svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							ログイン中...
						{:else}
							ログイン
						{/if}
					</button>

					<button
						type="button"
						onclick={handleClose}
						disabled={isLoading}
						class="w-full py-3 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
					>
						キャンセル
					</button>
				</div>
			</form>

			<!-- アカウント作成リンク -->
			<div class="mt-6 pt-4 border-t border-gray-200">
				<div class="bg-gray-50 rounded-lg p-4">
					<p class="text-sm text-gray-600 mb-3">AIGIDアカウントをお持ちでない方</p>
					<div class="flex items-start gap-2">
						<svg
							class="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<div class="text-xs text-gray-600">
							<p>
								本サービスをご利用いただくには、AIGIDアカウントが必要です。
								下のボタンからアカウント作成ページにお進みください。
							</p>
						</div>
					</div>
					<a
						href="https://aigid.example.com/signup"
						target="_blank"
						rel="noopener noreferrer"
						class="mt-3 w-full inline-flex items-center justify-center py-2 px-4 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
					>
						AIGIDアカウントを作成する
						<svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
							/>
						</svg>
					</a>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideIn {
		from {
			transform: translateY(-20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.fixed {
		animation: fadeIn 0.3s ease-out;
	}

	.transform {
		animation: slideIn 0.3s ease-out;
	}
</style>
