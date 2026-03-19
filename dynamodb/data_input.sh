#!/bin/bash

# テーブルの存在確認とデータ削除・テーブル作成を行う関数
manage_dynamodb_table() {
  local TABLE_NAME="$1"
  local ENDPOINT_URL="$2"

  # テーブルが存在するか確認
  if aws dynamodb describe-table --endpoint-url "$ENDPOINT_URL" --table-name "$TABLE_NAME" >/dev/null 2>&1; then
    echo "テーブル '$TABLE_NAME' は既に存在しています。テーブル内の全データを削除します。"

    # テーブルの全データをスキャンして削除
    items=$(aws dynamodb scan --endpoint-url "$ENDPOINT_URL" --table-name "$TABLE_NAME" --attributes-to-get "id" --query "Items[*].id.S" --output text)
    
    # 各アイテムを削除
    for item in $items; do
      aws dynamodb delete-item --endpoint-url "$ENDPOINT_URL" --table-name "$TABLE_NAME" --key "{\"id\": {\"S\": \"$item\"}}"
      echo "アイテム $item を削除しました。"
    done

    echo "テーブル '$TABLE_NAME' の全データを削除しました。"

  else
    # テーブルが存在しない場合は作成
    echo "テーブル '$TABLE_NAME' を作成します。"
    aws dynamodb --endpoint-url "$ENDPOINT_URL" \
      create-table \
      --table-name "$TABLE_NAME" \
      --attribute-definitions AttributeName=id,AttributeType=S \
      --key-schema AttributeName=id,KeyType=HASH \
      --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
      --output json
    echo "テーブル '$TABLE_NAME' を作成しました。"
  fi
}

# 関数の呼び出し例
ENDPOINT_URL="http://dynamodb:8000"
manage_dynamodb_table "preset_info" $ENDPOINT_URL
manage_dynamodb_table "simulation_reserve" $ENDPOINT_URL
manage_dynamodb_table "viewer_info" $ENDPOINT_URL

# Load data
ls -1 /dynamodb/test_data/*.json | while read jsonfile; do
  echo "Processing $jsonfile file... データをロードします。"
  aws dynamodb batch-write-item --request-items file://$jsonfile --endpoint-url http://dynamodb:8000
done