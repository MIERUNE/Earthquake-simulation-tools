import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSimulations, getSimulationById } from './simulations';
import * as dynamodbClient from '../aws/dynamodbClient';

// Mock DynamoDB DocumentClient
vi.mock('../aws/dynamodbClient');

describe('simulations API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getSimulations', () => {
		it('should fetch simulations successfully', async () => {
			const mockItems = [
				{
					id: '1',
					region: '東京都',
					parameter: 'M7.5',
					datetime: '2025-01-20 10:00:00',
					requiresLogin: false,
					status: 'completed'
				},
				{
					id: '2',
					region: '大阪府',
					parameter: 'M8.0',
					datetime: '2025-01-19 15:30:00',
					requiresLogin: true,
					status: 'completed'
				}
			];

			const mockSend = vi.fn().mockResolvedValue({
				Items: mockItems,
				Count: 2
			});

			vi.mocked(dynamodbClient.getDynamoDBDocumentClient).mockReturnValue({
				send: mockSend
			} as any);

			const result = await getSimulations();

			expect(result.items).toHaveLength(2);
			expect(result.totalCount).toBe(2);
			expect(mockSend).toHaveBeenCalledTimes(1);
		});

		it('should filter by keyword', async () => {
			const mockItems = [
				{
					id: '1',
					region: '東京都',
					parameter: 'M7.5',
					datetime: '2025-01-20 10:00:00',
					requiresLogin: false,
					status: 'completed'
				},
				{
					id: '2',
					region: '大阪府',
					parameter: 'M8.0',
					datetime: '2025-01-19 15:30:00',
					requiresLogin: true,
					status: 'completed'
				}
			];

			const mockSend = vi.fn().mockResolvedValue({
				Items: mockItems
			});

			vi.mocked(dynamodbClient.getDynamoDBDocumentClient).mockReturnValue({
				send: mockSend
			} as any);

			const result = await getSimulations({ keyword: '東京' });

			expect(result.items).toHaveLength(1);
			expect(result.items[0].region).toBe('東京都');
		});

		it('should filter by date range', async () => {
			const mockItems = [
				{
					id: '1',
					region: '東京都',
					parameter: 'M7.5',
					datetime: '2025-01-20 10:00:00',
					requiresLogin: false,
					status: 'completed'
				},
				{
					id: '2',
					region: '大阪府',
					parameter: 'M8.0',
					datetime: '2025-01-15 15:30:00',
					requiresLogin: true,
					status: 'completed'
				}
			];

			const mockSend = vi.fn().mockResolvedValue({
				Items: mockItems
			});

			vi.mocked(dynamodbClient.getDynamoDBDocumentClient).mockReturnValue({
				send: mockSend
			} as any);

			const result = await getSimulations({
				startDate: '2025-01-18',
				endDate: '2025-01-22'
			});

			expect(result.items).toHaveLength(1);
			expect(result.items[0].datetime).toBe('2025-01-20 10:00:00');
		});

		it('should sort by datetime desc', async () => {
			const mockItems = [
				{
					id: '1',
					region: '東京都',
					parameter: 'M7.5',
					datetime: '2025-01-15 10:00:00',
					requiresLogin: false,
					status: 'completed'
				},
				{
					id: '2',
					region: '大阪府',
					parameter: 'M8.0',
					datetime: '2025-01-20 15:30:00',
					requiresLogin: true,
					status: 'completed'
				}
			];

			const mockSend = vi.fn().mockResolvedValue({
				Items: mockItems
			});

			vi.mocked(dynamodbClient.getDynamoDBDocumentClient).mockReturnValue({
				send: mockSend
			} as any);

			const result = await getSimulations(undefined, 'desc');

			expect(result.items[0].id).toBe('2');
			expect(result.items[1].id).toBe('1');
		});

		it('should sort by datetime asc', async () => {
			const mockItems = [
				{
					id: '1',
					region: '東京都',
					parameter: 'M7.5',
					datetime: '2025-01-20 10:00:00',
					requiresLogin: false,
					status: 'completed'
				},
				{
					id: '2',
					region: '大阪府',
					parameter: 'M8.0',
					datetime: '2025-01-15 15:30:00',
					requiresLogin: true,
					status: 'completed'
				}
			];

			const mockSend = vi.fn().mockResolvedValue({
				Items: mockItems
			});

			vi.mocked(dynamodbClient.getDynamoDBDocumentClient).mockReturnValue({
				send: mockSend
			} as any);

			const result = await getSimulations(undefined, 'asc');

			expect(result.items[0].id).toBe('2');
			expect(result.items[1].id).toBe('1');
		});
	});

	describe('getSimulationById', () => {
		it('should return simulation by id using GetCommand', async () => {
			const mockItem = {
				id: '1',
				region: '東京都',
				parameter: 'M7.5',
				datetime: '2025-01-20 10:00:00',
				requiresLogin: false,
				status: 'completed'
			};

			const mockSend = vi.fn().mockResolvedValue({
				Item: mockItem
			});

			vi.mocked(dynamodbClient.getDynamoDBDocumentClient).mockReturnValue({
				send: mockSend
			} as any);

			const result = await getSimulationById('1');

			expect(result).not.toBeNull();
			expect(result?.id).toBe('1');
			expect(result?.region).toBe('東京都');

			// GetCommandが正しく呼ばれたことを確認
			expect(mockSend).toHaveBeenCalledTimes(1);
		});

		it('should return null if simulation not found', async () => {
			const mockSend = vi.fn().mockResolvedValue({
				Item: undefined
			});

			vi.mocked(dynamodbClient.getDynamoDBDocumentClient).mockReturnValue({
				send: mockSend
			} as any);

			const result = await getSimulationById('999');

			expect(result).toBeNull();
		});
	});
});
