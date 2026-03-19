/**
 * 日時関連のユーティリティ関数
 */

/**
 * 日付を文字列に変換する関数
 * @param timestamp - エポック秒
 * @returns "YYYY/MM/DD HH:mm:ss" 形式の文字列
 */
export const unixTimestampToString = (timestamp: number): string => {
	const date = new Date(timestamp * 1000); // エポック秒をミリ秒に変換
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');
	// "YYYY/MM/DD HH:mm:ss" の形式で返す
	return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * ミリ秒単位のタイムスタンプをUNIXタイムスタンプ（秒）に変換する関数
 * @param datetimeNumber - ミリ秒単位のタイムスタンプ
 * @returns 秒単位のUNIXタイムスタンプ
 * @throws {Error} 負数または無効な入力値の場合
 */
export const getUnixTimestamp = (datetimeNumber: number): number => {
	if (isNaN(datetimeNumber) || datetimeNumber < 0) {
		throw new Error('Invalid timestamp value');
	}
	return Math.floor(datetimeNumber / 1000);
};