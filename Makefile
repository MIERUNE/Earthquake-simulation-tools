.PHONY: help init remove_node_modules docker_build docker_down data_init cdk_synth cdk_diff cdk_deploy cdk_destroy lint logs svelte_build

# .env ファイルを読み込む
# -include .env

help: ## このヘルプを表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

init: ## 開発環境の初期設定
	[ -f .env ] || cp .env.example .env
	pnpm install

remove_node_modules: ## node_modulesを削除
	rm -rf ./node_modules
	pnpm store prune

docker_build: ## Dockerイメージをビルド
	docker compose up -d --build --wait

docker_down: ## 開発環境を停止
	docker compose down -v --rmi all

data_init: ## DynamoDBの初期データを設定
	-@docker exec -w /dynamodb awscli-local /bin/bash -c "sh data_input.sh"
	-@docker exec -w /dynamodb mosiri-minio-1 /bin/bash -c "sh minio_set.sh"

lint: ## リントを実行
	pnpm install
	pnpm lint

STACK_DIR := ./cdk/backend-stack
svelte_build: ## 管理システム（admin）のビルド
	pnpm install
	pnpm build:admin

dev: ## 全アプリの開発サーバー起動
	pnpm dev

dev_admin: ## 管理システムの開発サーバー起動
	pnpm dev:admin

dev_viewer: ## ビューワーの開発サーバー起動
	pnpm dev:viewer

cdk_synth_backend: ## CDKを利用して差分表示
	export AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID)
	export AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION)
	cd $(STACK_DIR) && pnpm build && npx cdk synth  --context env=development > stack_out.yaml

cdk_diff_backend: svelte_build cdk_synth_backend ## CDKを利用して差分表示
	export AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID)
	export AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION)
	cd $(STACK_DIR) && npx cdk diff -v --context stage=develop

cdk_deploy_backend: cdk_diff_backend ## CDKを利用してAWSのアカウントにデプロイ
	export AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID)
	export AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION)
	cd $(STACK_DIR) && npx cdk deploy --require-approval never --context env=development

PLATFORM-STACK_DIR := ./cdk/platform-stack
cdk_synth_platform: ## CDKを利用して差分表示
	export AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID)
	export AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION)
	cd $(PLATFORM-STACK_DIR) && pnpm build && npx cdk synth  --context env=development > stack_out.yaml

cdk_diff_platform: cdk_synth_platform ## CDKを利用して差分表示
	export AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID)
	export AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION)
	cd $(PLATFORM-STACK_DIR) && npx cdk diff -v --context stage=develop

cdk_deploy_platform: cdk_diff_platform ## CDKを利用してAWSのアカウントにデプロイ
	export AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID)
	export AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION)
	cd $(PLATFORM-STACK_DIR) && npx cdk deploy --require-approval never --context env=development


NARROWSIM_STACK_DIR := ./cdk/narrowsim-batch-stack
cdk_synth_narrow: ## CDKを利用して差分表示
	export AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID)
	export AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION)
	cd $(NARROWSIM_STACK_DIR) && pnpm build && npx cdk synth  --context env=development > stack_out.yaml

cdk_diff_narrow: cdk_synth_narrow ## CDKを利用して差分表示
	export AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID)
	export AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION)
	cd $(NARROWSIM_STACK_DIR) && npx cdk diff -v --context stage=develop

cdk_deploy_narrow: cdk_diff_narrow ## CDKを利用してAWSのアカウントにデプロイ
	export AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID)
	export AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION)
	cd $(NARROWSIM_STACK_DIR) && npx cdk deploy --require-approval never --context env=development

WIDESIM_STACK_DIR := ./cdk/widesim-batch-stack
cdk_synth_wide: ## CDKを利用して差分表示
	export AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID)
	export AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION)
	cd $(WIDESIM_STACK_DIR) && pnpm build && npx cdk synth  --context env=development > stack_out.yaml

cdk_diff_wide: cdk_synth_wide ## CDKを利用して差分表示
	export AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID)
	export AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION)
	cd $(WIDESIM_STACK_DIR) && npx cdk diff -v --context stage=develop

cdk_deploy_wide: cdk_diff_wide ## CDKを利用してAWSのアカウントにデプロイ
	export AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID)
	export AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION)
	cd $(WIDESIM_STACK_DIR) && npx cdk deploy --require-approval never --context env=development


logs:
	docker logs -f mosiri-sveltekit-1