import type {
	Dataset,
	LegendItem,
	LayerConfig,
	MenuCategory,
	MenuItem,
	ConfigData
} from '../types/dataset';
import { buildings, damageTypes } from '../shizuokaSimulationData';
import { calculateAllRoadBlockages, keyFacilities } from '../shizuokaRoadData';

/**
 * menu.json、config.json、静岡シミュレーションデータを統合して
 * 統一されたDataset配列を生成する
 */
export const buildUnifiedDatasets = (
	menu: MenuCategory[],
	config: ConfigData,
	shizuokaDatasets: Dataset[]
): Dataset[] => {
	const result: Dataset[] = [];

	// 1. menu.jsonとconfig.jsonからデータセットを構築
	menu.forEach((category) => {
		category.data.forEach((item) => {
			// config.jsonから対応するレイヤー情報を取得
			const layerConfigs = item.id
				.map((layerId) => config.layers.find((layer) => layer.id === layerId))
				.filter((layer): layer is LayerConfig => layer !== undefined);

			if (layerConfigs.length === 0) return;

			const firstLayerConfig = layerConfigs[0];

			// typeを適切なDataset['type']にマッピング
			let datasetType: Dataset['type'];
			if (firstLayerConfig.type === 'pmtiles') {
				datasetType = 'pmtiles';
			} else if (firstLayerConfig.type === 'temporal_displacement') {
				datasetType = 'temporal_displacement';
			} else if (firstLayerConfig.type === 'geojson' || firstLayerConfig.type === 'geojsonicon') {
				datasetType = 'geojson';
			} else {
				// mvt, mvt_emergency_road, gltf など、Deck.glで処理するレイヤー
				datasetType = 'deckgl';
			}

			result.push({
				id: item.id[0], // 最初のIDを代表IDとする
				name: item.title,
				category: category.category,
				type: datasetType,
				checked: item.checked,
				description: item.title,
				layerIds: item.id,
				layerConfigs: layerConfigs,
				legend: buildLegendFromLayer(firstLayerConfig),
				lng: item.lng,
				lat: item.lat,
				zoom: item.zoom,
				downloadUrl: item.downloadUrl || item.download_url // キャメルケースとスネークケースの両方をサポート
			});
		});
	});

	// 2. 静岡シミュレーションデータを追加
	// カテゴリーが重複しないように調整
	shizuokaDatasets.forEach((dataset) => {
		result.push({
			...dataset,
			// IDが重複しないようにプレフィックスを付ける
			id: `shizuoka-${dataset.id}`,
			// カテゴリーに「静岡」プレフィックスを付ける
			category: `静岡/${dataset.category}`
		});
	});

	return result;
};

/**
 * レイヤー設定から凡例を構築
 */
const buildLegendFromLayer = (layerConfig: LayerConfig): LegendItem[] => {
	if (!layerConfig) return [];

	// PMTilesレイヤーの場合、paintプロパティから凡例を生成
	if (layerConfig.type === 'pmtiles' && layerConfig.paint?.['fill-color']) {
		const fillColor = layerConfig.paint['fill-color'];
		if (Array.isArray(fillColor) && fillColor[0] === 'step') {
			const legend: LegendItem[] = [];
			for (let i = 3; i < fillColor.length; i += 2) {
				if (i + 1 < fillColor.length) {
					legend.push({
						label: `${fillColor[i]} 以上`,
						color: fillColor[i + 1] as string
					});
				}
			}
			return legend;
		}
	}

	return [];
};

/**
 * 静岡シミュレーションデータをDataset形式に変換
 */
