// DuckDB空間SQLを使った超高速道路閉塞率計算 - V2（Prepared Statement版）

import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import type { Feature } from 'geojson';
import { ROAD_BLOCKAGE_COLORS } from '$lib/constants/roadColors';

// 定数定義
const METERS_PER_KM = 1000; // メートルからキロメートルへの変換係数
const METERS_PER_DEGREE = 111000; // 度からメートルへの変換係数（赤道付近の近似値）

/**
 * DuckDB空間SQLで道路閉塞率を一括計算（Prepared Statement使用）
 */
export const calculateRoadBlockageWithDuckDB = async (
	conn: AsyncDuckDBConnection,
	roads: Feature[],
	buildings: Feature[],
	bufferDistanceMeters = 10
): Promise<Feature[]> => {
	try {
		// メートルから度への変換
		const bufferDegrees = bufferDistanceMeters / METERS_PER_DEGREE;

		// 1. 道路テーブルを作成
		await conn.query(`DROP TABLE IF EXISTS roads_temp`);
		await conn.query(`
      CREATE TEMP TABLE roads_temp (
        road_id INTEGER,
        geom_json VARCHAR,
        props_json VARCHAR
      )
    `);

		// 道路データを挿入
		const roadInsertStmt = await conn.prepare(
			'INSERT INTO roads_temp (road_id, geom_json, props_json) VALUES (?, ?, ?)'
		);
		try {
			for (let i = 0; i < roads.length; i++) {
				const feature = roads[i];
				const geom = feature.geometry;

				if (!geom) {
					console.warn(`Road ${i} has null geometry`);
					continue;
				}

				// MVTタイルのgeometryはプロキシオブジェクトの可能性があるため、
				// 明示的に完全なGeoJSON形式に変換
				// GeometryCollectionを除外
				if (geom.type === 'GeometryCollection') {
					console.warn(`Road ${i} is GeometryCollection, skipping`);
					continue;
				}

				const fullGeometry = {
					type: geom.type,
					coordinates: (geom as Exclude<typeof geom, { type: 'GeometryCollection' }>).coordinates
				};

				if (!fullGeometry.coordinates) {
					console.warn(`Road ${i} geometry missing coordinates`);
					continue;
				}

				const geomJson = JSON.stringify(fullGeometry);
				const propsJson = JSON.stringify(feature.properties || {});
				await roadInsertStmt.query(i + 1, geomJson, propsJson);
			}
		} finally {
			roadInsertStmt.close();
		}

		// 2. 建物テーブルを作成
		await conn.query(`DROP TABLE IF EXISTS buildings_temp`);
		await conn.query(`
      CREATE TEMP TABLE buildings_temp (
        building_id INTEGER,
        geom_json VARCHAR,
        props_json VARCHAR
      )
    `);

		// 建物データを挿入
		const buildingInsertStmt = await conn.prepare(
			'INSERT INTO buildings_temp (building_id, geom_json, props_json) VALUES (?, ?, ?)'
		);
		try {
			for (let i = 0; i < buildings.length; i++) {
				const feature = buildings[i];
				const geom = feature.geometry;

				if (!geom) {
					console.warn(`Building ${i} has null geometry`);
					continue;
				}

				// MVTタイルのgeometryをプロキシから完全なGeoJSON形式に変換
				// GeometryCollectionを除外
				if (geom.type === 'GeometryCollection') {
					console.warn(`Building ${i} is GeometryCollection, skipping`);
					continue;
				}

				const fullGeometry = {
					type: geom.type,
					coordinates: (geom as Exclude<typeof geom, { type: 'GeometryCollection' }>).coordinates
				};

				if (!fullGeometry.coordinates) {
					console.warn(`Building ${i} has invalid geometry`);
					continue;
				}

				const geomJson = JSON.stringify(fullGeometry);
				const propsJson = JSON.stringify(feature.properties || {});
				await buildingInsertStmt.query(i + 1, geomJson, propsJson);
			}
		} finally {
			buildingInsertStmt.close();
		}

		// 3. ジオメトリ変換と道路バッファー作成
		// ST_Lengthは度単位で返すので、メートルに変換
		// 注: 1度≈111kmは赤道付近の近似値。緯度が高くなるほど誤差が大きくなる。
		// 例えば静岡（約35°N）では経度1度は約91km、緯度1度は約111km。
		// ここでは簡易的に111kmで計算（道路延長の概算値として使用）
		await conn.query(`
      CREATE TEMP TABLE road_buffers AS
      SELECT
        road_id,
        ST_Buffer(ST_GeomFromGeoJSON(geom_json), ${bufferDegrees}) as buffer_geom,
        ST_GeomFromGeoJSON(geom_json) as original_geom,
        geom_json,
        props_json,
        TRIM(BOTH '"' FROM CAST(json_extract(props_json, '$.vt_rnkwidth') AS VARCHAR)) as road_width,
        ST_Length(ST_GeomFromGeoJSON(geom_json)) * ${METERS_PER_DEGREE}.0 as road_length_m
      FROM roads_temp
    `);

		// 4. 建物ジオメトリ変換
		// max_driftから被害レベルを判定: max_drift >= 0.01 で被害建物とする
		await conn.query(`
      CREATE TEMP TABLE buildings_geom AS
      SELECT
        building_id,
        ST_GeomFromGeoJSON(geom_json) as geometry,
        props_json,
        CAST(json_extract(props_json, '$.max_drift') AS DOUBLE) as max_drift
      FROM buildings_temp
    `);

		// 5. 空間結合で道路閉塞率を計算（道路幅係数はJavaScript側で計算）
		// max_drift >= 0.01 を被害建物として判定
		await conn.query(`
      CREATE TEMP TABLE road_blockage_results AS
      SELECT
        rb.road_id,
        rb.geom_json,
        rb.props_json,
        COUNT(bg.building_id) as building_count,
        COUNT(CASE WHEN bg.max_drift >= 0.01 THEN 1 END) as damaged_building_count,
        rb.road_width,
        rb.road_length_m
      FROM road_buffers rb
      LEFT JOIN buildings_geom bg ON ST_Intersects(rb.buffer_geom, bg.geometry)
      GROUP BY rb.road_id, rb.geom_json, rb.props_json, rb.road_width, rb.road_length_m
    `);

		// 6. 結果を取得（閉塞率はJavaScript側で計算、道路延長は既に計算済み）
		const result = await conn.query(`
      SELECT
        road_id,
        geom_json as geometry_json,
        props_json,
        building_count,
        damaged_building_count,
        road_width,
        road_length_m
      FROM road_blockage_results
      WHERE building_count > 0
      ORDER BY road_id
    `);

		// 7. GeoJSON Featureに変換し、道路幅係数と閉塞率を計算
		const features: Feature[] = [];
		const rows = result.toArray() as Array<{
			road_id: number;
			geometry_json: string;
			props_json: string;
			building_count: number;
			damaged_building_count: number;
			road_width: string;
			road_length_m: number;
		}>;

		for (const row of rows) {
			const geometry = JSON.parse(row.geometry_json);
			const properties = JSON.parse(row.props_json);

			// 道路幅に基づく係数を計算
			let widthCoefficient = 0;
			switch (row.road_width) {
				case '3m未満':
					widthCoefficient = 1.28;
					break;
				case '3m-5.5m未満':
					widthCoefficient = 0.604;
					break;
				case '5.5m-13m未満':
				case '13m-19.5m未満':
				case '19.5m以上':
					widthCoefficient = 0.194;
					break;
				default:
					widthCoefficient = 0;
			}

			// BigIntをNumberに変換
			const buildingCount = Number(row.building_count);
			const damagedBuildingCount = Number(row.damaged_building_count);

			// 閉塞率を計算
			const damageRate = buildingCount > 0 ? (damagedBuildingCount / buildingCount) * 100 : 0;
			const blockagePercent = widthCoefficient * damageRate;

			// 閉塞率に基づく色を決定（フィルターUIと統一）
			let blockageColor: [number, number, number, number];
			if (blockagePercent <= 10) {
				blockageColor = ROAD_BLOCKAGE_COLORS.PASSABLE;
			} else if (blockagePercent <= 50) {
				blockageColor = ROAD_BLOCKAGE_COLORS.WARNING;
			} else {
				blockageColor = ROAD_BLOCKAGE_COLORS.DIFFICULT;
			}

			features.push({
				type: 'Feature',
				geometry,
				properties: {
					...properties,
					buildingCount: buildingCount,
					damagedBuildingCount: damagedBuildingCount,
					blockagePercent: blockagePercent,
					roadWidth: row.road_width,
					roadLengthM: Number(row.road_length_m), // 道路延長（メートル）
					roadLengthKm: Number(row.road_length_m) / METERS_PER_KM, // 道路延長（キロメートル）
					blockageColor
				}
			});
		}

		// クリーンアップ
		await conn.query(`DROP TABLE IF EXISTS roads_temp`);
		await conn.query(`DROP TABLE IF EXISTS buildings_temp`);
		await conn.query(`DROP TABLE IF EXISTS road_buffers`);
		await conn.query(`DROP TABLE IF EXISTS buildings_geom`);
		await conn.query(`DROP TABLE IF EXISTS road_blockage_results`);

		console.log(`道路閉塞率計算完了: ${features.length}件の道路を処理`);

		return features;
	} catch (error) {
		console.error('DuckDB road blockage calculation failed:', error);
		throw error;
	}
};

