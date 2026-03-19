import * as R from 'ramda';
import { getSimulationStatusName } from './getName';
import type { UpdateCommandInput } from '@aws-sdk/lib-dynamodb';
import type { AnyRecord } from '@mosiri/shared';

// Result 型の定義
/**
 * Result 型
 * Ok は成功時の値を、Err はエラー時の値を保持する
 * @template T - Ok の値の型
 * @template E - Err の値の型
 * @example
 * const result: Result<number, string> = ok(10);
 * if (result.isOk()) {
 *  console.log(result.value); // 10
 * } else {
 * console.error(result.error);
 * }
 */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Ok 型の定義
 * @template T - Ok の値の型
 * @example
 * const result: Ok<number> = new Ok(10);
 *
 */
export class Ok<T> {
	readonly value: T;

	constructor(value: T) {
		this.value = value;
	}

	isOk(): this is Ok<T> {
		return true;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	isErr(): this is Err<any> {
		return false;
	}
}

/**
 * Err 型の定義
 * @template E - Err の値の型
 * @example
 * const result: Err<string> = new Err("error");
 */
export class Err<E> {
	readonly error: E;

	constructor(error: E) {
		this.error = error;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	isOk(): this is Ok<any> {
		return false;
	}

	isErr(): this is Err<E> {
		return true;
	}
}

// ユーティリティ関数
/**
 * Ok を返す関数
 * @param value - Ok の値
 * @returns Result<T, E>
 * @example
 * const result = ok(10);
 */
export const ok = <T, E>(value: T): Result<T, E> => new Ok<T>(value);
/**
 * Err を返す関数
 * @param error - Err の値
 * @returns Result<T, E>
 * @example
 * const result = err("error");
 */
export const err = <T, E>(error: E): Result<T, E> => new Err<E>(error);

/**
 *  日付を文字列に変換する関数
 *
 * @param timestamp - エポック秒
 * @returns "YYYY/MM/DD HH:mm:ss" 形式の文字列
 */
export const unixTimestampToString = (timestamp: number) => {
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
 *
 * @param datetimeNumber - ミリ秒単位のタイムスタンプ
 * @returns 秒単位のUNIXタイムスタンプ
 * @throws {Error} 負数または無効な入力値の場合
 */
export const getUnixTimestamp = (datetimeNumber: number) => {
	if (isNaN(datetimeNumber) || datetimeNumber < 0) {
		throw new Error('Invalid timestamp value');
	}
	return Math.floor(datetimeNumber / 1000);
};

/**
 * シミュレーションステータスを取得する関数
 *
 * @param calcStatusId - ステータスID
 * @returns ステータス名
 */
export const getCalcStatus = (calcStatusId: number): string => {
	return getSimulationStatusName(calcStatusId.toString()) || 'Unknown status';
};

/**
 * ダイナミックフォームを送信する関数
 *
 * @param actionName - post先のURL
 * @param fields - 送信するフィールド { "key": "value" }
 * @returns Promise<void>
 */
export const submitDynamicForm = async (
	actionName: string,
	fields: { [key: string]: string }
): Promise<void> => {
	const form = document.createElement('form');
	form.method = 'POST';

	const encodedActionName = encodeURIComponent(actionName);
	form.action = `?${encodedActionName}`;

	Object.keys(fields).forEach((key) => {
		const input = document.createElement('input');
		input.type = 'hidden';
		input.name = key;
		input.value = fields[key as keyof typeof fields];
		form.appendChild(input);
	});
	document.body.appendChild(form);
	await form.submit();
	document.body.removeChild(form);
};

/**
 * アップデートリクエストを生成
 * @param tableName
 * @param key
 * @param fields
 * @param values
 * @returns UpdateCommandInput
 * @example
 * 使用例
 * const tableName = "preset_info";
 * const key = { id: "12345" };
 * const fields = ["additionalInfo", "narrowParamFilePath"];
 * const values = { additionalInfo: "UpdatedName", narrowParamFilePath: 25 };
 * const updateRequest = createUpdateRequest(tableName, key, fields, values);
 * 出力:
 * {
 *   TableName: 'preset_info',
 *   Key: { id: '12345' },
 *   UpdateExpression: 'SET #additionalInfo = :additionalInfo, #narrowParamFilePath = :narrowParamFilePath',
 *   ExpressionAttributeNames: {
 * 	   '#additionalInfo': 'additionalInfo',
 * 	   '#narrowParamFilePath': 'narrowParamFilePath'
 *   },
 *   ExpressionAttributeValues: {
 * 	    ':additionalInfo': 'UpdatedName',
 * 	    ':narrowParamFilePath': 25
 *   },
 *   ReturnValues: 'UPDATED_NEW'
 * }
 */
export const createUpdateRequest = <T>(
	tableName: string,
	key: Record<string, string>,
	fields: string[],
	values: AnyRecord<T>
): UpdateCommandInput => {
	// DynamoDB UpdateItem リクエストオブジェクト
	return {
		TableName: tableName,
		Key: key,
		UpdateExpression: createUpdateExpression(fields),
		ExpressionAttributeNames: createExpressionAttributeNames(fields),
		ExpressionAttributeValues: createExpressionAttributeValues(values),
		ReturnValues: 'UPDATED_NEW'
	};
};

/**
 * DynamoDB の UpdateExpression を生成
 * @param names フィールド名の配列 (ExpressionAttributeNames 用)
 * @param values フィールド名と値のオブジェクト (ExpressionAttributeValues 用)
 * @returns DynamoDB 用の UpdateExpression
 * @example 出力: 'SET #additionalInfo = :additionalInfo, #narrowParamFilePath = :narrowParamFilePath'
 */
const createUpdateExpression = (names: string[]): string => {
	const updateExpressions = names.map((field) => `#${field} = :${field}`);
	return `SET ${updateExpressions.join(', ')}`;
};

/**
 * 指定したフィールド名の配列をもとに、ExpressionAttributeNames オブジェクトを作成
 * @param fields フィールド名の配列
 * @returns Key-Value オブジェクト (ExpressionAttributeNames)
 * @example 出力: { '#additionalInfo': 'additionalInfo', '#narrowParamFilePath': 'narrowParamFilePath' }
 */
const createExpressionAttributeNames = (fields: string[]): Record<string, string> => {
	return R.fromPairs(fields.map((field) => [`#${field}`, field]));
};

/**
 * ExpressionAttributeValues を生成
 * @param values キーと値のオブジェクト
 * @returns DynamoDB 用の ExpressionAttributeValues オブジェクト
 * @example 出力: { ':additionalInfo': 'additionalInfo', ':narrowParamFilePath': 'narrowParamFilePath' }
 */
const createExpressionAttributeValues = <T>(values: AnyRecord<T>): Record<string, string> => {
	return R.fromPairs(
		R.toPairs(values).map(([key, value]) => [`:${String(key)}`, String(value)])
	) as Record<string, string>;
};

/**
 * ExpressionAttributeNames と ExpressionAttributeValues を生成
 * @param names フィールド名の配列 (ExpressionAttributeNames 用)
 * @param values フィールド名と値のオブジェクト (ExpressionAttributeValues 用)
 * @returns ExpressionAttributeNames と ExpressionAttributeValues を含むオブジェクト
 * @example
 *出力:
 * ExpressionAttributeNames: {
 *   '#additionalInfo': 'additionalInfo',
 *   '#narrowParamFilePath': 'narrowParamFilePath'
 * },
 * ExpressionAttributeValues: {
 *   ':additionalInfo': 'additionalInfo',
 *   ':narrowParamFilePath': 'narrowParamFilePath'
 * }
 */

// const createExpressionAttributes = (
// 	names: string[],
// 	values: AnyRecord<string>
// ): {
// 	ExpressionAttributeNames: Record<string, string>;
// 	ExpressionAttributeValues: AnyRecord<string>;
// } => {
// 	return {
// 		ExpressionAttributeNames: createExpressionAttributeNames(names),
// 		ExpressionAttributeValues: createExpressionAttributeValues(values)
// 	};
// };