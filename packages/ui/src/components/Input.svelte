<script lang="ts" module>
	export interface Props {
		inputType?: 'text' | 'password' | 'email';
		id?: string;
		className?: string;
		value: string;
		placeholder?: string;
		required?: boolean;
		onfocus?: () => void;
	}
</script>

<script lang="ts">
	import { twMerge } from 'tailwind-merge';

	let {
		inputType = 'text',
		id = '',
		className = '',
		value = $bindable(),
		placeholder = '',
		required = false,
		onfocus
	}: Props = $props();

	let mergedClass = twMerge(
		'w-full rounded border outline-none focus:border-primary px-4 py-2',
		className
	);
</script>

{#if inputType === 'text'}
	<input {id} bind:value {placeholder} class={mergedClass} {required} {onfocus} />
{:else if inputType === 'email'}
	<input {id} bind:value {placeholder} type="email" class={mergedClass} {required} {onfocus} />
{:else if inputType === 'password'}
	<input {id} bind:value {placeholder} type="password" class={mergedClass} {required} {onfocus} />
{/if}