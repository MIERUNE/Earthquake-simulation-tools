/**
 * シミュレーション一覧取得API
 * DynamoDB viewer_infoテーブルからデータを取得
 */

import { ScanCommand, GetCommand, type ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBDocumentClient } from '../aws/dynamodbClient';
import { env } from '../env';
import {
	type ViewerInfoItem,
	type SimulationListFilter,
	type SimulationListSortOrder,
	type SimulationListResponse
} from '../types/viewerInfo';
import { AwsError, formatErrorMessage, logError } from '../utils/errors';

/**
 * シミュレーション一覧を取得
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
	const tableName = env.dynamodb.viewerInfoTable;
	const client = getDynamoDBDocumentClient();

	const params: ScanCommandInput = {
		TableName: tableName,
		Limit: limit
	};

	// ページネーショントークンがある場合は設定
	if (nextToken) {
		params.ExclusiveStartKey = JSON.parse(nextToken);
	}

	// フィルター式の構築
	const filterExpressions: string[] = [];
	const expressionAttributeNames: Record<string, string> = {};
	const expressionAttributeValues: Record<string, unknown> = {};

	// ステータスフィルター
	if (filter?.status) {
		filterExpressions.push('#status = :status');
		expressionAttributeNames['#status'] = 'status';
		expressionAttributeValues[':status'] = filter.status;
	}

	// ログイン要否フィルター
	if (filter?.loginFilter && filter.loginFilter !== 'all') {
		const requiresLogin = filter.loginFilter === 'required';
		filterExpressions.push('requiresLogin = :requiresLogin');
		expressionAttributeValues[':requiresLogin'] = requiresLogin;
	}

	// フィルター式を設定
	if (filterExpressions.length > 0) {
		params.FilterExpression = filterExpressions.join(' AND ');
		params.ExpressionAttributeNames = expressionAttributeNames;
		params.ExpressionAttributeValues = expressionAttributeValues;
	}

	try {
		const command = new ScanCommand(params);
		const response = await client.send(command);

		let items = (response.Items || []) as ViewerInfoItem[];

		// クライアントサイドでのフィルタリング（DynamoDBのフィルター式では対応できない条件）
		if (filter) {
			// キーワード検索
			if (filter.keyword) {
				const lowerKeyword = filter.keyword.toLowerCase();
				items = items.filter(
					(item) =>
						item.region.toLowerCase().includes(lowerKeyword) ||
						item.parameter.toLowerCase().includes(lowerKeyword)
				);
			}

			// 日付範囲フィルター
			if (filter.startDate || filter.endDate) {
				items = items.filter((item) => {
					const itemDate = item.datetime.split(' ')[0]; // "YYYY-MM-DD HH:mm:ss" から日付部分を取得

					if (filter.startDate && filter.endDate) {
						return itemDate >= filter.startDate && itemDate <= filter.endDate;
					} else if (filter.startDate) {
						return itemDate >= filter.startDate;
					} else if (filter.endDate) {
						return itemDate <= filter.endDate;
					}
					return true;
				});
			}
		}

		// ソート（datetime降順/昇順）
		items.sort((a, b) => {
			const dateA = new Date(a.datetime);
			const dateB = new Date(b.datetime);
			return sortOrder === 'desc'
				? dateB.getTime() - dateA.getTime()
				: dateA.getTime() - dateB.getTime();
		});

		return {
			items,
			totalCount: items.length,
			nextToken: response.LastEvaluatedKey ? JSON.stringify(response.LastEvaluatedKey) : undefined
		};
	} catch (error) {
		logError(error, 'getSimulations');
		throw new AwsError(formatErrorMessage(error), error as Error);
	}
};

/**
 * シミュレーション詳細を取得
 * DynamoDBのGetItemを使用して効率的に単一アイテムを取得
 *
 * @param id シミュレーションID
 * @returns シミュレーション詳細
 */
export const getSimulationById = async (id: string): Promise<ViewerInfoItem | null> => {
	try {
		const tableName = env.dynamodb.viewerInfoTable;
		const client = getDynamoDBDocumentClient();

		const command = new GetCommand({
			TableName: tableName,
			Key: {
				id: id
			}
		});

		const response = await client.send(command);

		if (!response.Item) {
			return null;
		}

		return response.Item as ViewerInfoItem;
	} catch (error) {
		logError(error, 'getSimulationById');
		throw new AwsError(formatErrorMessage(error), error as Error);
	}
};
