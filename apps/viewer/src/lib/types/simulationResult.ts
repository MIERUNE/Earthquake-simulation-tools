/**
 * シミュレーション結果データの型定義
 * S3から取得したシミュレーション結果の構造を定義
 */

/**
 * 建物データ（GeoJSON Feature）
 */
export interface BuildingFeature {
	type: 'Feature';
	geometry: {
		type: 'Point';
		coordinates: [number, number]; // [lng, lat]
	};
	properties: {
		id: string;
		name?: string;
		buildingType: 'residential' | 'commercial' | 'public' | 'industrial';
		damageLevel: 0 | 1 | 2 | 3 | 4;
		floors?: number;
		area?: number;
		estimatedLoss?: number;
		district?: string;
		districtName?: string;
		[key: string]: unknown;
	};
}

/**
 * 建物GeoJSONコレクション
 */
export interface BuildingGeoJSON {
	type: 'FeatureCollection';
	features: BuildingFeature[];
}

/**
 * 道路閉塞データ（GeoJSON Feature）
 */
export interface RoadFeature {
	type: 'Feature';
	geometry: {
		type: 'LineString';
		coordinates: Array<[number, number]>; // [[lng, lat], ...]
	};
	properties: {
		id: string;
		name?: string;
		roadType?: string;
		isBlocked: boolean;
		blockageRate?: number;
		width?: number;
		district?: string;
		[key: string]: unknown;
	};
}

/**
 * 道路GeoJSONコレクション
 */
export interface RoadGeoJSON {
	type: 'FeatureCollection';
	features: RoadFeature[];
}

/**
 * メッシュデータ（GeoJSON Feature）
 */
export interface MeshFeature {
	type: 'Feature';
	geometry: {
		type: 'Polygon';
		coordinates: Array<Array<[number, number]>>; // [[[lng, lat], ...]]
	};
	properties: {
		meshCode: string;
		pga?: number; // 最大地動加速度
		pgv?: number; // 最大地動速度
		intensity?: number; // 震度
		[key: string]: unknown;
	};
}

/**
 * メッシュGeoJSONコレクション
 */
export interface MeshGeoJSON {
	type: 'FeatureCollection';
	features: MeshFeature[];
}

/**
 * シミュレーション結果全体
 */
export interface SimulationResult {
	/** シミュレーションID */
	id: string;

	/** 建物被害データ */
	buildings?: BuildingGeoJSON;

	/** 道路閉塞データ */
	roads?: RoadGeoJSON;

	/** メッシュデータ */
	meshes?: MeshGeoJSON;

	/** メタデータ */
	metadata?: {
		simulationDate?: string;
		earthquakeParameters?: {
			magnitude?: number;
			epicenter?: [number, number];
			depth?: number;
		};
		region?: string;
		[key: string]: unknown;
	};
}

/**
 * S3からの取得レスポンス
 */
export interface SimulationResultResponse {
	success: boolean;
	data?: SimulationResult;
	error?: string;
}
