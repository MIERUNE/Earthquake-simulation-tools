<script lang="ts">
	import SignIn from '$lib/components/login/signIn.svelte';
	import SignUp from '$lib/components/login/signUp.svelte';
	import RequestCode from '$lib/components/login/requestCode.svelte';
	import ResetPassword from '$lib/components/login/resetPassword.svelte';
	import SignUpConfirm from '$lib/components/login/signUpConfirm.svelte';
	import ResendSignUpCode from '$lib/components/login/resendSignUpCode.svelte';

	// modeの定数
	const LOGIN_MODES = {
		SIGN_IN: 'signIn',
		SIGN_UP: 'signUp',
		RESET: 'reset',
		REQUEST_CODE: 'requestCode',
		SIGN_UP_CONFIRM: 'signUpConfirm',
		RESEND_SIGN_UP_CODE: 'resendSignUpCode'
	};

	type LoginMode = (typeof LOGIN_MODES)[keyof typeof LOGIN_MODES];

	interface Props {
		mode?: LoginMode;
	}

	let { mode = $bindable(LOGIN_MODES.SIGN_IN) }: Props = $props();
</script>

<section>
	<!-- TODO: replace image -->
	<div class="relative h-[40vh] bg-gray-400 bg-[url('/kanban.jpeg')]">
		<h1 class="absolute inset-0 m-auto h-fit w-fit text-4xl font-bold text-white">
			建物震動に関する大規模シミュレーション
		</h1>
	</div>
	<div class="mt-20 flex h-[50vh] flex-col items-center justify-center px-6 py-8">
		<div class="w-full max-w-[600px] grow">
			{#key mode}
				<div role="tabpanel" aria-live="polite">
					{#if mode === LOGIN_MODES.SIGN_IN}
						<SignIn bind:loginMode={mode} />
					{:else if mode === LOGIN_MODES.SIGN_UP}
						<SignUp bind:loginMode={mode} />
					{:else if mode === LOGIN_MODES.RESET}
						<ResetPassword bind:loginMode={mode} />
					{:else if mode === LOGIN_MODES.REQUEST_CODE}
						<RequestCode bind:loginMode={mode} />
					{:else if mode === LOGIN_MODES.SIGN_UP_CONFIRM}
						<SignUpConfirm bind:loginMode={mode} />
					{:else if mode === LOGIN_MODES.RESEND_SIGN_UP_CODE}
						<ResendSignUpCode bind:loginMode={mode} />
					{:else}
						<p class="p-4 text-red-500">無効なモードです: {mode}</p>
					{/if}
				</div>
			{/key}
		</div>
		<hr class="w-full border-primary" />
		<div class="w-full text-right leading-10">Version:1.0.0</div>
	</div>
</section>
