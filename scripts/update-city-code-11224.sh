#!/bin/bash

# DynamoDBの戸田市コードを11228から11224に更新するスクリプト
#
# 使用方法:
#   ローカル環境: ./scripts/update-city-code-11224.sh local
#   本番環境: ./scripts/update-city-code-11224.sh prod

set -e

ENV=${1:-local}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "========================================="
echo "戸田市コード更新スクリプト"
echo "環境: $ENV"
echo "実行時刻: $TIMESTAMP"
echo "========================================="

# 環境に応じてエンドポイントを設定
if [ "$ENV" = "local" ]; then
    ENDPOINT="--endpoint-url http://localhost:8000"
    echo "ローカルDynamoDBに接続します"
elif [ "$ENV" = "prod" ]; then
    ENDPOINT=""
    echo "本番DynamoDBに接続します"
    echo "⚠️  警告: 本番環境のデータを更新します。続行しますか？ (y/n)"
    read -r CONFIRM
    if [ "$CONFIRM" != "y" ]; then
        echo "処理を中止しました"
        exit 0
    fi
else
    echo "エラー: 環境は 'local' または 'prod' を指定してください"
    exit 1
fi

# バックアップディレクトリの作成
BACKUP_DIR="./backup/dynamodb_${ENV}_${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

echo ""
echo "1. データのバックアップ..."
echo "========================================="

# simulation_reserveテーブルのバックアップと更新
TABLE_NAME="simulation_reserve"
echo "処理中: $TABLE_NAME テーブル"

# 11228を含むアイテムを検索してバックアップ
echo "  - cityCodeが11228のアイテムを検索中..."
aws dynamodb scan \
    $ENDPOINT \
    --table-name "$TABLE_NAME" \
    --filter-expression "cityCode = :code" \
    --expression-attribute-values '{":code":{"S":"11228"}}' \
    --output json > "$BACKUP_DIR/${TABLE_NAME}_11228.json" 2>/dev/null || true

ITEM_COUNT=$(cat "$BACKUP_DIR/${TABLE_NAME}_11228.json" | jq '.Items | length' 2>/dev/null || echo "0")
echo "  - 見つかったアイテム数: $ITEM_COUNT"

if [ "$ITEM_COUNT" != "0" ] && [ "$ITEM_COUNT" != "" ]; then
    echo "  - バックアップ保存: $BACKUP_DIR/${TABLE_NAME}_11228.json"

    echo ""
    echo "2. データの更新..."
    echo "========================================="

    # 各アイテムを更新
    cat "$BACKUP_DIR/${TABLE_NAME}_11228.json" | jq -r '.Items[] | @json' | while read -r item; do
        # アイテムのIDを取得
        ID=$(echo "$item" | jq -r '.id.S')
        echo "  - ID: $ID を更新中..."

        # cityCodeを11224に更新
        aws dynamodb update-item \
            $ENDPOINT \
            --table-name "$TABLE_NAME" \
            --key "{\"id\":{\"S\":\"$ID\"}}" \
            --update-expression "SET cityCode = :newcode" \
            --expression-attribute-values '{":newcode":{"S":"11224"}}' \
            --return-values UPDATED_NEW

        echo "    ✓ 更新完了"
    done
fi

# preset_infoテーブルの確認と更新
TABLE_NAME="preset_info"
echo ""
echo "処理中: $TABLE_NAME テーブル"

# regionNameに戸田を含むアイテムを検索
echo "  - regionNameに'戸田'を含むアイテムを検索中..."
aws dynamodb scan \
    $ENDPOINT \
    --table-name "$TABLE_NAME" \
    --filter-expression "contains(regionName, :region)" \
    --expression-attribute-values '{":region":{"S":"戸田"}}' \
    --output json > "$BACKUP_DIR/${TABLE_NAME}_toda.json" 2>/dev/null || true

ITEM_COUNT=$(cat "$BACKUP_DIR/${TABLE_NAME}_toda.json" | jq '.Items | length' 2>/dev/null || echo "0")
echo "  - 見つかったアイテム数: $ITEM_COUNT"

