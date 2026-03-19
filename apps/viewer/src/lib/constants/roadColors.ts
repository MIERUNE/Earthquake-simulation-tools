/**
 * 道路関連の色定義定数
 *
 * アプリケーション全体で統一された色を使用するための定数定義
 */

// RGB色の型定義
export type RGBColor = [number, number, number];
export type RGBAColor = [number, number, number, number];

/**
 * 道路閉塞率に基づく色定義
 */
export const ROAD_BLOCKAGE_COLORS = {
	PASSABLE: [59, 130, 246, 200] as RGBAColor, // 青 (#3B82F6): 通行可能 (0-10%)
	WARNING: [245, 158, 11, 200] as RGBAColor, // オレンジ (#F59E0B): 要注意 (11-50%)
	DIFFICULT: [239, 68, 68, 200] as RGBAColor, // 赤 (#EF4444): 通行困難 (51-100%)
	DEFAULT: [128, 128, 128, 180] as RGBAColor // 灰色: デフォルト
};

/**
 * 避難所周辺道路状況に基づく色定義
 */
export const SHELTER_COLORS = {
	GOOD: [16, 185, 129, 220] as RGBAColor, // 緑 (#10B981): アクセス良好
	WARNING: [245, 158, 11, 220] as RGBAColor, // オレンジ (#F59E0B): 要注意
	DIFFICULT: [239, 68, 68, 220] as RGBAColor, // 赤 (#EF4444): アクセス困難
	DEFAULT: [128, 128, 128, 200] as RGBAColor // 灰色: 評価前
};

/**
 * 緊急輸送道路種別ごとの色定義（Deck.gl用：RGBA）
 * キー: N10_002の値（'1', '2', '3'）
 */
export const EMERGENCY_ROAD_COLORS_RGBA: Record<string, RGBAColor> = {
	'1': [147, 51, 234, 220] as RGBAColor, // 第1次: 濃い紫 (#9333EA) - 最重要
	'2': [236, 72, 153, 220] as RGBAColor, // 第2次: ピンク (#EC4899) - 重要
	'3': [6, 182, 212, 220] as RGBAColor // 第3次: シアン (#06B6D4) - 準重要
};

/**
 * 緊急輸送道路種別ごとの色定義（Chart.js用：HEX）
 * キー: N10_002の値（'1', '2', '3'）
 */
export const EMERGENCY_ROAD_COLORS_HEX: Record<string, string> = {
	'1': '#9333EA', // 第1次: 濃い紫 - 最重要
	'2': '#EC4899', // 第2次: ピンク - 重要
	'3': '#06B6D4' // 第3次: シアン - 準重要
};

/**
 * 緊急輸送道路種別の定義
 */
export const EMERGENCY_ROAD_TYPES = {
	'1': { label: '第1次緊急輸送道路', color: EMERGENCY_ROAD_COLORS_HEX['1'] },
	'2': { label: '第2次緊急輸送道路', color: EMERGENCY_ROAD_COLORS_HEX['2'] },
	'3': { label: '第3次緊急輸送道路', color: EMERGENCY_ROAD_COLORS_HEX['3'] }
};

/**
 * RGB配列をHEX文字列に変換
 */
export const rgbToHex = (rgb: RGBColor): string => {
	const [r, g, b] = rgb;
	return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
};

/**
 * HEX文字列をRGB配列に変換
 */
export const hexToRgb = (hex: string): RGBColor | null => {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
		: null;
};
