<script lang="ts">
	import '../app.css';
	import { Toaster } from '@mosiri/ui';
	import type { Snippet } from 'svelte';
	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<Toaster />

{@render children?.()}
