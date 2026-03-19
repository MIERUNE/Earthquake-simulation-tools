import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { aws_ecs as ecs } from 'aws-cdk-lib';
import { Duration, aws_batch as batch } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import path = require('path');
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Runtime, AssetCode } from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

const simName = 'Wide';
const stackName = `Sim${simName}Batch`;

//本番設置に使用される環境変数の名前
const production_env_name = 'production';

export class WideSimBatchStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const vpcId = this.node.tryGetContext('vpcId');
		const vpc = ec2.Vpc.fromLookup(this, `${stackName}VPC`, {
			vpcId: vpcId
		});

		const bucketName = this.node.tryGetContext('s3BucketName');
		const bucket = s3.Bucket.fromBucketName(
			this,
			`${stackName}-S3Bucket`,
			bucketName
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
				actions: ['s3:GetObject', 's3:ListBucket', 's3:PutObject', 's3:DeleteObject'],
				resources: [
					`arn:aws:s3:::${bucket.bucketName}`,
					`arn:aws:s3:::${bucket.bucketName}/*`,
					`arn:aws:s3:::${this.node.tryGetContext('s3OutputBucketName') || 'SET_S3_OUTPUT_BUCKET'}`,
					`arn:aws:s3:::${this.node.tryGetContext('s3OutputBucketName') || 'SET_S3_OUTPUT_BUCKET'}/*`
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
				spot: true // スポットインスタンスを使用する場合はtrue
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
				image: ecs.ContainerImage.fromAsset(path.resolve(__dirname, '../', 'wide-batch')),
				cpu: 2,
				memory: cdk.Size.mebibytes(4096),
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
				ephemeralStorageSize: cdk.Size.gibibytes(100), // 一時ストレージを100GBに設定
				environment: {
					ID: 'placeholder',
					TEST: 'FALSE',
					S3_INPUT_BUCKET: bucket.bucketName,
					S3_OUTPUT_BUCKET: this.node.tryGetContext('s3OutputBucketName') || 'SET_S3_OUTPUT_BUCKET'
				}
			}
		);

		/**
		 * ジョブ定義の作成
		 */
		const timeout = Duration.seconds(60 * 60); // 1時間
		const jobDefinition = new batch.EcsJobDefinition(this, `${stackName}JobDef`, {
			container: containerDefinitionFargate,
			timeout: timeout,
			retryAttempts: 1
		});

		// #region Lambda関数

		// const lambdaFunction = new lambdaNode.NodejsFunction(this, 'MyFunction', {
		// 	entry: 'lambda/index.mjs', // .mjs ファイルを指定
		// 	runtime: lambda.Runtime.NODEJS_22_X, // Node.js 22 以降を使用
		// 	handler: 'index.handler',
		// 	code: lambda.Code.fromAsset(path.join(__dirname, 'lambda-handler')),
		// 	bundling: {
		// 		format: lambdaNode.OutputFormat.ESM, // 出力を ESM にする
		// 		target: 'node22', // Node.js のバージョンに合わせる
		// 		mainFields: ['module', 'main'], // ESM を優先
		// 	}
		// });

		// const lambdaFunction = new lambda.Function(this, `${stackName}-function`, {
		// 	runtime: lambda.Runtime.NODEJS_22_X,
		// 	handler: 'index.handler',
		// 	code: lambda.Code.fromAsset(path.join(__dirname, 'lambda-handler')),
		// 	//code: lambda.Code.fromAsset('./lib/lambda-handler'),
		// 	memorySize: 512,
		// 	timeout: Duration.seconds(128),
		// });

		// Lambda のセキュリティグループ
		//const lambdaSG = new ec2.SecurityGroup(this, 'LambdaSG', { vpc });

		// RDS のセキュリティグループに Lambda の SG を許可
		//rdsInstance.connections.allowFrom(lambdaSG, ec2.Port.tcp(5432));

		const lambdaFunction = new lambda.Function(this as Construct, `${stackName}-function`, {
			functionName: `${stackName}-function`,
			handler: 'handler.handler',
			runtime: Runtime.NODEJS_22_X,
			code: new AssetCode(`./src`),
			memorySize: 128,
			timeout: Duration.seconds(20),
			environment: {
				WIDE_JOBNAME: 'mosiri-wide-job-from-lambda',
				WIDE_JOBQUEUE: jobQueue.jobQueueName,
				WIDE_JOBDEFINITION: jobDefinition.jobDefinitionName,
				WIDE_SIMULATION_S3_BUCKET: bucket.bucketName
			}
		});

		// Lambda の IAM ロールに アクセス権限を付与
		lambdaFunction.addToRolePolicy(
			new iam.PolicyStatement({
				actions: [
					'dynamodb:Scan',
					'dynamodb:UpdateItem',
					'dynamodb:GetItem',
					'dynamodb:PutItem'
				],
				resources: [
					`arn:aws:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/simulation_reserve`
				]
			})
		);

		lambdaFunction.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['batch:SubmitJob', 'batch:DescribeJobs', 'batch:TerminateJob'],
				resources: [jobQueue.jobQueueArn, jobDefinition.jobDefinitionArn]
			})
		);
		lambdaFunction.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['s3:ListBucket', 's3:GetBucketLocation'],
				resources: ['*']
			})
		);
		// const lambdaPolicy = new PolicyStatement();
		// lambdaPolicy.addActions('s3:ListBucket');
		// lambdaPolicy.addActions('s3:getBucketLocation');
		// lambdaPolicy.addResources('*');

		// #endregion

		// EventBridge ルールの作成（ここでは5分ごとに実行）
		const rule = new events.Rule(this as Construct, `${stackName}-ScheduleRule`, {
			ruleName: `${stackName}-ScheduleRule`,
			schedule: events.Schedule.expression('rate(5 minutes)')
		});

		// Lambda 関数をルールのターゲットとして追加
		rule.addTarget(new targets.LambdaFunction(lambdaFunction));

		/**
		 * 出力 (オプション)
		 */
		new cdk.CfnOutput(this, `${stackName}-BatchJobQueueArn`, {
			value: jobQueue.jobQueueArn
		});
	}
}
