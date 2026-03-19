import type { Feature } from 'geojson';

// 建物データキャッシュの型定義
interface BuildingDataCache {
	features: Feature[];
	timestamp: number;
}

// 道路データキャッシュの型定義
interface RoadDataCache {
	roadFeatures: Feature[];
	emergencyRoadFeatures: Feature[];
	timestamp: number;
}

// 小学校区データキャッシュの型定義
interface DistrictDataCache {
	features: Feature[];
	timestamp: number;
}

// メッシュデータキャッシュの型定義
interface MeshDataCache {
	features: Feature[];
	timestamp: number;
}

class DashboardDataStore {
	private buildingCache: Map<string, BuildingDataCache> = new Map();
	private roadCache: Map<string, RoadDataCache> = new Map();
	private districtCache: Map<string, DistrictDataCache> = new Map();
	private meshCache: Map<string, MeshDataCache> = new Map();

	// キャッシュの有効期限（30分）
	private readonly CACHE_TTL = 30 * 60 * 1000;
	// キャッシュの最大サイズ（各キャッシュごと）
	private readonly MAX_CACHE_SIZE = 10;
	// クリーンアップインターバル（5分）
	private readonly CLEANUP_INTERVAL = 5 * 60 * 1000;
	private cleanupTimer: ReturnType<typeof setInterval> | null = null;

	constructor() {
		// ブラウザ環境でのみ定期クリーンアップを開始
		if (typeof window !== 'undefined') {
			this.startPeriodicCleanup();
		}
	}

	// 建物データの取得
	getBuildingData(cityCode: string): Feature[] | null {
		const cache = this.buildingCache.get(cityCode);
		if (!cache) {
			console.log(`[DataStore] 建物データキャッシュなし: ${cityCode}`);
			return null;
		}

		// キャッシュの有効期限チェック
		if (Date.now() - cache.timestamp > this.CACHE_TTL) {
			console.log(`[DataStore] 建物データキャッシュ期限切れ: ${cityCode}`);
			this.buildingCache.delete(cityCode);
			return null;
		}

		console.log(`[DataStore] 建物データキャッシュヒット: ${cityCode} (${cache.features.length}件)`);
		return cache.features;
	}

	// 建物データの保存
	setBuildingData(cityCode: string, features: Feature[]): void {
		console.log(`[DataStore] 建物データを保存: ${cityCode} (${features.length}件)`);

		// LRU: キャッシュサイズが最大を超える場合、最も古いエントリを削除
		if (this.buildingCache.size >= this.MAX_CACHE_SIZE) {
			const oldestKey = this.findOldestEntry(this.buildingCache);
			if (oldestKey) {
				console.log(`[DataStore] LRU: 建物データキャッシュから削除: ${oldestKey}`);
				this.buildingCache.delete(oldestKey);
			}
		}

		this.buildingCache.set(cityCode, {
			features,
			timestamp: Date.now()
		});
	}

	// 道路データの取得
	getRoadData(cityCode: string): { roadFeatures: Feature[]; emergencyRoadFeatures: Feature[] } | null {
		const cache = this.roadCache.get(cityCode);
		if (!cache) {
			console.log(`[DataStore] 道路データキャッシュなし: ${cityCode}`);
			return null;
		}

		// キャッシュの有効期限チェック
		if (Date.now() - cache.timestamp > this.CACHE_TTL) {
			console.log(`[DataStore] 道路データキャッシュ期限切れ: ${cityCode}`);
			this.roadCache.delete(cityCode);
			return null;
		}

		console.log(`[DataStore] 道路データキャッシュヒット: ${cityCode}`);
		return {
			roadFeatures: cache.roadFeatures,
			emergencyRoadFeatures: cache.emergencyRoadFeatures
		};
	}

	// 道路データの保存
	setRoadData(cityCode: string, roadFeatures: Feature[], emergencyRoadFeatures: Feature[]): void {
		console.log(`[DataStore] 道路データを保存: ${cityCode} (道路${roadFeatures.length}件, 緊急輸送道路${emergencyRoadFeatures.length}件)`);

		// LRU: キャッシュサイズが最大を超える場合、最も古いエントリを削除
		if (this.roadCache.size >= this.MAX_CACHE_SIZE) {
			const oldestKey = this.findOldestEntry(this.roadCache);
			if (oldestKey) {
				console.log(`[DataStore] LRU: 道路データキャッシュから削除: ${oldestKey}`);
				this.roadCache.delete(oldestKey);
			}
		}

		this.roadCache.set(cityCode, {
			roadFeatures,
			emergencyRoadFeatures,
			timestamp: Date.now()
		});
	}

	// 小学校区データの取得
	getDistrictData(cityCode: string): Feature[] | null {
		const cache = this.districtCache.get(cityCode);
		if (!cache) {
			console.log(`[DataStore] 小学校区データキャッシュなし: ${cityCode}`);
			return null;
		}

		// キャッシュの有効期限チェック
		if (Date.now() - cache.timestamp > this.CACHE_TTL) {
			console.log(`[DataStore] 小学校区データキャッシュ期限切れ: ${cityCode}`);
			this.districtCache.delete(cityCode);
			return null;
		}

		console.log(`[DataStore] 小学校区データキャッシュヒット: ${cityCode} (${cache.features.length}件)`);
		return cache.features;
	}

