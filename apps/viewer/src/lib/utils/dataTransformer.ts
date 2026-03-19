/**
 * データ変換ユーティリティ
 * S3から取得したシミュレーション結果を、アプリケーションで使用するフォーマットに変換
 *
 * 注: このファイルの関数は現在使用されていません。
 * 将来的にS3から集計済みJSONを取得する機能を実装する場合は、
 * これらの関数を再利用できます。
 */

import type {
	BuildingGeoJSON,
	RoadGeoJSON,
	MeshGeoJSON,
	SimulationResult
} from '../types/simulationResult';
import type { Building } from '../shizuokaSimulationData';

/**
 * 被害レベルの色を取得
 */
export const getDamageLevelColor = (level: 0 | 1 | 2 | 3 | 4): string => {
	const colors = {
		0: '#10b981', // 緑 - 被害なし
		1: '#fbbf24', // 黄 - 軽微な被害
		2: '#f97316', // オレンジ - 中程度の被害
		3: '#ef4444', // 赤 - 大きな被害
		4: '#991b1b' // 暗赤 - 甚大な被害
	};
	return colors[level];
};

/**
 * 被害レベルのラベルを取得
 */
export const getDamageLevelLabel = (level: 0 | 1 | 2 | 3 | 4): string => {
	const labels = {
		0: '被害なし',
		1: '軽微',
		2: '中程度',
		3: '大破',
		4: '倒壊'
	};
	return labels[level];
};

/**
 * BuildingGeoJSONを内部フォーマットの Building[] に変換
 */
export const transformBuildingData = (geojson: BuildingGeoJSON | undefined): Building[] => {
	if (!geojson || !geojson.features) {
		return [];
	}

	return geojson.features.map((feature) => {
		const props = feature.properties;
		const coords = feature.geometry.coordinates;

		return {
			id: props.id,
			name: props.name || `建物-${props.id}`,
			location: {
				lat: coords[1],
				lng: coords[0]
			},
			district: props.district || 'unknown',
			districtName: props.districtName || props.district || '不明',
			buildingType: props.buildingType,
			damageLevel: props.damageLevel,
			floors: props.floors || 0,
			area: props.area || 0,
			estimatedLoss: props.estimatedLoss || 0
		};
	});
};

/**
 * 建物データから統計情報を計算
 */
export const calculateBuildingStats = (buildings: Building[]) => {
	const totalBuildings = buildings.length;
	const damagedBuildings = buildings.filter((b) => b.damageLevel > 0).length;
	const severelyDamagedBuildings = buildings.filter((b) => b.damageLevel >= 3).length;
	const totalEstimatedLoss = buildings.reduce((sum, b) => sum + b.estimatedLoss, 0);

	// 被害レベル別の分布
	const damageDistribution = buildings.reduce(
		(dist, building) => {
			dist[building.damageLevel] = (dist[building.damageLevel] || 0) + 1;
			return dist;
		},
		{} as Record<number, number>
	);

	// 区ごとの統計
	const districtStats = buildings.reduce(
		(stats, building) => {
			const key = building.district;
			if (!stats[key]) {
				stats[key] = {
					name: building.districtName,
					total: 0,
					damaged: 0,
					damageRate: 0
				};
			}
			stats[key].total += 1;
			if (building.damageLevel > 0) {
				stats[key].damaged += 1;
			}
			return stats;
		},
		{} as Record<string, { name: string; total: number; damaged: number; damageRate: number }>
	);

	// 被害率を計算
	Object.values(districtStats).forEach((stat) => {
		stat.damageRate = stat.total > 0 ? (stat.damaged / stat.total) * 100 : 0;
	});

	// 建物種別ごとの統計
	const buildingTypeStats = buildings.reduce(
		(stats, building) => {
			const key = building.buildingType;
			if (!stats[key]) {
				stats[key] = {
					label: getBuildingTypeLabel(building.buildingType),
					total: 0,
					damaged: 0,
					severelyDamaged: 0
				};
			}
			stats[key].total += 1;
			if (building.damageLevel > 0) {
				stats[key].damaged += 1;
			}
			if (building.damageLevel >= 3) {
				stats[key].severelyDamaged += 1;
			}
			return stats;
		},
		{} as Record<
			string,
			{ label: string; total: number; damaged: number; severelyDamaged: number }
		>
	);

	return {
		totalBuildings,
		damagedBuildings,
		severelyDamagedBuildings,
		damageRate: totalBuildings > 0 ? (damagedBuildings / totalBuildings) * 100 : 0,
		totalEstimatedLoss,
		damageDistribution,
		districtStats,
		buildingTypeStats
	};
};

/**
 * 建物種別のラベルを取得
 */
const getBuildingTypeLabel = (
	type: 'residential' | 'commercial' | 'public' | 'industrial'
): string => {
	const labels = {
		residential: '住宅',
		commercial: '商業',
		public: '公共',
		industrial: '工業'
	};
	return labels[type];
};

/**
 * 道路データを変換
 */
export const transformRoadData = (geojson: RoadGeoJSON | undefined) => {
	if (!geojson || !geojson.features) {
		return {
			features: [],
			stats: {
				totalRoads: 0,
				blockedRoads: 0,
				blockageRate: 0
			}
		};
	}

	const totalRoads = geojson.features.length;
	const blockedRoads = geojson.features.filter((f) => f.properties.isBlocked).length;

	return {
		features: geojson.features,
		stats: {
			totalRoads,
			blockedRoads,
			blockageRate: totalRoads > 0 ? (blockedRoads / totalRoads) * 100 : 0
		}
	};
};

/**
 * メッシュデータを変換
 */
export const transformMeshData = (geojson: MeshGeoJSON | undefined) => {
	if (!geojson || !geojson.features) {
		return {
			features: [],
			stats: {
				totalMeshes: 0,
				averageIntensity: 0,
				maxIntensity: 0
			}
		};
	}

	const intensities = geojson.features
		.map((f) => f.properties.intensity)
		.filter((i): i is number => i !== undefined);

	const averageIntensity =
		intensities.length > 0 ? intensities.reduce((sum, i) => sum + i, 0) / intensities.length : 0;
	const maxIntensity = intensities.length > 0 ? Math.max(...intensities) : 0;

	return {
		features: geojson.features,
		stats: {
			totalMeshes: geojson.features.length,
			averageIntensity,
			maxIntensity
		}
	};
};

/**
 * シミュレーション結果全体を変換
 */
export const transformSimulationResult = (result: SimulationResult | undefined) => {
	if (!result) {
		return null;
	}

	const buildings = transformBuildingData(result.buildings);
	const buildingStats = calculateBuildingStats(buildings);
	const roads = transformRoadData(result.roads);
	const meshes = transformMeshData(result.meshes);

	return {
		id: result.id,
		buildings,
		buildingStats,
		roads,
		meshes,
		metadata: result.metadata
	};
};
