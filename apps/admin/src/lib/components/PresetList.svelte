<script lang="ts" module>
	export type PresetInfoList = PresetInfo & {
		checked: boolean;
	};
	export interface Props {
		// ヘッダ情報
		headerItems: string[];
		// 選択されたアイテムの表示項目番号
		selectedItemsDisplayNo: number;
		// プリセット情報のリスト
		presetInfos: any;
		onMoveAreaPreset: (data: PresetInfoList) => void;
	}
</script>

<script lang="ts">
	import * as R from 'ramda';
	import type { PresetInfo } from '$lib/types';
	import { Button } from '@mosiri/ui';

	let { headerItems, selectedItemsDisplayNo, presetInfos, onMoveAreaPreset }: Props = $props();
	// プリセット情報のリストをチェックボックス付きに変換
	let lineDatas: PresetInfoList[] = $state(
		presetInfos.map((item: PresetInfo) => {
			return { checked: false, ...item };
		})
	);

	// 選択されたアイテムのリスト
	let selectedItems = $derived(lineDatas.filter((item: PresetInfoList) => item.checked));

	// 呼び出される関数を定義
	export const getSelectedItems = () => {
		return selectedItems;
	};

	// クロージャーを使って親コンポーネントにデータを送信
	const moveAreaPresetEdit = (data: PresetInfoList) => {
		return () => {
			onMoveAreaPreset(data);
		};
	};
</script>

<div class="container mx-auto my-4 rounded-md border border-gray-300 p-4">
	<table class="container border-separate border-spacing-0">
		<thead class="bg-gray-100 p-2 font-semibold">
			<tr class="gap-0 text-left">
				{#each headerItems as headerItem}
					<th class="p-2">{headerItem}</th>
				{/each}
				<th class="p-2"></th>
			</tr>
		</thead>

		<tbody>
			{#each lineDatas as lineData}
				<tr>
					{#each R.keys(lineData) as data, index}
						<!-- 条件を満たす場合、描画をスキップ -->
						{#if data == 'id'}
							<!-- 何も描画しない（実質的なcontinue） -->
						{:else if index == 0}
							<td class="border-b p-2">
								<input
									type="checkbox"
									bind:checked={lineData.checked}
									class="form-checkbox cursor-pointer"
								/>
							</td>
						{:else}
							<td class="border-b p-2 align-middle">{lineData[data]}</td>
						{/if}
					{/each}
					<td class="w-0 whitespace-nowrap border-b p-2">
						<Button onclick={moveAreaPresetEdit(lineData)}>付帯情報</Button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<!-- 選択されたアイテムのリスト -->
	<h3 class="mt-4 font-semibold">選択されたアイテム</h3>
	<ul class="mt-2 list-inside list-disc">
		{#each selectedItems as item}
			<li>{item[R.keys(item)[selectedItemsDisplayNo]]}</li>
		{/each}
	</ul>
</div>
