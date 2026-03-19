#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MosiriStack } from '../lib/mosiri-stack';

const app = new cdk.App();
const stackName = 'mosiri';

new MosiriStack(app, `${stackName}-dev`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});
