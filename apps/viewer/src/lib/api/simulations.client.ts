/**
 * シミュレーション一覧取得・予約作成API（クライアント用 - サーバーサイドAPI経由）
 */

import type {
	SimulationListFilter,
	SimulationListSortOrder,
	SimulationListResponse
} from '../types/viewerInfo';
import type { SimulationData, SimulationReservation } from '../types/simulation';
import { AwsError, formatErrorMessage, logError } from '../utils/errors';
import { getMockSimulationListResponse } from '../mockData';

/**
 * デバッグモードかどうかを判定
 * - URLに?debug=trueがある
 * - または環境変数でデバッグモードが有効
 */
const isDebugMode = (): boolean => {
	if (typeof window !== 'undefined') {
		const params = new URLSearchParams(window.location.search);
		return params.get('debug') === 'true';
	}
	return false;
};

/**
 * シミュレーション一覧を取得（サーバーサイドAPI経由）
 * デバッグモード時またはAPIが失敗した場合はモックデータを返す
 *
 * @param filter フィルター条件
 * @param sortOrder ソート順（デフォルト: desc）
 * @param limit 取得件数（デフォルト: 100）
 * @param nextToken 次ページトークン（ページネーション用）
 * @returns シミュレーション一覧
 */
export const getSimulations = async (
	filter?: SimulationListFilter,
	sortOrder: SimulationListSortOrder = 'desc',
	limit = 100,
	nextToken?: string
): Promise<SimulationListResponse> => {
	// デバッグモードの場合はモックデータを返す
	if (isDebugMode()) {
		console.log('[DEBUG MODE] Using mock data');
		return getMockSimulationListResponse(limit, nextToken);
	}

	try {
		// クエリパラメータを構築
		const params = new URLSearchParams();
		params.set('limit', limit.toString());
		params.set('sortOrder', sortOrder);

		if (nextToken) params.set('nextToken', nextToken);
		if (filter?.status) params.set('status', filter.status);
		if (filter?.loginFilter) params.set('loginFilter', filter.loginFilter);
		if (filter?.keyword) params.set('keyword', filter.keyword);
		if (filter?.startDate) params.set('startDate', filter.startDate);
		if (filter?.endDate) params.set('endDate', filter.endDate);

		// サーバーサイドAPIを呼び出し
		const response = await fetch(`/api/simulations?${params.toString()}`);

		if (!response.ok) {
			throw new Error(`API request failed: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		return data as SimulationListResponse;
	} catch (error) {
		logError(error, 'getSimulations');
		console.warn('[API ERROR] Falling back to mock data', error);
		// APIエラー時はモックデータにフォールバック
		return getMockSimulationListResponse(limit, nextToken);
	}
};

/**
 * シミュレーション予約を作成
 * @param data - シミュレーションデータ
 * @returns シミュレーション予約情報
 */
export const createSimulationReservation = async (
	data: SimulationData & { userId: string; createdAt: Date }
): Promise<SimulationReservation> => {
	console.log('[Client] Creating simulation reservation with data:', data);

	const requestBody = {
		...data,
		createdAt: data.createdAt.toISOString()
	};
	console.log('[Client] Request body:', JSON.stringify(requestBody, null, 2));

	const response = await fetch('/api/simulations', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(requestBody)
	});

	console.log('[Client] Response status:', response.status);

	if (!response.ok) {
		const error = await response.json();
		console.error('[Client] Error response:', error);
		throw new Error(
			error.error || `Failed to create simulation reservation: ${response.statusText}`
		);
	}

	const result = await response.json();
	console.log('[Client] Success response:', result);
	return result;
};
