<script lang="ts">
	import { ifcModalState, selectedElement, ifcDataType } from '$lib/stores/ifcModalStore';
	import { onMount } from 'svelte';
	import type { Component } from 'svelte';
	import AttributePanel from './AttributePanel.svelte';

	// SSR時にweb-ifc-threeがロードされないように動的インポート
	let IFCViewer = $state<Component | null>(null);
	let isMounted = $state(false);

	onMount(async () => {
		isMounted = true;
		const module = await import('./IFCViewer.svelte');
		IFCViewer = module.default as Component;
	});

	const closeModal = () => {
		$ifcModalState = { isOpen: false, ifcFilePath: null, dataType: null };
		$selectedElement = null;
	};

	const handleElementClick = (properties: any) => {
		$selectedElement = properties;
	};

	const handleCloseAttributePanel = () => {
		$selectedElement = null;
	};

	const handleBackdropClick = (event: MouseEvent) => {
		if (event.target === event.currentTarget) {
			closeModal();
		}
	};
</script>

{#if $ifcModalState.isOpen && $ifcModalState.ifcFilePath}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-[9999] overflow-y-auto bg-black/50"
		style="background-color: rgba(0, 0, 0, 0.5) !important;"
		on:click={handleBackdropClick}
	>
		<div class="flex min-h-full items-center justify-center p-0 text-center">
			<div
				class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all my-8 w-full max-w-[1000px] p-6"
			>
				<div class="absolute top-0 right-0 pt-4 pr-4 block z-10">
					<button
						type="button"
						class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
						on:click={closeModal}
					>
						<span class="sr-only">Close</span>
						<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<div class="flex flex-col items-start relative" id="three-ifc-modal">
					<h3 class="text-lg font-medium leading-6 text-gray-900 select-none">
						Ｅ-ディフェンス実験試験体{#if $ifcModalState.ifcFilePath === '/200408_building_RC.ifc' && $ifcDataType}
							(熊本地震{$ifcDataType === 'fore' ? '前震' : '本震'}によるシミュレーション)
						{/if}
					</h3>

					{#if isMounted && IFCViewer}
						<svelte:component
							this={IFCViewer}
							ifcFilePath={$ifcModalState.ifcFilePath}
							onElementClick={handleElementClick}
						/>
					{:else}
						<div class="w-full h-[600px] flex items-center justify-center bg-gray-100">
							<span class="text-gray-500">IFCビューワーを読み込み中...</span>
						</div>
					{/if}

					{#if $selectedElement}
						<AttributePanel
							properties={$selectedElement}
							dataType={$ifcDataType}
							onClose={handleCloseAttributePanel}
						/>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
