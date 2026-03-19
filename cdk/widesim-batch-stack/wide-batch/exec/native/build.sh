#!/bin/bash

# プロジェクトルートを定義
PROJECT_ROOT=$(pwd)

# デフォルトのデバッグフラグ
DEBUG_FLAG=OFF

# 引数処理 -d または --debug が指定された場合にデバッグモードを有効にする
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -d|--debug) DEBUG_FLAG=ON ;;  # デバッグモードを有効にする
        *) echo "Unknown option: $1" ; exit 1 ;;
    esac
    shift
done

# ビルドディレクトリのクリーンアップ
rm -rf "$PROJECT_ROOT/build"

# CMake の実行
cmake -S "$PROJECT_ROOT" -B "$PROJECT_ROOT/build" -G Ninja -DENABLE_OPENMP=OFF -DDEBUG=$DEBUG_FLAG
cmake --build "$PROJECT_ROOT/build"

# 実行
# time "$PROJECT_ROOT/build/main"
