<script lang="ts" module>
	export interface Props {
		selectedCodes: Array<string | number>;
		isOpen: boolean;
		onClose?: () => void;
		onSelect?: (selected: Array<string | number>) => void;
	}
</script>

<script lang="ts">
	import { MapLibre, GeoJSONSource, FillLayer, LineLayer } from 'svelte-maplibre-gl';
	import { Button } from '@mosiri/ui';

	let { selectedCodes = $bindable(), isOpen = $bindable(), onClose, onSelect }: Props = $props();
	let hoveredCode: string | number | undefined = $state();
	const defaultArray: Array<string | number> = ['default'];

	const updateSelectedCode = (code: string | number | undefined) => {
		if (!code) return;
		if (selectedCodes.includes(code)) {
			// 選択済みのコードを再クリックした場合は選択解除
			selectedCodes.splice(selectedCodes.indexOf(code), 1);
		} else if (selectedCodes.length < 10) {
			// 選択数は10以下に制限
			selectedCodes.push(code);
		}
	};
</script>

{#if isOpen}
	<!-- オーバーレイ -->
	<div class="fixed inset-0 z-50 bg-black bg-opacity-30">
		<div
			class="absolute inset-0 m-auto flex h-[90vh] w-[90vw] flex-col items-center gap-4 rounded-2xl bg-white p-10 shadow-lg"
		>
			<h2 class="w-full text-xl font-semibold text-gray-900">戸田市（全域）</h2>
			<MapLibre
				class="h-[75vh] w-full"
				style={{
					version: 8,
					sources: {
						t_pale: {
							type: 'raster',
							tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
							tileSize: 256,
							attribution:
								'<a href="http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html" target="_blank">地理院タイル</a>'
						}
					},
					layers: [
						{
							id: 't_pale',
							type: 'raster',
							source: 't_pale',
							minzoom: 0,
							maxzoom: 18
						}
					]
				}}
				zoom={13}
				center={{ lng: 139.65698210839577, lat: 35.81477088586259 }}
			>
				<GeoJSONSource data="../toda-mesh.geojson">
					<FillLayer
						paint={{
							'fill-color': [
								'match',
								['get', 'code'],
								defaultArray.concat(selectedCodes), // 空配列のエラー回避のため、デフォルト値を追加
								'#ff0000',
								'#00ff55'
							],
							'fill-opacity': ['match', ['get', 'code'], hoveredCode ?? -1, 0.4, 0.1]
						}}
						onclick={(ev) => updateSelectedCode(ev.features?.[0]?.properties?.code)}
						onmousemove={(ev) => (hoveredCode = ev.features?.[0]?.properties?.code)}
						onmouseleave={() => (hoveredCode = undefined)}
					/>
					<LineLayer
						paint={{
							'line-color': [
								'match',
								['get', 'code'],
								defaultArray.concat(selectedCodes), // 空配列のエラー回避のため、デフォルト値を追加
								'#ff0000',
								'#00ff55'
							],
							'line-opacity': ['match', ['get', 'code'], hoveredCode ?? -1, 1, 0.3],
							'line-width': 1
						}}
					/>
				</GeoJSONSource>
			</MapLibre>
			<div class="flex w-full justify-between">
				<div class="space-x-2">
					<Button onclick={() => (selectedCodes = [])}>全解除</Button>
				</div>
				<Button
					onclick={() => {
						onClose?.();
						isOpen = false;
						onSelect?.(selectedCodes);
					}}
				>
					決定
				</Button>
			</div>
		</div>
	</div>
{/if}
