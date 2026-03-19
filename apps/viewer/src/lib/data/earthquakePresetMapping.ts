/**
 * 地震動プリセットIDとCSVファイルのマッピング
 */

export const EARTHQUAKE_PRESET_CSV_MAPPING: Record<string, string> = {
	'bf82e220-e2ba-43b5-aafa-abdb180d7b0c': 'WAV073_K-TOHOKU.csv', // 東北 震度6弱
	'65d8c5af-4fb0-40c9-a9bc-5d88ba172008': 'WAV078_K-HAC_234sec.csv', // 能登 震度6強
	'a32c23fc-0361-457a-a0fc-7c7459dbad81': 'WAV075_K-KOBE.csv' // 神戸 震度7
};

/**
 * プリセットIDからCSVファイル名を取得
 * @param presetId プリセットID
 * @returns CSVファイル名（見つからない場合はデフォルトのWAV073_K-TOHOKU.csv）
 */
export const getCsvFileNameForPreset = (presetId: string): string => {
	return EARTHQUAKE_PRESET_CSV_MAPPING[presetId] || 'WAV073_K-TOHOKU.csv';
};
