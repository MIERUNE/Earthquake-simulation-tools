// IndexedDBを使った変換済みGeoJSONのキャッシング
// MVT→GeoJSON変換の3分間の処理を回避し、2回目以降のアクセスを高速化

import type { Feature } from 'geojson';

const DB_NAME = 'mosiri_geojson_cache';
const DB_VERSION = 1;
const STORE_NAME = 'building_tiles';

interface CachedTileData {
	cacheKey: string; // タイルの一意識別子（例: "building_damage_z15_x29234_y13056"）
	features: Feature[]; // 変換済みGeoJSON Features
	timestamp: number; // キャッシュ保存時刻
	metadata: {
		tileZ: number;
		tileX: number;
		tileY: number;
		featureCount: number;
	};
}

/**
 * IndexedDBの初期化
 */
const initDB = (): Promise<IDBDatabase> => {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => {
			reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
		};

		request.onsuccess = () => {
			resolve(request.result);
		};

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;

			// Object Storeが存在しない場合のみ作成
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
				// タイル座標でのインデックスを作成（検索用）
				objectStore.createIndex('tileCoords', ['metadata.tileZ', 'metadata.tileX', 'metadata.tileY'], {
					unique: false
				});
				// タイムスタンプでのインデックス（古いキャッシュの削除用）
				objectStore.createIndex('timestamp', 'timestamp', { unique: false });
			}
		};
	});
};

/**
 * タイルのキャッシュキーを生成
 */
export const generateCacheKey = (layerId: string, z: number, x: number, y: number): string => {
	return `${layerId}_z${z}_x${x}_y${y}`;
};

/**
 * IndexedDBから変換済みGeoJSONを取得
 */
export const getCachedTileFeatures = async (
	cacheKey: string
): Promise<Feature[] | null> => {
	try {
		const db = await initDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction([STORE_NAME], 'readonly');
			const objectStore = transaction.objectStore(STORE_NAME);
			const request = objectStore.get(cacheKey);

			request.onsuccess = () => {
				const result = request.result as CachedTileData | undefined;
				if (result) {
					resolve(result.features);
				} else {
					resolve(null);
				}
			};

			request.onerror = () => {
				reject(new Error(`Failed to get cached tile: ${request.error?.message}`));
			};

			transaction.oncomplete = () => {
				db.close();
			};
		});
	} catch (error) {
		console.error('[geoJSONCache] Failed to get cached tile:', error);
		return null;
	}
};

/**
 * 変換済みGeoJSONをIndexedDBにキャッシュ
 */
export const setCachedTileFeatures = async (
	cacheKey: string,
	features: Feature[],
	metadata: {
		tileZ: number;
		tileX: number;
		tileY: number;
	}
): Promise<void> => {
	try {
		const db = await initDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction([STORE_NAME], 'readwrite');
			const objectStore = transaction.objectStore(STORE_NAME);

			const data: CachedTileData = {
				cacheKey,
				features,
				timestamp: Date.now(),
				metadata: {
					...metadata,
					featureCount: features.length
				}
			};

			const request = objectStore.put(data);

			request.onsuccess = () => {
				resolve();
			};

			request.onerror = () => {
				reject(new Error(`Failed to cache tile: ${request.error?.message}`));
			};

			transaction.oncomplete = () => {
				db.close();
			};
		});
	} catch (error) {
		console.error('[geoJSONCache] Failed to cache tile:', error);
		throw error;
	}
};

/**
 * 複数のタイルをバッチでキャッシュから取得
 */
export const getBatchCachedTileFeatures = async (
	cacheKeys: string[]
): Promise<Map<string, Feature[]>> => {
	const resultMap = new Map<string, Feature[]>();

	try {
		const db = await initDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction([STORE_NAME], 'readonly');
			const objectStore = transaction.objectStore(STORE_NAME);

			let completed = 0;
			const total = cacheKeys.length;

			for (const cacheKey of cacheKeys) {
				const request = objectStore.get(cacheKey);

				request.onsuccess = () => {
					const result = request.result as CachedTileData | undefined;
					if (result) {
						resultMap.set(cacheKey, result.features);
					}
					completed++;

					if (completed === total) {
						resolve(resultMap);
					}
				};

				request.onerror = () => {
					console.error(`Failed to get cached tile ${cacheKey}:`, request.error);
					completed++;

					if (completed === total) {
						resolve(resultMap);
					}
				};
			}

			transaction.oncomplete = () => {
				db.close();
			};
		});
	} catch (error) {
		console.error('[geoJSONCache] Failed to get batch cached tiles:', error);
		return resultMap;
	}
};

