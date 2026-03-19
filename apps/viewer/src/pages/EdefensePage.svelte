<script lang="ts">
	import { ifcModalState, ifcDataType } from '$lib/stores/ifcModalStore';
	import IFCModal from '$lib/components/ifc/IFCModal.svelte';

	const openRCModel = () => {
		$ifcDataType = 'fore';
		$ifcModalState = {
			isOpen: true,
			ifcFilePath: '/200408_building_RC.ifc',
			dataType: 'fore'
		};
	};

	const openSModel = () => {
		$ifcDataType = 'fore';
		$ifcModalState = {
			isOpen: true,
			ifcFilePath: '/200408_building_S.ifc',
			dataType: 'fore'
		};
	};

	const toggleDataType = () => {
		$ifcDataType = $ifcDataType === 'fore' ? 'after' : 'fore';
	};
</script>

<div class="min-h-screen bg-gray-100 p-8">
	<div class="max-w-4xl mx-auto">
		<h1 class="text-3xl font-bold text-gray-900 mb-8">
			Ｅ－ディフェンス実験試験体の詳細解析モデルと解析結果
		</h1>

		<div class="bg-white rounded-lg shadow p-6 mb-6">
			<h2 class="text-xl font-semibold text-gray-800 mb-4">熊本地震シミュレーション</h2>
			<p class="text-gray-600 mb-4">
				防災科学技術研究所（NIED）によるＥ－ディフェンス実験試験体の地震シミュレーション結果を3Dで表示します。
			</p>

			<div class="flex items-center gap-4 mb-4">
				<label class="inline-flex items-center">
					<input
						type="radio"
						name="dataType"
						value="fore"
						checked={$ifcDataType === 'fore'}
						on:change={() => ($ifcDataType = 'fore')}
						class="form-radio"
					/>
					<span class="ml-2">熊本地震前震によるシミュレーション</span>
				</label>
				<label class="inline-flex items-center">
					<input
						type="radio"
						name="dataType"
						value="after"
						checked={$ifcDataType === 'after'}
						on:change={() => ($ifcDataType = 'after')}
						class="form-radio"
					/>
					<span class="ml-2">熊本地震本震によるシミュレーション</span>
				</label>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-lg font-semibold text-gray-800 mb-4">RC造建物モデル</h3>
				<p class="text-gray-600 mb-4">
					鉄筋コンクリート造建物の詳細解析モデルと地震応答解析結果を表示します。
				</p>
				<button
					on:click={openRCModel}
					class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
				>
					RC造建物を表示
				</button>
			</div>

			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-lg font-semibold text-gray-800 mb-4">鉄骨造建物モデル</h3>
				<p class="text-gray-600 mb-4">
					鉄骨造建物の詳細解析モデルと地震応答解析結果を表示します。
				</p>
				<button
					on:click={openSModel}
					class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
				>
					鉄骨造建物を表示
				</button>
			</div>
		</div>

		<div class="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6">
			<div class="flex">
				<div class="ml-3">
					<p class="text-sm text-blue-700">
						<strong>使い方:</strong> 建物モデルをクリックすると3Dビューワーが開きます。モデル内の部材をクリックすると、その部材の属性情報と地震時の変位データが表示されます。
					</p>
				</div>
			</div>
		</div>

		<div class="mt-6 text-sm text-gray-500">
			<p>データ出典:</p>
			<a
				href="https://www.geospatial.jp/ckan/dataset/nied-simulation"
				target="_blank"
				rel="noopener noreferrer"
				class="text-blue-600 hover:underline"
			>
				https://www.geospatial.jp/ckan/dataset/nied-simulation
			</a>
		</div>
	</div>
</div>

<IFCModal />
