import { putPresetInfo } from '$lib/client/presetInfo';
import type { PresetInfo } from '$lib/types/index.js';
import { getUnixTimestamp } from '$lib/utils/common';
import { JobType, SimulationType } from '$lib/utils/getName';
import { v4 as uuidv4 } from 'uuid';

export const actions = {
	updateAreaPreset: async ({ request }) => {
		const formData = await request.formData();
		const regionName = formData.get('regionName');
		const meshCodesJson = formData.get('meshCodes');

		if (!regionName || typeof regionName !== 'string') {
			return {
				status: 400,
				body: { error: '地域名は必須です' }
			};
		}

		let meshCodes: Array<string> = [];
		if (meshCodesJson && typeof meshCodesJson === 'string') {
			try {
				meshCodes = JSON.parse(meshCodesJson);
			} catch (error) {
				console.error('Error parsing meshCodes:', error);
			}
		}

		const presetInfo: PresetInfo = {
			id: uuidv4(),
			userId: 'us-east-1:12345678-1234-1234-1234-123456789012',
			type: SimulationType.Wide,
			job: JobType.Area,
			regionName: (regionName as string) || '',
			presetName: (regionName as string) || '',
			meshCode: meshCodes,
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

		console.log('regionName:', regionName);
	}
};