/**
 * 複数のタイルをバッチでキャッシュに保存
 */
export const setBatchCachedTileFeatures = async (
	tiles: Array<{
		cacheKey: string;
		features: Feature[];
		metadata: {
			tileZ: number;
			tileX: number;
			tileY: number;
		};
	}>
): Promise<void> => {
	try {
		const db = await initDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction([STORE_NAME], 'readwrite');
			const objectStore = transaction.objectStore(STORE_NAME);

			let completed = 0;
			const total = tiles.length;
			let hasError = false;

			for (const tile of tiles) {
				const data: CachedTileData = {
					cacheKey: tile.cacheKey,
					features: tile.features,
					timestamp: Date.now(),
					metadata: {
						...tile.metadata,
						featureCount: tile.features.length
					}
				};

				const request = objectStore.put(data);

				request.onsuccess = () => {
					completed++;
					if (completed === total) {
						resolve();
					}
				};

				request.onerror = () => {
					console.error(`Failed to cache tile ${tile.cacheKey}:`, request.error);
					hasError = true;
					completed++;

					if (completed === total) {
						if (hasError) {
							reject(new Error('Some tiles failed to cache'));
						} else {
							resolve();
						}
					}
				};
			}

			transaction.oncomplete = () => {
				db.close();
			};
		});
	} catch (error) {
		console.error('[geoJSONCache] Failed to batch cache tiles:', error);
		throw error;
	}
};

/**
 * 古いキャッシュを削除（例: 7日以上経過したもの）
 */
export const clearOldCache = async (maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> => {
	try {
		const db = await initDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction([STORE_NAME], 'readwrite');
			const objectStore = transaction.objectStore(STORE_NAME);
			const index = objectStore.index('timestamp');

			const cutoffTime = Date.now() - maxAgeMs;
			const range = IDBKeyRange.upperBound(cutoffTime);
			const request = index.openCursor(range);

			let deletedCount = 0;

			request.onsuccess = (event) => {
				const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
				if (cursor) {
					cursor.delete();
					deletedCount++;
					cursor.continue();
				} else {
					resolve(deletedCount);
				}
			};

			request.onerror = () => {
				reject(new Error(`Failed to clear old cache: ${request.error?.message}`));
			};

			transaction.oncomplete = () => {
				db.close();
			};
		});
	} catch (error) {
		console.error('[geoJSONCache] Failed to clear old cache:', error);
		return 0;
	}
};

/**
 * キャッシュ全体をクリア
 */
export const clearAllCache = async (): Promise<void> => {
	try {
		const db = await initDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction([STORE_NAME], 'readwrite');
			const objectStore = transaction.objectStore(STORE_NAME);
			const request = objectStore.clear();

			request.onsuccess = () => {
				resolve();
			};

			request.onerror = () => {
				reject(new Error(`Failed to clear all cache: ${request.error?.message}`));
			};

			transaction.oncomplete = () => {
				db.close();
			};
		});
	} catch (error) {
		console.error('[geoJSONCache] Failed to clear all cache:', error);
		throw error;
	}
};

/**
 * キャッシュの統計情報を取得
 */
export const getCacheStats = async (): Promise<{
	totalTiles: number;
	totalFeatures: number;
	oldestTimestamp: number | null;
	newestTimestamp: number | null;
}> => {
	try {
		const db = await initDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction([STORE_NAME], 'readonly');
			const objectStore = transaction.objectStore(STORE_NAME);
			const request = objectStore.getAll();

			request.onsuccess = () => {
				const allData = request.result as CachedTileData[];
				const totalTiles = allData.length;
				const totalFeatures = allData.reduce((sum, tile) => sum + tile.metadata.featureCount, 0);
				const timestamps = allData.map((tile) => tile.timestamp);

				resolve({
					totalTiles,
					totalFeatures,
					oldestTimestamp: timestamps.length > 0 ? Math.min(...timestamps) : null,
					newestTimestamp: timestamps.length > 0 ? Math.max(...timestamps) : null
				});
			};

			request.onerror = () => {
				reject(new Error(`Failed to get cache stats: ${request.error?.message}`));
			};

			transaction.oncomplete = () => {
				db.close();
			};
		});
	} catch (error) {
		console.error('[geoJSONCache] Failed to get cache stats:', error);
		return {
			totalTiles: 0,
			totalFeatures: 0,
			oldestTimestamp: null,
			newestTimestamp: null
		};
	}
};
