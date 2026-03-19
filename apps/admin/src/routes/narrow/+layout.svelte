<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="bg-narrow/50 fixed h-3 w-full"></div>
{@render children?.()}
