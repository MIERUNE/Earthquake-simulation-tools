/**
 * DuckDB-WASM initialization and utilities
 * DuckDB-WASMの初期化とユーティリティ関数
 */

import * as duckdb from '@duckdb/duckdb-wasm';
import type { Feature, FeatureCollection, GeoJSON } from 'geojson';

type DuckDBInstance = {
	db: duckdb.AsyncDuckDB;
	conn: duckdb.AsyncDuckDBConnection;
};

let cachedInstance: DuckDBInstance | null = null;
let initializationPromise: Promise<DuckDBInstance> | null = null;

/**
 * Initialize DuckDB-WASM with Spatial extension
 * Spatial extensionを有効にしてDuckDB-WASMを初期化する
 *
 * @returns Initialized DuckDB instance and connection
 */
export async function initializeDuckDB(): Promise<DuckDBInstance> {
	// すでに初期化されている場合はキャッシュを返す
	if (cachedInstance) {
		return cachedInstance;
	}

	// 初期化中の場合は同じPromiseを返す（重複初期化を防ぐ）
	if (initializationPromise) {
		return initializationPromise;
	}

	initializationPromise = (async () => {
		try {
			console.info('DuckDB-WASM初期化を開始します');

			// バンドルの取得と選択
			const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
			const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

			// Workerの作成
			const worker_url = URL.createObjectURL(
				new Blob([`importScripts("${bundle.mainWorker}");`], {
					type: 'text/javascript'
				})
			);
			const worker = new Worker(worker_url);

			// DuckDBインスタンスの初期化
			const duckdbLogger = new duckdb.ConsoleLogger();
			const db = new duckdb.AsyncDuckDB(duckdbLogger, worker);
			await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

			// コネクションを取得
			const conn = await db.connect();

			// Spatial extensionのインストールとロード
			console.info('Spatial extensionをロードします');
			await conn.query('INSTALL spatial;');
			await conn.query('LOAD spatial;');

			console.info('DuckDB-WASM初期化が完了しました');

			cachedInstance = { db, conn };
			return cachedInstance;
		} catch (error) {
			console.error('DuckDB-WASM初期化に失敗しました', error);
			initializationPromise = null;
			throw new Error(
				`DuckDB-WASMの初期化に失敗しました: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
		}
	})();

	return initializationPromise;
}

/**
 * Get cached DuckDB instance
 * キャッシュされたDuckDBインスタンスを取得する
 *
 * @returns Cached DuckDB instance or null if not initialized
 */
export function getCachedDuckDB(): DuckDBInstance | null {
	return cachedInstance;
}

/**
 * Sanitize column name for SQL identifier
 * SQL識別子として安全なカラム名にサニタイズする
 *
 * @param columnName - Raw column name
 * @returns Sanitized column name
 */
function sanitizeColumnName(columnName: string): string {
	// ダブルクォートをエスケープ（DuckDBの識別子エスケープルールに従う）
	// ダブルクォートを二重化することでエスケープする
	return columnName.replace(/"/g, '""');
}

/**
 * Load GeoJSON data into DuckDB table
 * GeoJSONデータをDuckDBテーブルにロードする
 *
 * @param conn - DuckDB connection
 * @param geojsonData - GeoJSON data to load
 * @param tableName - Name of the table to create (default: 'geojson_data')
 * @returns Number of features loaded
 */
export async function loadGeoJSONToDuckDB(
	conn: duckdb.AsyncDuckDBConnection,
	geojsonData: GeoJSON,
	tableName = 'geojson_data'
): Promise<number> {
	try {
		console.info(`GeoJSONデータをDuckDBテーブル '${tableName}' にロードします`);

		// GeoJSONがFeatureCollectionであることを確認
		if (geojsonData.type !== 'FeatureCollection') {
			throw new Error('GeoJSONデータはFeatureCollection形式である必要があります');
		}

		const featureCollection = geojsonData as FeatureCollection;

		if (!featureCollection.features || featureCollection.features.length === 0) {
			throw new Error('GeoJSONデータにフィーチャーが含まれていません');
		}

		// featuresからpropertiesを抽出してテーブルを作成
		const features = featureCollection.features;

		// すべてのプロパティキーを収集
		const propertyKeys = new Set<string>();
		features.forEach((feature: Feature) => {
			if (feature.properties) {
				Object.keys(feature.properties).forEach((key) => propertyKeys.add(key));
			}
		});

		// プロパティキーが空の場合はエラー
		if (propertyKeys.size === 0) {
			throw new Error('GeoJSONデータにプロパティが含まれていません');
		}

		// テーブルを作成（まず空のテーブルを作成）
		// カラム名をサニタイズしてからダブルクォートで囲む
		const columns = Array.from(propertyKeys)
			.map((key) => `"${sanitizeColumnName(key)}" VARCHAR`)
			.join(', ');
		await conn.query(`CREATE OR REPLACE TABLE ${tableName} (${columns})`);

		// データを挿入（バッチ処理）
		const batchSize = 1000;
		// プレースホルダーを使用した準備済みステートメントを作成
		const placeholders = Array.from(propertyKeys)
			.map(() => '?')
			.join(', ');
		const insertSql = `INSERT INTO ${tableName} VALUES (${placeholders})`;
		const stmt = await conn.prepare(insertSql);

		try {
			for (let i = 0; i < features.length; i += batchSize) {
				const batch = features.slice(i, i + batchSize);

				// バッチごとにINSERTを実行
				for (const feature of batch) {
					const props = feature.properties || {};
					const values = Array.from(propertyKeys).map((key) => {
						const value = props[key];
						// undefinedはnullに変換
						return value === undefined ? null : value;
					});

					await stmt.query(...values);
				}
			}
		} finally {
			// ステートメントを必ずクローズ
			stmt.close();
		}

		// ロードされた行数を取得
		const result = await conn.query(`SELECT COUNT(*) as count FROM ${tableName}`);
		const count = result.toArray()[0]?.count || 0;

		console.info(`${count}件のフィーチャーをロードしました`);
		return Number(count);
	} catch (error) {
		console.error('GeoJSONデータのロードに失敗しました', error);
		throw new Error(
			`GeoJSONデータのロードに失敗しました: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
	}
}

/**
 * Search condition for specific column
 * 特定カラムに対する検索条件
 */
export type SearchCondition = {
	column: string;
	query: string;
};

/**
 * Build WHERE clause for search
 * 検索用のWHERE句を構築する
 *
 * @param searchQuery - Search query for OR search across all columns
 * @param searchConditions - Column-specific search conditions for AND search
 * @param columns - Column names for OR search
 * @returns Object containing WHERE clause and parameters
 */
function buildWhereClause(
	searchQuery?: string,
	searchConditions?: SearchCondition[],
	columns?: string[]
): { whereClause: string; params: unknown[] } {
	const params: unknown[] = [];
	let whereClause = '';

	if (searchConditions && searchConditions.length > 0) {
		// 検索条件あり: 各条件をANDで結合
		const conditions: string[] = [];
		for (const condition of searchConditions) {
			if (condition.query && condition.query.trim()) {
				conditions.push(`CAST("${sanitizeColumnName(condition.column)}" AS VARCHAR) LIKE ?`);
				params.push(`%${condition.query.trim()}%`);
			}
		}
		if (conditions.length > 0) {
			whereClause = ` WHERE ${conditions.join(' AND ')}`;
		}
	} else if (searchQuery && searchQuery.trim() && columns && columns.length > 0) {
		// 検索条件なし: 全カラムOR検索
		const orConditions: string[] = [];
		for (const column of columns) {
			orConditions.push(`CAST("${sanitizeColumnName(column)}" AS VARCHAR) LIKE ?`);
			params.push(`%${searchQuery.trim()}%`);
		}
		if (orConditions.length > 0) {
			whereClause = ` WHERE ${orConditions.join(' OR ')}`;
		}
	}

	return { whereClause, params };
}

/**
 * Query GeoJSON data from DuckDB table
 * DuckDBテーブルからGeoJSONデータをクエリする
 *
 * @param conn - DuckDB connection
 * @param tableName - Name of the table to query
 * @param options - Query options (limit, offset, orderBy, searchQuery, searchConditions)
 * @returns Query result as array of records
 */
export async function queryGeoJSONTable(
	conn: duckdb.AsyncDuckDBConnection,
	tableName = 'geojson_data',
	options: {
		limit?: number;
		offset?: number;
		orderBy?: string;
		orderDirection?: 'ASC' | 'DESC';
		columns?: string[];
		searchQuery?: string; // 全カラムOR検索用（検索条件なしの場合）
		searchConditions?: SearchCondition[]; // 項目ごとの検索条件（検索条件ありの場合、AND検索）
	} = {}
): Promise<Record<string, unknown>[]> {
	try {
		const {
			limit,
			offset,
			orderBy,
			orderDirection = 'ASC',
			columns,
			searchQuery,
			searchConditions
		} = options;

		// SELECT句の構築
		// カラム名をサニタイズしてダブルクォートで囲む
		const selectClause =
			columns && columns.length > 0
				? columns.map((col) => `"${sanitizeColumnName(col)}"`).join(', ')
				: '*';

		// WHERE句の構築
		const { whereClause, params: whereParams } = buildWhereClause(
			searchQuery,
			searchConditions,
			columns
		);

		// クエリの構築
		let query = `SELECT ${selectClause} FROM ${tableName}${whereClause}`;
		const params: unknown[] = [...whereParams];

		// ORDER BY句の追加
		if (orderBy) {
			// カラム名がcolumnsリストに含まれているか検証
			if (!columns || !columns.includes(orderBy)) {
				throw new Error(`無効なorderByカラム名: ${orderBy}`);
			}
			// orderDirectionの検証（ASC/DESCのみ許可）
			const validDirections = ['ASC', 'DESC'] as const;
			if (!validDirections.includes(orderDirection)) {
				throw new Error(`無効なorderDirection: ${orderDirection}`);
			}
			// ORDER BY句のカラム名をサニタイズ
			query += ` ORDER BY "${sanitizeColumnName(orderBy)}" ${orderDirection}`;
		}

		// LIMIT句の追加
		if (limit !== undefined) {
			query += ` LIMIT ?`;
			params.push(limit);
		}

		// OFFSET句の追加
		if (offset !== undefined) {
			query += ` OFFSET ?`;
			params.push(offset);
		}

		console.debug(`DuckDBクエリを実行: ${query}`, params);

		// パラメータバインディングを使用してクエリを実行
		const stmt = await conn.prepare(query);
		try {
			const result = await stmt.query(...params);
			return result.toArray() as Record<string, unknown>[];
		} finally {
			stmt.close();
		}
	} catch (error) {
		console.error('DuckDBクエリの実行に失敗しました', error);
		throw new Error(
			`DuckDBクエリの実行に失敗しました: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

/**
 * Get column names from DuckDB table
 * DuckDBテーブルのカラム名を取得する
 *
 * @param conn - DuckDB connection
 * @param tableName - Name of the table
 * @returns Array of column names
 */
export async function getTableColumns(
	conn: duckdb.AsyncDuckDBConnection,
	tableName = 'geojson_data'
): Promise<string[]> {
	try {
		const result = await conn.query(`DESCRIBE ${tableName}`);
		const rows = result.toArray() as Array<{ column_name: string }>;
		return rows.map((row) => row.column_name);
	} catch (error) {
		console.error('テーブルカラムの取得に失敗しました', error);
		throw new Error(
			`テーブルカラムの取得に失敗しました: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
	}
}

/**
 * Get total row count from DuckDB table
 * DuckDBテーブルの総行数を取得する
 *
 * @param conn - DuckDB connection
 * @param tableName - Name of the table
 * @param searchQuery - Search query for OR search across all columns
 * @param searchConditions - Column-specific search conditions for AND search
 * @param columns - Column names for OR search
 * @returns Total row count
 */
export async function getTableRowCount(
	conn: duckdb.AsyncDuckDBConnection,
	tableName = 'geojson_data',
	searchQuery?: string,
	searchConditions?: SearchCondition[],
	columns?: string[]
): Promise<number> {
	try {
		// WHERE句の構築
		const { whereClause, params } = buildWhereClause(searchQuery, searchConditions, columns);

		const query = `SELECT COUNT(*) as count FROM ${tableName}${whereClause}`;

		console.debug(`DuckDBカウントクエリを実行: ${query}`, params);

		// パラメータバインディングを使用してクエリを実行
		if (params.length > 0) {
			const stmt = await conn.prepare(query);
			try {
				const result = await stmt.query(...params);
				const count = result.toArray()[0]?.count || 0;
				return Number(count);
			} finally {
				stmt.close();
			}
		} else {
			// パラメータがない場合は直接実行
			const result = await conn.query(query);
			const count = result.toArray()[0]?.count || 0;
			return Number(count);
		}
	} catch (error) {
		console.error('行数のカウントに失敗しました', error);
		throw new Error(
			`行数のカウントに失敗しました: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

/**
 * Create buffer polygon from GeoJSON feature using DuckDB spatial functions
 * DuckDBの空間関数を使用してGeoJSONフィーチャーからバッファーポリゴンを生成する
 *
 * @param conn - DuckDB connection
 * @param feature - GeoJSON feature (LineString or MultiLineString)
 * @param bufferMeters - Buffer distance in meters
 * @returns Buffered polygon feature
 */
export async function createBufferPolygon(
	conn: duckdb.AsyncDuckDBConnection,
	feature: Feature,
	bufferMeters: number
): Promise<Feature | null> {
	try {
		// ジオメトリの存在チェック
		if (!feature.geometry) {
			console.warn('geometry is missing');
			return null;
		}

		// coordinatesフィールドの存在チェック
		if (!('coordinates' in feature.geometry)) {
			console.warn(`geometry.coordinates is missing, type: ${feature.geometry.type}`);
			return null;
		}

		// LineStringまたはMultiLineStringのみサポート
		if (feature.geometry.type !== 'LineString' && feature.geometry.type !== 'MultiLineString') {
			console.warn(`サポートされていないgeometry type: ${feature.geometry.type}`);
			return null;
		}

		// GeoJSONを文字列化
		const geojson = JSON.stringify(feature.geometry);

		// ST_Bufferを使用してバッファーを生成
		// ST_Bufferの単位はメートル（SRID 4326の場合は度数に変換が必要）
		// 近似的な変換: 1度 ≈ 111,000メートル（赤道付近）
		const bufferDegrees = bufferMeters / 111000;

		const query = `
            SELECT ST_AsGeoJSON(
                ST_Buffer(
                    ST_GeomFromGeoJSON(?),
                    ?
                )
            ) as buffered_geom
        `;

		const stmt = await conn.prepare(query);
		const result = await stmt.query(geojson, bufferDegrees);
		stmt.close();
		const rows = result.toArray() as Array<{ buffered_geom: string }>;

		if (rows.length === 0 || !rows[0].buffered_geom) {
			return null;
		}

		const bufferedGeometry = JSON.parse(rows[0].buffered_geom);

		return {
			type: 'Feature',
			geometry: bufferedGeometry,
			properties: feature.properties || {}
		};
	} catch (error) {
		console.error('バッファーポリゴンの生成に失敗しました', error);
		return null;
	}
}

/**
 * Create buffer polygons from multiple GeoJSON features (batch processing)
 * 複数のGeoJSONフィーチャーからバッファーポリゴンをバッチ生成する
 *
 * @param conn - DuckDB connection
 * @param features - Array of GeoJSON features
 * @param bufferMeters - Buffer distance in meters
 * @returns Array of buffered polygon features
 */
export async function createBufferPolygonsBatch(
	conn: duckdb.AsyncDuckDBConnection,
	features: Feature[],
	bufferMeters: number
): Promise<Feature[]> {
	try {
		if (features.length === 0) {
			return [];
		}

		// バッファー距離を度数に変換
		const bufferDegrees = bufferMeters / 111000;

		// 一時テーブルを作成
		const tableName = `buffer_temp_${Date.now()}`;

		// 有効なフィーチャーのみをフィルタリングして、インデックスとともに保持
		const validFeaturesWithIndex: Array<{ feature: Feature; originalIdx: number }> = [];

		features.forEach((feature, idx) => {
			// ジオメトリの存在チェック
			if (!feature.geometry) {
				console.warn(`Feature ${idx}: geometry is missing`);
				return;
			}

			// coordinatesフィールドの存在チェック
			if (!('coordinates' in feature.geometry)) {
				console.warn(
					`Feature ${idx}: geometry.coordinates is missing, type: ${feature.geometry.type}`
				);
				return;
			}

			// coordinatesが空でないかチェック
			const coords = feature.geometry.coordinates;
			if (!Array.isArray(coords) || coords.length === 0) {
				console.warn(`Feature ${idx}: geometry.coordinates is empty or not an array`);
				return;
			}

			// LineStringまたはMultiLineStringのみサポート
			if (feature.geometry.type !== 'LineString' && feature.geometry.type !== 'MultiLineString') {
				console.warn(`Feature ${idx}: unsupported geometry type: ${feature.geometry.type}`);
				return;
			}

			// LineStringの場合、座標が最低2点必要
			if (feature.geometry.type === 'LineString' && coords.length < 2) {
				console.warn(
					`Feature ${idx}: LineString requires at least 2 coordinates, got ${coords.length}`
				);
				return;
			}

			// デバッグ: coordinates構造をログ出力
			console.debug(
				`Feature ${idx}: type=${feature.geometry.type}, coords length=${coords.length}`,
				coords
			);

			validFeaturesWithIndex.push({ feature, originalIdx: idx });
		});

		if (validFeaturesWithIndex.length === 0) {
			console.warn('No valid features to process for buffer generation');
			return [];
		}

		console.info(
			`Processing ${validFeaturesWithIndex.length} valid features out of ${features.length} total features`
		);

		// プリペアドステートメントを使用してデータを挿入
		// まず空の一時テーブルを作成
		const createTableQuery = `
            CREATE TEMP TABLE ${tableName} (
                idx INTEGER,
                geom_json VARCHAR,
                props_json VARCHAR
            )
        `;
		await conn.query(createTableQuery);

		// データを挿入
		const insertStmt = await conn.prepare(`INSERT INTO ${tableName} VALUES (?, ?, ?)`);
		try {
			for (const { feature, originalIdx } of validFeaturesWithIndex) {
				const geojson = JSON.stringify({
					...feature.geometry,
					coordinates: feature.geometry.coordinates
				});
				const props = JSON.stringify(feature.properties || {});

				// デバッグ: シリアライズされたGeoJSONをログ出力
				console.debug(`Inserting feature ${originalIdx}: geojson length=${geojson.length}`);

				await insertStmt.query(originalIdx, geojson, props);
			}
		} finally {
			insertStmt.close();
		}

		// バッファー処理を実行
		const bufferQuery = `
            CREATE TEMP TABLE ${tableName}_buffered AS
            SELECT
                idx,
                ST_AsGeoJSON(
                    ST_Buffer(
                        ST_GeomFromGeoJSON(geom_json),
                        ${bufferDegrees}
                    )
                ) as buffered_geom,
                props_json
            FROM ${tableName}
        `;

		await conn.query(bufferQuery);

		// 結果を取得
		const selectQuery = `SELECT idx, buffered_geom, props_json FROM ${tableName}_buffered ORDER BY idx`;
		const result = await conn.query(selectQuery);
		const rows = result.toArray() as Array<{
			idx: number;
			buffered_geom: string;
			props_json: string;
		}>;

		// テーブルをドロップ
		try {
			await conn.query(`DROP TABLE IF EXISTS ${tableName}`);
			await conn.query(`DROP TABLE IF EXISTS ${tableName}_buffered`);
		} catch (dropError) {
			console.warn(`Failed to drop temporary tables:`, dropError);
		}

		// 結果をFeature配列に変換
		return rows.map((row) => {
			const geometry = JSON.parse(row.buffered_geom);
			const properties = JSON.parse(row.props_json);
			return {
				type: 'Feature',
				geometry,
				properties
			};
		});
	} catch (error) {
		console.error('バッファーポリゴンのバッチ生成に失敗しました', error);
		// より詳細なエラー情報をログ出力
		if (error instanceof Error) {
			console.error('Error details:', {
				message: error.message,
				stack: error.stack
			});
		}
		return [];
	}
}

/**
 * Check spatial intersection between two geometries
 * 2つのジオメトリの空間的交差を判定する
 *
 * @param conn - DuckDB connection
 * @param geometry1 - First GeoJSON geometry
 * @param geometry2 - Second GeoJSON geometry
 * @returns True if geometries intersect
 */
export async function checkIntersection(
	conn: duckdb.AsyncDuckDBConnection,
	geometry1: GeoJSON,
	geometry2: GeoJSON
): Promise<boolean> {
	try {
		const geojson1 = JSON.stringify(geometry1);
		const geojson2 = JSON.stringify(geometry2);

		const query = `
            SELECT ST_Intersects(
                ST_GeomFromGeoJSON(?),
                ST_GeomFromGeoJSON(?)
            ) as intersects
        `;

		const stmt = await conn.prepare(query);
		const result = await stmt.query(geojson1, geojson2);
		stmt.close();
		const rows = result.toArray() as Array<{ intersects: boolean }>;

		return rows.length > 0 ? rows[0].intersects : false;
	} catch (error) {
		console.error('交差判定に失敗しました', error);
		return false;
	}
}

/**
 * Get intersection geometry between two geometries
 * 2つのジオメトリの交差部分を取得する
 *
 * @param conn - DuckDB connection
 * @param geometry1 - First GeoJSON geometry
 * @param geometry2 - Second GeoJSON geometry
 * @returns Intersection geometry or null
 */
export async function getIntersection(
	conn: duckdb.AsyncDuckDBConnection,
	geometry1: GeoJSON,
	geometry2: GeoJSON
): Promise<GeoJSON | null> {
	try {
		const geojson1 = JSON.stringify({ ...geometry1, coordinates: geometry1.coordinates });
		const geojson2 = JSON.stringify({ ...geometry2, coordinates: geometry2.coordinates });

		const query = `
            SELECT ST_AsGeoJSON(
                ST_Intersection(
                    ST_GeomFromGeoJSON(?),
                    ST_GeomFromGeoJSON(?)
                )
            ) as intersection_geom
        `;

		const stmt = await conn.prepare(query);
		const result = await stmt.query(geojson1, geojson2);
		stmt.close();
		const rows = result.toArray() as Array<{ intersection_geom: string }>;

		if (rows.length === 0 || !rows[0].intersection_geom) {
			return null;
		}

		return JSON.parse(rows[0].intersection_geom);
	} catch (error) {
		console.error('交差部分の取得に失敗しました', error);
		return null;
	}
}

/**
 * Close DuckDB connection and clean up
 * DuckDBコネクションを閉じてクリーンアップする
 */
export async function closeDuckDB(): Promise<void> {
	if (cachedInstance) {
		try {
			await cachedInstance.conn.close();
			await cachedInstance.db.terminate();
			console.info('DuckDB-WASMを正常に終了しました');
		} catch (error) {
			console.error('DuckDB-WASMの終了に失敗しました', error);
		} finally {
			cachedInstance = null;
			initializationPromise = null;
		}
	}
}
