import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';

/**
 * DuckDBで直接MVTタイルを読み込んで建物データを取得する
 * @param conn DuckDB接続
 * @param tileUrls MVTタイルのURL配列
 * @param bounds 対象範囲のバウンディングボックス
 * @returns 建物フィーチャーの配列
 */
export const loadMVTTilesDirectly = async (
  conn: AsyncDuckDBConnection,
  tileUrls: string[],
  bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number }
) => {
  try {
    console.log('[MVT DuckDB] MVTタイルの直接読み込みを開始');
    console.log('[MVT DuckDB] タイル数:', tileUrls.length);
    console.log('[MVT DuckDB] 対象範囲:', bounds);

    // HTTPFSとSpatialエクステンションを有効化
    await conn.query(`INSTALL httpfs IF NOT EXISTS`);
    await conn.query(`LOAD httpfs`);
    await conn.query(`INSTALL spatial IF NOT EXISTS`);
    await conn.query(`LOAD spatial`);

    // S3アクセス用の設定（必要に応じて）
    await conn.query(`SET s3_region='ap-northeast-1'`);

    const allFeatures = [];

    // 各タイルURLからデータを読み込み
    for (const tileUrl of tileUrls) {
      try {
        console.log('[MVT DuckDB] タイル読み込み中:', tileUrl);

        // MVTタイルからデータを読み込み、範囲内のフィーチャーのみ取得
        const result = await conn.query(`
          WITH mvt_data AS (
            SELECT
              ST_AsGeoJSON(geometry)::JSON as geom_json,
              properties
            FROM ST_Read('${tileUrl}')
          ),
          filtered AS (
            SELECT
              geom_json,
              properties,
              ST_XMin(ST_GeomFromGeoJSON(geom_json::VARCHAR)) as min_lng,
              ST_XMax(ST_GeomFromGeoJSON(geom_json::VARCHAR)) as max_lng,
              ST_YMin(ST_GeomFromGeoJSON(geom_json::VARCHAR)) as min_lat,
              ST_YMax(ST_GeomFromGeoJSON(geom_json::VARCHAR)) as max_lat
            FROM mvt_data
          )
          SELECT
            geom_json,
            properties
          FROM filtered
          WHERE
            min_lng <= ${bounds.maxLng} AND
            max_lng >= ${bounds.minLng} AND
            min_lat <= ${bounds.maxLat} AND
            max_lat >= ${bounds.minLat}
        `);

        const features = result.toArray().map((row: any) => ({
          type: 'Feature',
          geometry: row.geom_json,
          properties: row.properties
        }));

        console.log(`[MVT DuckDB] タイルから${features.length}件のフィーチャーを取得`);
        allFeatures.push(...features);

      } catch (error) {
        console.error('[MVT DuckDB] タイル読み込みエラー:', tileUrl, error);
        // エラーが発生しても続行
      }
    }

    console.log(`[MVT DuckDB] 合計${allFeatures.length}件のフィーチャーを取得`);
    return allFeatures;

  } catch (error) {
    console.error('[MVT DuckDB] MVT読み込みエラー:', error);

    // フォールバック: ST_Readが使えない場合は通常のHTTP読み込みを試行
    console.log('[MVT DuckDB] フォールバック処理を試行中...');

    try {
      // HTTPでタイルをバイナリとして取得して処理
      // （この部分は実装が複雑なため、別途検討が必要）
      return [];
    } catch (fallbackError) {
      console.error('[MVT DuckDB] フォールバックも失敗:', fallbackError);
      return [];
    }
  }
};

/**
 * タイルのズームレベルとバウンディングボックスから必要なタイルURLを生成
 */
export const generateTileUrls = (
  baseUrl: string,
  bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number },
  zoom: number = 14
): string[] => {
  const urls: string[] = [];

  // 緯度経度からタイル座標を計算
  const latToTile = (lat: number, z: number) => {
    return Math.floor(
      ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, z)
    );
  };

  const lngToTile = (lng: number, z: number) => {
    return Math.floor(((lng + 180) / 360) * Math.pow(2, z));
  };

  const minX = lngToTile(bounds.minLng, zoom);
  const maxX = lngToTile(bounds.maxLng, zoom);
  const minY = latToTile(bounds.maxLat, zoom);
  const maxY = latToTile(bounds.minLat, zoom);

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const url = baseUrl
        .replace('{z}', zoom.toString())
        .replace('{x}', x.toString())
        .replace('{y}', y.toString());
      urls.push(url);
    }
  }

  console.log(`[MVT DuckDB] 生成したタイルURL数: ${urls.length}`);
  return urls;
};