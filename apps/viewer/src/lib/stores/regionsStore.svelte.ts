/**
 * 地域選択状態管理ストア
 * Svelte 5 Runes を使用した地域データと選択状態の管理
 */

import type { Prefecture, Municipality, MeshCode, RegionSelection } from '$lib/types/region';
import { fetchMeshCodes } from '$lib/api/regions.client';
import { prefectures as allPrefectures } from '$lib/data/regions';

/**
 * 地域ストアの状態
 */
class RegionsStore {
	// マスターデータ（静的データから初期化）
	prefectures = $state<Prefecture[]>(allPrefectures);
	municipalities = $state<Municipality[]>([]);
	meshCodes = $state<MeshCode[]>([]);

	// 選択状態
	selectedPrefecture = $state<Prefecture | null>(null);
	selectedMunicipality = $state<Municipality | null>(null);
	selectedMeshCodes = $state<string[]>([]);

	// ローディング状態
	isLoadingMunicipalities = $state(false);
	isLoadingMeshCodes = $state(false);

	// エラー状態
	error = $state<string | null>(null);

	/**
	 * メッシュコード一覧を読み込み
	 * @param options - クエリオプション
	 */
	loadMeshCodes = async (options?: { regionName?: string; limit?: number }) => {
		this.isLoadingMeshCodes = true;
		this.error = null;

		try {
			const result = await fetchMeshCodes(options);
			this.meshCodes = result.meshCodes;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to load mesh codes';
			this.error = message;
			console.error('[RegionsStore]', message, err);
		} finally {
			this.isLoadingMeshCodes = false;
		}
	};

	/**
	 * 都道府県を選択
	 * 市区町村リストはコンポーネント側で cities.json から設定する
	 */
	selectPrefecture = (prefecture: Prefecture | null) => {
		this.selectedPrefecture = prefecture;
		this.selectedMunicipality = null;
		this.selectedMeshCodes = [];
		this.municipalities = [];
	};

	/**
	 * 市区町村を選択
	 */
	selectMunicipality = async (municipality: Municipality | null) => {
		this.selectedMunicipality = municipality;
		this.selectedMeshCodes = [];

		// 市区町村が選択されたら、そのメッシュコードを読み込み
		if (municipality) {
			await this.loadMeshCodes({ regionName: municipality.name });
		} else {
			this.meshCodes = [];
		}
	};

	/**
	 * メッシュコードを選択
	 */
	selectMeshCode = (meshCode: string) => {
		if (!this.selectedMeshCodes.includes(meshCode)) {
			this.selectedMeshCodes = [...this.selectedMeshCodes, meshCode];
		}
	};

	/**
	 * メッシュコードの選択を解除
	 */
	deselectMeshCode = (meshCode: string) => {
		this.selectedMeshCodes = this.selectedMeshCodes.filter((code) => code !== meshCode);
	};

	/**
	 * メッシュコードの選択をトグル
	 */
	toggleMeshCode = (meshCode: string) => {
		if (this.selectedMeshCodes.includes(meshCode)) {
			this.deselectMeshCode(meshCode);
		} else {
			this.selectMeshCode(meshCode);
		}
	};

	/**
	 * すべてのメッシュコードを選択
	 */
	selectAllMeshCodes = () => {
		this.selectedMeshCodes = this.meshCodes.map((mc) => mc.code);
	};

	/**
	 * すべてのメッシュコード選択を解除
	 */
	clearMeshCodeSelection = () => {
		this.selectedMeshCodes = [];
	};

	/**
	 * すべての選択をクリア
	 */
	clearSelection = () => {
		this.selectedPrefecture = null;
		this.selectedMunicipality = null;
		this.selectedMeshCodes = [];
		this.municipalities = [];
		this.meshCodes = [];
	};

	/**
	 * 現在の選択状態を取得
	 */
	getSelection = (): RegionSelection => {
		return {
			prefecture: this.selectedPrefecture ?? undefined,
			municipality: this.selectedMunicipality ?? undefined,
			meshCodes: this.selectedMeshCodes.length > 0 ? this.selectedMeshCodes : undefined
		};
	};
}

/**
 * グローバルな地域ストアインスタンス
 */
export const regionsStore = new RegionsStore();
