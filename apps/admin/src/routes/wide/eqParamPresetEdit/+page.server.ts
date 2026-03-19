import { putPresetInfo } from '$lib/client/presetInfo';
import type { PresetInfo } from '$lib/types/index.js';
import { getUnixTimestamp } from '$lib/utils/common';
import { JobType, SimulationType } from '$lib/utils/getName';
import { v4 as uuidv4 } from 'uuid';

export const actions = {
	updateEqParam: async ({ request }) => {
		const formData = await request.formData();
		const eqParamName = formData.get('eqParamName');
		if (!eqParamName || typeof eqParamName !== 'string') {
			return {
				status: 400,
				body: { error: '地震動識別名は必須です' }
			};
		}

		const presetInfo: PresetInfo = {
			id: uuidv4(),
			userId: 'us-east-1:12345678-1234-1234-1234-123456789012',
			type: SimulationType.Wide,
			job: JobType.Earthquake,
			regionName: '',
			presetName: (eqParamName as string) || '',
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

		console.log('regionName:', eqParamName);
	}
};
