// 静岡市の緊急輸送道路データ
// 注意: このファイルの関数は旧実装です。新しい道路閉塞率計算にはDuckDB空間SQLを使用してください。
// 参照: apps/viewer/src/lib/utils/roadBlockageDuckDB.ts

// 型定義
type RoadType = 'primary' | 'secondary' | 'tertiary';

interface RoadTypeInfo {
  label: string;
  color: string;
  width: number;
}

interface RoadTypesMap {
  primary: RoadTypeInfo;
  secondary: RoadTypeInfo;
  tertiary: RoadTypeInfo;
}

interface BlockageLevel {
  label: string;
  color: string;
  description: string;
}

interface BlockageLevelsMap {
  0: BlockageLevel;
  1: BlockageLevel;
  2: BlockageLevel;
  3: BlockageLevel;
}

interface Road {
  id: string;
  name: string;
  type: RoadType;
  width: number;
  coordinates: [number, number][];
}

interface Facility {
  id: string;
  name: string;
  type: string;
  location: {
    lat: number;
    lng: number;
  };
  importance: string;
}

interface Point {
  lng: number;
  lat: number;
}

interface Building {
  location: Point;
  damageLevel: number;
  floors: number;
}

interface BlockageInfo {
  blockageRate: number;
  blockageLevel: number;
  affectedSegments: number;
  isPassable: boolean;
}

export interface RoadWithBlockage extends Road, BlockageInfo {
  nearbyBuildingsCount: number;
  length: number;
}

interface RoadTypeStats {
  total: number;
  blocked: number;
  length: number;
  passableLength: number;
}

interface RoadStatistics {
  total: number;
  totalLength: number;
  passableLength: number;
  blockedCount: number;
  byType: {
    primary: RoadTypeStats;
    secondary: RoadTypeStats;
    tertiary: RoadTypeStats;
  };
  passableRate: number;
}

export interface FacilityAccess extends Facility {
  accessible: boolean;
  nearestRoad: string | undefined;
  distanceToRoad: number;
}

// 道路種別の定義
export const roadTypes: RoadTypesMap = {
  primary: { label: '第1次緊急輸送道路', color: '#DC2626', width: 6 },
  secondary: { label: '第2次緊急輸送道路', color: '#F59E0B', width: 4 },
  tertiary: { label: '第3次緊急輸送道路', color: '#3B82F6', width: 2 }
};

