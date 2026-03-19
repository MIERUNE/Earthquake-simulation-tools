import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';

const stackName = 'mosiri-dev';

//本番設置に使用される環境変数の名前
type Env = 'development' | 'production';

export class MosiriStack extends cdk.Stack {
	/** AWSアカウントでのデプロイ作業を許すGitHubリポジトリ */
	private readonly GITHUB_ACTIONS_SUBJECT: string = 'repo:MIERUNE/mosiri:*';

	/** スタックのコンストラクタ */
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const accountId = cdk.Stack.of(this).account;
		const region = cdk.Stack.of(this).region;
		console.log(`accountId: ${accountId}`);
		console.log(`region: ${region}`);

		// Parameters
		const env: Env = this.node.tryGetContext('env') ?? 'development';

		// GitHub Actions
		this.setupIamForDeployment(accountId);

		// ECRリポジトリのみ作成（Lambda関数はGitHub Actionsで管理）
		const adminEcrRepo = this.createEcrRepository('Admin');
		const viewerEcrRepo = this.createEcrRepository('Viewer');

		// Lambda実行用のIAMロールを作成
		const lambdaExecutionRole = this.createLambdaExecutionRole(env);

		// Outputs
		new cdk.CfnOutput(this, 'AdminRepositoryUri', {
			value: adminEcrRepo.repositoryUri,
			description: 'Admin ECR Repository URI'
		});

		new cdk.CfnOutput(this, 'AdminRepositoryName', {
			value: adminEcrRepo.repositoryName,
			description: 'Admin ECR Repository Name'
		});

		new cdk.CfnOutput(this, 'ViewerRepositoryUri', {
			value: viewerEcrRepo.repositoryUri,
			description: 'Viewer ECR Repository URI'
		});

		new cdk.CfnOutput(this, 'ViewerRepositoryName', {
			value: viewerEcrRepo.repositoryName,
			description: 'Viewer ECR Repository Name'
		});

		new cdk.CfnOutput(this, 'LambdaExecutionRoleArn', {
			value: lambdaExecutionRole.roleArn,
			description: 'Lambda Execution Role ARN (for GitHub Actions to use)'
		});
	}

	/** GitHub Actions からのデプロイ時に利用する IAM ロール */
	private setupIamForDeployment(accountId: string) {
		const role = new iam.Role(this, `${stackName}DeployRole`, {
			roleName: `${stackName}-DeployRole`,
			maxSessionDuration: cdk.Duration.hours(1),
			assumedBy: new iam.WebIdentityPrincipal(
				`arn:aws:iam::${accountId}:oidc-provider/token.actions.githubusercontent.com`,
				{
					StringEquals: {
						'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com'
					},
					StringLike: {
						'token.actions.githubusercontent.com:sub': this.GITHUB_ACTIONS_SUBJECT
					}
				}
			)
		});

		// GitHub Actions からのデプロイ時に、CDK が自動生成するポリシーを利用する
		const assumeCdkDeploymentRoles = new iam.PolicyStatement({
			effect: iam.Effect.ALLOW,
			actions: ['sts:AssumeRole'],
			resources: ['arn:aws:iam::*:role/cdk-*'],
			conditions: {
				StringEquals: {
					'aws:ResourceTag/aws-cdk:bootstrap-role': [
						'file-publishing',
						'image-publishing',
						'lookup',
						'deploy'
					]
				}
			}
		});

		role.addToPolicy(assumeCdkDeploymentRoles);

		// 開発環境のみ、AdminAccessを付与
		const env: Env = this.node.tryGetContext('env') ?? 'development';
		if (env === 'development') {
			const adminPolicy = iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess');
			role.addManagedPolicy(adminPolicy);
		}
	}

	/** ECRリポジトリの作成 */
	private createEcrRepository(appName: string): ecr.Repository {
		const ecrRepository = new ecr.Repository(this, `${stackName}-${appName}-EcrRepository`, {
			repositoryName: `${stackName}-${appName.toLowerCase()}-repository`,
			imageScanOnPush: true,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			emptyOnDelete: true
		});

		// ライフサイクルポリシーの設定
		ecrRepository.addLifecycleRule({
			rulePriority: 1,
			maxImageCount: 3
		});

		return ecrRepository;
	}

	/** Lambda関数実行用のIAMロールを作成 */
	private createLambdaExecutionRole(env: Env): iam.Role {
		const role = new iam.Role(this, `${stackName}LambdaExecutionRole`, {
			roleName: `${stackName}-LambdaExecutionRole`,
			assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
			managedPolicies: [
				// Lambda基本実行ロール
				iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
				// DynamoDB フルアクセス
				iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess')
			]
		});

		// AWS Batch権限を追加（Admin用）
		const jobQueueArn = this.node.tryGetContext('batchJobQueueArn') || `arn:aws:batch:${region}:${accountId}:job-queue/*`;
		const jobDefinitionArn = this.node.tryGetContext('batchJobDefinitionArn') || `arn:aws:batch:${region}:${accountId}:job-definition/*`;

		role.addToPolicy(
			new iam.PolicyStatement({
				actions: ['batch:SubmitJob', 'batch:DescribeJobs', 'batch:TerminateJob'],
				resources: [jobQueueArn, `${jobDefinitionArn}:*`]
			})
		);

		return role;
	}
}
