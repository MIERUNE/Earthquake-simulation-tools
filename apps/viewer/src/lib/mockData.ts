/**
 * デバッグ用のモックデータ
 * バックエンドが動いていない時にダッシュボードをテストするために使用
 */

import type { ViewerInfoItem, SimulationListResponse } from './types/viewerInfo';
import { DEFAULT_CITY_CODE } from './constants/cityConstants';

export const mockSimulations: ViewerInfoItem[] = [
  {
    id: 'mock-sim-001',
    region: "静岡市",
    parameter: "南海トラフ地震 M9.0",
    datetime: "2025-01-28 14:30:00",
    requiresLogin: false,
    status: 'completed' as const,
    createdAt: '2025-01-28T14:30:00.000Z',
    userId: 'mock-user-001',
    dataPath: 's3://mock-bucket/simulations/mock-sim-001/result.json',
    cityCode: DEFAULT_CITY_CODE
  },
  {
    id: 'mock-sim-001b',
    region: "戸田市",
    parameter: "関東地震 M7.9",
    datetime: "2025-01-28 10:00:00",
    requiresLogin: false,
    status: 'completed' as const,
    createdAt: '2025-01-28T10:00:00.000Z',
    userId: 'mock-user-001',
    dataPath: 's3://mock-bucket/simulations/mock-sim-001b/result.json',
    cityCode: '11224'
  },
  {
    id: 'mock-sim-001c',
    region: "益城町",
    parameter: "布田川断層帯地震 M7.3（熊本地震）",
    datetime: "2025-01-27 15:30:00",
    requiresLogin: false,
    status: 'completed' as const,
    createdAt: '2025-01-27T15:30:00.000Z',
    userId: 'mock-user-001',
    dataPath: 's3://mock-bucket/simulations/mock-sim-001c/result.json',
    cityCode: '43443'
  },
  {
    id: 'mock-sim-002',
    region: "大阪府大阪市中央区",
    parameter: "上町断層帯地震 M7.5",
    datetime: "2025-01-27 09:15:00",
    requiresLogin: true,
    status: 'completed' as const,
    createdAt: '2025-01-27T09:15:00.000Z',
    userId: 'mock-user-002',
    dataPath: 's3://mock-bucket/simulations/mock-sim-002/result.json'
  },
  {
    id: 'mock-sim-003',
    region: "神奈川県横浜市",
    parameter: "相模トラフ地震 M8.2",
    datetime: "2025-01-26 16:45:00",
    requiresLogin: false,
    status: 'completed' as const,
    createdAt: '2025-01-26T16:45:00.000Z',
    userId: 'mock-user-001',
    dataPath: 's3://mock-bucket/simulations/mock-sim-003/result.json'
  },
  {
    id: 'mock-sim-004',
    region: "愛知県名古屋市",
    parameter: "東南海地震 M8.0",
    datetime: "2025-01-25 11:20:00",
    requiresLogin: true,
    status: 'processing' as const,
    createdAt: '2025-01-25T11:20:00.000Z',
    userId: 'mock-user-002'
  },
  {
    id: 'mock-sim-005',
    region: "福岡県福岡市",
    parameter: "警固断層地震 M7.0",
    datetime: "2025-01-24 13:00:00",
    requiresLogin: false,
    status: 'completed' as const,
    createdAt: '2025-01-24T13:00:00.000Z',
    userId: 'mock-user-003',
    dataPath: 's3://mock-bucket/simulations/mock-sim-005/result.json'
  },
  {
    id: 'mock-sim-006',
    region: "宮城県仙台市",
    parameter: "宮城県沖地震 M7.8",
    datetime: "2025-01-23 10:30:00",
    requiresLogin: false,
    status: 'completed' as const,
    createdAt: '2025-01-23T10:30:00.000Z',
    userId: 'mock-user-001',
    dataPath: 's3://mock-bucket/simulations/mock-sim-006/result.json'
  },
  {
    id: 'mock-sim-007',
    region: "北海道札幌市",
    parameter: "石狩低地東縁断層帯 M7.3",
    datetime: "2025-01-22 15:45:00",
    requiresLogin: true,
    status: 'failed' as const,
    createdAt: '2025-01-22T15:45:00.000Z',
    userId: 'mock-user-002'
  },
  {
    id: 'mock-sim-008',
    region: "京都府京都市",
    parameter: "花折断層地震 M7.2",
    datetime: "2025-01-21 08:00:00",
    requiresLogin: false,
    status: 'completed' as const,
    createdAt: '2025-01-21T08:00:00.000Z',
    userId: 'mock-user-003',
    dataPath: 's3://mock-bucket/simulations/mock-sim-008/result.json'
  },
  {
    id: 'mock-sim-009',
    region: "兵庫県神戸市",
    parameter: "六甲・淡路島断層帯 M7.5",
    datetime: "2025-01-20 17:30:00",
    requiresLogin: true,
    status: 'completed' as const,
    createdAt: '2025-01-20T17:30:00.000Z',
    userId: 'mock-user-001',
    dataPath: 's3://mock-bucket/simulations/mock-sim-009/result.json'
  },
  {
    id: 'mock-sim-011',
    region: "新潟県新潟市",
    parameter: "信濃川断層帯 M7.0",
    datetime: "2025-01-18 14:00:00",
    requiresLogin: true,
    status: 'processing' as const,
    createdAt: '2025-01-18T14:00:00.000Z',
    userId: 'mock-user-003'
  },
  {
    id: 'mock-sim-012',
    region: "広島県広島市",
    parameter: "安芸灘断層群 M7.0",
    datetime: "2025-01-17 09:45:00",
    requiresLogin: false,
    status: 'completed' as const,
    createdAt: '2025-01-17T09:45:00.000Z',
    userId: 'mock-user-001',
    dataPath: 's3://mock-bucket/simulations/mock-sim-012/result.json'
  },
  {
    id: 'mock-sim-013',
    region: "千葉県千葉市",
    parameter: "東京湾北部地震 M7.3",
    datetime: "2025-01-16 16:20:00",
    requiresLogin: false,
    status: 'completed' as const,
    createdAt: '2025-01-16T16:20:00.000Z',
    userId: 'mock-user-002',
    dataPath: 's3://mock-bucket/simulations/mock-sim-013/result.json'
  },
  {
    id: 'mock-sim-014',
    region: "埼玉県さいたま市",
    parameter: "立川断層帯地震 M7.4",
    datetime: "2025-01-15 11:30:00",
    requiresLogin: true,
    status: 'completed' as const,
    createdAt: '2025-01-15T11:30:00.000Z',
    userId: 'mock-user-003',
    dataPath: 's3://mock-bucket/simulations/mock-sim-014/result.json'
  },
  {
    id: 'mock-sim-015',
    region: "岡山県岡山市",
    parameter: "長者ヶ原断層帯 M7.0",
    datetime: "2025-01-14 13:45:00",
    requiresLogin: false,
    status: 'completed' as const,
    createdAt: '2025-01-14T13:45:00.000Z',
    userId: 'mock-user-001',
    dataPath: 's3://mock-bucket/simulations/mock-sim-015/result.json'
  },
  {
    id: 'mock-sim-016',
    region: "熊本県熊本市",
    parameter: "布田川断層帯 M7.3",
    datetime: "2025-01-13 10:00:00",
    requiresLogin: true,
    status: 'failed' as const,
    createdAt: '2025-01-13T10:00:00.000Z',
    userId: 'mock-user-002'
  },
  {
    id: 'mock-sim-017',
    region: "長野県長野市",
    parameter: "長野盆地西縁断層帯 M7.8",
    datetime: "2025-01-12 15:15:00",
    requiresLogin: false,
    status: 'completed' as const,
    createdAt: '2025-01-12T15:15:00.000Z',
    userId: 'mock-user-003',
    dataPath: 's3://mock-bucket/simulations/mock-sim-017/result.json'
  },
  {
    id: 'mock-sim-018',
    region: "茨城県水戸市",
    parameter: "茨城県沖地震 M7.5",
    datetime: "2025-01-11 08:30:00",
    requiresLogin: false,
    status: 'completed' as const,
    createdAt: '2025-01-11T08:30:00.000Z',
    userId: 'mock-user-001',
    dataPath: 's3://mock-bucket/simulations/mock-sim-018/result.json'
  },
  {
    id: 'mock-sim-019',
    region: "山形県山形市",
    parameter: "山形盆地断層帯 M7.2",
    datetime: "2025-01-10 17:00:00",
    requiresLogin: true,
    status: 'processing' as const,
    createdAt: '2025-01-10T17:00:00.000Z',
    userId: 'mock-user-002'
  },
  {
    id: 'mock-sim-020',
    region: "鹿児島県鹿児島市",
    parameter: "鹿児島湾直下地震 M7.1",
    datetime: "2025-01-09 12:45:00",
    requiresLogin: false,
    status: 'completed' as const,
    createdAt: '2025-01-09T12:45:00.000Z',
    userId: 'mock-user-003',
    dataPath: 's3://mock-bucket/simulations/mock-sim-020/result.json'
  }
];

