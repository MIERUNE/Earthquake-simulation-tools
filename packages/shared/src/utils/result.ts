/**
 * Result型 - エラーハンドリング用の型定義
 * Ok は成功時の値を、Err はエラー時の値を保持する
 */

/**
 * Result 型
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