	// 小学校区データの保存
	setDistrictData(cityCode: string, features: Feature[]): void {
		console.log(`[DataStore] 小学校区データを保存: ${cityCode} (${features.length}件)`);
		this.districtCache.set(cityCode, {
			features,
			timestamp: Date.now()
		});
	}

	// メッシュデータの取得
	getMeshData(cityCode: string): Feature[] | null {
		const cache = this.meshCache.get(cityCode);
		if (!cache) {
			console.log(`[DataStore] メッシュデータキャッシュなし: ${cityCode}`);
			return null;
		}

		// キャッシュの有効期限チェック
		if (Date.now() - cache.timestamp > this.CACHE_TTL) {
			console.log(`[DataStore] メッシュデータキャッシュ期限切れ: ${cityCode}`);
			this.meshCache.delete(cityCode);
			return null;
		}

		console.log(`[DataStore] メッシュデータキャッシュヒット: ${cityCode} (${cache.features.length}件)`);
		return cache.features;
	}

	// メッシュデータの保存
	setMeshData(cityCode: string, features: Feature[]): void {
		console.log(`[DataStore] メッシュデータを保存: ${cityCode} (${features.length}件)`);
		this.meshCache.set(cityCode, {
			features,
			timestamp: Date.now()
		});
	}

	// 全キャッシュをクリア
	clearAll(): void {
		console.log('[DataStore] 全キャッシュをクリア');
		this.buildingCache.clear();
		this.roadCache.clear();
		this.districtCache.clear();
		this.meshCache.clear();
	}

	// 特定の都市のキャッシュをクリア
	clearCity(cityCode: string): void {
		console.log(`[DataStore] ${cityCode}のキャッシュをクリア`);
		this.buildingCache.delete(cityCode);
		this.roadCache.delete(cityCode);
		this.districtCache.delete(cityCode);
		this.meshCache.delete(cityCode);
	}

	// デバッグ情報の取得
	getDebugInfo(): {
		buildingCacheSizes: { cityCode: string; count: number }[];
		roadCacheSizes: { cityCode: string; roadCount: number; emergencyCount: number }[];
		districtCacheSizes: { cityCode: string; count: number }[];
		meshCacheSizes: { cityCode: string; count: number }[];
	} {
		return {
			buildingCacheSizes: Array.from(this.buildingCache.entries()).map(([cityCode, cache]) => ({
				cityCode,
				count: cache.features.length
			})),
			roadCacheSizes: Array.from(this.roadCache.entries()).map(([cityCode, cache]) => ({
				cityCode,
				roadCount: cache.roadFeatures.length,
				emergencyCount: cache.emergencyRoadFeatures.length
			})),
			districtCacheSizes: Array.from(this.districtCache.entries()).map(([cityCode, cache]) => ({
				cityCode,
				count: cache.features.length
			})),
			meshCacheSizes: Array.from(this.meshCache.entries()).map(([cityCode, cache]) => ({
				cityCode,
				count: cache.features.length
			}))
		};
	}

	// 最も古いエントリのキーを見つける（LRU用）
	private findOldestEntry<T extends { timestamp: number }>(cache: Map<string, T>): string | null {
		let oldestKey: string | null = null;
		let oldestTime = Infinity;

		for (const [key, value] of cache.entries()) {
			if (value.timestamp < oldestTime) {
				oldestTime = value.timestamp;
				oldestKey = key;
			}
		}

		return oldestKey;
	}

	// 期限切れエントリをクリーンアップ
	private cleanupExpiredEntries(): void {
		const now = Date.now();
		let cleanedCount = 0;

		// 建物データのクリーンアップ
		for (const [key, value] of this.buildingCache.entries()) {
			if (now - value.timestamp > this.CACHE_TTL) {
				this.buildingCache.delete(key);
				cleanedCount++;
			}
		}

		// 道路データのクリーンアップ
		for (const [key, value] of this.roadCache.entries()) {
			if (now - value.timestamp > this.CACHE_TTL) {
				this.roadCache.delete(key);
				cleanedCount++;
			}
		}

		// 小学校区データのクリーンアップ
		for (const [key, value] of this.districtCache.entries()) {
			if (now - value.timestamp > this.CACHE_TTL) {
				this.districtCache.delete(key);
				cleanedCount++;
			}
		}

		// メッシュデータのクリーンアップ
		for (const [key, value] of this.meshCache.entries()) {
			if (now - value.timestamp > this.CACHE_TTL) {
				this.meshCache.delete(key);
				cleanedCount++;
			}
		}

		if (cleanedCount > 0) {
			console.log(`[DataStore] 期限切れキャッシュを${cleanedCount}件削除しました`);
		}
	}

	// 定期的なクリーンアップを開始
	private startPeriodicCleanup(): void {
		// 既存のタイマーをクリア
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
		}

		// 定期クリーンアップを開始
		this.cleanupTimer = setInterval(() => {
			this.cleanupExpiredEntries();
		}, this.CLEANUP_INTERVAL);

		console.log('[DataStore] 定期クリーンアップを開始しました');
	}

	// クリーンアップタイマーを停止（テスト用）
	stopPeriodicCleanup(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
			this.cleanupTimer = null;
			console.log('[DataStore] 定期クリーンアップを停止しました');
		}
	}
}

// シングルトンインスタンスをエクスポート
export const dashboardDataStore = new DashboardDataStore();

// 型定義もエクスポート
export type { BuildingDataCache, RoadDataCache, DistrictDataCache, MeshDataCache };