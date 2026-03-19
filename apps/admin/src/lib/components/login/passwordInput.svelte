<script lang="ts" module>
	export interface Props {
		value?: string;
		placeholder?: string | undefined;
		onfocus?: () => void;
	}
</script>

<script lang="ts">
	import { Icon, Eye, EyeSlash } from 'svelte-hero-icons';
	import { createToggle, melt } from '@melt-ui/svelte';
	import { Input } from '@mosiri/ui';

	let { value = $bindable(''), placeholder = undefined, onfocus }: Props = $props();

	const {
		elements: { root: root1 },
		states: { pressed: pressed1 }
	} = createToggle();
</script>

<div class="relative">
	{#if !$pressed1}
		<Input bind:value inputType="password" {placeholder} {onfocus} />
	{:else}
		<Input bind:value {placeholder} {onfocus} />
	{/if}
	<div use:melt={$root1} class="absolute inset-y-0 right-0 my-auto h-fit cursor-pointer">
		{#if $pressed1}
			<Icon src={Eye} class="px-4 text-gray-500" size="20" />
		{:else}
			<Icon src={EyeSlash} class="px-4 text-gray-500" size="20" />
		{/if}
	</div>
</div>
