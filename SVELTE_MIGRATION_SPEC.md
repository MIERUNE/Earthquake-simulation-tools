# 熊本地震前震シミュレーション機能 - Svelte移植仕様書

## 概要

「熊本地震前震によるシミュレーション」レイヤーの地物をクリックすると、モーダルが開き、建物の地震シミュレーション結果が3Dで表示される機能の仕様書です。床などのオブジェクトをクリックすると、属性値と地震による移動量（変位データ）がグラフとして表示されます。

---

## 1. 機能の全体フロー

### 1.1 レイヤー構成

レイヤーは3つの要素で構成されます：

1. **アイコンレイヤー** (`edefense-icon`)
   - 地図上にピン（マーカー）を表示
   - クリック可能
   - 位置: `[130.820101, 32.796837, 30]`（経度、緯度、高度）

2. **3D建物モデル（GLTF）** 2種類
   - `edefense-rc`: RC造建物 (`building_RC.glb`)
   - `edefense-s`: 鉄骨造建物 (`building_S.glb`)

3. **IFCモデル** 2種類
   - `/200408_building_RC.ifc`: RC造建物の詳細モデル
   - `/200408_building_S.ifc`: 鉄骨造建物の詳細モデル

### 1.2 ユーザー操作フロー

```
1. ユーザーがサイドバーで「熊本地震前震によるシミュレーション」をチェック
   ↓
2. 地図上に青いピンアイコンが表示される
   ↓
3. ユーザーがアイコンまたは3D建物モデルをクリック
   ↓
4. IFCモデル表示モーダルが開く
   ↓
5. モーダル内に建物の3DモデルがThree.jsで表示される
   ↓
6. ユーザーがモデル内の床・壁などの部材をクリック
   ↓
7. ドラッグ可能な属性パネルが表示される
   - 部材のID、名前、タイプなどの属性
   - 地震時の変位グラフ（画像）
```

---

## 2. データ構造

### 2.1 config.json - レイヤー設定

```json
{
  "id": "edefense-icon",
  "type": "icon",
  "source": "https://nied.s3.ap-northeast-1.amazonaws.com/map_icon_blue.svg",
  "coords": [130.820101, 32.796837, 30],
  "color": [5, 5, 190, 255]
}
```

```json
{
  "id": "edefense-rc",
  "type": "gltf",
  "source": "https://nied.s3.ap-northeast-1.amazonaws.com/edefense/building_RC.glb",
  "coords": [130.820182, 32.796837, 0],
  "color": [84, 84, 84, 180],
  "orientation": [0, 17, 0]
}
```

```json
{
  "id": "edefense-s",
  "type": "gltf",
  "source": "https://nied.s3.ap-northeast-1.amazonaws.com/edefense/building_S.glb",
  "coords": [130.820018, 32.796803, 0],
  "color": [84, 84, 84, 180],
  "orientation": [0, 17, 0]
}
```

### 2.2 menu/login.json - メニュー設定

```json
{
  "category": "Ｅ－ディフェンス実験試験体の詳細解析モデルと解析結果",
  "open": false,
  "url": "https://www.geospatial.jp/ckan/dataset/nied-simulation",
  "data": [
    {
      "title": "熊本地震前震によるシミュレーション",
      "type": "icon",
      "lng": 130.820182,
      "lat": 32.796837,
      "zoom": 18,
      "id": ["edefense-rc", "edefense-s", "edefense-icon"],
      "checked": true,
      "color": "#0505BE"
    }
  ]
}
```

### 2.3 状態管理

**IFCDataTypeState**: シミュレーションタイプを管理
- `'fore'`: 前震
- `'after'`: 本震（熊本地震本震によるシミュレーション）
- `null`: 未選択

**TooltipData**: モーダル表示状態を管理
```typescript
{
  tooltip: any,
  showA1Movie: boolean,
  showEdefenseMovie: boolean,
  ifcFilePath: string | null  // '/200408_building_RC.ifc' または '/200408_building_S.ifc'
}
```

---

## 3. クリックイベント処理

### 3.1 アイコン/GLTFモデルクリック時

**ファイル**: `src/components/Tooltip/show.ts`

```typescript
// クリック判定ロジック
const showIFC = (object: any) => {
  if (object.name === 'building_S') {
    return { ifcFilePath: '/200408_building_S.ifc' };
  }
  if (object.name === 'building_RC') {
    return { ifcFilePath: '/200408_building_RC.ifc' };
  }
  return null;
};
```

**トリガー条件**:
- `object.id === 'edefense-icon'`
- `object.label === 'edefense-rc'`
- `object.label === 'edefense-s'`
- `object.name === 'building_RC'`
- `object.name === 'building_S'`

