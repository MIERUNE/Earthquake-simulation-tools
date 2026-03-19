import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { aws_ecs as ecs } from 'aws-cdk-lib';
import { Duration, aws_batch as batch } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import path = require('path');

const simName = 'Narrow';
const stackName = `Sim${simName}Batch`;

//本番設置に使用される環境変数の名前
const production_env_name = 'production';

export class NarrowSimBatchStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const vpcId = this.node.tryGetContext('vpcId');
		const vpc = ec2.Vpc.fromLookup(this, `${stackName}VPC`, {
			vpcId: vpcId
		});

		const narrowBucketName = this.node.tryGetContext('s3BucketName') || 'SET_S3_BUCKET_NAME';
		const bucket = s3.Bucket.fromBucketName(
			this,
			`${stackName}-S3Bucket`,
			narrowBucketName
		);

		// IAM ロールの作成 (ECSの実行に使用 executionRoleArn ) 自動的に作成されるので基本不要
		// const executionRoleRole = new iam.Role(this, `${stackName}ExecutionRole`, {
		//   assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
		//   managedPolicies: [
		//     iam.ManagedPolicy.fromAwsManagedPolicyName(
		//       "service-role/AmazonECSTaskExecutionRolePolicy"
		//     ),
		//   ],
		// });

		// IAMロールの作成 (Batch ジョブの実行に使用 jobRoleArn)
		const jobRole = new iam.Role(this, `${stackName}JobRole`, {
			assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com')
		});

		// S3アクセスのためのポリシーをアタッチ
		jobRole.addToPolicy(
			new iam.PolicyStatement({
				actions: ['s3:GetObject', 's3:ListBucket', 's3:PutObject'],
				resources: [
					`arn:aws:s3:::${bucket.bucketName}`,
					`arn:aws:s3:::${bucket.bucketName}/*`
				]
			})
		);

		// DynamoDBアクセスのためのポリシーをアタッチ
		jobRole.addToPolicy(
			new iam.PolicyStatement({
				actions: [
					'dynamodb:UpdateItem', // DynamoDBの更新操作
					'dynamodb:GetItem', // 必要に応じて取得操作も追加
					'dynamodb:PutItem' // 必要に応じて新規作成操作も追加
				],
				resources: [
					`arn:aws:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/simulation_reserve`
				]
			})
		);

		/**
		 * コンピューティング環境の作成 (Fargate)
		 */
		const computeEnvironmentFargate = new batch.FargateComputeEnvironment(
			this,
			`${stackName}EnvFargate`,
			{
				vpc: vpc,
				maxvCpus: 16,
				spot: false
				//spot: true
			}
		);

		/**
		 * ジョブキューの作成
		 */
		const jobQueue = new batch.JobQueue(this, `${stackName}JQue`, {
			priority: 1,
			computeEnvironments: [
				{
					computeEnvironment: computeEnvironmentFargate,
					order: 1
				}
			]
		});

		/**
		 * コンテナ定義 (Fargate)
		 */
		const containerDefinitionFargate = new batch.EcsFargateContainerDefinition(
			this,
			`${stackName}DefFargate`,
			{
				image: ecs.ContainerImage.fromAsset(path.resolve(__dirname, '../', 'narrow-batch')),
				cpu: 2,
				memory: cdk.Size.mebibytes(1024 * 16),
				logging: new ecs.AwsLogDriver({
					streamPrefix: `${stackName}-batch-log`,
					logRetention: logs.RetentionDays.ONE_DAY
				}),
				//ECRからPullする場合に使用 (パブリックサブネットにある場合)
				assignPublicIp: true,
				//FargateのCPUアーキテクチャ Soptの場合はARM64は使用不可
				//fargateCpuArchitecture: ecs.CpuArchitecture.ARM64,
				fargateCpuArchitecture: ecs.CpuArchitecture.X86_64,
				jobRole: jobRole,
				environment: {
					ID: 'placeholder',
					TEST: 'TRUE',
					S3_BUCKET_NAME: narrowBucketName
				}
			}
		);

		/**
		 * ジョブ定義の作成
		 */
		const timeout = Duration.seconds(60 * 60 * 5); // 5時間
		const jobDefinition = new batch.EcsJobDefinition(this, `${stackName}JobDef`, {
			container: containerDefinitionFargate,
			timeout: timeout,
			retryAttempts: 1
		});

		/**
		 * 出力 (オプション)
		 */
		new cdk.CfnOutput(this, `${stackName}-BatchJobQueueArn`, {
			value: jobQueue.jobQueueArn
		});
	}
}
