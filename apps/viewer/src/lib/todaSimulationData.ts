// 戸田市の地震シミュレーションモックデータ

// 型定義
type DistrictId = 'toda' | 'niizo' | 'bijo' | 'sasame';
type BuildingTypeKey = 'residential' | 'commercial' | 'public' | 'industrial';
type DamageLevel = 0 | 1 | 2 | 3 | 4;

interface District {
  id: DistrictId;
  name: string;
  center: [number, number];
}

interface DamageType {
  label: string;
  color: string;
  description: string;
}

interface DamageTypesMap {
  0: DamageType;
  1: DamageType;
  2: DamageType;
  3: DamageType;
  4: DamageType;
}

interface BuildingType {
  label: string;
  icon: string;
}

interface BuildingTypesMap {
  residential: BuildingType;
  commercial: BuildingType;
  public: BuildingType;
  industrial: BuildingType;
}

export interface Building {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  district: DistrictId;
  districtName: string;
  buildingType: BuildingTypeKey;
  damageLevel: DamageLevel;
  floors: number;
  area: number;
  estimatedLoss: number;
}

interface DamageDistribution {
  [key: number]: number;
}

interface DistrictStat {
  name: string;
  total: number;
  damaged: number;
  damageRate: number;
}

interface DistrictStatsMap {
  [key: string]: DistrictStat;
}

interface BuildingTypeStat {
  label: string;
  total: number;
  damaged: number;
  severelyDamaged: number;
}

interface BuildingTypeStatsMap {
  [key: string]: BuildingTypeStat;
}

interface Summary {
  total: number;
  damaged: number;
  severelyDamaged: number;
  damageRate: number;
  totalLoss: number;
  estimatedEvacuees: number;
  damageDistribution: DamageDistribution;
  districtStats: DistrictStatsMap;
  buildingTypeStats: BuildingTypeStatsMap;
}

interface BuildingFilters {
  districts?: DistrictId[];
  damageLevels?: DamageLevel[];
  buildingTypes?: BuildingTypeKey[];
}

// 戸田市の地区データ
export const districts: District[] = [
  { id: 'toda', name: '戸田', center: [139.678, 35.818] },
  { id: 'niizo', name: '新曽', center: [139.668, 35.825] },
  { id: 'bijo', name: '美女木', center: [139.663, 35.812] },
  { id: 'sasame', name: '笹目', center: [139.688, 35.810] }
];

// 被害レベルの定義
export const damageTypes: DamageTypesMap = {
  0: { label: '無被害', color: '#10B981', description: '構造的損傷なし' },
  1: { label: '軽微', color: '#F59E0B', description: '軽微な亀裂、非構造部材の損傷' },
  2: { label: '中程度', color: '#EF4444', description: '構造部材の部分的損傷' },
  3: { label: '大破', color: '#DC2626', description: '構造部材の重大な損傷' },
  4: { label: '倒壊', color: '#1F2937', description: '完全倒壊または倒壊の危険' }
};

// 建物タイプの定義
export const buildingTypes: BuildingTypesMap = {
  residential: { label: '住宅', icon: '🏠' },
  commercial: { label: '商業施設', icon: '🏢' },
  public: { label: '公共施設', icon: '🏛️' },
  industrial: { label: '工場', icon: '🏭' }
};

// ランダムな建物データを生成する関数
function generateBuilding(id: number, districtId: DistrictId): Building {
  const district = districts.find((d) => d.id === districtId);
  if (!district) {
    throw new Error(`District not found: ${districtId}`);
  }

  const buildingTypeKeys = Object.keys(buildingTypes) as BuildingTypeKey[];
  const buildingType = buildingTypeKeys[Math.floor(Math.random() * buildingTypeKeys.length)];

  // 地区の中心から半径内でランダムな位置を生成
  const radius = 0.02; // 約2km (戸田市は面積が小さい)
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radius;

  const lat = district.center[1] + distance * Math.cos(angle);
  const lng = district.center[0] + distance * Math.sin(angle);

  // 被害レベルは正規分布に近い形で生成（関東地震想定で被害やや大きめ）
  const damageRand = Math.random();
  let damageLevel: DamageLevel;
  if (damageRand < 0.25) damageLevel = 0;
  else if (damageRand < 0.55) damageLevel = 1;
  else if (damageRand < 0.75) damageLevel = 2;
  else if (damageRand < 0.92) damageLevel = 3;
  else damageLevel = 4;

  const floors =
    buildingType === 'residential'
      ? Math.floor(Math.random() * 3) + 1
      : Math.floor(Math.random() * 10) + 2;

  const area =
    buildingType === 'residential'
      ? Math.floor(Math.random() * 150) + 50
      : Math.floor(Math.random() * 5000) + 500;

  const estimatedLoss = damageLevel * area * 10000 * (Math.random() * 0.5 + 0.5);

  return {
    id: `building_${id}`,
    name: `${district.name}${buildingTypes[buildingType].label}${id}`,
    location: { lat, lng },
    district: districtId,
    districtName: district.name,
    buildingType,
    damageLevel,
    floors,
    area,
    estimatedLoss: Math.floor(estimatedLoss)
  };
}

