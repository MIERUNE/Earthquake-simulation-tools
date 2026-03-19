import { putPresetInfo } from '$lib/client/presetInfo';
import type { PresetInfo } from '$lib/types/index.js';
import { JobType, SimulationType } from '$lib/utils/getName.js';
import { getUnixTimestamp } from '$lib/utils/common';
import { v4 as uuidv4 } from 'uuid';

export const actions = {
	updateBuildingPreset: async ({ request }) => {
		const formData = await request.formData();
		const buildingName = formData.get('buildingName');
		if (!buildingName || typeof buildingName !== 'string') {
			return {
				status: 400,
				body: { error: '建物名は必須です' }
			};
		}

		const presetInfo: PresetInfo = {
			id: uuidv4(),
			userId: 'us-east-1:12345678-1234-1234-1234-123456789012',
			type: SimulationType.Narrow,
			job: JobType.Building,
			regionName: (buildingName as string) || '',
			presetName: (buildingName as string) || '',
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

		console.log('buildingName:', buildingName);
	}
};
