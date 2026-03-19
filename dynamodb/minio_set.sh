#!/bin/bash

mc alias set myminio http://minio:9000 minioadmin minioadmin

# バケットの存在確認と作成・公開設定を行う関数
create_and_set_public_bucket() {
  local BUCKET_NAME="$1"

  # バケットが存在するか確認
  if mc ls "$BUCKET_NAME" >/dev/null 2>&1; then
    echo "バケット '$BUCKET_NAME' は既に存在しています。スキップします。"
  else
    # バケットが存在しない場合は作成し、公開設定を行う
    echo "バケット '$BUCKET_NAME' を作成します。"
    mc mb "$BUCKET_NAME"
    mc anonymous set public "$BUCKET_NAME"
    echo "バケット '$BUCKET_NAME' を作成し、パブリックに設定しました。"
  fi
}

# 使用例
create_and_set_public_bucket "myminio/YOUR_S3_BUCKET"
create_and_set_public_bucket "myminio/bridge-eqsim-presets-dev"
create_and_set_public_bucket "myminio/bridge-eqsim-fileexchange-dev"
create_and_set_public_bucket "myminio/bridge-eqsim-reservation-dev"
create_and_set_public_bucket "myminio/bridge-eqsim-visualize-public-dev"
create_and_set_public_bucket "myminio/bridge-eqsim-visualize-template-dev"