/**
 * DuckDB空間SQLで道路閉塞率結果と緊急輸送道路を空間結合
 */
export const joinRoadBlockageWithEmergencyRoads = async (
	conn: AsyncDuckDBConnection,
	roadBlockageFeatures: Feature[],
	emergencyRoadFeatures: Feature[]
): Promise<{
	features: Feature[];
	statsByType: Record<
		string,
		{ totalLength: number; passableLength: number; blockedLength: number }
	>;
}> => {
	try {
		// 1. 道路閉塞率結果テーブルを作成
		await conn.query(`DROP TABLE IF EXISTS road_blockage_temp`);
		await conn.query(`
      CREATE TEMP TABLE road_blockage_temp (
        blockage_id INTEGER,
        geom_json VARCHAR,
        props_json VARCHAR
      )
    `);

		// 道路閉塞率データを挿入
		const blockageInsertStmt = await conn.prepare(
			'INSERT INTO road_blockage_temp (blockage_id, geom_json, props_json) VALUES (?, ?, ?)'
		);
		try {
			for (let i = 0; i < roadBlockageFeatures.length; i++) {
				const feature = roadBlockageFeatures[i];
				const geom = feature.geometry;

				if (!geom) continue;

				// GeometryCollectionを除外
				if (geom.type === 'GeometryCollection') continue;

				const fullGeometry = {
					type: geom.type,
					coordinates: (geom as Exclude<typeof geom, { type: 'GeometryCollection' }>).coordinates
				};

				const geomJson = JSON.stringify(fullGeometry);
				const propsJson = JSON.stringify(feature.properties || {});
				await blockageInsertStmt.query(i + 1, geomJson, propsJson);
			}
		} finally {
			blockageInsertStmt.close();
		}

		// 2. 緊急輸送道路テーブルを作成
		await conn.query(`DROP TABLE IF EXISTS emergency_roads_temp`);
		await conn.query(`
      CREATE TEMP TABLE emergency_roads_temp (
        emergency_id INTEGER,
        geom_json VARCHAR,
        props_json VARCHAR
      )
    `);

		// 緊急輸送道路データを挿入
		const emergencyInsertStmt = await conn.prepare(
			'INSERT INTO emergency_roads_temp (emergency_id, geom_json, props_json) VALUES (?, ?, ?)'
		);
		try {
			for (let i = 0; i < emergencyRoadFeatures.length; i++) {
				const feature = emergencyRoadFeatures[i];
				const geom = feature.geometry;

				if (!geom) continue;

				// GeometryCollectionを除外
				if (geom.type === 'GeometryCollection') continue;

				const fullGeometry = {
					type: geom.type,
					coordinates: (geom as Exclude<typeof geom, { type: 'GeometryCollection' }>).coordinates
				};

				const geomJson = JSON.stringify(fullGeometry);
				const propsJson = JSON.stringify(feature.properties || {});
				await emergencyInsertStmt.query(i + 1, geomJson, propsJson);
			}
		} finally {
			emergencyInsertStmt.close();
		}

		// 3. ジオメトリ変換テーブル作成
		await conn.query(`
      CREATE TEMP TABLE blockage_geom AS
      SELECT
        blockage_id,
        ST_GeomFromGeoJSON(geom_json) as geometry,
        geom_json,
        props_json,
        CAST(json_extract(props_json, '$.roadLengthKm') AS DOUBLE) as road_length_km,
        CAST(json_extract(props_json, '$.blockagePercent') AS DOUBLE) as blockage_percent
      FROM road_blockage_temp
    `);

		await conn.query(`
      CREATE TEMP TABLE emergency_geom AS
      SELECT
        emergency_id,
        ST_GeomFromGeoJSON(geom_json) as geometry,
        props_json,
        CAST(json_extract(props_json, '$.N10_002') AS INTEGER) as road_type
      FROM emergency_roads_temp
    `);

		// 4. 空間結合: 道路閉塞率結果と交差する緊急輸送道路を特定
		await conn.query(`
      CREATE TEMP TABLE joined_results AS
      SELECT
        bg.blockage_id,
        bg.geom_json,
        bg.props_json,
        bg.road_length_km,
        bg.blockage_percent,
        eg.road_type as emergency_road_type
      FROM blockage_geom bg
      INNER JOIN emergency_geom eg ON ST_Intersects(bg.geometry, eg.geometry)
    `);

		// 5. 結果を取得
		const result = await conn.query(`
      SELECT
        blockage_id,
        geom_json as geometry_json,
        props_json,
        road_length_km,
        blockage_percent,
        emergency_road_type
      FROM joined_results
      ORDER BY blockage_id
    `);

		// 6. GeoJSON Featureに変換し、緊急輸送道路種別情報を追加
		const features: Feature[] = [];
		const statsByType: Record<
			string,
			{ totalLength: number; passableLength: number; blockedLength: number }
		> = {
			'1': { totalLength: 0, passableLength: 0, blockedLength: 0 },
			'2': { totalLength: 0, passableLength: 0, blockedLength: 0 },
			'3': { totalLength: 0, passableLength: 0, blockedLength: 0 }
		};

		const rows = result.toArray() as Array<{
			blockage_id: number;
			geometry_json: string;
			props_json: string;
			road_length_km: number;
			blockage_percent: number;
			emergency_road_type: number;
		}>;

		for (const row of rows) {
			const geometry = JSON.parse(row.geometry_json);
			const properties = JSON.parse(row.props_json);

			const roadLengthKm = Number(row.road_length_km);
			const blockagePercent = Number(row.blockage_percent);
			const emergencyRoadType = String(row.emergency_road_type);

			// 統計情報を更新
			if (statsByType[emergencyRoadType]) {
				statsByType[emergencyRoadType].totalLength += roadLengthKm;

				// 閉塞率50%以上を通行不可とする
				if (blockagePercent >= 50) {
					statsByType[emergencyRoadType].blockedLength += roadLengthKm;
				} else {
					statsByType[emergencyRoadType].passableLength += roadLengthKm;
				}
			}

			features.push({
				type: 'Feature',
				geometry,
				properties: {
					...properties,
					emergencyRoadType: emergencyRoadType
				}
			});
		}

		// クリーンアップ
		await conn.query(`DROP TABLE IF EXISTS road_blockage_temp`);
		await conn.query(`DROP TABLE IF EXISTS emergency_roads_temp`);
		await conn.query(`DROP TABLE IF EXISTS blockage_geom`);
		await conn.query(`DROP TABLE IF EXISTS emergency_geom`);
		await conn.query(`DROP TABLE IF EXISTS joined_results`);

		console.log(`緊急輸送道路との結合完了: ${features.length}件の道路を処理`);
		console.log('種別ごとの統計:', statsByType);

		return { features, statsByType };
	} catch (error) {
		console.error('DuckDB emergency road join failed:', error);
		throw error;
	}
};

