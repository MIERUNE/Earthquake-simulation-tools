/**
 * マスター名称を取得する関数
 */

import { SimulationType, JobType, SimulationStatus } from '../constants/simulation';

const SIMULATION_TYPE = [
	{
		id: SimulationType.Wide,
		name: '広域'
	},
	{
		id: SimulationType.Narrow,
		name: '個別建物'
	}
];

const JOB_TYPE = [
	{
		id: JobType.Area,
		name: '地域'
	},
	{
		id: JobType.Earthquake,
		name: '地震動'
	},
	{
		id: JobType.Building,
		name: '建物'
	},
	{
		id: JobType.Analysis_model,
		name: '解析モデル'
	}
];

const SIMULATION_STATUS = [
	{
		id: SimulationStatus.reservation,
		name: '計算予約'
	},
	{
		id: SimulationStatus.start,
		name: '計算開始'
	},
	{
		id: SimulationStatus.complete,
		name: '計算完了'
	},
	{
		id: SimulationStatus.error,
		name: '計算エラー'
	},
	{
		id: SimulationStatus.visualizationStart,
		name: '可視化加工処理開始'
	},
	{
		id: SimulationStatus.visualizationComplete,
		name: '可視化加工処理完了'
	},
	{
		id: SimulationStatus.visualizationError,
		name: '可視化加工処理エラー'
	}
];

/**
 * シミュレーションタイプ名を取得
 */
export const getSimulationTypeName = (id: string): string | null => {
	const type = SIMULATION_TYPE.find((t) => t.id === id);
	return type ? type.name : null;
};

/**
 * ジョブタイプ名を取得
 */
export const getJobTypeName = (id: string): string | null => {
	const type = JOB_TYPE.find((t) => t.id === id);
	return type ? type.name : null;
};

/**
 * シミュレーションステータス名を取得
 */
export const getSimulationStatusName = (id: string): string | null => {
	const type = SIMULATION_STATUS.find((t) => t.id === id);
	return type ? type.name : null;
};