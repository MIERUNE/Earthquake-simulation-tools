import type { FeatureCollection, Feature, Polygon } from 'geojson';

interface DistrictProperties {
  id: string;
  name: string;
  center: [number, number];
}

interface MeshProperties {
  id: string;
  bounds: [number, number, number, number];
  buildingCount: number;
  damageCount: number;
  damageRate: number;
}

interface Building {
  location: {
    lng: number;
    lat: number;
  };
  damageLevel: number;
}

interface DistrictStats {
  total: number;
  damaged: number;
  damageRate: number;
}

interface DistrictStatsMap {
  [districtId: string]: DistrictStats;
}

interface EnhancedDistrictProperties extends DistrictProperties {
  total: number;
  damaged: number;
  damageRate: number;
  fillColor: string;
  fillOpacity: number;
}

// 静岡市の地区ポリゴンデータ（簡易版）
export const districtPolygons: FeatureCollection<Polygon, DistrictProperties> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "aoi",
        name: "葵区",
        center: [138.383, 35.015]
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [138.30, 35.10],
          [138.46, 35.10],
          [138.46, 34.93],
          [138.30, 34.93],
          [138.30, 35.10]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        id: "suruga",
        name: "駿河区",
        center: [138.403, 34.955]
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [138.35, 34.99],
          [138.46, 34.99],
          [138.46, 34.92],
          [138.35, 34.92],
          [138.35, 34.99]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        id: "shimizu",
        name: "清水区",
        center: [138.489, 35.016]
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [138.45, 35.08],
          [138.53, 35.08],
          [138.53, 34.95],
          [138.45, 34.95],
          [138.45, 35.08]
        ]]
      }
    }
  ]
};

// メッシュグリッドの生成（0.01度 = 約1km四方）
export function generateMeshGrid(
  bounds: [number, number, number, number],
  gridSize: number = 0.01
): FeatureCollection<Polygon, MeshProperties> {
  const [minLng, minLat, maxLng, maxLat] = bounds;
  const features: Feature<Polygon, MeshProperties>[] = [];

  for (let lng = minLng; lng < maxLng; lng += gridSize) {
    for (let lat = minLat; lat < maxLat; lat += gridSize) {
      features.push({
        type: "Feature",
        properties: {
          id: `mesh_${lng}_${lat}`,
          bounds: [lng, lat, lng + gridSize, lat + gridSize],
          buildingCount: 0,
          damageCount: 0,
          damageRate: 0
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [lng, lat],
            [lng + gridSize, lat],
            [lng + gridSize, lat + gridSize],
            [lng, lat + gridSize],
            [lng, lat]
          ]]
        }
      });
    }
  }

  return {
    type: "FeatureCollection",
    features
  };
}

// 建物データをメッシュに集計
export function aggregateBuildingsToMesh(
  buildings: Building[],
  meshGrid: FeatureCollection<Polygon, MeshProperties>
): FeatureCollection<Polygon, MeshProperties> {
  const meshFeatures = [...meshGrid.features];

  // 各建物をメッシュに割り当て
  buildings.forEach((building) => {
    const lng = building.location.lng;
    const lat = building.location.lat;

    // 該当するメッシュを見つける
    const meshIndex = meshFeatures.findIndex((mesh) => {
      const [minLng, minLat, maxLng, maxLat] = mesh.properties.bounds;
      return lng >= minLng && lng < maxLng && lat >= minLat && lat < maxLat;
    });

    if (meshIndex !== -1) {
      meshFeatures[meshIndex].properties.buildingCount++;
      if (building.damageLevel > 0) {
        meshFeatures[meshIndex].properties.damageCount++;
      }
    }
  });

  // 被害率を計算
  meshFeatures.forEach((mesh) => {
    if (mesh.properties.buildingCount > 0) {
      mesh.properties.damageRate =
        mesh.properties.damageCount / mesh.properties.buildingCount;
    }
  });

  // 建物が0のメッシュを除外
  const filteredFeatures = meshFeatures.filter(
    (mesh) => mesh.properties.buildingCount > 0
  );

  return {
    type: "FeatureCollection",
    features: filteredFeatures
  };
}

// 被害率に基づく色を取得
export function getDamageColor(damageRate: number): string {
  if (damageRate === 0) return '#10B981'; // 緑
  if (damageRate < 0.2) return '#84CC16'; // 黄緑
  if (damageRate < 0.4) return '#F59E0B'; // 黄
  if (damageRate < 0.6) return '#F97316'; // 橙
  if (damageRate < 0.8) return '#EF4444'; // 赤
  return '#991B1B'; // 濃い赤
}

// 地区ごとの集計データをGeoJSONに変換
export function createDistrictGeoJSON(
  districtStats: DistrictStatsMap,
  districtPolygons: FeatureCollection<Polygon, DistrictProperties>
): FeatureCollection<Polygon, EnhancedDistrictProperties> {
  const features = districtPolygons.features.map((district) => {
    const stats = districtStats[district.properties.id];
    const damageRate = stats ? stats.damageRate / 100 : 0;

    return {
      type: "Feature" as const,
      geometry: district.geometry,
      properties: {
        ...district.properties,
        total: stats?.total || 0,
        damaged: stats?.damaged || 0,
        damageRate,
        fillColor: getDamageColor(damageRate),
        fillOpacity: 0.7
      }
    };
  });

  return {
    type: "FeatureCollection",
    features
  };
}