### 3.2 IFCモデル内部材クリック時

**ファイル**: `src/components/Modals/IFCThreeModal.tsx`

Three.jsのraycastingで部材を検出し、以下の情報を取得：

```typescript
{
  expressId: number,           // IFC内部ID
  id: string,                  // GlobalId（例: '38PK7t_wfFQRvV6YNJ0zXn'）
  name: string,                // 部材名
  objectType: string,          // オブジェクトタイプ
  creationDate: number,        // 作成日時（Unixタイムスタンプ）
  applicationFullName: string  // アプリケーション名
}
```

---

## 4. IFCモデル表示機能

### 4.1 使用ライブラリ

- **web-ifc-three**: IFCファイルをThree.jsで読み込むライブラリ
- **three-mesh-bvh**: レイキャストの高速化
- **@react-three/fiber**: React用Three.jsラッパー（Svelteでは`threlte`を使用）
- **@react-three/drei**: Three.js用ヘルパーコンポーネント

### 4.2 3D表示設定

```typescript
// カメラ設定
camera: {
  fov: 75,
  near: 0.1,
  far: 200,
  position: [10, 4, 10]
}

// ライティング
<ambientLight intensity={0.5} />
<directionalLight intensity={0.7} position={[1, 0.5, 0.866]} />

// 背景グラデーション
background: 'linear-gradient(0deg, rgba(0,66,76,1) 0%, rgba(0,90,104,1) 35%, rgba(76,223,247,1) 100%)'
```

### 4.3 部材選択ハイライト

クリックされた部材は半透明マゼンタでハイライト表示：

```typescript
selectMaterial: {
  transparent: true,
  opacity: 0.6,
  color: 0xff00ff,  // マゼンタ
  depthTest: false
}
```

---

## 5. 地震変位データ表示

### 5.1 データ構造

変位データは**画像ファイル**として提供されています。

**ディレクトリ構造**:
```
public/
└── ifcGraphImage/
    ├── fore/           # 前震データ
    │   ├── floor/      # 階ごとの変位グラフ
    │   └── item/       # 特定部材の変位グラフ
    └── after/          # 本震データ
        ├── floor/
        └── item/
```

### 5.2 画像パス生成ロジック

**ファイル**: `src/components/Modals/IFCGraph.tsx`

#### 階の変位グラフ

部材ID（GlobalId）を元に所属階を判定し、画像を表示：

```typescript
// 1F〜10Fの部材IDリスト
const IDList = {
  '1F': ['38PK7t_wfFQRvV6YNJ0zXn', '38PK7t_wfFQRvV6YNJ0zgt', ...],
  '2F': ['0J71D_z7zDNPEqfvF2IkCP', ...],
  ...
};

// 画像パス例
`/ifcGraphImage/${dataType}/floor/${dataType}_long_1F.png`
`/ifcGraphImage/${dataType}/floor/${dataType}_short_1F.png`
```

#### 特定部材の変位グラフ

特別な部材（A12, B12, A2など）には専用グラフ：

```typescript
if (id === '0o4RqXVrP4UOeE6WhYzCWF') {  // A12
  return {
    floor: '',
    image: [
      `/ifcGraphImage/${dataType}/item/${dataType}_A12_left.png`,
      `/ifcGraphImage/${dataType}/item/${dataType}_A12_right.png`
    ]
  };
}
```

### 5.3 表示される画像の種類

**階ごとのグラフ**（各階2枚）:
- `{dataType}_long_{階数}.png`: 長辺方向の変位
- `{dataType}_short_{階数}.png`: 短辺方向の変位

**特定部材のグラフ**:
- A12部材: `left`, `right`
- B12部材: `left`, `right`
- A2部材: `top_X`, `top_Y`, `bottom_X`, `bottom_Y`

---

## 6. モーダルUI仕様

### 6.1 モーダル基本構成

- **サイズ**: 最大幅 1000px
- **3Dビューポート**: 幅100%、高さ500px
- **背景**: 半透明グレーオーバーレイ（opacity: 0.75）

### 6.2 タイトル

```
Ｅ-ディフェンス実験試験体(熊本地震前震によるシミュレーション)
```

※ RCモデルかつデータタイプが設定されている場合のみ括弧内を表示

### 6.3 属性パネル

