<script lang="ts">
	import { goto } from '$app/navigation';

	const handleMenuSelection = (menu: string) => {
		goto(menu);
	};
</script>

<div class="flex h-screen flex-col items-center justify-center">
	<div
		class="flex w-3/4 max-w-[600px] flex-col divide-y divide-primary rounded-2xl border border-primary"
	>
		<button
			class="flex items-center justify-between rounded-t-2xl p-10 text-lg font-bold hover:bg-primary/10"
			onclick={() => handleMenuSelection('wide/menu')}
		>
			<span>広域のシミュレーション</span>
			<div class="relative h-8 w-8 rounded-full bg-primary">
				<svg
					data-slot="icon"
					fill="none"
					stroke-width="3"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
					aria-hidden="true"
					class="absolute inset-0 m-auto size-5 text-white"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="m8.25 4.5 7.5 7.5-7.5 7.5"
					></path>
				</svg>
			</div>
		</button>
		<button
			class="flex items-center justify-between rounded-b-2xl p-10 text-lg font-bold hover:bg-primary/10"
			onclick={() => handleMenuSelection('narrow/menu')}
		>
			<span>個別建物のシミュレーション</span>
			<div class="relative h-8 w-8 rounded-full bg-primary">
				<svg
					data-slot="icon"
					fill="none"
					stroke-width="3"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
					aria-hidden="true"
					class="absolute inset-0 m-auto size-5 text-white"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="m8.25 4.5 7.5 7.5-7.5 7.5"
					></path>
				</svg>
			</div>
		</button>
	</div>
</div>
