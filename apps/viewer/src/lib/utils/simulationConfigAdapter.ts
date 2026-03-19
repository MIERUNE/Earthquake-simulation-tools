/**
 * シミュレーション結果データとconfig.jsonを連携させるアダプター
 * 静的なconfig.jsonの設定を、動的なシミュレーション結果データに置き換える
 */

import type { ConfigData, LayerConfig } from '../types/dataset';
import type { ViewerInfoItem } from '../types/viewerInfo';

/**
 * シミュレーションIDから広域シミュレーションのタイルURLを生成
 * @param simulationId シミュレーションID
 * @param bucketName S3バケット名
 * @returns ベクタータイルのURLテンプレート
 */
export const getWideSimulationTileUrl = (
	simulationId: string,
	cloudFrontURL = ''
): string => {
	const cfUrl = cloudFrontURL || import.meta.env.VITE_CLOUDFRONT_URL || '';
	return `https://${cfUrl}/${simulationId}/tiles/{z}/{x}/{y}.pbf`;
};

/**
 * config.jsonの設定をシミュレーション結果に合わせて更新
 *
 * - building_damage レイヤーのsourceを、指定されたシミュレーションのタイルURLに置き換える
 * - main_shock などの時系列レイヤーも同様に置き換える
 *
 * @param config 元のconfig.json設定
 * @param simulation 選択されたシミュレーション情報
 * @returns 更新されたconfig設定
 */
export const adaptConfigForSimulation = (
	config: ConfigData,
	simulation: ViewerInfoItem | null
): ConfigData => {
	if (!simulation || !simulation.id) {
		// シミュレーションが選択されていない場合は、そのまま返す
		return config;
	}

	// 広域シミュレーションのタイルURLを生成
	const tileUrl = getWideSimulationTileUrl(simulation.id);

	// レイヤー設定を複製して更新
	const updatedLayers: LayerConfig[] = config.layers.map((layer) => {
		// building_damage や main_shock などのMVT/時系列レイヤーを対象
		const targetLayerIds = ['building_damage', 'main_shock', 'temporal_displacement'];

		if (targetLayerIds.includes(layer.id)) {
			return {
				...layer,
				source: tileUrl
			};
		}

		return layer;
	});

	return {
		...config,
		layers: updatedLayers
	};
};

/**
 * dataPathからS3バケット名とシミュレーションIDを抽出
 *
 * @param dataPath S3パス（例: "s3://your-bucket/output/simulation-uuid/tiles"）
 * @returns { bucket: string, simulationId: string } または null
 */
export const parseDataPath = (
	dataPath: string
): { bucket: string; simulationId: string } | null => {
	// s3://bucket-name/output/simulation-id/... の形式を想定
	const outputMatch = dataPath.match(/^s3:\/\/([^/]+)\/output\/([^/]+)/);
	if (outputMatch) {
		return {
			bucket: outputMatch[1],
			simulationId: outputMatch[2]
		};
	}

	// s3://bucket-name/simulation-id/... の旧形式も対応
	const legacyMatch = dataPath.match(/^s3:\/\/([^/]+)\/([^/]+)/);
	if (legacyMatch) {
		return {
			bucket: legacyMatch[1],
			simulationId: legacyMatch[2]
		};
	}

	return null;
};

/**
 * ViewerInfoItemからタイルURLを取得
 * dataPathが設定されている場合は、そこからバケット名とIDを抽出
 *
 * @param simulation シミュレーション情報
 * @returns タイルURL
 */
export const getTileUrlFromSimulation = (simulation: ViewerInfoItem): string => {
	if (simulation.dataPath) {
		const parsed = parseDataPath(simulation.dataPath);
		if (parsed) {
			return getWideSimulationTileUrl(parsed.simulationId, parsed.bucket);
		}
	}

	// フォールバック: simulationIdを直接使用
	return getWideSimulationTileUrl(simulation.id);
};
