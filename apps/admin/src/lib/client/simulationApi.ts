import type { SimulationReserve } from '$lib/types';

/**
 * APIレスポンスの型定義
 * 実際のAPIレスポンス形式に合わせて更新
 */
export interface SimulationApiResponse {
	uuid: string; // シミュレーションジョブのUUID
	message: string; // 処理結果メッセージ
	log_url?: string; // ログURL
	jobId?: string; // 互換性のためのジョブID（実際のAPIレスポンスにはない）
	simulationId?: string; // 内部管理用シミュレーションID
	status?: string; // 内部管理用ステータス
	[key: string]: unknown; // その他の追加フィールド
}

/**
 * ランダムなUUIDを生成する関数
 * @returns UUID文字列
 */
const generateUUID = (): string => {
	// crypto APIを安全に使用
	try {
		// ブラウザ環境用
		if (
			typeof window !== 'undefined' &&
			window.crypto &&
			typeof window.crypto.randomUUID === 'function'
		) {
			return window.crypto.randomUUID();
		}
		// Node.js環境用
		else if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
			return crypto.randomUUID();
		}
	} catch {
		console.warn('Crypto API not available, using fallback UUID generation');
	}

	// フォールバック: 単純なタイムスタンプベースのUUID
	const timestamp = new Date().getTime().toString(16);
	const random = Math.floor(Math.random() * 10000000000000).toString(16);
	return `mock-${timestamp}-${random}`;
};

/**
 * シミュレーションAPIを呼び出す
 * @param simulationReserve シミュレーション予約データ
 * @param dppContent dppファイルの内容
 * @returns API呼び出し結果
 */
export const executeSimulationApi = async (
	simulationReserve: SimulationReserve,
	dppContent: string
): Promise<{ success: boolean; data?: SimulationApiResponse; error?: string }> => {
	try {
		// ファイル名の設定
		const dppFileName = `${simulationReserve.id}.dpp`;
		console.log('Executing simulation API with:', {
			simulationId: simulationReserve.id,
			simulationType: simulationReserve.type,
			dppContentPreview: dppContent.substring(0, 100) + '...'
		});

		// 開発環境の場合はモックレスポンスを返す
		// if (import.meta.env.DEV || !import.meta.env.VITE_SIMULATION_API_ENDPOINT) {
		// 	console.log('Development mode: Using mock API response');
		// 	// 実際のDPPファイル内容をログに出力（デバッグ用）
		// 	console.log('DPP File Content:', dppContent);

		// 	// モック用のUUID生成
		// 	const mockUuid = generateUUID();

		// 	// 実際のAPIレスポンス形式に合わせたモックレスポンス
		// 	return {
		// 		success: true,
		// 		data: {
		// 			uuid: mockUuid,
		// 			message: 'File submitted and processed successfully.',
		// 			log_url: `http://example.com/log/${mockUuid}`,
		// 			// 内部管理用の追加フィールド
		// 			simulationId: simulationReserve.id,
		// 			status: 'SUBMITTED'
		// 		}
		// 	};
		// }

		// CSVファイルの取得 - 地震動データから対応するCSVファイルを取得
		const csvFileName = `${simulationReserve.paramName}.csv`;
		//const csvData = await fetchCsvData(simulationReserve.paramName);

		// DPPコンテンツとCSVデータをBlobに変換
		const dppBlob = new Blob([dppContent], { type: 'text/plain' });
		//const csvBlob = new Blob([csvData], { type: 'text/csv' });

		// FormDataを作成
		const formData = new FormData();
		formData.append('script', dppBlob, dppFileName);
		//formData.append('csv', csvBlob, csvFileName);

		// APIエンドポイントとAPIキーを設定

		const API_ENDPOINT =
			import.meta.env.VITE_SIMULATION_API_ENDPOINT || 'default-api-endpoint';
		const API_KEY =
			import.meta.env.VITE_SIMULATION_API_KEY || 'default-api-key';

		// APIを呼び出す
		const response = await fetch(API_ENDPOINT, {
			method: 'POST',
			headers: {
				'X-API-Key': API_KEY
			},
			body: formData
		});

		if (!response.ok) {
			throw new Error(`API error: ${response.status} ${response.statusText}`);
		}

		// レスポンスをパースして適切な形式に整形
		const apiResponse = await response.json();

		// 応答データを検証
		if (!apiResponse.uuid) {
			throw new Error('Invalid API response: missing uuid field');
		}

		// 内部管理用の情報を追加
		const enrichedResponse: SimulationApiResponse = {
			...apiResponse,
			simulationId: simulationReserve.id,
			jobId: apiResponse.uuid, // uuidをjobIdとして使用
			status: 'SUBMITTED'
		};

		console.log('API response:', enrichedResponse);
		return {
			success: true,
			data: enrichedResponse
		};
	} catch (error) {
		console.error('Simulation API execution failed:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
};

/**
 * 地震動データ名からCSVデータを取得する
 * @param earthquakeName 地震動データ名
 * @returns CSVデータ
 */
const fetchCsvData = async (earthquakeName: string): Promise<string> => {
	// 開発環境の場合は模擬データを返す
	// if (import.meta.env.DEV) {
	// 	// 模擬データを生成
	// 	return generateMockCsvData(earthquakeName);
	// }

	try {
		// 実際の実装では、S3やDBからCSVデータを取得する
		//const csvUrl = `${import.meta.env.VITE_CSV_DATA_BASE_URL}/${earthquakeName}.csv`;
		const csvBaseUrl = import.meta.env.VITE_CSV_DATA_BASE_URL || '';
		const csvUrl = `${csvBaseUrl}/WAV073_K-TOHOKU.csv`;
		const response = await fetch(csvUrl);

		if (!response.ok) {
			throw new Error(`Failed to fetch CSV data: ${response.status} ${response.statusText}`);
		}

		return await response.text();
	} catch (error) {
		console.error('Error fetching CSV data:', error);
		// エラー時は模擬データを返す
		return generateMockCsvData(earthquakeName);
	}
};

/**
 * 地震動データ用の模擬CSVデータを生成する
 * @param earthquakeName 地震動データ名
 * @returns 模擬CSVデータ
 */
const generateMockCsvData = (earthquakeName: string): string => {
	// 模擬データのヘッダー
	const header = 'time,acceleration_x,acceleration_y,acceleration_z';

	// 100行のランダムデータを生成
	const rows: string[] = [];
	for (let i = 0; i < 100; i++) {
		const time = i * 0.01;
		const accX = (Math.random() - 0.5) * 2;
		const accY = (Math.random() - 0.5) * 2;
		const accZ = (Math.random() - 0.5) * 2;
		rows.push(`${time.toFixed(2)},${accX.toFixed(4)},${accY.toFixed(4)},${accZ.toFixed(4)}`);
	}

	console.log(`Generated mock CSV data for ${earthquakeName}`);
	return `${header}\n${rows.join('\n')}`;
};
