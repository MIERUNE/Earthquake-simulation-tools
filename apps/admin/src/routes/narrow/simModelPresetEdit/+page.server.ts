import { putPresetInfo } from '$lib/client/presetInfo';
import type { PresetInfo } from '$lib/types/index.js';
import { getUnixTimestamp } from '$lib/utils/common';
import { JobType, SimulationType } from '$lib/utils/getName';
import { v4 as uuidv4 } from 'uuid';

export const actions = {
	updateAnalysisModel: async ({ request }) => {
		const formData = await request.formData();
		const analysisModelName = formData.get('analysisModelName');
		if (!analysisModelName || typeof analysisModelName !== 'string') {
			return {
				status: 400,
				body: { error: '解析モデル識別名は必須です' }
			};
		}

		const presetInfo: PresetInfo = {
			id: uuidv4(),
			userId: 'us-east-1:12345678-1234-1234-1234-123456789012',
			type: SimulationType.Narrow,
			job: JobType.Analysis_model,
			regionName: '',
			presetName: (analysisModelName as string) || '',
			meshCode: [],
			gmlFilePath: '',
			wideLongPeriodParamFilePath: '',
			wideNormalParamFilePath: '',
			wideDirectlyParamFilePath: '',
			narrowAnalysisModelFilePath: '',
			narrowParamFilePath: '',
			narrowForceParamFilePath: '',
			narrowCalcParamFilePath: '',
			additionalInfo: '',
			createDateTime: getUnixTimestamp(Date.now())
		};

		putPresetInfo(presetInfo);

		console.log('analysisModelName:', analysisModelName);
	}
};