/**
 * 避難所周辺道路状況を評価する関数
 */
export const evaluateShelterAccessibility = async (
	conn: AsyncDuckDBConnection,
	shelters: Feature[],
	roadBlockageFeatures: Feature[],
	bufferDistanceMeters = 500
): Promise<{
	shelterAccessibility: Array<{
		shelterId: number;
		name: string;
		location: [number, number];
		totalRoadLength: number;
		passableRoadLength: number;
		accessibilityScore: number;
		status: 'good' | 'warning' | 'difficult';
	}>;
	summary: {
		good: number;
		warning: number;
		difficult: number;
	};
}> => {
	try {
		const bufferDegrees = bufferDistanceMeters / METERS_PER_DEGREE;

		// 1. 避難所テーブルを作成
		await conn.query(`DROP TABLE IF EXISTS shelters_temp`);
		await conn.query(`
      CREATE TEMP TABLE shelters_temp (
        shelter_id INTEGER,
        shelter_name VARCHAR,
        geom_json VARCHAR,
        lat DOUBLE,
        lon DOUBLE
      )
    `);

		const shelterInsertStmt = await conn.prepare(
			'INSERT INTO shelters_temp (shelter_id, shelter_name, geom_json, lat, lon) VALUES (?, ?, ?, ?, ?)'
		);
		try {
			for (let i = 0; i < shelters.length; i++) {
				const feature = shelters[i];
				const geom = feature.geometry;

				if (!geom || geom.type !== 'Point') continue;

				const name = feature.properties?.['名称'] || `避難所${i + 1}`;
				const coords = (geom as any).coordinates as [number, number];

				const geomJson = JSON.stringify(geom);
				await shelterInsertStmt.query(i + 1, name, geomJson, coords[1], coords[0]);
			}
		} finally {
			shelterInsertStmt.close();
		}

		// 2. 道路閉塞率データテーブルを作成
		await conn.query(`DROP TABLE IF EXISTS roads_blockage_temp`);
		await conn.query(`
      CREATE TEMP TABLE roads_blockage_temp (
        road_id INTEGER,
        geom_json VARCHAR,
        road_length_km DOUBLE,
        blockage_percent DOUBLE
      )
    `);

		const roadInsertStmt = await conn.prepare(
			'INSERT INTO roads_blockage_temp (road_id, geom_json, road_length_km, blockage_percent) VALUES (?, ?, ?, ?)'
		);
		try {
			for (let i = 0; i < roadBlockageFeatures.length; i++) {
				const feature = roadBlockageFeatures[i];
				const geom = feature.geometry;

				if (!geom || geom.type === 'GeometryCollection') continue;

				const roadLengthKm = feature.properties?.roadLengthKm || 0;
				const blockagePercent = feature.properties?.blockagePercent || 0;

				const fullGeometry = {
					type: geom.type,
					coordinates: (geom as Exclude<typeof geom, { type: 'GeometryCollection' }>).coordinates
				};

				const geomJson = JSON.stringify(fullGeometry);
				await roadInsertStmt.query(i + 1, geomJson, roadLengthKm, blockagePercent);
			}
		} finally {
			roadInsertStmt.close();
		}

		// 3. 避難所周辺の道路を集計
		await conn.query(`
      CREATE TEMP TABLE shelter_buffers AS
      SELECT
        shelter_id,
        shelter_name,
        lat,
        lon,
        ST_Buffer(ST_Point(lon, lat), ${bufferDegrees}) as buffer_geom
      FROM shelters_temp
    `);

		await conn.query(`
      CREATE TEMP TABLE shelter_road_stats AS
      SELECT
        sb.shelter_id,
        sb.shelter_name,
        sb.lat,
        sb.lon,
        SUM(rb.road_length_km) as total_road_length,
        SUM(CASE WHEN rb.blockage_percent < 50 THEN rb.road_length_km ELSE 0 END) as passable_road_length
      FROM shelter_buffers sb
      LEFT JOIN roads_blockage_temp rb ON ST_Intersects(sb.buffer_geom, ST_GeomFromGeoJSON(rb.geom_json))
      GROUP BY sb.shelter_id, sb.shelter_name, sb.lat, sb.lon
    `);

		// 4. アクセス性スコアを計算
		const result = await conn.query(`
      SELECT
        shelter_id,
        shelter_name,
        lat,
        lon,
        total_road_length,
        passable_road_length,
        CASE
          WHEN total_road_length > 0 THEN (passable_road_length / total_road_length * 100)
          ELSE 0
        END as accessibility_score
      FROM shelter_road_stats
      WHERE total_road_length > 0
      ORDER BY accessibility_score DESC
    `);

		// 5. 結果を集計
		const shelterAccessibility: Array<{
			shelterId: number;
			name: string;
			location: [number, number];
			totalRoadLength: number;
			passableRoadLength: number;
			accessibilityScore: number;
			status: 'good' | 'warning' | 'difficult';
		}> = [];

		const summary = {
			good: 0,
			warning: 0,
			difficult: 0
		};

		const rows = result.toArray() as Array<{
			shelter_id: number;
			shelter_name: string;
			lat: number;
			lon: number;
			total_road_length: number;
			passable_road_length: number;
			accessibility_score: number;
		}>;

		for (const row of rows) {
			const score = Number(row.accessibility_score);
			let status: 'good' | 'warning' | 'difficult';

			if (score >= 80) {
				status = 'good';
				summary.good++;
			} else if (score >= 50) {
				status = 'warning';
				summary.warning++;
			} else {
				status = 'difficult';
				summary.difficult++;
			}

			shelterAccessibility.push({
				shelterId: Number(row.shelter_id),
				name: row.shelter_name,
				location: [Number(row.lon), Number(row.lat)],
				totalRoadLength: Number(row.total_road_length),
				passableRoadLength: Number(row.passable_road_length),
				accessibilityScore: score,
				status
			});
		}

		// クリーンアップ
		await conn.query(`DROP TABLE IF EXISTS shelters_temp`);
		await conn.query(`DROP TABLE IF EXISTS roads_blockage_temp`);
		await conn.query(`DROP TABLE IF EXISTS shelter_buffers`);
		await conn.query(`DROP TABLE IF EXISTS shelter_road_stats`);

		console.log(`避難所アクセス性評価完了: ${shelterAccessibility.length}箇所`);
		console.log('アクセス性サマリー:', summary);

		return { shelterAccessibility, summary };
	} catch (error) {
		console.error('DuckDB shelter accessibility evaluation failed:', error);
		throw error;
	}
};