/**
 * モックレスポンスを生成
 */
export const getMockSimulationListResponse = (
	limit = 100,
	nextToken?: string
): SimulationListResponse => {
	return {
		items: mockSimulations.slice(0, limit),
		totalCount: mockSimulations.length,
		nextToken: undefined
	};
};

/**
 * IDで特定のモックシミュレーションを取得
 */
export const getMockSimulationById = (id: string): ViewerInfoItem | undefined => {
	return mockSimulations.find((sim) => sim.id === id);
};

/**
 * 地震動プリセットのモックデータ
 * DynamoDBから実際に取得される地震動プリセット(job="job2")に基づく
 */
export const mockEarthquakePresets = [
	{
		id: 'bf82e220-e2ba-43b5-aafa-abdb180d7b0c',
		presetName: '東北 震度6弱',
		regionName: '',
		description: '東北地方を想定した震度6弱の地震動'
	},
	{
		id: '65d8c5af-4fb0-40c9-a9bc-5d88ba172008',
		presetName: '能登 震度6強',
		regionName: '',
		description: '能登地方を想定した震度6強の地震動'
	},
	{
		id: 'a32c23fc-0361-457a-a0fc-7c7459dbad81',
		presetName: '神戸 震度7',
		regionName: '',
		description: '神戸地方を想定した震度7の地震動'
	}
];