// 閉塞レベルの定義
export const blockageLevels: BlockageLevelsMap = {
  0: { label: '通行可能', color: '#10B981', description: '閉塞率10%未満' },
  1: { label: '注意', color: '#F59E0B', description: '閉塞率10-30%' },
  2: { label: '困難', color: '#EF4444', description: '閉塞率30-60%' },
  3: { label: '通行不可', color: '#1F2937', description: '閉塞率60%以上' }
};
export const roads: Road[] = [
  // === 東西方向の主要道路 ===
  {
    id: 'road_1',
    name: '国道1号（北）',
    type: 'primary',
    width: 30,
    coordinates: [
      [138.370, 34.980],
      [138.372, 34.980],
      [138.374, 34.980],
      [138.376, 34.980],
      [138.378, 34.980],
      [138.380, 34.980],
      [138.382, 34.980],
      [138.384, 34.980],
      [138.386, 34.980],
      [138.388, 34.980],
      [138.390, 34.980],
      [138.392, 34.980],
      [138.394, 34.980]
    ]
  },
  {
    id: 'road_2',
    name: '国道1号（中央）',
    type: 'primary',
    width: 25,
    coordinates: [
      [138.370, 34.975],
      [138.372, 34.975],
      [138.374, 34.975],
      [138.376, 34.975],
      [138.378, 34.975],
      [138.380, 34.975],
      [138.382, 34.975],
      [138.384, 34.975],
      [138.386, 34.975],
      [138.388, 34.975],
      [138.390, 34.975],
      [138.392, 34.975],
      [138.394, 34.975]
    ]
  },
  {
    id: 'road_3',
    name: '国道150号',
    type: 'primary',
    width: 20,
    coordinates: [
      [138.370, 34.970],
      [138.372, 34.970],
      [138.374, 34.970],
      [138.376, 34.970],
      [138.378, 34.970],
      [138.380, 34.970],
      [138.382, 34.970],
      [138.384, 34.970],
      [138.386, 34.970],
      [138.388, 34.970],
      [138.390, 34.970],
      [138.392, 34.970],
      [138.394, 34.970]
    ]
  },

  // === 南北方向の主要道路 ===
  {
    id: 'road_4',
    name: '県道27号',
    type: 'secondary',
    width: 15,
    coordinates: [
      [138.375, 34.968],
      [138.375, 34.970],
      [138.375, 34.972],
      [138.375, 34.974],
      [138.375, 34.975],
      [138.375, 34.976],
      [138.375, 34.978],
      [138.375, 34.980],
      [138.375, 34.982]
    ]
  },
  {
    id: 'road_5',
    name: '県道84号',
    type: 'secondary',
    width: 12,
    coordinates: [
      [138.380, 34.968],
      [138.380, 34.970],
      [138.380, 34.972],
      [138.380, 34.974],
      [138.380, 34.975],
      [138.380, 34.976],
      [138.380, 34.978],
      [138.380, 34.980],
      [138.380, 34.982]
    ]
  },
  {
    id: 'road_6',
    name: '県道201号',
    type: 'secondary',
    width: 12,
    coordinates: [
      [138.385, 34.968],
      [138.385, 34.970],
      [138.385, 34.972],
      [138.385, 34.974],
      [138.385, 34.975],
      [138.385, 34.976],
      [138.385, 34.978],
      [138.385, 34.980],
      [138.385, 34.982]
    ]
  },
  {
    id: 'road_7',
    name: '県道354号',
    type: 'secondary',
    width: 12,
    coordinates: [
      [138.390, 34.968],
      [138.390, 34.970],
      [138.390, 34.972],
      [138.390, 34.974],
      [138.390, 34.975],
      [138.390, 34.976],
      [138.390, 34.978],
      [138.390, 34.980],
      [138.390, 34.982]
    ]
  },
  // 追加の道路データ（静岡市中心部）
  {
    id: 'road_8',
    name: '新東名高速道路（新静岡IC付近）',
    type: 'primary',
    width: 30,
    coordinates: [
      [138.370, 34.985],
      [138.373, 34.983],
      [138.376, 34.981],
      [138.379, 34.979],
      [138.382, 34.977]
    ]
  },
  {
    id: 'road_9',
    name: '県道201号（安倍街道）',
    type: 'secondary',
    width: 12,
    coordinates: [
      [138.376, 34.980],
      [138.377, 34.978],
      [138.378, 34.976],
      [138.379, 34.974]
    ]
  },
  {
    id: 'road_10',
    name: '県道354号（長沼通り）',
    type: 'secondary',
    width: 12,
    coordinates: [
      [138.390, 34.976],
      [138.388, 34.975],
      [138.386, 34.974],
      [138.384, 34.973]
    ]
  },
  {
    id: 'road_11',
    name: '市道呉服町通り',
    type: 'tertiary',
    width: 8,
    coordinates: [
      [138.380, 34.972],
      [138.381, 34.973],
      [138.382, 34.974],
      [138.383, 34.975]
    ]
  },
  {
    id: 'road_12',
    name: '市道七間町通り',
    type: 'tertiary',
    width: 8,
    coordinates: [
      [138.385, 34.973],
      [138.384, 34.974],
      [138.383, 34.975],
      [138.382, 34.976]
    ]
  },
  {
    id: 'road_13',
    name: '県道75号（本通り）',
    type: 'secondary',
    width: 15,
    coordinates: [
      [138.387, 34.978],
      [138.386, 34.976],
      [138.385, 34.974],
      [138.384, 34.972]
    ]
  },
  {
    id: 'road_14',
    name: '市道東西線',
    type: 'tertiary',
    width: 10,
    coordinates: [
      [138.375, 34.973],
      [138.378, 34.973],
      [138.381, 34.973],
      [138.384, 34.973],
      [138.387, 34.973]
    ]
  },
  {
    id: 'road_15',
    name: '国道362号（安倍川沿い）',
    type: 'primary',
    width: 20,
    coordinates: [
      [138.370, 34.970],
      [138.372, 34.972],
      [138.374, 34.974],
      [138.376, 34.976],
      [138.378, 34.978]
    ]
  }
];

