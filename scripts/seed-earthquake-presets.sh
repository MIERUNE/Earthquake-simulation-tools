#!/bin/bash

# 地震動プリセットの初期データ登録スクリプト
# 東日本大震災、阪神淡路大震災、Hachinohe1968のプリセットを登録

ENDPOINT="http://localhost:8000"
TABLE_NAME="preset_info"

echo "地震動プリセットを登録します..."

# 現在のUnixタイムスタンプを取得
NOW=$(date +%s)

# 東日本大震災
UUID1=$(uuidgen | tr '[:upper:]' '[:lower:]')
aws dynamodb put-item \
  --table-name "$TABLE_NAME" \
  --endpoint-url "$ENDPOINT" \
  --item "{
    \"id\": {\"S\": \"$UUID1\"},
    \"userId\": {\"S\": \"system\"},
    \"type\": {\"S\": \"earthquake\"},
    \"job\": {\"S\": \"\"},
    \"regionName\": {\"S\": \"東北地方\"},
    \"presetName\": {\"S\": \"東日本大震災\"},
    \"meshCode\": {\"L\": []},
    \"gmlFilePath\": {\"S\": \"\"},
    \"wideLongPeriodParamFilePath\": {\"S\": \"\"},
    \"wideNormalParamFilePath\": {\"S\": \"\"},
    \"wideDirectlyParamFilePath\": {\"S\": \"\"},
    \"narrowAnalysisModelFilePath\": {\"S\": \"\"},
    \"narrowParamFilePath\": {\"S\": \"\"},
    \"narrowForceParamFilePath\": {\"S\": \"\"},
    \"narrowCalcParamFilePath\": {\"S\": \"\"},
    \"additionalInfo\": {\"S\": \"2011年3月11日に発生した東北地方太平洋沖地震（マグニチュード9.0）\"},
    \"createDateTime\": {\"N\": \"$NOW\"}
  }" 2>&1

if [ $? -eq 0 ]; then
  echo "✓ 東日本大震災 を登録しました (ID: $UUID1)"
else
  echo "✗ 東日本大震災 の登録に失敗しました"
fi

# 阪神淡路大震災
UUID2=$(uuidgen | tr '[:upper:]' '[:lower:]')
aws dynamodb put-item \
  --table-name "$TABLE_NAME" \
  --endpoint-url "$ENDPOINT" \
  --item "{
    \"id\": {\"S\": \"$UUID2\"},
    \"userId\": {\"S\": \"system\"},
    \"type\": {\"S\": \"earthquake\"},
    \"job\": {\"S\": \"\"},
    \"regionName\": {\"S\": \"近畿地方\"},
    \"presetName\": {\"S\": \"阪神淡路大震災\"},
    \"meshCode\": {\"L\": []},
    \"gmlFilePath\": {\"S\": \"\"},
    \"wideLongPeriodParamFilePath\": {\"S\": \"\"},
    \"wideNormalParamFilePath\": {\"S\": \"\"},
    \"wideDirectlyParamFilePath\": {\"S\": \"\"},
    \"narrowAnalysisModelFilePath\": {\"S\": \"\"},
    \"narrowParamFilePath\": {\"S\": \"\"},
    \"narrowForceParamFilePath\": {\"S\": \"\"},
    \"narrowCalcParamFilePath\": {\"S\": \"\"},
    \"additionalInfo\": {\"S\": \"1995年1月17日に発生した兵庫県南部地震（マグニチュード7.3）\"},
    \"createDateTime\": {\"N\": \"$NOW\"}
  }" 2>&1

if [ $? -eq 0 ]; then
  echo "✓ 阪神淡路大震災 を登録しました (ID: $UUID2)"
else
  echo "✗ 阪神淡路大震災 の登録に失敗しました"
fi

# Hachinohe1968
UUID3=$(uuidgen | tr '[:upper:]' '[:lower:]')
aws dynamodb put-item \
  --table-name "$TABLE_NAME" \
  --endpoint-url "$ENDPOINT" \
  --item "{
    \"id\": {\"S\": \"$UUID3\"},
    \"userId\": {\"S\": \"system\"},
    \"type\": {\"S\": \"earthquake\"},
    \"job\": {\"S\": \"\"},
    \"regionName\": {\"S\": \"東北地方\"},
    \"presetName\": {\"S\": \"Hachinohe1968\"},
    \"meshCode\": {\"L\": []},
    \"gmlFilePath\": {\"S\": \"\"},
    \"wideLongPeriodParamFilePath\": {\"S\": \"\"},
    \"wideNormalParamFilePath\": {\"S\": \"\"},
    \"wideDirectlyParamFilePath\": {\"S\": \"\"},
    \"narrowAnalysisModelFilePath\": {\"S\": \"\"},
    \"narrowParamFilePath\": {\"S\": \"\"},
    \"narrowForceParamFilePath\": {\"S\": \"\"},
    \"narrowCalcParamFilePath\": {\"S\": \"\"},
    \"additionalInfo\": {\"S\": \"1968年十勝沖地震の八戸港湾での観測記録\"},
    \"createDateTime\": {\"N\": \"$NOW\"}
  }" 2>&1

if [ $? -eq 0 ]; then
  echo "✓ Hachinohe1968 を登録しました (ID: $UUID3)"
else
  echo "✗ Hachinohe1968 の登録に失敗しました"
fi

echo ""
echo "登録完了！"