if [ "$ITEM_COUNT" != "0" ] && [ "$ITEM_COUNT" != "" ]; then
    echo "  - バックアップ保存: $BACKUP_DIR/${TABLE_NAME}_toda.json"

    # cityCodeフィールドがある場合のみ更新
    cat "$BACKUP_DIR/${TABLE_NAME}_toda.json" | jq -r '.Items[] | @json' | while read -r item; do
        # cityCodeフィールドの存在を確認
        HAS_CITY_CODE=$(echo "$item" | jq 'has("cityCode")')

        if [ "$HAS_CITY_CODE" = "true" ]; then
            CURRENT_CODE=$(echo "$item" | jq -r '.cityCode.S')
            if [ "$CURRENT_CODE" = "11228" ]; then
                ID=$(echo "$item" | jq -r '.id.S')
                echo "  - ID: $ID のcityCodeを更新中..."

                aws dynamodb update-item \
                    $ENDPOINT \
                    --table-name "$TABLE_NAME" \
                    --key "{\"id\":{\"S\":\"$ID\"}}" \
                    --update-expression "SET cityCode = :newcode" \
                    --expression-attribute-values '{":newcode":{"S":"11224"}}' \
                    --return-values UPDATED_NEW

                echo "    ✓ 更新完了"
            fi
        fi
    done
fi

# viewer_infoテーブルの確認
TABLE_NAME="viewer_info"
echo ""
echo "処理中: $TABLE_NAME テーブル"

# cityCodeが11228のアイテムを検索
echo "  - cityCodeが11228のアイテムを検索中..."
aws dynamodb scan \
    $ENDPOINT \
    --table-name "$TABLE_NAME" \
    --filter-expression "cityCode = :code" \
    --expression-attribute-values '{":code":{"S":"11228"}}' \
    --output json > "$BACKUP_DIR/${TABLE_NAME}_11228.json" 2>/dev/null || true

ITEM_COUNT=$(cat "$BACKUP_DIR/${TABLE_NAME}_11228.json" | jq '.Items | length' 2>/dev/null || echo "0")
echo "  - 見つかったアイテム数: $ITEM_COUNT"

if [ "$ITEM_COUNT" != "0" ] && [ "$ITEM_COUNT" != "" ]; then
    echo "  - バックアップ保存: $BACKUP_DIR/${TABLE_NAME}_11228.json"

    # 各アイテムを更新
    cat "$BACKUP_DIR/${TABLE_NAME}_11228.json" | jq -r '.Items[] | @json' | while read -r item; do
        ID=$(echo "$item" | jq -r '.id.S')
        echo "  - ID: $ID を更新中..."

        aws dynamodb update-item \
            $ENDPOINT \
            --table-name "$TABLE_NAME" \
            --key "{\"id\":{\"S\":\"$ID\"}}" \
            --update-expression "SET cityCode = :newcode" \
            --expression-attribute-values '{":newcode":{"S":"11224"}}' \
            --return-values UPDATED_NEW

        echo "    ✓ 更新完了"
    done
fi

echo ""
echo "========================================="
echo "3. 更新結果の確認..."
echo "========================================="

# 更新後の確認
echo "更新後の11228の件数:"
for TABLE in simulation_reserve preset_info viewer_info; do
    COUNT=$(aws dynamodb scan \
        $ENDPOINT \
        --table-name "$TABLE" \
        --filter-expression "cityCode = :code" \
        --expression-attribute-values '{":code":{"S":"11228"}}' \
        --select COUNT \
        --output json 2>/dev/null | jq '.Count' || echo "0")
    echo "  - $TABLE: $COUNT 件"
done

echo ""
echo "更新後の11224の件数:"
for TABLE in simulation_reserve preset_info viewer_info; do
    COUNT=$(aws dynamodb scan \
        $ENDPOINT \
        --table-name "$TABLE" \
        --filter-expression "cityCode = :code" \
        --expression-attribute-values '{":code":{"S":"11224"}}' \
        --select COUNT \
        --output json 2>/dev/null | jq '.Count' || echo "0")
    echo "  - $TABLE: $COUNT 件"
done

echo ""
echo "========================================="
echo "✅ 処理完了"
echo "バックアップは $BACKUP_DIR に保存されています"
echo "========================================="