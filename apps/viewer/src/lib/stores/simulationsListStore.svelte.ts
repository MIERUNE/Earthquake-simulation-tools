/**
 * シミュレーション一覧管理Store
 * Svelte 5のrunesを使用した状態管理
 */

import { getSimulations } from '../api/simulations.client';
import type {
	ViewerInfoItem,
	SimulationListFilter,
	SimulationListSortOrder
} from '../types/viewerInfo';
import { withErrorHandling } from '../utils/errors';

/**
 * DynamoDB取得時の最大件数
 */
const DEFAULT_FETCH_LIMIT = 100;

/**
 * シミュレーション一覧の状態
 */
interface SimulationsListState {
	/** シミュレーション一覧（全データ） */
	allSimulations: ViewerInfoItem[];

	/** フィルター後のシミュレーション一覧 */
	filteredSimulations: ViewerInfoItem[];

	/** 現在表示中のシミュレーション一覧（ページネーション後） */
	displayedSimulations: ViewerInfoItem[];

	/** ローディング状態 */
	isLoading: boolean;

	/** エラーメッセージ */
	error: string | null;

	/** 現在のページ番号 */
	currentPage: number;

	/** 1ページあたりの件数 */
	itemsPerPage: number;

	/** ソート順 */
	sortOrder: SimulationListSortOrder;

	/** フィルター条件 */
	filter: SimulationListFilter;

	/** 次ページトークン */
	nextToken?: string;
}

/**
 * シミュレーション一覧ストアクラス
 */
class SimulationsListStore {
	private state = $state<SimulationsListState>({
		allSimulations: [],
		filteredSimulations: [],
		displayedSimulations: [],
		isLoading: false,
		error: null,
		currentPage: 1,
		itemsPerPage: 10,
		sortOrder: 'desc',
		filter: {},
		nextToken: undefined
	});

	/**
	 * 状態を取得（読み取り専用）
	 */
	get allSimulations(): ViewerInfoItem[] {
		return this.state.allSimulations;
	}

	get filteredSimulations(): ViewerInfoItem[] {
		return this.state.filteredSimulations;
	}

	get displayedSimulations(): ViewerInfoItem[] {
		return this.state.displayedSimulations;
	}

	get isLoading(): boolean {
		return this.state.isLoading;
	}

	get error(): string | null {
		return this.state.error;
	}

	get currentPage(): number {
		return this.state.currentPage;
	}

	get itemsPerPage(): number {
		return this.state.itemsPerPage;
	}

	get sortOrder(): SimulationListSortOrder {
		return this.state.sortOrder;
	}

	get filter(): SimulationListFilter {
		return this.state.filter;
	}

	/**
	 * 総ページ数を計算
	 */
	get totalPages(): number {
		return Math.ceil(this.state.filteredSimulations.length / this.state.itemsPerPage);
	}

	/**
	 * シミュレーション一覧をDynamoDBから取得
	 */
	async fetchSimulations(): Promise<void> {
		this.state.isLoading = true;
		this.state.error = null;

		const result = await withErrorHandling(
			async () => {
				const response = await getSimulations(
					this.state.filter,
					this.state.sortOrder,
					DEFAULT_FETCH_LIMIT,
					this.state.nextToken
				);

				this.state.allSimulations = response.items;
				this.state.filteredSimulations = response.items;
				this.state.nextToken = response.nextToken;

				// 初回表示を更新
				this.updateDisplayedSimulations();

				return { success: true };
			},
			'SimulationsListStore.fetchSimulations'
		);

		this.state.isLoading = false;

		if (result.error) {
			this.state.error = result.error;
		}
	}

	/**
	 * フィルター条件を更新して再取得
	 */
	async applyFilter(filter: SimulationListFilter): Promise<void> {
		this.state.filter = filter;
		this.state.currentPage = 1; // フィルター適用時は1ページ目に戻る
		await this.fetchSimulations();
	}

	/**
	 * ソート順を変更
	 */
	async setSortOrder(sortOrder: SimulationListSortOrder): Promise<void> {
		this.state.sortOrder = sortOrder;
		await this.fetchSimulations();
	}

	/**
	 * ページ番号を変更
	 */
	setPage(page: number): void {
		if (page < 1 || page > this.totalPages) {
			return;
		}
		this.state.currentPage = page;
		this.updateDisplayedSimulations();
	}

	/**
	 * 1ページあたりの件数を変更
	 */
	setItemsPerPage(itemsPerPage: number): void {
		this.state.itemsPerPage = itemsPerPage;
		this.state.currentPage = 1; // 件数変更時は1ページ目に戻る
		this.updateDisplayedSimulations();
	}

	/**
	 * 表示するシミュレーション一覧を更新（ページネーション）
	 */
	private updateDisplayedSimulations(): void {
		const start = (this.state.currentPage - 1) * this.state.itemsPerPage;
		const end = start + this.state.itemsPerPage;
		this.state.displayedSimulations = this.state.filteredSimulations.slice(start, end);
	}

	/**
	 * エラーをクリア
	 */
	clearError(): void {
		this.state.error = null;
	}

	/**
	 * 全データをリセット
	 */
	reset(): void {
		this.state = {
			allSimulations: [],
			filteredSimulations: [],
			displayedSimulations: [],
			isLoading: false,
			error: null,
			currentPage: 1,
			itemsPerPage: 10,
			sortOrder: 'desc',
			filter: {},
			nextToken: undefined
		};
	}
}

// シングルトンインスタンスをエクスポート
export const simulationsListStore = new SimulationsListStore();
