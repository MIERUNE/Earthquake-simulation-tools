#!/bin/bash
set -e

#aws cli
# 08e455fc-a418-4eb5-8c0e-12c125b25ac0
GLB_EXEC_FILE_NAME=make_glb.py # GLBファイルを作成するためのpyファイル名
GLB_FILE_NAME=output.glb # GLBファイル名
TRJ_FILE_NAME=out.trj # /wallstat/calc5110 で作成されるファイル名 (固定)
S3_BUCKET=s3://${S3_BUCKET_NAME:?S3_BUCKET_NAME is not set}

# ----------------------------------------------------
# pwd #/wallstatになる
# ls -l
echo "******* narrow batch start *******"
echo "--- env ---"
df -h
echo $(date)
echo $(/blender-4.3.2-linux-x64/blender --version)
echo $(printenv)
echo "ID=$ID"
echo "TEST=$TEST"
echo "GLBファイルを作成するためのpyファイル名=$GLB_EXEC_FILE_NAME"
echo "GLBファイル名=$GLB_FILE_NAME"
echo "/wallstat/calc5110で作成されるファイル名=$TRJ_FILE_NAME"
echo "データが保持されているバケット名=$S3_BUCKET"
echo "--- end ---"
# ----------------------------------------------------

# ----------------------------------------------------
echo "dynamodbへ処理開始のステータスをセット"
aws dynamodb update-item \
    --table-name simulation_reserve \
    --key "{\"id\": {\"S\": \"$ID\"}}" \
    --update-expression "SET #status = :newStatus" \
    --expression-attribute-names '{"#status": "status"}' \
    --expression-attribute-values '{":newStatus": {"S": "1"}}'
# ----------------------------------------------------

# ----------------------------------------------------
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
        --expression-attribute-values '{":newStatus": {"S": "2"}}'
    echo "******* narrow batch end (テスト用) *******"
    exit 0
fi
# ----------------------------------------------------

# ----------------------------------------------------
echo "--- /data フォルダーの作成 ---"
mkdir -p /data
cd /data
echo "--- s3 download start ---"
aws s3 cp --recursive --no-progress $S3_BUCKET/$ID/ /data/ > /dev/null
echo "--- s3 download end ---"

# ----------------------------------------------------
echo "--- wallstat start ---"
echo "処理を開始します..."
echo "1" | /wallstat/calc5110 2>&1 | tee calc5110.log
# ファイルが存在するか確認 処理に失敗している場合はファイルが作成されない
if [ ! -f "$TRJ_FILE_NAME" ]; then
  echo "Error: $TRJ_FILE_NAME does not exist." >&2
  echo "******* narrow batch end (error) *******"
  exit 1
fi
aws s3 cp --no-progress /data/$TRJ_FILE_NAME $S3_BUCKET/$ID/output/ > /dev/null
aws s3 cp --no-progress /data/calc5110.log $S3_BUCKET/$ID/output/ > /dev/null
echo "処理を終了しました..."
echo "--- wallstat end ---"
# ----------------------------------------------------

# ----------------------------------------------------
echo "--- Blender用のスクリプト(script.py)を作成 start ---"
echo "/wallstat/blender_script -i $TRJ_FILE_NAME ファイル名で script.py 作成開始"
/wallstat/blender_script -i $TRJ_FILE_NAME  2>&1 | tee blender_script.log
echo "/wallstat/blender_script -i $TRJ_FILE_NAME ファイル名で script.py 作成終了"
# ファイルが存在するか確認 処理に失敗している場合はファイルが作成されない
if [ ! -f "script.py" ]; then
  echo "Error: script.py does not exist." >&2
  echo "******* narrow batch end (error) *******"
  exit 1
fi
aws s3 cp --no-progress /data/script.py $S3_BUCKET/$ID/output/ > /dev/null
aws s3 cp --no-progress /data/blender_script.log $S3_BUCKET/$ID/output/ > /dev/null
echo "--- Blender用のスクリプト(script.py)を作成 end ---"
# ----------------------------------------------------

# ----------------------------------------------------
echo "Blenderで script.py を実行"
/blender-4.3.2-linux-x64/blender --background --python script.py 2>&1 | tee blender.log
# ファイルが存在するか確認 処理に失敗している場合はファイルが作成されない
if [ ! -f "script.py" ]; then
  echo "Error: script.py does not exist." >&2
  echo "******* narrow batch end (error) *******"
  exit 1
fi
aws s3 cp --no-progress /data/$GLB_FILE_NAME $S3_BUCKET/$ID/output/ > /dev/null
aws s3 cp --no-progress /data/blender.log $S3_BUCKET/$ID/output/ > /dev/null
echo "Blender $GLB_EXEC_FILE_NAME を実行終了"
# ----------------------------------------------------

# ----------------------------------------------------
echo "dynamodbへ処理完了のステータスをセット"
aws dynamodb update-item \
    --table-name simulation_reserve \
    --key "{\"id\": {\"S\": \"$ID\"}}" \
    --update-expression "SET #status = :newStatus" \
    --expression-attribute-names '{"#status": "status"}' \
    --expression-attribute-values '{":newStatus": {"S": "2"}}'
# ----------------------------------------------------

echo "******* narrow batch end *******"
