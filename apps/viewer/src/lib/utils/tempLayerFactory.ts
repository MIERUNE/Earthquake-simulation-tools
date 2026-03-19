import { MVTLayer } from '@deck.gl/geo-layers';
import type { Layer } from '@deck.gl/core';
import type { Feature, Geometry } from 'geojson';
import type { DeckLayerConfig, LayerCallbacks, TemporalDisplacementLayerConfig } from './DeckLayerFactory';

interface FeatureProperties {
  displacement_mean?: string;
  bui_floor?: number;
  [key: string]: unknown;
}

/**
 * 変位値に基づく色分け
 */
const displacementValueColor = (val: number): [number, number, number, number] => {
  const alpha = 200;
  if (val < 0) return [200, 0, 0, alpha];
  if (val >= 0 && val < 50) return [80, 64, 191, alpha];
  if (val >= 50 && val < 100) return [64, 96, 191, alpha];
  if (val >= 100 && val < 150) return [64, 143, 191, alpha];
  if (val >= 150 && val < 200) return [64, 191, 191, alpha];
  if (val >= 200 && val < 250) return [64, 191, 164, alpha];
  if (val >= 250 && val < 300) return [64, 191, 127, alpha];
  if (val >= 300 && val < 350) return [96, 191, 64, alpha];
  if (val >= 350 && val < 400) return [64, 191, 64, alpha];
  if (val >= 400 && val < 450) return [127, 191, 64, alpha];
  if (val >= 450 && val < 500) return [191, 191, 64, alpha];
  if (val >= 500 && val < 550) return [191, 164, 64, alpha];
  if (val >= 550 && val < 600) return [191, 127, 64, alpha];
  if (val >= 600 && val < 650) return [191, 111, 64, alpha];
  if (val >= 650 && val < 700) return [191, 96, 64, alpha];
  if (val >= 700 && val < 750) return [191, 64, 64, alpha];
  if (val >= 750) return [191, 64, 111, alpha];
  return [0, 0, 0, 0];
};

/**
 * 時系列変位データのレイヤーを作成
 */
export const makeTempLayers = (
  layerConfigs: TemporalDisplacementLayerConfig[],
  timestamp: number,
  callbacks: LayerCallbacks = {}
): Layer[] => {
  const { onHover, onClick } = callbacks;
  const layers: Layer[] = [];

  for (const config of layerConfigs) {
    if (!config.visible) continue;

    if (config.type === 'temporal_displacement') {
      const { type: _type, source, visible: _visible, id, ...otherConfig } = config;

      layers.push(
        new MVTLayer({
          id: id,
          data: source,
          pickable: true,
          extruded: true,
          filled: true,
          stroked: false,
          getFillColor: (d: Feature<Geometry, FeatureProperties>) => {
            const properties = d.properties as FeatureProperties;
            if (properties.displacement_mean) {
              let dataArray: number[];
              try {
                dataArray = JSON.parse(properties.displacement_mean) as number[];
              } catch (_e) {
                try {
                  dataArray = JSON.parse('[' + properties.displacement_mean + ']') as number[];
                } catch (_e2) {
                  return [0, 0, 0, 0];
                }
              }
              if (dataArray.length === 0) {
                return [0, 0, 0, 0];
              }
              const val = Number(dataArray[timestamp]) || 0;
              return displacementValueColor(val * 10000);
            }
            return [0, 0, 0, 0];
          },
          getElevation: (d: Feature<Geometry, FeatureProperties>) => {
            const properties = d.properties as FeatureProperties;
            if ('bui_floor' in properties) {
              if (properties.bui_floor === 0) {
                return 2 * 3;
              } else {
                return (properties.bui_floor ?? 0) * 3;
              }
            }
            return 2 * 3;
          },
          updateTriggers: {
            getFillColor: [timestamp]
          },
          onHover: onHover,
          onClick: onClick,
          ...otherConfig
        })
      );
    }
  }

  return layers;
};
