<script lang="ts">
	import { handleConfirmResetPassword } from '$lib/utils/auth';
	import PasswordInput from '$lib/components/login/passwordInput.svelte';
	import Error from './error.svelte';
	import { Button } from '@mosiri/ui';
	import { Input } from '@mosiri/ui';

	let { loginMode = $bindable() } = $props();

	let email = $state('');
	let newPassword = $state('');
	let checkNewPassword = $state('');
	let confirmationCode = $state('');
	let errorMessage = $state('');

	const handleFocus = () => {
		errorMessage = '';
	};

	const confirmResetPassword = async () => {
		if (newPassword !== checkNewPassword) {
			errorMessage = 'パスワードが一致しません';
			return;
		}

		const result = await handleConfirmResetPassword({
			username: email,
			newPassword: newPassword,
			confirmationCode: confirmationCode
		});
		if (result.isOk()) {
			errorMessage = `パスワードリセットに成功しました。`;
		} else {
			errorMessage = `パスワードリセットに失敗しました。${result.error}`;
		}
	};
</script>

<div class="p-6 sm:p-8">
	<form class="space-y-6" action="#">
		<h4 class="text-xl font-bold">パスワードをリセット</h4>

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
			<label for="newPassword">変更パスワード</label>
			<PasswordInput
				placeholder="パス変更パスワードワード"
				bind:value={newPassword}
				onfocus={handleFocus}
			></PasswordInput>
		</div>

		<div>
			<label for="checkNewPassword">変更パスワードの確認</label>
			<PasswordInput
				placeholder="確認用変更パスワード"
				bind:value={checkNewPassword}
				onfocus={handleFocus}
			></PasswordInput>
		</div>

		<div>
			<label for="confirmationCode">検証コード</label>
			<Input
				id="confirmationCode"
				bind:value={confirmationCode}
				placeholder=""
				required
				onfocus={handleFocus}
			/>
		</div>

		{#if errorMessage !== ''}
			<Error>{errorMessage}</Error>
		{/if}

		<div class="w-full">
			<Button onclick={confirmResetPassword} className="w-full">パスワードを更新</Button>
		</div>
		<div class="w-full">
			<Button
				onclick={() => {
					loginMode = 'requestCode';
				}}
				className="w-full"
				variant="secondary"
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
