// DuckDB空間SQLを使った高速建物被害集計

import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import type { Feature } from 'geojson';
import * as arrow from 'apache-arrow';
import { WOOD_THRESHOLDS, RC_THRESHOLDS, STEEL_THRESHOLDS } from '@mosiri/shared';

export interface AggregationResult {
	districtName: string;
	counts: Record<number, number>; // paramの値 -> 棟数
}

/**
 * SQL文字列のエスケープ処理
 * - シングルクォートを二重化
 * - バックスラッシュをエスケープ
 * - ヌルバイトを除去
 */
const escapeSQLString = (str: string): string => {
	return str
		.replace(/\\/g, '\\\\') // バックスラッシュをエスケープ（最初に処理）
		.replace(/'/g, "''") // シングルクォートを二重化
		.replace(/\0/g, ''); // ヌルバイトを除去
};

/**
 * プロパティオブジェクトから構造種別を特定する
 * @param properties 建物プロパティ
 * @param useCityAttributes 市区町村コード指定時かどうか
 * @returns 構造種別（'wood' | 'rc' | 'steel' | 'unknown'）
 */
const getStructureType = (
	properties: Record<string, any>,
	useCityAttributes: boolean
): 'wood' | 'rc' | 'steel' | 'unknown' => {
	const nameValues: string[] = [];

	for (const key in properties) {
		if (key.startsWith('_NAME')) {
			// _NAME00001と_NAME00002は市区町村コード指定時のみ使用
			if (!useCityAttributes && (key === '_NAME00001' || key === '_NAME00002')) {
				continue;
			}

			const value = properties[key];
			if (typeof value === 'string' && value !== 'no_name' && value !== '') {
				nameValues.push(value);
			}
		}
	}

	// 木造をチェック
	if (nameValues.some((v) => WOOD_THRESHOLDS.identifiers.includes(v))) {
		return 'wood';
	}
	// RC造をチェック
	if (nameValues.some((v) => RC_THRESHOLDS.identifiers.includes(v))) {
		return 'rc';
	}
	// S造をチェック
	if (nameValues.some((v) => STEEL_THRESHOLDS.identifiers.includes(v))) {
		return 'steel';
	}

	return 'unknown';
};

/**
 * 建物被害判定のSQL CASE文を生成
 * 定数ファイルから閾値を読み取って動的にCASE文を構築
 */
const generateDamageParamCaseSQL = (): string => {
	// 木造の閾値
	const woodThreshold1 = WOOD_THRESHOLDS.thresholds[0].value;
	const woodThreshold2 = WOOD_THRESHOLDS.thresholds[1].value;
	const woodParam1 = WOOD_THRESHOLDS.thresholds[0].param;
	const woodParam2 = WOOD_THRESHOLDS.thresholds[1].param;
	const woodParam3 = WOOD_THRESHOLDS.thresholds[2].param;
	const woodDefault = WOOD_THRESHOLDS.defaultParam;

	// RC造の閾値
	const rcThreshold1 = RC_THRESHOLDS.thresholds[0].value;
	const rcThreshold2 = RC_THRESHOLDS.thresholds[1].value;
	const rcParam1 = RC_THRESHOLDS.thresholds[0].param;
	const rcParam2 = RC_THRESHOLDS.thresholds[1].param;
	const rcParam3 = RC_THRESHOLDS.thresholds[2].param;
	const rcDefault = RC_THRESHOLDS.defaultParam;

	// S造の閾値
	const steelThreshold1 = STEEL_THRESHOLDS.thresholds[0].value;
	const steelThreshold2 = STEEL_THRESHOLDS.thresholds[1].value;
	const steelParam1 = STEEL_THRESHOLDS.thresholds[0].param;
	const steelParam2 = STEEL_THRESHOLDS.thresholds[1].param;
	const steelParam3 = STEEL_THRESHOLDS.thresholds[2].param;
	const steelDefault = STEEL_THRESHOLDS.defaultParam;

	return `
        CASE
          -- 木造
          WHEN bg.structure_type = 'wood' THEN
            CASE
              WHEN bg.max_drift < ${woodThreshold1} THEN ${woodParam1}
              WHEN bg.max_drift >= ${woodThreshold1} AND bg.max_drift < ${woodThreshold2} THEN ${woodParam2}
              WHEN bg.max_drift >= ${woodThreshold2} THEN ${woodParam3}
              ELSE ${woodDefault}
            END
          -- RC造
          WHEN bg.structure_type = 'rc' THEN
            CASE
              WHEN bg.max_drift < ${rcThreshold1} THEN ${rcParam1}
              WHEN bg.max_drift >= ${rcThreshold1} AND bg.max_drift < ${rcThreshold2} THEN ${rcParam2}
              WHEN bg.max_drift >= ${rcThreshold2} THEN ${rcParam3}
              ELSE ${rcDefault}
            END
          -- S造
          WHEN bg.structure_type = 'steel' THEN
            CASE
              WHEN bg.max_drift < ${steelThreshold1} THEN ${steelParam1}
              WHEN bg.max_drift >= ${steelThreshold1} AND bg.max_drift < ${steelThreshold2} THEN ${steelParam2}
              WHEN bg.max_drift >= ${steelThreshold2} THEN ${steelParam3}
              ELSE ${steelDefault}
            END
          ELSE ${woodDefault}
        END`;
};

/**
 * DuckDB空間SQLで小学校区ごとの建物被害を集計
 *
 * パフォーマンス最適化:
 * - バッチINSERTを使用（小学校区: 100件/batch、建物: 500件/batch）
 * - R-Treeインデックスで空間結合を高速化
 * - SQL内でgetParamロジックを実装し、JavaScriptループを回避
 *
 * 注意: さらなる最適化が必要な場合は、insertArrowTableの使用を検討してください
 */
export const aggregateBuildingDamageWithDuckDB = async (
	conn: AsyncDuckDBConnection,
	districts: Feature[],
	buildings: Feature[],
	cityCode?: string | null
): Promise<AggregationResult[]> => {
	try {
		// 市区町村コードが指定されている場合は _NAME00001 と _NAME00002 も使用
		const useCityAttributes = !!cityCode;

		// 1. 小学校区テーブルを作成
		await conn.query(`DROP TABLE IF EXISTS districts_temp`);
		await conn.query(`
      CREATE TEMP TABLE districts_temp (
        district_id INTEGER,
        district_name VARCHAR,
        geom_json VARCHAR
      )
    `);

		// 小学校区データをバッチINSERT（バッチサイズ100）
		const BATCH_SIZE = 100;
		const districtBatches: string[][] = [];
		let currentBatch: string[] = [];

		for (let i = 0; i < districts.length; i++) {
			const feature = districts[i];
			const geom = feature.geometry;

			if (!geom || geom.type === 'GeometryCollection') {
				continue;
			}

			const fullGeometry = {
				type: geom.type,
				coordinates: (geom as Exclude<typeof geom, { type: 'GeometryCollection' }>).coordinates
			};

			if (!fullGeometry.coordinates) {
				continue;
			}

			const districtName = feature.properties?.NAME || '不明';
			// JSON.stringify一回のみで、複数のreplace呼び出しを避ける
			const geomJson = JSON.stringify(fullGeometry);

			// 最適化されたエスケープ処理
			const escapedName = escapeSQLString(districtName);
			const escapedGeomJson = escapeSQLString(geomJson);

			currentBatch.push(`(${i + 1}, '${escapedName}', '${escapedGeomJson}')`);

			if (currentBatch.length >= BATCH_SIZE) {
				districtBatches.push([...currentBatch]);
				currentBatch = [];
			}
		}

		if (currentBatch.length > 0) {
			districtBatches.push(currentBatch);
		}

		// バッチINSERTを実行
		for (const batch of districtBatches) {
			const insertSQL = `INSERT INTO districts_temp (district_id, district_name, geom_json) VALUES ${batch.join(', ')}`;
			await conn.query(insertSQL);
		}

		// 2. 建物テーブルを作成
		await conn.query(`DROP TABLE IF EXISTS buildings_temp`);
		await conn.query(`
      CREATE TEMP TABLE buildings_temp (
        building_id INTEGER,
        geom_json VARCHAR,
        max_drift DOUBLE,
        structure_type VARCHAR
      )
    `);

		// 建物データをバッチINSERT（バッチサイズ500 - 建物は小学校区より多いため）
		const BUILDING_BATCH_SIZE = 500;
		const buildingBatches: string[][] = [];
		let currentBuildingBatch: string[] = [];

		for (let i = 0; i < buildings.length; i++) {
			const feature = buildings[i];
			const geom = feature.geometry;

			if (!geom || geom.type === 'GeometryCollection') {
				continue;
			}

			const fullGeometry = {
				type: geom.type,
				coordinates: (geom as Exclude<typeof geom, { type: 'GeometryCollection' }>).coordinates
			};

			if (!fullGeometry.coordinates) {
				continue;
			}

			// プロパティの取得とJSON化を一度に実行
			const geomJson = JSON.stringify(fullGeometry);
			// max_driftを数値に変換（無効な値は0にフォールバック）
			const maxDriftRaw = feature.properties?.max_drift;
			const maxDrift =
				typeof maxDriftRaw === 'number' && !isNaN(maxDriftRaw)
					? maxDriftRaw
					: Number(maxDriftRaw) || 0;

			// 構造種別を特定
			const structureType = getStructureType(feature.properties || {}, useCityAttributes);

			// 最適化されたエスケープ処理（関数を使用）
			const escapedGeomJson = escapeSQLString(geomJson);

			currentBuildingBatch.push(
				`(${i + 1}, '${escapedGeomJson}', ${maxDrift}, '${structureType}')`
			);

			if (currentBuildingBatch.length >= BUILDING_BATCH_SIZE) {
				buildingBatches.push([...currentBuildingBatch]);
				currentBuildingBatch = [];
			}
		}

		if (currentBuildingBatch.length > 0) {
			buildingBatches.push(currentBuildingBatch);
		}

		// バッチINSERTを実行
		for (const batch of buildingBatches) {
			const insertSQL = `INSERT INTO buildings_temp (building_id, geom_json, max_drift, structure_type) VALUES ${batch.join(', ')}`;
			await conn.query(insertSQL);
		}

		// 3. ジオメトリ変換と空間インデックスの作成
		await conn.query(`
      CREATE TEMP TABLE districts_geom AS
      SELECT
        district_id,
        district_name,
        ST_GeomFromGeoJSON(geom_json) as geometry
      FROM districts_temp
    `);

		await conn.query(`
      CREATE TEMP TABLE buildings_geom AS
      SELECT
        building_id,
        ST_GeomFromGeoJSON(geom_json) as geometry,
        max_drift,
        structure_type
      FROM buildings_temp
    `);

		// 空間インデックスを作成して空間結合を高速化
		// R-Treeインデックスは ST_Intersects などの空間述語で自動的に使用され、
		// 大規模データセットでの空間結合のパフォーマンスを大幅に向上させます
		await conn.query(`
      CREATE INDEX idx_districts_geom ON districts_geom USING RTREE (geometry)
    `);

		await conn.query(`
      CREATE INDEX idx_buildings_geom ON buildings_geom USING RTREE (geometry)
    `);

		// 4. getParamのロジックをSQLで実装し、空間結合で集計
		// getParam関数のロジックをCASE文で表現（定数ファイルから閾値を取得）
		// max_drift = 0 の建物は除外（属性を持たない建物）
		await conn.query(`
      CREATE TEMP TABLE aggregation_results AS
      SELECT
        dg.district_id,
        dg.district_name,
        ${generateDamageParamCaseSQL()} as param,
        COUNT(*) as building_count
      FROM districts_geom dg
      INNER JOIN buildings_geom bg ON ST_Intersects(dg.geometry, bg.geometry)
      WHERE bg.max_drift != 0
      GROUP BY dg.district_id, dg.district_name, param
      ORDER BY dg.district_id, param
    `);

		// 5. 結果を取得
		const result = await conn.query(`
      SELECT
        district_name,
        param,
        building_count
      FROM aggregation_results
      ORDER BY district_name, param
    `);

		// 6. AggregationResult形式に変換
		const rows = result.toArray() as Array<{
			district_name: string;
			param: number;
			building_count: bigint;
		}>;

		// district_nameごとにグループ化
		const resultMap = new Map<string, Record<number, number>>();

		for (const row of rows) {
			const districtName = row.district_name;
			const param = row.param;
			const count = Number(row.building_count);

			if (!resultMap.has(districtName)) {
				resultMap.set(districtName, {});
			}

			const counts = resultMap.get(districtName)!;
			counts[param] = count;
		}

		// Map to Array
		const results: AggregationResult[] = [];
		for (const [districtName, counts] of resultMap.entries()) {
			results.push({
				districtName,
				counts
			});
		}

		// テーブルをクリーンアップ
		await conn.query(`DROP TABLE IF EXISTS districts_temp`);
		await conn.query(`DROP TABLE IF EXISTS buildings_temp`);
		await conn.query(`DROP TABLE IF EXISTS districts_geom`);
		await conn.query(`DROP TABLE IF EXISTS buildings_geom`);
		await conn.query(`DROP TABLE IF EXISTS aggregation_results`);

		return results;
	} catch (error) {
		// テーブルクリーンアップ（エラー時）
		try {
			await conn.query(`DROP TABLE IF EXISTS districts_temp`);
			await conn.query(`DROP TABLE IF EXISTS buildings_temp`);
			await conn.query(`DROP TABLE IF EXISTS districts_geom`);
			await conn.query(`DROP TABLE IF EXISTS buildings_geom`);
			await conn.query(`DROP TABLE IF EXISTS aggregation_results`);
		} catch {
			// クリーンアップエラーは無視
		}
		throw error;
	}
};

/**
 * Arrow Table形式を使った高速版の建物被害集計
 *
 * パフォーマンス最適化:
 * - Apache Arrow形式でデータをDuckDBに挿入（JSON文字列のパース不要）
 * - SQL文字列エスケープ処理を完全に回避
 * - メモリ効率の向上
 *
 * 期待される高速化: 従来版と比較して2-3倍高速
 */
export const aggregateBuildingDamageWithArrow = async (
	conn: AsyncDuckDBConnection,
	districts: Feature[],
	buildings: Feature[],
	cityCode?: string | null
): Promise<AggregationResult[]> => {
	try {
		// 市区町村コードが指定されている場合は _NAME00001 と _NAME00002 も使用
		const useCityAttributes = !!cityCode;

		// 1. 小学校区データをArrow Tableとして作成
		const districtData: {
			district_id: number[];
			district_name: string[];
			geom_json: string[];
		} = {
			district_id: [],
			district_name: [],
			geom_json: []
		};

		console.log('[DuckDB Debug] 地区データ処理開始:', districts.length, '件');

		for (let i = 0; i < districts.length; i++) {
			const feature = districts[i];
			const geom = feature.geometry;

			if (i < 3) {
				console.log(`[DuckDB Debug] 地区 ${i} ジオメトリ:`, geom);
				console.log(`[DuckDB Debug] 地区 ${i} ジオメトリtype:`, geom?.type);
				console.log(`[DuckDB Debug] 地区 ${i} coordinates存在:`, geom && 'coordinates' in geom);
			}

			if (!geom || geom.type === 'GeometryCollection') {
				continue;
			}

			// 建物と同じように明示的にアクセス
			const coords = (geom as any).coordinates;

			if (!coords) {
				console.warn(`[DuckDB Debug] 地区 ${i}: coordinatesがnull - スキップ`);
				continue;
			}

			const fullGeometry = {
				type: geom.type,
				coordinates: coords
			};

			// 名前の取得: 小学校区の場合はNAME、メッシュの場合は他のプロパティから
			const districtName =
				feature.properties?.NAME ||
				feature.properties?.id ||
				feature.properties?.mesh_id ||
				feature.properties?.MESH_ID ||
				`フィーチャー${i + 1}`;
			const geomJson = JSON.stringify(fullGeometry);

			if (i < 3) {
				console.log(`[DuckDB Debug] 地区 ${i} GeoJSON長:`, geomJson.length);
				console.log(`[DuckDB Debug] 地区 ${i} 地区名:`, districtName);
			}

			districtData.district_id.push(i + 1);
			districtData.district_name.push(districtName);
			districtData.geom_json.push(geomJson);
		}

		console.log('[DuckDB Debug] 地区データ処理完了:', districtData.district_id.length, '件');

		// デバッグ: 配列の内容を確認
		if (districtData.geom_json.length > 0) {
			console.log('[DuckDB Debug] 地区配列の最初のGeoJSON長:', districtData.geom_json[0].length);
			console.log(
				'[DuckDB Debug] 地区配列の最初のGeoJSONプレビュー:',
				districtData.geom_json[0].substring(0, 100)
			);
		}

		// Arrow Tableを作成
		// makeVector()でLargeUtf8を使うとnullになるバグがあるため、直接配列を渡す
		// tableFromArrays()は自動的に適切な型を推論する
		const districtTable = arrow.tableFromArrays({
			district_id: districtData.district_id,
			district_name: districtData.district_name,
			geom_json: districtData.geom_json
		});

		console.log('[DuckDB Debug] Arrow Table作成完了:', districtTable.numRows, '行');
		console.log(
			'[DuckDB Debug] Arrow Tableのgeom_jsonカラム:',
			districtTable.getChild('geom_json')
		);
		if (districtTable.numRows > 0) {
			const firstRow = districtTable.get(0);
			console.log('[DuckDB Debug] Arrow Table最初の行:', firstRow);
			console.log('[DuckDB Debug] Arrow Table最初の行のgeom_json:', firstRow?.geom_json);
		}

		// DuckDBに挿入
		console.log('[DuckDB Debug] DuckDBへの地区データ挿入開始...');
		await conn.insertArrowTable(districtTable, { name: 'districts_temp', create: true });
		console.log('[DuckDB Debug] DuckDBへの地区データ挿入完了');

		// 2. 建物データをArrow Tableとして作成
		const buildingData: {
			building_id: number[];
			geom_json: string[];
			max_drift: number[];
			structure_type: string[];
		} = {
			building_id: [],
			geom_json: [],
			max_drift: [],
			structure_type: []
		};

		console.log('[DuckDB Debug] 建物データ処理開始:', buildings.length, '件');
		let skippedCount = 0;
		let processedCount = 0;

		for (let i = 0; i < buildings.length; i++) {
			const feature = buildings[i];
			const geom = feature.geometry;

			if (i < 3) {
				console.log(`[DuckDB Debug] 建物 ${i} ジオメトリ:`, geom);
				console.log(`[DuckDB Debug] 建物 ${i} ジオメトリtype:`, geom?.type);
				console.log(`[DuckDB Debug] 建物 ${i} coordinates存在:`, geom && 'coordinates' in geom);
				console.log(`[DuckDB Debug] 建物 ${i} coordinates値:`, (geom as any)?.coordinates);
			}

			if (!geom || geom.type === 'GeometryCollection') {
				skippedCount++;
				if (i < 3) {
					console.log(
						`[DuckDB Debug] 建物 ${i}: ジオメトリがnullまたはGeometryCollection - スキップ`,
						geom?.type
					);
				}
				continue;
			}

			// 型アサーションを使わずに直接アクセスを試みる
			const coords = (geom as any).coordinates;

			if (!coords) {
				skippedCount++;
				if (i < 3) {
					console.log(`[DuckDB Debug] 建物 ${i}: coordinatesがnull - スキップ`);
				}
				continue;
			}

			const fullGeometry = {
				type: geom.type,
				coordinates: coords
			};

			const geomJson = JSON.stringify(fullGeometry);
			const maxDriftRaw = feature.properties?.max_drift;
			const maxDrift =
				typeof maxDriftRaw === 'number' && !isNaN(maxDriftRaw)
					? maxDriftRaw
					: Number(maxDriftRaw) || 0;

			// 構造種別を特定
			const structureType = getStructureType(feature.properties || {}, useCityAttributes);

			buildingData.building_id.push(i + 1);
			buildingData.geom_json.push(geomJson);
			buildingData.max_drift.push(maxDrift);
			buildingData.structure_type.push(structureType);
			processedCount++;

			if (i < 3) {
				console.log(`[DuckDB Debug] 建物 ${i} 処理成功:`, {
					type: geom.type,
					coordsLength: geomJson.length,
					max_drift: maxDrift
				});
			}
		}

		console.log(
			'[DuckDB Debug] 建物データ処理完了:',
			processedCount,
			'件処理,',
			skippedCount,
			'件スキップ'
		);
		console.log('[DuckDB Debug] buildingData配列長:', {
			building_id: buildingData.building_id.length,
			geom_json: buildingData.geom_json.length,
			max_drift: buildingData.max_drift.length
		});

		// Arrow Tableを作成
		// makeVector()を使わず直接配列を渡して型推論に任せる
		console.log('[DuckDB Debug] Arrow Table作成開始...');

		const buildingTable = arrow.tableFromArrays({
			building_id: buildingData.building_id,
			geom_json: buildingData.geom_json,
			max_drift: buildingData.max_drift,
			structure_type: buildingData.structure_type
		});
		console.log('[DuckDB Debug] Arrow Table作成完了:', buildingTable.numRows, '行');

		// DuckDBに挿入
		console.log('[DuckDB Debug] DuckDBへの挿入開始...');
		await conn.insertArrowTable(buildingTable, { name: 'buildings_temp', create: true });
		console.log('[DuckDB Debug] DuckDBへの挿入完了');

		// 3. ジオメトリ変換と空間インデックスの作成（既存のSQL処理と同じ）
		await conn.query(`
      CREATE TEMP TABLE districts_geom AS
      SELECT
        district_id,
        district_name,
        ST_GeomFromGeoJSON(geom_json) as geometry
      FROM districts_temp
    `);

		await conn.query(`
      CREATE TEMP TABLE buildings_geom AS
      SELECT
        building_id,
        ST_GeomFromGeoJSON(geom_json) as geometry,
        max_drift,
        structure_type
      FROM buildings_temp
    `);

		// 空間インデックスを作成
		await conn.query(`
      CREATE INDEX idx_districts_geom ON districts_geom USING RTREE (geometry)
    `);

		await conn.query(`
      CREATE INDEX idx_buildings_geom ON buildings_geom USING RTREE (geometry)
    `);

		// デバッグ: テーブルの件数とサンプルデータを確認
		const districtCountResult = await conn.query(`SELECT COUNT(*) as count FROM districts_geom`);
		const districtCount = districtCountResult.toArray()[0].count;
		console.log('[DuckDB Debug] districts_geom件数:', districtCount);

		// 地区のGeoJSON文字列も確認
		const districtTempSampleResult = await conn.query(`
			SELECT district_id, district_name, geom_json
			FROM districts_temp
			LIMIT 1
		`);
		const districtTempSample = districtTempSampleResult.toArray()[0];
		console.log('[DuckDB Debug] 地区のGeoJSON (districts_temp):', {
			district_id: districtTempSample.district_id,
			district_name: districtTempSample.district_name,
			geom_json_length: districtTempSample.geom_json?.length,
			geom_json_preview: districtTempSample.geom_json?.substring(0, 200)
		});

		const buildingCountResult = await conn.query(`SELECT COUNT(*) as count FROM buildings_geom`);
		const buildingCount = buildingCountResult.toArray()[0].count;
		console.log('[DuckDB Debug] buildings_geom件数:', buildingCount);

		// サンプルデータの取得（最初の1件）
		const districtSampleResult = await conn.query(`
			SELECT district_id, district_name, ST_AsText(geometry) as geom_wkt
			FROM districts_geom
			LIMIT 1
		`);
		const districtSample = districtSampleResult.toArray()[0];
		console.log('[DuckDB Debug] 地区サンプル:', districtSample);
		console.log('[DuckDB Debug] 地区サンプル - district_id:', districtSample.district_id);
		console.log('[DuckDB Debug] 地区サンプル - district_name:', districtSample.district_name);
		console.log('[DuckDB Debug] 地区サンプル - geom_wkt:', districtSample.geom_wkt);

		const buildingSampleResult = await conn.query(`
			SELECT building_id, max_drift, ST_AsText(geometry) as geom_wkt
			FROM buildings_geom
			LIMIT 1
		`);
		const buildingSample = buildingSampleResult.toArray()[0];
		console.log('[DuckDB Debug] 建物サンプル:', buildingSample);
		console.log('[DuckDB Debug] 建物サンプル - building_id:', buildingSample.building_id);
		console.log('[DuckDB Debug] 建物サンプル - max_drift:', buildingSample.max_drift);
		console.log('[DuckDB Debug] 建物サンプル - geom_wkt:', buildingSample.geom_wkt);

		// DuckDBに格納された座標のバウンディングボックスを確認
		const districtBoundsResult = await conn.query(`
			SELECT
				MIN(ST_XMin(geometry)) as min_lng,
				MAX(ST_XMax(geometry)) as max_lng,
				MIN(ST_YMin(geometry)) as min_lat,
				MAX(ST_YMax(geometry)) as max_lat
			FROM districts_geom
		`);
		const districtBoundsInDB = districtBoundsResult.toArray()[0];
		console.log('[DuckDB Debug] 地区のDB内バウンディングボックス:', {
			lng: [districtBoundsInDB.min_lng, districtBoundsInDB.max_lng],
			lat: [districtBoundsInDB.min_lat, districtBoundsInDB.max_lat]
		});

		const buildingBoundsResult = await conn.query(`
			SELECT
				MIN(ST_XMin(geometry)) as min_lng,
				MAX(ST_XMax(geometry)) as max_lng,
				MIN(ST_YMin(geometry)) as min_lat,
				MAX(ST_YMax(geometry)) as max_lat
			FROM buildings_geom
		`);
		const buildingBoundsInDB = buildingBoundsResult.toArray()[0];
		console.log('[DuckDB Debug] 建物のDB内バウンディングボックス:', {
			lng: [buildingBoundsInDB.min_lng, buildingBoundsInDB.max_lng],
			lat: [buildingBoundsInDB.min_lat, buildingBoundsInDB.max_lat]
		});
		console.log('[座標確認] 建物データの座標範囲:');
		console.log('[座標確認] 経度:', [buildingBoundsInDB.min_lng, buildingBoundsInDB.max_lng]);
		console.log('[座標確認] 緯度:', [buildingBoundsInDB.min_lat, buildingBoundsInDB.max_lat]);

		// 座標のズレを計算
		const lngOffset = buildingBoundsInDB.min_lng - districtBoundsInDB.min_lng;
		const latOffset = buildingBoundsInDB.min_lat - districtBoundsInDB.min_lat;
		console.log('[座標確認] 座標のズレ:');
		console.log('[座標確認] 経度オフセット:', lngOffset);
		console.log('[座標確認] 緯度オフセット:', latOffset);

		// 空間結合のテスト（件数のみ）
		// max_drift = 0 の建物は除外
		const intersectTestResult = await conn.query(`
			SELECT COUNT(*) as count
			FROM districts_geom dg
			INNER JOIN buildings_geom bg ON ST_Intersects(dg.geometry, bg.geometry)
			WHERE bg.max_drift != 0
		`);
		const intersectCount = intersectTestResult.toArray()[0].count;
		console.log('[DuckDB Debug] ST_Intersects結合件数:', intersectCount);

		// 4. getParamのロジックをSQLで実装し、空間結合で集計
		// getParam関数のロジックをCASE文で表現（定数ファイルから閾値を取得）
		// max_drift = 0 の建物は除外（属性を持たない建物）
		await conn.query(`
      CREATE TEMP TABLE aggregation_results AS
      SELECT
        dg.district_id,
        dg.district_name,
        ${generateDamageParamCaseSQL()} as param,
        COUNT(*) as building_count
      FROM districts_geom dg
      INNER JOIN buildings_geom bg ON ST_Intersects(dg.geometry, bg.geometry)
      WHERE bg.max_drift != 0
      GROUP BY dg.district_id, dg.district_name, param
      ORDER BY dg.district_id, param
    `);

		// 5. 結果を取得
		const result = await conn.query(`
      SELECT
        district_name,
        param,
        building_count
      FROM aggregation_results
      ORDER BY district_name, param
    `);

		// 6. AggregationResult形式に変換
		const rows = result.toArray() as Array<{
			district_name: string;
			param: number;
			building_count: bigint;
		}>;

		const resultMap = new Map<string, Record<number, number>>();

		for (const row of rows) {
			const districtName = row.district_name;
			const param = row.param;
			const count = Number(row.building_count);

			if (!resultMap.has(districtName)) {
				resultMap.set(districtName, {});
			}

			const counts = resultMap.get(districtName)!;
			counts[param] = count;
		}

		const results: AggregationResult[] = [];
		for (const [districtName, counts] of resultMap.entries()) {
			results.push({
				districtName,
				counts
			});
		}

		console.log('[DuckDB] 集計結果を返す:', results.length, '地区');
		results.forEach((r, i) => {
			const totalBuildings = Object.values(r.counts).reduce((a, b) => a + b, 0);
			console.log(`[DuckDB] 地区 ${i}: ${r.districtName} - ${totalBuildings} 棟`);
		});

		// テーブルをクリーンアップ
		await conn.query(`DROP TABLE IF EXISTS districts_temp`);
		await conn.query(`DROP TABLE IF EXISTS buildings_temp`);
		await conn.query(`DROP TABLE IF EXISTS districts_geom`);
		await conn.query(`DROP TABLE IF EXISTS buildings_geom`);
		await conn.query(`DROP TABLE IF EXISTS aggregation_results`);

		return results;
	} catch (error) {
		// テーブルクリーンアップ（エラー時）
		try {
			await conn.query(`DROP TABLE IF EXISTS districts_temp`);
			await conn.query(`DROP TABLE IF EXISTS buildings_temp`);
			await conn.query(`DROP TABLE IF EXISTS districts_geom`);
			await conn.query(`DROP TABLE IF EXISTS buildings_geom`);
			await conn.query(`DROP TABLE IF EXISTS aggregation_results`);
		} catch {
			// クリーンアップエラーは無視
		}
		throw error;
	}
};

/**
 * MVTタイルのバイナリデータを直接DuckDBに読み込んで集計する試験的関数
 * dataInWGS84の重い変換を回避するため、ST_ReadMVTを使用
 */
export const aggregateBuildingDamageFromMVTTiles = async (
	conn: AsyncDuckDBConnection,
	districts: Feature[],
	mvtTiles: Array<{
		bbox: { west: number; south: number; east: number; north: number };
		content: ArrayBuffer | Uint8Array;
		z: number;
		x: number;
		y: number;
	}>
): Promise<AggregationResult[]> => {
	try {
		// 1. 小学校区テーブルを作成
		await conn.query(`DROP TABLE IF EXISTS districts_temp`);
		await conn.query(`
      CREATE TEMP TABLE districts_temp (
        district_id INTEGER,
        district_name VARCHAR,
        geom_json VARCHAR
      )
    `);

		// 小学校区データをバッチINSERT
		const BATCH_SIZE = 100;
		const districtBatches: string[][] = [];
		let currentBatch: string[] = [];

		for (let i = 0; i < districts.length; i++) {
			const feature = districts[i];
			const geom = feature.geometry;

			if (!geom || geom.type === 'GeometryCollection') {
				continue;
			}

			const fullGeometry = {
				type: geom.type,
				coordinates: (geom as Exclude<typeof geom, { type: 'GeometryCollection' }>).coordinates
			};

			if (!fullGeometry.coordinates) {
				continue;
			}

			// 名前の取得: 小学校区の場合はNAME、メッシュの場合は他のプロパティから
			const districtName =
				feature.properties?.NAME ||
				feature.properties?.id ||
				feature.properties?.mesh_id ||
				feature.properties?.MESH_ID ||
				`フィーチャー${i + 1}`;
			const geomJson = JSON.stringify(fullGeometry);

			const escapedName = escapeSQLString(districtName);
			const escapedGeomJson = escapeSQLString(geomJson);

			currentBatch.push(`(${i + 1}, '${escapedName}', '${escapedGeomJson}')`);

			if (currentBatch.length >= BATCH_SIZE) {
				districtBatches.push([...currentBatch]);
				currentBatch = [];
			}
		}

		if (currentBatch.length > 0) {
			districtBatches.push(currentBatch);
		}

		// バッチINSERTを実行
		for (const batch of districtBatches) {
			const insertSQL = `INSERT INTO districts_temp (district_id, district_name, geom_json) VALUES ${batch.join(', ')}`;
			await conn.query(insertSQL);
		}

		// 2. 小学校区ジオメトリテーブル作成
		await conn.query(`
      CREATE TEMP TABLE districts_geom AS
      SELECT
        district_id,
        district_name,
        ST_GeomFromGeoJSON(geom_json) as geometry
      FROM districts_temp
    `);

		// 3. 空間インデックスを作成
		await conn.query(`
      CREATE INDEX idx_districts_geom ON districts_geom USING RTREE (geometry)
    `);

		// 4. MVTタイルから建物データを読み込む
		// DuckDBのST_ReadMVT関数を使ってMVTバイナリを直接読み込み
		await conn.query(`DROP TABLE IF EXISTS buildings_from_mvt`);

		console.log(`[aggregateBuildingDamageFromMVTTiles] Processing ${mvtTiles.length} MVT tiles...`);

		for (let i = 0; i < mvtTiles.length; i++) {
			const tile = mvtTiles[i];
			console.log(
				`[aggregateBuildingDamageFromMVTTiles] Processing tile ${i + 1}/${mvtTiles.length} (z=${tile.z}, x=${tile.x}, y=${tile.y})...`
			);

			// DuckDBにMVTバイナリデータを登録してST_ReadMVTで読み込む
			// MVTバイナリは tile.content として利用可能（Uint8Array または ArrayBuffer）
			// 注: DuckDB-WASMでのBLOB処理は制限があるため、代替アプローチを検討
			console.warn(
				'[aggregateBuildingDamageFromMVTTiles] ST_ReadMVT approach requires further investigation'
			);
		}

		// TODO: ST_ReadMVTが使えない場合は従来のGeoJSON変換に戻す
		throw new Error(
			'ST_ReadMVT implementation not yet complete. Use aggregateBuildingDamageWithDuckDB instead.'
		);
	} catch (error) {
		// テーブルクリーンアップ（エラー時）
		try {
			await conn.query(`DROP TABLE IF EXISTS districts_temp`);
			await conn.query(`DROP TABLE IF EXISTS districts_geom`);
			await conn.query(`DROP TABLE IF EXISTS buildings_from_mvt`);
		} catch {
			// クリーンアップエラーは無視
		}
		throw error;
	}
};
