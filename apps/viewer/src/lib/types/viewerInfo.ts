/**
 * DynamoDB viewer_infoテーブルの型定義
 * シミュレーション結果の一覧表示用データ
 */

/**
 * シミュレーション一覧アイテム（DynamoDBから取得）
 */
export interface ViewerInfoItem {
	/** シミュレーションID (PK) */
	id: string;

	/** 地域名 */
	region: string;

	/** 市区町村コード（オプショナル） */
	cityCode?: string;

	/** 地震パラメータ（表示用文字列） */
	parameter: string;

	/** シミュレーション実行日時 */
	datetime: string;

	/** ログイン要否 */
	requiresLogin: boolean;

	/** ステータス */
	status: 'pending' | 'processing' | 'completed' | 'failed';

	/** 作成日時（ISO 8601形式） */
	createdAt?: string;

	/** 更新日時（ISO 8601形式） */
	updatedAt?: string;

	/** 作成者ユーザーID */
	userId?: string;

	/** 詳細データへのS3パス */
	dataPath?: string;
}

/**
 * シミュレーション一覧取得のフィルター条件
 */
export interface SimulationListFilter {
	/** キーワード検索 */
	keyword?: string;

	/** 開始日（YYYY-MM-DD形式） */
	startDate?: string;

	/** 終了日（YYYY-MM-DD形式） */
	endDate?: string;

	/** ログイン要否フィルター */
	loginFilter?: 'all' | 'required' | 'notRequired';

	/** ステータスフィルター */
	status?: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * シミュレーション一覧取得のソート順
 */
export type SimulationListSortOrder = 'asc' | 'desc';

/**
 * シミュレーション一覧取得のレスポンス
 */
export interface SimulationListResponse {
	/** シミュレーション一覧 */
	items: ViewerInfoItem[];

	/** 総件数 */
	totalCount: number;

	/** 次ページのトークン（ページネーション用） */
	nextToken?: string;
}