**位置**: モーダル左上（絶対配置）
**機能**: ドラッグ可能（Draggableコンポーネント使用）
**スタイル**:
- ハンドル部分: 青色背景 (#17a2b8)、カーソルmove
- 内容部分: 白背景、最大高さ400px（スクロール可能）

**表示内容**:
```
┌─────────────────────────┐
│ [ドラッグハンドル]  [x] │
├─────────────────────────┤
│ ID         │ 値         │
│ Name       │ 値         │
│ ObjectType │ 値         │
│ CreationDate│ 値        │
│ ApplicationFullName│値  │
├─────────────────────────┤
│ {階数}                  │
│ [変位グラフ画像1]       │
│ [変位グラフ画像2]       │
└─────────────────────────┘
```

### 6.4 閉じるボタン

- モーダル右上
- 属性パネル右上
- ESCキーでも閉じる（Dialog標準動作）

---

## 7. Svelte実装時の推奨アーキテクチャ

### 7.1 状態管理

**Svelteストア**を使用:

```typescript
// stores/ifcModal.ts
import { writable } from 'svelte/store';

export const ifcModalState = writable<{
  isOpen: boolean;
  ifcFilePath: string | null;
  dataType: 'fore' | 'after' | null;
}>({
  isOpen: false,
  ifcFilePath: null,
  dataType: null
});

export const selectedElement = writable<{
  id: string;
  name: string;
  objectType: string;
  creationDate: number;
  applicationFullName: string;
} | null>(null);
```

### 7.2 コンポーネント構成

```
IFCModal.svelte                    (モーダル本体)
├── ThreeViewer.svelte             (Three.js表示)
│   └── IFCModel.svelte            (IFCモデル読み込み・表示)
├── AttributePanel.svelte          (ドラッグ可能属性パネル)
│   ├── PropertyTable.svelte       (属性テーブル)
│   └── DisplacementGraphs.svelte  (変位グラフ画像表示)
└── CloseButton.svelte             (閉じるボタン)
```

### 7.3 推奨ライブラリ

| 機能 | React版 | Svelte版推奨 |
|------|---------|-------------|
| 3D描画 | @react-three/fiber | threlte |
| 3Dヘルパー | @react-three/drei | @threlte/extras |
| IFC読み込み | web-ifc-three | web-ifc-three (そのまま使用可) |
| BVH高速化 | three-mesh-bvh | three-mesh-bvh (そのまま使用可) |
| ドラッグ | react-draggable | svelte-drag |
| モーダル | @headlessui/react | svelte-headlessui |
| 状態管理 | Recoil | Svelteストア |

### 7.4 IFCファイル読み込み例（Svelte + threlte）

```svelte
<script lang="ts">
  import { T } from '@threlte/core';
  import { OrbitControls } from '@threlte/extras';
  import { IFCLoader } from 'web-ifc-three';
  import { onMount } from 'svelte';
  import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';

  export let ifcFilePath: string;

  let ifcModel = null;

  onMount(async () => {
    const loader = new IFCLoader();
    loader.ifcManager.setupThreeMeshBVH(
      computeBoundsTree,
      disposeBoundsTree,
      acceleratedRaycast
    );

    loader.ifcManager.setWasmPath('/');
    const model = await loader.loadAsync(ifcFilePath);

    // 中心に配置
    const center = new Vector3();
    model.mesh.geometry.boundingBox.getCenter(center);
    model.position.copy(center.negate());

    ifcModel = model;
  });

  function handleClick(event) {
    // raycastingで部材を検出
    const found = event.detail.intersections[0];
    if (!found) return;

    const faceIndex = found.faceIndex;
    const geometry = found.object.geometry;
    const id = loader.ifcManager.getExpressId(geometry, faceIndex);

    // 属性を取得
    loader.ifcManager.getItemProperties(ifcModel.modelID, id, true)
      .then(props => {
        selectedElement.set({
          id: props.GlobalId.value,
          name: props.Name.value,
          objectType: props.ObjectType.value,
          creationDate: props.OwnerHistory.CreationDate.value,
          applicationFullName: props.OwnerHistory.OwningApplication.ApplicationFullName.value
        });
      });
  }
</script>

<T.PerspectiveCamera position={[10, 4, 10]} fov={75}>
  <OrbitControls />
</T.PerspectiveCamera>

{#if ifcModel}
  <T.Primitive object={ifcModel} on:click={handleClick} />
{/if}

<T.AmbientLight intensity={0.5} />
<T.DirectionalLight intensity={0.7} position={[1, 0.5, 0.866]} />
```

---

## 8. 注意事項・制約事項

### 8.1 データタイプの排他制御

前震と本震は同時に表示不可：
- 「熊本地震前震」がチェックされている場合、「本震」はdisabled
- 逆も同様

### 8.2 IFCファイルサイズ

IFCファイルは大きいため、初回読み込みに時間がかかる可能性があります。
- ローディングインジケーターの表示推奨
- WASMファイル（web-ifc.wasm, web-ifc-mt.wasm）をpublicディレクトリに配置

### 8.3 ブラウザ互換性

- WebGL 2.0対応ブラウザが必須
- モバイルでは3D表示のパフォーマンスが低下する可能性あり

### 8.4 メモリ管理

IFCモデルは大きいため、モーダルを閉じる際に適切にdisposeする：

```typescript
await ifcLoader.ifcManager.dispose();
ifcLoader = null;
ifcModel = null;
```

---

## 9. テストシナリオ

### 9.1 基本動作テスト

1. サイドバーで「熊本地震前震によるシミュレーション」をチェック
2. 地図上に青いピンが表示されることを確認
3. ピンをクリックしてモーダルが開くことを確認
4. 3Dモデルが表示されることを確認
5. OrbitControlsで視点操作ができることを確認

### 9.2 部材クリックテスト

1. 建物の床部分をクリック
2. 属性パネルが表示されることを確認
3. ID、Name等が正しく表示されることを確認
4. 変位グラフ画像が表示されることを確認
5. 別の部材をクリックして属性が更新されることを確認

### 9.3 ドラッグテスト

1. 属性パネルのヘッダーをドラッグ
2. パネルが移動できることを確認
3. モーダル外にはみ出さないことを確認（bounds制御）

### 9.4 排他制御テスト

1. 前震をチェック
2. 本震のチェックボックスがdisabledになることを確認
3. 前震のチェックを外す
4. 本震のチェックボックスが有効になることを確認

### 9.5 クリーンアップテスト

1. モーダルを開く
2. 部材をいくつかクリック
3. モーダルを閉じる
4. 再度開く
5. 前回の選択状態が残っていないことを確認
6. メモリリークがないことを確認（開発ツールで）

---

## 10. データファイル一覧

### 10.1 3Dモデル

| ファイル | URL | 用途 |
|---------|-----|------|
| building_RC.glb | https://nied.s3.ap-northeast-1.amazonaws.com/edefense/building_RC.glb | RC造建物GLTFモデル |
| building_S.glb | https://nied.s3.ap-northeast-1.amazonaws.com/edefense/building_S.glb | 鉄骨造建物GLTFモデル |
| 200408_building_RC.ifc | /200408_building_RC.ifc | RC造建物IFCモデル |
| 200408_building_S.ifc | /200408_building_S.ifc | 鉄骨造建物IFCモデル |

### 10.2 アイコン

| ファイル | URL |
|---------|-----|
| 青ピン | https://nied.s3.ap-northeast-1.amazonaws.com/map_icon_blue.svg |

### 10.3 変位グラフ画像

**前震データ** (`public/ifcGraphImage/fore/`):
- `floor/fore_long_1F.png` 〜 `fore_long_10F.png`
- `floor/fore_short_1F.png` 〜 `fore_short_10F.png`
- `item/fore_A12_left.png`, `fore_A12_right.png`
- `item/fore_B12_left.png`, `fore_B12_right.png`
- `item/fore_A2_top_X.png`, `fore_A2_top_Y.png`, `fore_A2_bottom_X.png`, `fore_A2_bottom_Y.png`

**本震データ** (`public/ifcGraphImage/after/`):
- 前震と同じ構成

---

## 11. 参考情報

### 11.1 関連URL

- **データ出典**: https://www.geospatial.jp/ckan/dataset/nied-simulation
- **Ｅ－ディフェンス**: 防災科学技術研究所の実大三次元震動破壊実験施設

### 11.2 技術スタック比較

| 項目 | React実装 | Svelte移植推奨 |
|------|-----------|---------------|
| フレームワーク | Next.js 14.2.21 | SvelteKit |
| 3D | @react-three/fiber | threlte |
| 状態管理 | Recoil | Svelte stores |
| UI | Tailwind CSS | Tailwind CSS |
| ドラッグ | react-draggable | svelte-drag |
| モーダル | @headlessui/react | svelte-headlessui |

---

## 12. まとめ

この機能は以下の3つの主要コンポーネントで構成されています：

1. **地図レイヤー管理**: アイコンとGLTFモデルの表示・クリック検出
2. **IFCモデル表示**: Three.jsによる3D建物モデルの表示と部材選択
3. **変位データ表示**: 部材IDに基づく地震変位グラフ画像の表示

Svelteへの移植時は、`threlte`を使用することで、React Three Fiberとほぼ同等の機能を実現できます。状態管理はRecoilからSvelteストアに置き換え、ドラッグ機能などのUIライブラリもSvelte版に置き換えることで、スムーズな移植が可能です。

最も重要なのは、`web-ifc-three`を正しく初期化し、WASMファイルのパスを適切に設定することです。これにより、IFCファイルの読み込みと部材のクリック検出が正しく動作します。
