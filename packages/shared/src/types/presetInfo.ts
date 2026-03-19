/**
 * プリセット情報の型定義
 */
export interface PresetInfo {
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
}