<script lang="ts">
	import { handleSignUp } from '$lib/utils/auth';
	import PasswordInput from '$lib/components/login/passwordInput.svelte';
	import Error from './error.svelte';
	import { Button } from '@mosiri/ui';
	import { Input } from '@mosiri/ui';

	let { loginMode = $bindable() } = $props();

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let errorMessage = $state('');

	const signUp = async () => {
		if (email !== '' && password !== '' && confirmPassword !== '') {
			if (password !== confirmPassword) {
				errorMessage = 'パスワードが一致しません';
				return;
			}

			const result = await handleSignUp({ username: email, password: password });
			if (result.isOk()) {
				loginMode = 'signUpConfirm';
			} else {
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
		<h4 class="text-xl font-bold">アカウント登録</h4>

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
			<PasswordInput placeholder="パスワード" bind:value={password} onfocus={handleFocus}
			></PasswordInput>
		</div>

		<div>
			<label for="confirmPassword">パスワードの確認</label>
			<PasswordInput
				placeholder="パスワードの確認"
				bind:value={confirmPassword}
				onfocus={handleFocus}
			></PasswordInput>
		</div>

		{#if errorMessage !== ''}
			<Error>{errorMessage}</Error>
		{/if}

		<div class="w-full">
			<Button
				onclick={() => {
					signUp();
				}}
				className="w-full"
			>
				アカウント登録
			</Button>
		</div>
		<div class="w-full">
			<Button
				onclick={() => {
					signUp();
					loginMode = 'signIn';
				}}
				className="w-full"
				variant="secondary"
			>
				ログインに戻る
			</Button>
		</div>
	</form>
</div>
