/**
 * シミュレーション予約情報の型定義
 */
export interface SimulationReserve {
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
}

/**
 * シミュレーションAPI応答の型定義
 */
export interface SimulationApiResponse {
	uuid?: string;
	status?: string;
	message?: string;
	outputPath?: string;
	[key: string]: any;
}