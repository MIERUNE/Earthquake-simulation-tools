/**
 * 地域データの型定義
 * 都道府県・市区町村・メッシュコードデータの構造を定義
 */

/**
 * 都道府県
 */
export interface Prefecture {
	/** 都道府県ID（例: 'hokkaido', 'tokyo'） */
	id: string;

	/** 都道府県名（例: '北海道', '東京都'） */
	name: string;

	/** 地方区分（例: '北海道', '関東', '中部'） */
	region: string;

	/** JIS都道府県コード（2桁） */
	code?: string;
}

/**
 * 市区町村
 */
export interface Municipality {
	/** 市区町村ID */
	id: string;

	/** 市区町村名（例: '札幌市', '千代田区'） */
	name: string;

	/** 都道府県ID */
	prefectureId: string;

	/** JIS市区町村コード（5桁） */
	code?: string;

	/** 緯度経度（中心座標） */
	center?: {
		lat: number;
		lng: number;
	};

	/** Plateauデータの有無 */
	hasPlateauData: boolean;
}

/**
 * メッシュコード
 */
export interface MeshCode {
	/** メッシュコード */
	code: string;

	/** 地域名（例: '静岡市葵区'） */
	regionName: string;

	/** 緯度経度（中心座標） */
	center?: {
		lat: number;
		lng: number;
	};

	/** 境界ボックス */
	bounds?: {
		north: number;
		south: number;
		east: number;
		west: number;
	};
}

/**
 * プリセット情報（DynamoDBから取得）
 */
export interface PresetInfo {
	id: string;
	userId: string;
	type: string;
	job: string;
	regionName: string;
	presetName: string;
	meshCode: string[];
	gmlFilePath?: string;
	wideLongPeriodParamFilePath?: string;
	wideNormalParamFilePath?: string;
	wideDirectlyParamFilePath?: string;
	narrowAnalysisModelFilePath?: string;
	narrowParamFilePath?: string;
	narrowForceParamFilePath?: string;
	narrowCalcParamFilePath?: string;
	additionalInfo?: string;
	createDateTime?: number;
}

/**
 * 地域選択状態
 */
export interface RegionSelection {
	prefecture?: Prefecture;
	municipality?: Municipality;
	meshCodes?: string[];
}

/**
 * APIレスポンス型
 */
export interface PrefecturesResponse {
	prefectures: Prefecture[];
}

export interface MunicipalitiesResponse {
	municipalities: Municipality[];
}

export interface MeshCodesResponse {
	meshCodes: MeshCode[];
	totalCount: number;
}

export interface PresetsResponse {
	presets: PresetInfo[];
	totalCount: number;
}
