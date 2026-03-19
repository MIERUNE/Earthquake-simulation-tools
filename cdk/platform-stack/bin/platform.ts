#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { getProfile } from './utils';
import { PlatformSimStack } from '../lib/platform';

const app = new cdk.App();
const profile = getProfile(app);

new PlatformSimStack(app, `platform-sim-${profile.name}`, {
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION
	}
});
