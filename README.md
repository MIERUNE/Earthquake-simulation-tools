# 3D都市モデルを活用した建物振動シミュレーションシステム

## 1. 概要

本リポジトリでは、FY2023 の Project PLATEAU「都市デジタルツインの実現に向けた研究開発及び実証調査業務」（内閣府/研究開発とSociety5.0との橋渡しプログラム（BRIDGE））において開発された「3D都市モデルを活用した建物振動シミュレーションシステム」のソースコードを公開しています。

## 2. 「3D都市モデルを活用した建物振動シミュレーションシステム」について

3D都市モデルを活用し、地震動を設定して建物被害シミュレーションの実行、データのダウンロード、可視化までを完結できるWebアプリケーションです。
<!-- ダッシュボード機能を強化し、都市レベルの建物振動シミュレーション結果について、小学校区等のようにあらかじめセットした特定エリアの被害予測結果が比較・集計可能となっています。-->

## 3. システム概要

本ソフトウェアの機能は以下の通りです：

- 3D都市モデルを活用した建物振動シミュレーションの予約
- （シミュレーションの実行はJAMSTECの環境で実行）
- シミュレーション結果のダウンロード
- シミュレーション結果のWeb表示用に最適化したデータへの変換
- シミュレーション結果のダッシュボード表示（建物被害、道路閉塞、インタラクティブマップ）
- 過去のシミュレーション結果の一覧表示

## 4. 利用技術

| カテゴリ | 技術 |
| --- | --- |
| フロントエンド | SvelteKit 2.x, TypeScript, Svelte 5, Tailwind CSS |
| UIコンポーネント | Melt UI, Svelte Hero Icons |
| 地図・可視化 | MapLibre GL, Deck.gl, Terra Draw, Chart.js |
| バックエンド | AWS Lambda, Amazon DynamoDB, Amazon S3, AWS Batch |
| 認証 | Amazon Cognito, AWS Amplify Auth |
| インフラ | AWS CDK (TypeScript) |
| モノレポ管理 | Turborepo, pnpm workspace |
| ビルドツール | Vite, pnpm |

## 5. 本リポジトリのフォルダ構成

このプロジェクトはTurborepoを使用したモノレポ構成になっています。

```text
/
├── apps/
│   ├── admin/                  # 管理システム (wide/narrow機能)
│   └── viewer/                 # ビューワーアプリケーション
├── packages/
│   ├── shared/                 # 共有型定義・ユーティリティ
│   ├── ui/                     # 共通UIコンポーネント
│   ├── aws-client/             # AWS SDKクライアント
│   └── config/                 # 共通設定
└── cdk/                        # AWS CDKインフラストラクチャ
    ├── backend-stack/          # バックエンドリソース
    ├── platform-stack/         # Cognitoなどのプラットフォーム
    ├── narrowsim-batch-stack/  # 狭域シミュレーションバッチ
    └── widesim-batch-stack/    # 広域シミュレーションバッチ
```

## 6. 必要な環境

- **Node.js**: >= 22.0.0 (推奨: 22.18.0)
- **pnpm**: >= 9.11.0
- **mise**: Node.jsバージョン管理に使用（`.tool-versions`で管理）
- **Docker**: ローカル開発環境の一部で使用

## 7. ライセンス

