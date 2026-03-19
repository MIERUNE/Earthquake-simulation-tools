<script lang="ts" module>
	import { createToaster, melt } from '@melt-ui/svelte';
	import { Icon, XMark } from 'svelte-hero-icons';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';

	export type ToastData = {
		title: string;
		description: string;
		color: 'success' | 'error';
	};

	const {
		elements: { content, title, description, close },
		helpers,
		states: { toasts },
		actions: { portal }
	} = createToaster<ToastData>();

	export const addToast = helpers.addToast;
</script>

<div
	class="fixed right-0 top-0 z-50 m-4 flex flex-col items-end gap-2 md:bottom-0 md:top-auto"
	use:portal
>
	{#each $toasts as { id, data } (id)}
		<div
			use:melt={$content(id)}
			animate:flip={{ duration: 500 }}
			in:fly={{ duration: 150, x: '100%' }}
			out:fly={{ duration: 150, x: '100%' }}
			class="rounded-lg text-white shadow-md"
			class:bg-green-400={data.color === 'success'}
			class:bg-red-400={data.color === 'error'}
		>
			<div
				class="relative flex w-[24rem] max-w-[calc(100vw-2rem)] items-center justify-between gap-4 p-5"
			>
				<div>
					<h3 use:melt={$title(id)} class="flex items-center gap-2 font-semibold">
						{data.title}
					</h3>
					<div use:melt={$description(id)}>
						{data.description}
					</div>
				</div>
				<button
					use:melt={$close(id)}
					class="absolute right-4 top-4 grid size-6 place-items-center rounded-full"
				>
					<Icon src={XMark} size="20" />
				</button>
			</div>
		</div>
	{/each}
</div>
