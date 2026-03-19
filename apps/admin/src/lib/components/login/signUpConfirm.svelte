<script lang="ts">
	import { handleConfirmSignUp } from '$lib/utils/auth';
	import Error from './error.svelte';
	import { Button } from '@mosiri/ui';
	import { Input } from '@mosiri/ui';

	let { loginMode = $bindable() } = $props();

	let email = $state('');
	let confirmationCode = $state('');
	let errorMessage = $state('');

	const confirmSignUp = async () => {
		const result = await handleConfirmSignUp({
			username: email,
			confirmationCode: confirmationCode
		});

		if (result.isOk()) {
			loginMode = 'signUpConfirm';
			return;
		} else {
			errorMessage = `${result.error}`;
		}
	};

	const handleFocus = () => {
		errorMessage = '';
	};
</script>

<div class="p-6 sm:p-8">
	<form class="space-y-6" action="#">
		<h4 class="text-xl font-bold">アカウント作成検証コード確認</h4>
		<p class="font-normal leading-tight text-gray-700">
			メールアドレスに送信された検証コードを入力してください。
		</p>

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
			<label for="confirmationCode">検証コード</label>
			<Input
				id="confirmationCode"
				inputType="text"
				bind:value={confirmationCode}
				required
				onfocus={handleFocus}
			/>
		</div>

		{#if errorMessage !== ''}
			<Error>{errorMessage}</Error>
		{/if}

		<div class="w-full">
			<Button onclick={confirmSignUp} className="w-full">検証コードを確認</Button>
		</div>
		<div class="w-full">
			<Button
				onclick={() => {
					loginMode = 'resendSignUpCode';
				}}
				className="w-full"
			>
				確認コードを再送信
			</Button>
		</div>
		<div class="w-full">
			<Button
				onclick={() => {
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
