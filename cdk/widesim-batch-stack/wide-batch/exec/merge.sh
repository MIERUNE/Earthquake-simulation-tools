#!/bin/bash

# 統合結果の出力ファイル名
OUTPUT_FILE="merged_shapefile.shp"

# 入力ファイルが存在するディレクトリ（現在のディレクトリをデフォルトとする）
INPUT_DIR=${1:-.}

# フォルダー内の .shp ファイルをリストアップ
shp_files=("$INPUT_DIR"/*.shp)

# 統合処理
if [ ${#shp_files[@]} -eq 0 ]; then
    echo "No .shp files found in $INPUT_DIR"
    exit 1
fi

# 最初のファイルで新規作成
ogr2ogr -f "ESRI Shapefile" "$OUTPUT_FILE" "${shp_files[0]}"

# 2つ目以降のファイルを追加
for ((i = 1; i < ${#shp_files[@]}; i++)); do
    ogr2ogr -f "ESRI Shapefile" -update -append "$OUTPUT_FILE" "${shp_files[i]}" -nln merged_shapefile
done

echo "Merged shapefile saved to $OUTPUT_FILE"