// 重要拠点データ
export const keyFacilities: Facility[] = [
  {
    id: 'facility_1',
    name: '静岡県庁',
    type: 'government',
    location: { lat: 34.977, lng: 138.383 },
    importance: 'critical'
  },
  {
    id: 'facility_2',
    name: '静岡市役所',
    type: 'government',
    location: { lat: 34.975, lng: 138.385 },
    importance: 'critical'
  },
  {
    id: 'facility_3',
    name: '清水港',
    type: 'port',
    location: { lat: 35.016, lng: 138.515 },
    importance: 'critical'
  },
  {
    id: 'facility_4',
    name: '静岡赤十字病院',
    type: 'hospital',
    location: { lat: 34.980, lng: 138.390 },
    importance: 'major'
  },
  {
    id: 'facility_5',
    name: '静岡IC',
    type: 'ic',
    location: { lat: 34.970, lng: 138.350 },
    importance: 'major'
  }
];

// ====================================================================
// 統計・アクセス評価関数
// 注意: これらの関数はRoadDashboardコンポーネントで使用されていますが、
// 新しい実装ではDuckDB空間SQLを使用してください
// ====================================================================

/**
 * 道路統計を計算
 */
export function calculateRoadStatistics(roadData: RoadWithBlockage[]): RoadStatistics {
  const stats: RoadStatistics = {
    total: roadData.length,
    totalLength: 0,
    passableLength: 0,
    blockedCount: 0,
    byType: {
      primary: { total: 0, blocked: 0, length: 0, passableLength: 0 },
      secondary: { total: 0, blocked: 0, length: 0, passableLength: 0 },
      tertiary: { total: 0, blocked: 0, length: 0, passableLength: 0 }
    },
    passableRate: 0
  };

  roadData.forEach((road) => {
    stats.totalLength += road.length;

    if (road.isPassable) {
      stats.passableLength += road.length;
    } else {
      stats.blockedCount++;
    }

    // タイプ別集計
    stats.byType[road.type].total++;
    stats.byType[road.type].length += road.length;

    if (!road.isPassable) {
      stats.byType[road.type].blocked++;
    } else {
      stats.byType[road.type].passableLength += road.length;
    }
  });

  stats.passableRate = stats.totalLength > 0 ? (stats.passableLength / stats.totalLength) * 100 : 0;

  return stats;
}

/**
 * 拠点へのアクセス可能性を評価
 */
export function evaluateFacilityAccess(
  roadData: RoadWithBlockage[],
  facilities: Facility[]
): FacilityAccess[] {
  return facilities.map((facility): FacilityAccess => {
    // 簡易実装: 空配列の場合はアクセス不可とする
    if (roadData.length === 0) {
      return {
        ...facility,
        accessible: false,
        nearestRoad: undefined,
        distanceToRoad: Infinity
      };
    }

    // 実際の実装は省略（DuckDB実装に移行）
    return {
      ...facility,
      accessible: true,
      nearestRoad: roadData[0]?.id,
      distanceToRoad: 0
    };
  });
}

/**
 * すべての道路の閉塞状況を計算
 * @deprecated DuckDB空間SQLを使用してください (roadBlockageDuckDB.ts)
 */
export function calculateAllRoadBlockages(): RoadWithBlockage[] {
  console.warn('calculateAllRoadBlockages is deprecated - use DuckDB spatial SQL via RoadMapSimple component');
  return [];
}
