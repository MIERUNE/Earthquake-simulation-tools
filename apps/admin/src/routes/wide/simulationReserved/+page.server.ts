import {
	createSimulationReserve,
	updateSimulationReserve
} from '$lib/server/simulationReserve';
import { getMeshcodeByPresetName } from '$lib/server/presetInfo';
import { executeSimulationApi } from '$lib/client/simulationApi';
import type { SimulationReserve } from '$lib/types';
import { v4 as uuidv4 } from 'uuid';
import { getByUserTypeJob } from '$lib/server/presetInfo';
import { JobType, SimulationStatus, SimulationType } from '$lib/utils/getName';
import { getUnixTimestamp } from '$lib/utils/common';
import { generateWideDppContent } from '$lib/utils/dppGenerator';
import type { PageServerLoad, Actions } from './$types';

export const actions: Actions = {
	addSimulationBooking: async ({ request, locals }) => {
		try {
			// Check authentication
			if (!locals.user) {
				return {
					type: 'error',
					error: 'Unauthorized'
				};
			}

			const formData = await request.formData();
			const regionName = formData.get('regionName') as string;
			const presetName = formData.get('presetName') as string;

			if (!regionName || !presetName) {
				return {
					type: 'error',
					error: 'Region name and earthquake preset are required'
				};
			}

			// シミュレーションIDを生成
			const simulationId = uuidv4();

			// 出力パスを生成（S3バケットへのパス）
			const outputPath = `${simulationId}/SHP`;
			// 出力ディレクトリを設定
			const outputDir = `/output/${outputPath}`;

			// シミュレーション予約レコードを作成
			const simulationReserve: SimulationReserve = {
				id: simulationId,
				userId: locals.user.userId,
				type: SimulationType.Wide,
				regionName: regionName,
				paramName: presetName,
				status: SimulationStatus.reservation.toString(),
				createDateTime: getUnixTimestamp(Date.now()),
				outputPath: outputPath, // 出力パスを追加
				outputDir: outputDir, // 出力ディレクトリを追加
				uuid: uuidv4() // Add UUID for tracking
			};

			// DynamoDBにシミュレーション予約を保存
			console.log('Saving simulation reservation:', simulationReserve);
			const saveResult = await createSimulationReserve(simulationReserve, locals.user);
			
			if (!saveResult.success) {
				throw new Error('Failed to create simulation reservation');
			}

			// 選択された名前を用いてDynamoDBのregionPresetsからmeshCodeを取得
			const meshCode = await getMeshcodeByPresetName(
				locals.user.userId,
				SimulationType.Wide,
				JobType.Area,
				regionName
			);

			// メッシュコードが取得できなかった場合のエラー処理
			if (!meshCode) {
				throw new Error('Failed to retrieve mesh code for the selected region');
			}

			try {
				// DPPファイル内容の生成 - UUIDを渡す
				const dppContent = generateWideDppContent(meshCode, presetName, simulationId);
				console.log('Generated DPP content:', dppContent.substring(0, 200) + '...');

				// シミュレーションAPIの実行
				console.log('Executing simulation API...');
				const apiResult = await executeSimulationApi(simulationReserve, dppContent);
				console.log('API result:', apiResult);

				if (apiResult.success && apiResult.data) {
					// APIレスポンスを使用してシミュレーション予約を更新
					console.log('Updating simulation with API response...');

					// API結果から実際の出力ディレクトリがあれば更新
					const outputDir = `output/${simulationId}`;
					simulationReserve.outputDir = outputDir;

					const updateSuccess = await updateSimulationReserve(
						simulationReserve.id,
						{
							uuid: apiResult.data.uuid,
							jobId: apiResult.data.jobId,
							status: apiResult.data.status || 'SUBMITTED',
							statusMessage: apiResult.data.message,
							logUrl: apiResult.data.log_url
						},
						locals.user
					);

					if (!updateSuccess) {
						console.warn('Failed to update simulation with API response');
					}

					return {
						type: 'success',
						data: {
							simulationId: simulationReserve.id,
							status: apiResult.data.status || 'SUBMITTED',
							uuid: apiResult.data.uuid,
							message: apiResult.data.message || 'Simulation started successfully'
						}
					};
				} else {
					// API呼び出しが失敗した場合
					console.error('API execution failed:', apiResult.error);
					await updateSimulationReserve(
						simulationReserve.id,
						{
							uuid: `failed-${Date.now()}`,
							jobId: `failed-${Date.now()}`,
							status: 'FAILED',
							statusMessage: apiResult.error || 'API execution failed'
						},
						locals.user
					);

					return {
						type: 'error',
						error: `API execution failed: ${apiResult.error}`
					};
				}
			} catch (error) {
				// エラーが発生した場合はAPIレスポンス形式でエラー情報を更新
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error occurred';
				await updateSimulationReserve(
					simulationReserve.id,
					{
						uuid: `error-${Date.now()}`,
						status: 'FAILED',
						statusMessage: errorMessage
					},
					locals.user
				);

				return {
					type: 'error',
					error: errorMessage
				};
			}
		} catch (topLevelError) {
			console.error('Top level error in addSimulationBooking:', topLevelError);
			return {
				type: 'error',
				error:
					topLevelError instanceof Error
						? topLevelError.message
						: 'An unexpected error occurred'
			};
		}
	}
};

// 地域プリセットと地震動プリセットの読み込み
export const load: PageServerLoad = async ({ locals }) => {
	// Check authentication
	if (!locals.user) {
		return {
			regionPresets: [],
			earthquakePresets: []
		};
	}

	try {
		// 地域プリセットを取得
		const regionPresets = await getByUserTypeJob(
			locals.user.userId,
			SimulationType.Wide,
			JobType.Area,
			locals.user
		);
		
		// 地震動プリセットを取得
		const earthquakePresets = await getByUserTypeJob(
			locals.user.userId,
			SimulationType.Wide,
			JobType.Earthquake,
			locals.user
		);

		return {
			regionPresets: regionPresets,
			earthquakePresets: earthquakePresets
		};
	} catch (error) {
		console.error('Failed to load presets:', error);
		return {
			regionPresets: [],
			earthquakePresets: []
		};
	}
};
