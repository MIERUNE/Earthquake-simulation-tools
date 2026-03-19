import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findByUuid, updateSimulationWithApiResponse } from '$lib/client/simulationReserve';
import type { SimulationApiResponse } from '$lib/client/simulationApi';

/**
 * シミュレーションAPIからのwebhookを処理するPOSTハンドラ
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		// リクエストボディをパース
		const payload = await request.json();
		console.log('Received webhook payload:', payload);

		// APIキーの検証 (オプション)
		const apiKey = request.headers.get('x-api-key');
		const expectedApiKey = import.meta.env.VITE_SIMULATION_WEBHOOK_API_KEY;

		if (expectedApiKey && apiKey !== expectedApiKey) {
			console.warn('Invalid API key in webhook request');
			return json({ success: false, error: 'Invalid API key' }, { status: 401 });
		}

		// UUIDが必要
		if (!payload.uuid) {
			return json({ success: false, error: 'Missing uuid in payload' }, { status: 400 });
		}

		// UUIDからシミュレーションを検索
		const simulation = await findByUuid(payload.uuid);

		if (!simulation) {
			return json(
				{ success: false, error: `No simulation found for uuid: ${payload.uuid}` },
				{ status: 404 }
			);
		}

		// APIレスポンスとしてペイロードを整形
		const apiResponse: SimulationApiResponse = {
			uuid: payload.uuid,
			message: payload.message || 'Status update received',
			simulationId: simulation.id,
			// statusは送信側が追加している可能性を考慮
			status: payload.status || (payload.completed ? 'SUCCEEDED' : 'RUNNING')
		};

		// log_urlが存在する場合は追加
		if (payload.log_url) {
			apiResponse.log_url = payload.log_url;
		}

		// その他のフィールドを追加
		Object.entries(payload).forEach(([key, value]) => {
			if (!['uuid', 'message', 'simulationId', 'status', 'log_url'].includes(key)) {
				apiResponse[key] = value;
			}
		});

		// シミュレーション情報を更新
		const updateResult = await updateSimulationWithApiResponse(simulation.id, apiResponse);

		if (updateResult) {
			return json({
				success: true,
				message: 'Simulation updated successfully',
				simulationId: simulation.id,
				uuid: payload.uuid
			});
		} else {
			return json(
				{
					success: false,
					error: 'Failed to update simulation',
					simulationId: simulation.id,
					uuid: payload.uuid
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error('Error processing webhook:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Internal server error'
			},
			{ status: 500 }
		);
	}
};

/**
 * シミュレーションAPIのwebhook設定を確認するためのGETハンドラ
 */
export const GET: RequestHandler = async () => {
	return json({
		success: true,
		message: 'Simulation webhook endpoint is active'
	});
};
