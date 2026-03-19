<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import DownloadIcon from './DownloadIcon.svelte';

	export let href: string;
</script>

<a
	{href}
	onclick={(e) => {
		e.stopPropagation();
	}}
	rel="noopener noreferrer"
	target="_blank"
	class={cn(
		'hover:bg-gray-200 bg-gray-100 text-gray-700 flex size-7.5 cursor-pointer items-center justify-center rounded-full transition-colors sm:size-10',
		$$props.class
	)}
>
	<DownloadIcon class="size-3.5 sm:size-5" />
</a>
