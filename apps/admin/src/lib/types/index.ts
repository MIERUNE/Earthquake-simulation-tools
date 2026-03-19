import type { SimulationApiResponse } from '$lib/client/simulationApi';

type PresetInfo = {
	id: string;
	userId: string;
	type: string;
	job: string;
	regionName: string;
	presetName: string;
	meshCode: string[];
	gmlFilePath: string;
	wideLongPeriodParamFilePath: string;
	wideNormalParamFilePath: string;
	wideDirectlyParamFilePath: string;
	narrowAnalysisModelFilePath: string;
	narrowParamFilePath: string;
	narrowForceParamFilePath: string;
	narrowCalcParamFilePath: string;
	additionalInfo: string;
	createDateTime: number;
};

type SimulationReserve = {
	id: string;
	userId: string;
	type: string;
	regionName: string;
	paramName: string;
	status: string;
	createDateTime: number;
	updatedDateTime?: number;
	uuid?: string; // API応答のUUID
	outputPath?: string; // シミュレーション結果の出力パス
	dppPath?: string; // DPPファイルの保存パス
	csvPath?: string; // CSVファイルの保存パス
	jobId?: string; // AWS BatchジョブID
	jobArn?: string; // AWS BatchジョブARN
	logUrl?: string; // APIログURL
	apiResponse?: SimulationApiResponse;
	lastUpdated?: number; // 最終更新時刻
	executionStartTime?: number;
	completionTime?: number;
	completedAt?: number; // 完了時刻
	failedTime?: number;
	error?: string;
	statusMessage?: string; // ステータスメッセージ
	outputDir?: string;
};

type AnyRecord<T> = Record<string, T>;

export type { PresetInfo, SimulationReserve, AnyRecord };