export const getShizuokaDatasets = (): Dataset[] => {
	return [
		{
			id: 'building-damage',
			name: '建物被害分布',
			category: 'damage',
			type: 'geojson',
			checked: false,
			count: buildings.length,
			description: '地震による建物の被害状況',
			legend: Object.entries(damageTypes).map(([, type]) => ({
				label: type.label,
				color: type.color
			})),
			data: buildings
		},
		{
			id: 'road-blockage',
			name: '道路閉塞予測',
			category: 'road',
			type: 'geojson',
			checked: false,
			count: 156,
			description: '緊急輸送道路の閉塞状況',
			legend: [
				{ label: '通行可能', color: '#10b981' },
				{ label: '一部閉塞', color: '#f59e0b' },
				{ label: '完全閉塞', color: '#ef4444' }
			],
			data: null // データは選択時に生成
		},
		{
			id: 'key-facilities',
			name: '重要施設',
			category: 'facility',
			type: 'geojson',
			checked: false,
			count: keyFacilities.length,
			description: '災害拠点病院・防災拠点',
			legend: [
				{ label: '災害拠点病院', color: '#ef4444' },
				{ label: '防災拠点', color: '#3b82f6' },
				{ label: '物資集積所', color: '#10b981' }
			],
			data: keyFacilities
		},
		{
			id: 'evacuation-sites',
			name: '避難所',
			category: 'evacuation',
			type: 'geojson',
			checked: false,
			count: 45,
			description: '指定避難所・広域避難場所',
			legend: [
				{ label: '指定避難所', color: '#8b5cf6' },
				{ label: '広域避難場所', color: '#06b6d4' }
			],
			data: null // モックデータ
		},
		{
			id: 'population-density',
			name: '人口密度',
			category: 'demographic',
			type: 'geojson',
			checked: false,
			count: 120,
			description: '地区別人口密度（ヒートマップ）',
			legend: [
				{ label: '高密度', color: '#dc2626' },
				{ label: '中密度', color: '#f59e0b' },
				{ label: '低密度', color: '#3b82f6' }
			],
			data: null
		},
		{
			id: 'tsunami-risk',
			name: '津波浸水想定',
			category: 'hazard',
			type: 'geojson',
			checked: false,
			description: '想定津波浸水エリア',
			legend: [
				{ label: '0.5m未満', color: '#dbeafe' },
				{ label: '0.5-2m', color: '#93c5fd' },
				{ label: '2m以上', color: '#2563eb' }
			],
			data: null
		},
		{
			id: 'building-age',
			name: '建物築年数分布',
			category: 'infrastructure',
			type: 'geojson',
			checked: false,
			count: buildings.length,
			description: '建物の築年数別分布',
			legend: [
				{ label: '築50年以上', color: '#dc2626' },
				{ label: '築30-50年', color: '#f59e0b' },
				{ label: '築30年未満', color: '#10b981' }
			],
			data: null
		},
		{
			id: 'soil-type',
			name: '地盤種別',
			category: 'geological',
			type: 'geojson',
			checked: false,
			description: '地盤の種類別分布',
			legend: [
				{ label: '軟弱地盤', color: '#ef4444' },
				{ label: '中間地盤', color: '#f59e0b' },
				{ label: '良好地盤', color: '#10b981' }
			],
			data: null
		},
		{
			id: 'earthquake-intensity',
			name: '予測震度分布',
			category: 'hazard',
			type: 'geojson',
			checked: false,
			description: '地震時の予測震度分布',
			legend: [
				{ label: '震度7', color: '#7c2d12' },
				{ label: '震度6強', color: '#dc2626' },
				{ label: '震度6弱', color: '#f59e0b' },
				{ label: '震度5強', color: '#fbbf24' },
				{ label: '震度5弱', color: '#fde047' }
			],
			data: null
		},
		{
			id: 'fire-risk',
			name: '火災危険度',
			category: 'hazard',
			type: 'geojson',
			checked: false,
			count: 85,
			description: '地震時の火災発生リスク',
			legend: [
				{ label: '高リスク', color: '#dc2626' },
				{ label: '中リスク', color: '#f59e0b' },
				{ label: '低リスク', color: '#fbbf24' }
			],
			data: null
		},
		{
			id: 'liquefaction-risk',
			name: '液状化リスク',
			category: 'hazard',
			type: 'geojson',
			checked: false,
			description: '液状化発生の可能性',
			legend: [
				{ label: '高い', color: '#6366f1' },
				{ label: '中程度', color: '#a78bfa' },
				{ label: '低い', color: '#ddd6fe' }
			],
			data: null
		},
		{
			id: 'water-supply',
			name: '上水道網',
			category: 'infrastructure',
			type: 'geojson',
			checked: false,
			count: 320,
			description: '上水道管路網と被害予測',
			legend: [
				{ label: '主要管路', color: '#2563eb' },
				{ label: '配水管', color: '#60a5fa' }
			],
			data: null
		}
	];
};
