<script lang="ts">
	import { handleResendSignUpCode } from '$lib/utils/auth';
	import { Input } from '@mosiri/ui';
	import Error from './error.svelte';
	import Warning from './warning.svelte';
	import { Button } from '@mosiri/ui';

	let { loginMode = $bindable() } = $props();

	let email = $state('');
	let warningMessage = $state('');
	let errorMessage = $state('');

	const resendSignUpCode = async () => {
		if (email !== '') {
			const result = await handleResendSignUpCode({ username: email });
			if (result.isOk()) {
				warningMessage = `確認コードを ${email} に送信しました。検証コード確認に進んでください。`;
				return;
			} else {
				errorMessage = `確認コードの送信に失敗しました。${result.error}`;
				return;
			}
		}
	};

	const handleFocus = () => {
		errorMessage = '';
		warningMessage = '';
	};
</script>

<div class="p-6 sm:p-8">
	<form class="space-y-6" action="#">
		<h4 class="text-xl font-bold">サインアップ用の確認コードを送信</h4>
		<p class="font-normal leading-tight text-gray-700">
			ユーザー名 (email)のパスワード変更用の確認コードを送信します。
		</p>

		<div>
			<label for="email">ユーザー名 (email) を入力</label>
			<Input
				id="email"
				bind:value={email}
				inputType="email"
				placeholder="mail@example.com"
				required
				onfocus={handleFocus}
			/>
		</div>

		{#if warningMessage !== ''}
			<Warning>{warningMessage}</Warning>
		{/if}

		{#if errorMessage !== ''}
			<Error>{errorMessage}</Error>
		{/if}

		{#if warningMessage === ''}
			<div class="w-full">
				<Button onclick={resendSignUpCode} className="w-full">確認コードを送信</Button>
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
		{:else}
			<div class="w-full">
				<Button
					onclick={() => {
						loginMode = 'signUpConfirm';
					}}
					className="w-full"
				>
					検証コード確認に進む
				</Button>
			</div>
		{/if}
	</form>
</div>
