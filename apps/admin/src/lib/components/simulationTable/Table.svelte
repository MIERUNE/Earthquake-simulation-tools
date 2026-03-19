<script lang="ts" module>
	export interface Props {
		header?: Snippet;
		children?: Snippet;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	let { header, children }: Props = $props();
</script>

<table class="w-full table-fixed">
	<thead>
		{@render header?.()}
	</thead>
	<tbody>
		{@render children?.()}
	</tbody>
</table>
