import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { aws_ecs as ecs } from 'aws-cdk-lib';
import { Duration, aws_batch as batch } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import path = require('path');

const simName = 'Platform';
const stackName = `Sim${simName}`;

//本番設置に使用される環境変数の名前
const production_env_name = 'production';

export class PlatformSimStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		/**
		 * VPC
		 */
		const vpc = new ec2.Vpc(this, `BridgeSimVPC`, {
			natGateways: 0,
			subnetConfiguration: [
				{
					cidrMask: 24,
					name: `${stackName}PUBLIC`,
					subnetType: ec2.SubnetType.PUBLIC
				}
			],
			maxAzs: 1
		});

		/**
		 * S3 バケット (Narrowバッチ用)
		 */
		const bacthNarrowS3Bucket_name = `BridgeSim-Narrow-dev`.toLowerCase();
		const bacthNarrowS3Bucket = new s3.Bucket(this, bacthNarrowS3Bucket_name, {
			bucketName: bacthNarrowS3Bucket_name,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			removalPolicy: cdk.RemovalPolicy.RETAIN
		});

		/**
		 * S3 バケット (Wideバッチ用)
		 */
		const bacthWideS3Bucket_name = `BridgeSim-Wide-dev`.toLowerCase();
		const bacthWideS3Bucket = new s3.Bucket(this, bacthWideS3Bucket_name, {
			bucketName: bacthWideS3Bucket_name,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			removalPolicy: cdk.RemovalPolicy.RETAIN
		});
	}
}
