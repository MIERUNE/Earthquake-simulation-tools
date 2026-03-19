<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { signIn as handleSignIn } from '$lib/utils/authClient';
	import PasswordInput from '$lib/components/login/passwordInput.svelte';
	import Error from './error.svelte';
	import { Button } from '@mosiri/ui';
	import { Input } from '@mosiri/ui';

	let { loginMode = $bindable() } = $props();

	const development = true; // 開発中はtrueにする

	let isSaveUserName = true;
	let email = $state('');
	let password = $state('');
	let errorMessage = $state('');

	// $: if (typeof window !== 'undefined') {
	// 	console.log('SSG');
	// }

	const goMainMenu = () => {
		goto(`${base}/menu`);
	};

	// コンポーネントがマウントされたときにlocalStorageからユーザー名を読み込む
	onMount(() => {
		const savedUsername = localStorage.getItem('username');
		if (savedUsername) {
			email = savedUsername;
		}
	});

	// ユーザー名を変更し、localStorageに保存する関数
	const saveUsername = (isSaveUserName: boolean) => {
		if (!isSaveUserName) {
			localStorage.removeItem('username');
			return;
		}
		localStorage.setItem('username', email);
	};

	// const signOut = () => {
	// 	handleSignOut();
	// 	//alert('サインアウトしました');
	// };

	const signIn = async () => {
		if (development) {
			goMainMenu();
		}

		if (email !== '' && password !== '') {
			const result = await handleSignIn({ username: email, password: password });
			if (!result.isOk()) {
				if (result.error === 'CONFIRM_SIGN_UP') {
					loginMode = 'signUpConfirm';
					return;
				}
				errorMessage = `${result.error}`;
			}
		}
	};

	const handleFocus = () => {
		errorMessage = '';
	};
</script>

<div class="p-6 sm:p-8">
	<form class="space-y-6" action="#">
		<div>
			<label for="email">ユーザー名 (email)</label>
			<Input
				id="email"
				bind:value={email}
				inputType="email"
				placeholder="mail@example.com"
				required
				onfocus={handleFocus}
			/>
		</div>

		<div>
			<label for="password">パスワード</label>
			<PasswordInput placeholder="パスワード" bind:value={password} onfocus={handleFocus} />
			{#if errorMessage !== ''}
				<Error>{errorMessage}</Error>
			{/if}
		</div>

		<div class="flex items-center justify-center gap-4">
			<div class="flex items-center">
				<input
					checked
					id="checked-checkbox"
					type="checkbox"
					value=""
					class="h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary focus:ring-2 focus:ring-blue-500"
				/>
				<label for="checked-checkbox" class="ms-2 text-sm font-medium text-gray-900">
					ユーザー名を記憶
				</label>
			</div>
		</div>

		<Button
			onclick={() => {
				saveUsername(isSaveUserName);
				signIn();
			}}
			className="w-full"
		>
			ログイン
		</Button>
		<button
			type="button"
			onclick={() => {
				loginMode = 'requestCode';
			}}
			class="text-sm font-medium text-primary hover:underline"
		>
			パスワードを忘れた方はこちら
		</button>
		<p class="text-sm font-light">
			まだアカウントを持っていない場合は
			<button
				type="button"
				onclick={() => {
					loginMode = 'signUp';
				}}
				class="text-sm font-medium text-primary hover:underline"
			>
				アカウント登録
			</button>
		</p>
		<!-- <Button onclick={signOut} className="w-full" variant="secondary">サインアウト</Button> -->
	</form>
</div>
