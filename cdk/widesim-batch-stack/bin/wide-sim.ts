#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { getProfile } from './utils';
import { WideSimBatchStack } from '../lib/wide-sim';

const app = new cdk.App();
const profile = getProfile(app);

const simName = 'wide';

new WideSimBatchStack(app, `${simName}-sim-batch-${profile.name}`, {
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION
	}
});
