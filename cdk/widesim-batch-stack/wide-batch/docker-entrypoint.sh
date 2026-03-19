#!/bin/bash
set -e

# エラー時にDynamoDBのステータスを3(エラー)にセットする
BATCH_STATUS="error"

on_exit() {
    if [ "$BATCH_STATUS" = "error" ] && [ -n "$ID" ]; then
        echo "エラーが発生しました。DynamoDBにエラーステータス(3)をセット"
        aws dynamodb update-item \
            --table-name simulation_reserve \
            --key "{\"id\": {\"S\": \"$ID\"}}" \
            --update-expression "SET #status = :newStatus" \
            --expression-attribute-names '{"#status": "status"}' \
            --expression-attribute-values '{":newStatus": {"S": "3"}}' || true
        echo "******* wide batch end (error) *******"
    fi
}

trap on_exit EXIT

#aws cli
# 893c83f9-aaaf-4bf3-92de-0006f45d983c
VTK_S3_FOLDER="VTK"
SHP_S3_FOLDER="SHP"
TILES_S3_FOLDER="tiles"
S3_BUCKET=s3://${S3_INPUT_BUCKET:?S3_INPUT_BUCKET is not set}
S3_BUCKET_OUT=s3://${S3_OUTPUT_BUCKET:?S3_OUTPUT_BUCKET is not set}
SUBDIR=output
SHP_OUTPUT_FILE="merged_shapefile.shp"


# ----------------------------------------------------
# pwd #/widesimになる
# ls -l
echo "******* wide batch start *******"
echo "--- env ---"
df -h
echo $(date)
echo $(printenv)
echo $ID
echo $TEST
echo $(which python3)
echo $(python3 --version)
echo $(tippecanoe -v)
echo "VTKのS3フォルダー名=$VTK_S3_FOLDER"
echo "SHPのS3フォルダー名=$SHP_S3_FOLDER"
echo "サブディレクトリー名=$SUBDIR"
echo "タイルのS3フォルダー名=$TILES_S3_FOLDER"
echo "データが保持されているバケット名=$S3_BUCKET"
echo "データを出力するバケット名=$S3_BUCKET_OUT"
echo "マージされたSHPファイル名=$SHP_OUTPUT_FILE"
echo "ID=$ID"
echo "TEST=$TEST"
echo "--- end ---"

# IF 文で値をチェック (テスト用)
if [ "$TEST" = "TRUE" ]; then
    echo "TEST is TRUE"
    sleep 60  # 1分待つ
    echo "1分経過しました。"
    echo "dynamodbへ処理完了のステータスをセット"
    aws dynamodb update-item \
        --table-name simulation_reserve \
        --key "{\"id\": {\"S\": \"$ID\"}}" \
        --update-expression "SET #status = :newStatus" \
        --expression-attribute-names '{"#status": "status"}' \
        --expression-attribute-values '{":newStatus": {"S": "4"}}'
    echo "******* wide batch end (テスト用) *******"
    BATCH_STATUS="success"
    exit 0
fi

echo "--- /data フォルダーの作成 ---"
mkdir -p /data
cd /data

echo S3からファイルをダウンロード
# VTK
echo VTKファイルをダウンロード
echo "--- s3 download start ---"
echo "$S3_BUCKET/$SUBDIR/$ID/$VTK_S3_FOLDER/"
aws s3 cp --recursive --no-progress $S3_BUCKET/$SUBDIR/$ID/$VTK_S3_FOLDER/ /data/vtk > /dev/null
ls -l /data/vtk
echo "--- s3 download end ---"

# SHP
echo SHPファイルをダウンロード
echo "--- s3 download start ---"
echo "$S3_BUCKET/$SUBDIR/$ID/$SHP_S3_FOLDER/"
aws s3 cp --recursive --no-progress $S3_BUCKET/$SUBDIR/$ID/$SHP_S3_FOLDER/ /data/shp > /dev/null
ls -l /data/shp
echo "--- s3 download end ---"

# SHPフォルダー内のSHPをマージ
cd /data/shp
# 入力ファイルが存在するディレクトリ（現在のディレクトリをデフォルトとする）
INPUT_DIR=${1:-.}
# フォルダー内の .shp ファイルをリストアップ
shp_files=("$INPUT_DIR"/*.shp)
# 統合処理
if [ ${#shp_files[@]} -eq 0 ]; then
    echo "No .shp files found in $INPUT_DIR"
    echo "******* wide batch end (error) *******"
    exit 1
fi
# 最初のファイルで新規作成
ogr2ogr -f "ESRI Shapefile" "$SHP_OUTPUT_FILE" "${shp_files[0]}" -nln merged_shapefile -lco ENCODING=UTF-8
# 2つ目以降のファイルを追加
for ((i = 1; i < ${#shp_files[@]}; i++)); do
    ogr2ogr -f "ESRI Shapefile" -update -append "$SHP_OUTPUT_FILE" "${shp_files[i]}" -nln merged_shapefile
done
echo "Merged shapefile saved to $SHP_OUTPUT_FILE"
cd /data

## vtk.geojsonを作成
echo "--- /widesim/main で vtk.geojsonを作成 ---"
/widesim/main /data/vtk

## output.geojsonを作成
echo "--- output.geojsonを作成 ---"
python3 /widesim/main.py -f "/data/vtk.geojson" -s "/data/shp/merged_shapefile.shp"

## vectorタイルを作成
echo "--- vectorタイル作成 ---"
mkdir -p /data/tiles
# ディレクトリ形式 このシステムでは 14まで必要
tippecanoe -e tiles -pC -Z4 -z14 -pf -pk output.geojson

# 時系列属性情報を落とした版
mkdir -p /data/tiles_opt
tippecanoe -e tiles_opt -pC -Z4 -z14 -pf -pk output.geojson -x displacement_mean -x displacement_max

echo "--- vectorタイル upload start ---"
echo "$S3_BUCKET_OUT/$ID/$TILES_S3_FOLDER/"
aws s3 sync --delete --no-progress /data/tiles $S3_BUCKET_OUT/$ID/$TILES_S3_FOLDER/ > /dev/null
aws s3 sync --delete --no-progress /data/tiles_opt $S3_BUCKET_OUT/$ID/${TILES_S3_FOLDER}_opt/ > /dev/null
echo "--- vectorタイル upload end ---"

BATCH_STATUS="success"
echo "dynamodbへ処理完了のステータスをセット"
aws dynamodb update-item \
    --table-name simulation_reserve \
    --key "{\"id\": {\"S\": \"$ID\"}}" \
    --update-expression "SET #status = :newStatus" \
    --expression-attribute-names '{"#status": "status"}' \
    --expression-attribute-values '{":newStatus": {"S": "4"}}'

echo "******* wide batch end *******"


