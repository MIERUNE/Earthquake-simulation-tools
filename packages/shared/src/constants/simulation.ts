/**
 * シミュレーション関連の定数と列挙型
 */

export const TYPE_WIDE = 'wide';
export const TYPE_NARROW = 'narrow';
export const JOB_AREA = 'job1';
export const JOB_EARTHQUAKE = 'job2';
export const JOB_BUILDING = 'job3';
export const JOB_ANALYSIS_MODEL = 'job4';

/**
 * シミュレーションタイプ
 */
export enum SimulationType {
	/** 広域 */
	Wide = TYPE_WIDE,
	/** 狭域 */
	Narrow = TYPE_NARROW
}

/**
 * ジョブタイプ
 */
export enum JobType {
	/** 地域 */
	Area = JOB_AREA,
	/** 地震動 */
	Earthquake = JOB_EARTHQUAKE,
	/** 建物 */
	Building = JOB_BUILDING,
	/** 解析モデル */
	Analysis_model = JOB_ANALYSIS_MODEL
}

/**
 * シミュレーションステータス
 */
export enum SimulationStatus {
	/** 計算予約 */
	reservation = '0',
	/** 計算開始 */
	start = '1',
	/** 計算完了 */
	complete = '2',
	/** 計算エラー */
	error = '3',
	/** 可視化加工処理開始 */
	visualizationStart = '4',
	/** 可視化加工処理完了 */
	visualizationComplete = '5',
	/** 可視化加工処理エラー */
	visualizationError = '6'
}