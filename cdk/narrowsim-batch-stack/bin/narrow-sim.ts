#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { getProfile } from './utils';
import { NarrowSimBatchStack } from '../lib/narrow-sim';

const app = new cdk.App();
const profile = getProfile(app);

const simName = 'narrow';

new NarrowSimBatchStack(app, `${simName}-sim-batch-${profile.name}`, {
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION
	}
});
