// マスター名称を取得する関数
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

const SIMULATION_TYPE = [
	{
		id: TYPE_WIDE,
		name: '広域'
	},
	{
		id: TYPE_NARROW,
		name: '個別建物'
	}
];
const JOB_TYPE = [
	{
		id: JOB_AREA,
		name: '地域'
	},
	{
		id: JOB_EARTHQUAKE,
		name: '地震動'
	},
	{
		id: JOB_BUILDING,
		name: '建物'
	},
	{
		id: JOB_ANALYSIS_MODEL,
		name: '解析モデル'
	}
];
const SIMULATION_STATUS = [
	{
		id: SimulationStatus.reservation,
		name: '計算予約' // reservation
	},
	{
		id: SimulationStatus.start,
		name: '計算開始' // start
	},
	{
		id: SimulationStatus.complete,
		name: '計算完了' // complete
	},
	{
		id: SimulationStatus.error,
		name: '計算エラー' // error
	},
	{
		id: SimulationStatus.visualizationStart,
		name: '可視化加工処理開始' // visualizationStart
	},
	{
		id: SimulationStatus.visualizationComplete,
		name: '可視化加工処理完了' // visualizationComplete
	},
	{
		id: SimulationStatus.visualizationError,
		name: '可視化加工処理エラー' // visualizationError
	}
];

const getSimulationTypeName = (id: string) => {
	// idが存在しなかったらnullを返す
	const type = SIMULATION_TYPE.find((t) => t.id === id);
	return type ? type.name : null;
};

const getJobTypeName = (id: string) => {
	const type = JOB_TYPE.find((t) => t.id === id);
	return type ? type.name : null;
};

const getSimulationStatusName = (id: string) => {
	const type = SIMULATION_STATUS.find((t) => t.id === id);
	return type ? type.name : null;
};

export { getSimulationTypeName, getJobTypeName, getSimulationStatusName };