- 本ソフトウェアは、MITライセンスのもとで提供されるオープンソースソフトウェアです。
- ソースコードおよび関連ドキュメントの著作権は国土交通省および開発者に帰属します。
- 本ソフトウェアの開発は[株式会社MIERUNE](https://www.mierune.co.jp/)が行っています。
- 建物被害シミュレーションの実行は[JAMSTEC](https://www.jamstec.go.jp/)が担当しています。

## 8. 注意事項

- 本リポジトリおよびソフトウェアは Project PLATEAU の参考資料として提供しているものです。動作の保証は行っておりません。
- 本リポジトリおよび本ソフトウェアの利用により生じた損失及び損害等について、開発者および国土交通省はいかなる責任も負わないものとします。
- 本リポジトリの内容は予告なく変更・削除する場合があります。
- 建物被害シミュレーションの実行には、別途JAMSTECのシミュレーション環境が必要となります。シミュレーションの実行には、JAMSTECとの別途契約が必要となる場合があります。
- シミュレーションの精度や結果の解釈に十分注意してください。シミュレーション結果はあくまで予測であり、実際の被害状況を完全に反映するものではありません。

## 9. 参考資料

- [PLATEAU プロジェクト](https://www.mlit.go.jp/plateau/)
- [3D都市モデル標準製品仕様書](https://www.mlit.go.jp/plateaudocument/)

## Development (開発者向け情報)

### セットアップ

パッケージマネージャーとして [pnpm](https://pnpm.io/ja/installation) を使用します。

#### 1. 依存関係のインストール

```bash
pnpm install
```

#### 2. 環境変数の設定

`.env.example`を参考に`.env`ファイルを作成してください。

```bash
cp .env.example .env
# .envファイルを編集
```

`apps/viewer/.env.example`を参考に`apps/viewer/.env`ファイルを作成してください。

```bash
cp apps/viewer/.env.example apps/viewer/.env
# .envファイルを編集
```

#### 3. ローカル開発環境の起動（Docker）

```bash
make docker_build    # DynamoDBとMinIOを起動
make data_init       # 初期データを投入
```

### 開発コマンド

#### 開発サーバーの起動

```bash
# 全アプリを起動
pnpm dev

# 管理システムのみ起動 (http://localhost:5173)
pnpm dev:admin

# ビューワーのみ起動 (http://localhost:5174)
pnpm dev:viewer

# Makefileを使用
make dev          # 全アプリ
make dev_admin    # 管理システム
make dev_viewer   # ビューワー
```

#### ビルド

```bash
# 全アプリをビルド
pnpm build

# 管理システムのみビルド
pnpm build:admin

# ビューワーのみビルド
pnpm build:viewer

# Makefileを使用（管理システムのみ）
make svelte_build
```

#### コード品質

```bash
# Lint実行
pnpm lint

# フォーマット
pnpm format

# 型チェック
pnpm check

# テスト実行
pnpm test
```

#### その他

```bash
# ビルド成果物の削除
pnpm clean

# node_modules削除
make remove_node_modules
```

### デプロイ

#### フロントエンドのデプロイ

管理システム（admin）とビューワー（viewer）は独立してデプロイ可能です。

```bash
# 管理システムのビルド
pnpm build:admin

# ビューワーのビルド
pnpm build:viewer
```

ビルド成果物は各アプリの`build/`ディレクトリに生成されます。

#### バックエンドのデプロイ (AWS CDK)

```bash
# バックエンドスタック
make cdk_deploy_backend

# プラットフォームスタック
make cdk_deploy_platform

# 狭域シミュレーションバッチ
make cdk_deploy_narrow

# 広域シミュレーションバッチ
make cdk_deploy_wide
```

### アプリケーション

#### 管理システム (admin)

- **URL**: <http://localhost:5173>
- **機能**:
  - 広域シミュレーション管理
  - 狭域シミュレーション管理
  - プリセット管理
  - シミュレーション予約

#### ビューワー (viewer)

- **URL**: <http://localhost:5174>
- **機能**:
  - シミュレーション結果の可視化
    - S3からの実データ取得（本番環境）
    - モックデータによるフォールバック（開発環境）
  - 建物被害ダッシュボード
  - 道路閉塞ダッシュボード
  - インタラクティブマップ
  - 過去のシミュレーション一覧表示
  - デバッグモード対応（`?debug=true`パラメータ）

#### 認証

- AWS Cognitoを使用
- ユーザーロール: admin, operator, viewer
- 管理システムへのアクセスには認証が必要

### トラブルシューティング

#### Node.jsバージョンエラー

```bash
# miseでNode.jsをインストール
mise install node@22.18.0

# .tool-versionsが正しく設定されているか確認
cat .tool-versions
# 出力: nodejs 22.18.0

# 現在のバージョンを確認
mise current node
```

#### ビルドエラー

```bash
# 依存関係の再インストール
rm -rf node_modules
pnpm install

# キャッシュのクリア
pnpm clean
rm -rf .turbo
```

#### Docker関連

```bash
# コンテナを停止して削除
make docker_down

# 再起動
make docker_build
make data_init
```

#### 型エラー

```bash
# 型チェック実行
pnpm check

# SvelteKitの同期
cd apps/admin  # または apps/viewer
npx svelte-kit sync
```

#### S3接続エラー（開発環境）

開発環境でS3/MinIOが起動していない場合、以下のようにデバッグモードを使用できます:

``` text
# デバッグモード（モックデータを使用）
# ブラウザで以下のURLにアクセス
http://localhost:5174/?debug=true
```

または、MinIOを起動:

```bash
make docker_build
```