// 5,000棟の建物データを生成（戸田市は規模が小さい）
export const buildings: Building[] = [];
const buildingsPerDistrict: Record<DistrictId, number> = {
  toda: 1500,
  niizo: 1300,
  bijo: 1100,
  sasame: 1100
};

let buildingId = 1;
for (const [districtId, count] of Object.entries(buildingsPerDistrict) as [DistrictId, number][]) {
  for (let i = 0; i < count; i++) {
    buildings.push(generateBuilding(buildingId++, districtId));
  }
}

// 集計データを計算
export function calculateSummary(filteredBuildings: Building[] = buildings): Summary {
  const total = filteredBuildings.length;
  const damaged = filteredBuildings.filter((b) => b.damageLevel > 0).length;
  const severelyDamaged = filteredBuildings.filter((b) => b.damageLevel >= 3).length;
  const totalLoss = filteredBuildings.reduce((sum, b) => sum + b.estimatedLoss, 0);

  // 被害レベル別の集計
  const damageDistribution: DamageDistribution = {};
  for (let i = 0; i <= 4; i++) {
    damageDistribution[i] = filteredBuildings.filter((b) => b.damageLevel === i).length;
  }

  // 地区別の集計
  const districtStats: DistrictStatsMap = {};
  districts.forEach((d) => {
    const districtBuildings = filteredBuildings.filter((b) => b.district === d.id);
    districtStats[d.id] = {
      name: d.name,
      total: districtBuildings.length,
      damaged: districtBuildings.filter((b) => b.damageLevel > 0).length,
      damageRate:
        districtBuildings.length > 0
          ? (districtBuildings.filter((b) => b.damageLevel > 0).length /
              districtBuildings.length) *
            100
          : 0
    };
  });

  // 建物タイプ別の集計
  const buildingTypeStats: BuildingTypeStatsMap = {};
  Object.keys(buildingTypes).forEach((type) => {
    const typeKey = type as BuildingTypeKey;
    const typeBuildings = filteredBuildings.filter((b) => b.buildingType === typeKey);
    buildingTypeStats[type] = {
      label: buildingTypes[typeKey].label,
      total: typeBuildings.length,
      damaged: typeBuildings.filter((b) => b.damageLevel > 0).length,
      severelyDamaged: typeBuildings.filter((b) => b.damageLevel >= 3).length
    };
  });

  return {
    total,
    damaged,
    severelyDamaged,
    damageRate: total > 0 ? (damaged / total) * 100 : 0,
    totalLoss,
    estimatedEvacuees: Math.floor(severelyDamaged * 2.5), // 大破以上の建物×2.5人
    damageDistribution,
    districtStats,
    buildingTypeStats
  };
}

// フィルター関数
export function filterBuildings(filters: BuildingFilters = {}): Building[] {
	let filtered = [...buildings];

	if (filters.districts && filters.districts.length > 0) {
		filtered = filtered.filter((b) => filters.districts?.includes(b.district));
	}

	if (filters.damageLevels && filters.damageLevels.length > 0) {
		filtered = filtered.filter((b) => filters.damageLevels?.includes(b.damageLevel));
	}

	if (filters.buildingTypes && filters.buildingTypes.length > 0) {
		filtered = filtered.filter((b) => filters.buildingTypes?.includes(b.buildingType));
	}

	return filtered;
}

/**
 * 統合シミュレーションデータオブジェクト
 * DashboardPageで使用するための統合データ
 */
const summary = calculateSummary(buildings);

export const todaSimulationData = {
	// 建物データ
	buildings,

	// 集計データ
	totalBuildings: summary.total,
	damagedBuildings: summary.damaged,
	severelyDamagedBuildings: summary.severelyDamaged,
	damageRate: summary.damageRate,
	totalEstimatedLoss: summary.totalLoss,

	// 分布・統計データ
	damageDistribution: summary.damageDistribution,
	districtStats: summary.districtStats,
	buildingTypeStats: summary.buildingTypeStats,

	// その他
	estimatedEvacuees: summary.estimatedEvacuees,

	// メタデータ
	districts,
	damageTypes,
	buildingTypes
};
