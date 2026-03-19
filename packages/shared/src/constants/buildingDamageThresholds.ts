/**
 * 建物被害判定の閾値定義
 *
 * 構造種別ごとの層間変形角（drift）の閾値を定義します。
 * これらの閾値は以下のファイルで使用されます：
 * - apps/viewer/src/lib/utils/buildingAggregationDuckDB.ts
 * - apps/viewer/src/lib/utils/DeckLayerFactory.ts
 */

/**
 * 建物構造種別
 */
export type BuildingStructureType = 'wood' | 'rc' | 'steel';

/**
 * 被害レベル
 */
export type DamageLevel = 'minor' | 'damaged' | 'collapsed' | 'slight' | 'moderate' | 'severe';

/**
 * 被害パラメータ（色分け用の数値）
 * 1-3: 木造（無被害、半壊、全壊）
 * 4-6: 非木造（無被害、半壊、全壊）
 */
export type DamageParam = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * 構造種別ごとの閾値定義
 */
export interface StructureThresholds {
    /** 構造種別名 */
    type: BuildingStructureType;
    /** 構造種別の識別子（プロパティ値） */
    identifiers: string[];
    /** 閾値と対応する被害レベル */
    thresholds: {
        /** 閾値（この値未満） */
        value: number;
        /** 被害レベル */
        level: DamageLevel;
        /** 被害パラメータ */
        param: DamageParam;
        /** 表示名 */
        displayName: string;
    }[];
    /** デフォルトのパラメータ（閾値に該当しない場合） */
    defaultParam: DamageParam;
}

/**
 * 木造建物の閾値
 */
export const WOOD_THRESHOLDS: StructureThresholds = {
    type: 'wood',
    identifiers: ['WoodMDOF', 'wood', 'Wood'],
    thresholds: [
        {
            value: 0.033,
            level: 'minor',
            param: 1,
            displayName: '木造：無被害',
        },
        {
            value: 0.1,
            level: 'damaged',
            param: 2,
            displayName: '木造：半壊',
        },
        {
            value: Infinity,
            level: 'collapsed',
            param: 3,
            displayName: '木造：全壊',
        },
    ],
    defaultParam: 1,
};

/**
 * RC造（鉄筋コンクリート造）建物の閾値
 */
export const RC_THRESHOLDS: StructureThresholds = {
    type: 'rc',
    identifiers: ['RC', 'SRC'],
    thresholds: [
        {
            value: 0.008,
            level: 'minor',
            param: 4,
            displayName: '非木造：無被害',
        },
        {
            value: 0.02,
            level: 'damaged',
            param: 5,
            displayName: '非木造：半壊',
        },
        {
            value: Infinity,
            level: 'collapsed',
            param: 6,
            displayName: '非木造：全壊',
        },
    ],
    defaultParam: 4,
};

/**
 * S造（鉄骨造）建物の閾値
 */
export const STEEL_THRESHOLDS: StructureThresholds = {
    type: 'steel',
    identifiers: ['SteelMDOF', 'steel', 'Steel'],
    thresholds: [
        {
            value: 0.008,
            level: 'minor',
            param: 4,
            displayName: '非木造：無被害',
        },
        {
            value: 0.02,
            level: 'damaged',
            param: 5,
            displayName: '非木造：半壊',
        },
        {
            value: Infinity,
            level: 'collapsed',
            param: 6,
            displayName: '非木造：全壊',
        },
    ],
    defaultParam: 4,
};

/**
 * 全構造種別の閾値
 */
export const ALL_STRUCTURE_THRESHOLDS: StructureThresholds[] = [
    WOOD_THRESHOLDS,
    RC_THRESHOLDS,
    STEEL_THRESHOLDS,
];

/**
 * 層間変形角から被害パラメータを計算するヘルパー関数
 *
 * @param drift 層間変形角
 * @param properties プロパティオブジェクト（_NAMEで始まるプロパティから構造種別を検索）
 * @param useCityAttributes _NAME00001と_NAME00002を使用するかどうか（市区町村コード指定時のみtrue）
 * @returns 被害パラメータ (1-6: 木造1-3、非木造4-6)
 */
export const getDamageParam = (
    drift: number,
    properties?: Record<string, any>,
    useCityAttributes: boolean = false
): DamageParam => {
    if (!properties) {
        return WOOD_THRESHOLDS.defaultParam;
    }

    // _NAMEで始まるすべてのプロパティを検索して構造種別を見つける
    const nameValues: string[] = [];

    for (const key in properties) {
        if (key.startsWith('_NAME')) {
            // _NAME00001と_NAME00002は市区町村コード指定時のみ使用
            if (!useCityAttributes && (key === '_NAME00001' || key === '_NAME00002')) {
                continue;
            }

            const value = properties[key];
            // 値が文字列で、かつ'no_name'でない場合に追加
            if (typeof value === 'string' && value !== 'no_name' && value !== '') {
                nameValues.push(value);
            }
        }
    }

    // 構造種別を判定
    for (const structureThreshold of ALL_STRUCTURE_THRESHOLDS) {
        const isMatch = nameValues.some((value) =>
            structureThreshold.identifiers.includes(value)
        );

        if (isMatch) {
            // 閾値に基づいてパラメータを決定
            for (const threshold of structureThreshold.thresholds) {
                if (drift < threshold.value) {
                    return threshold.param;
                }
            }
            // 全ての閾値を超えた場合は最後のパラメータ
            return structureThreshold.thresholds[structureThreshold.thresholds.length - 1].param;
        }
    }

    // どの構造種別にも該当しない場合はデフォルト（木造の軽微）
    return WOOD_THRESHOLDS.defaultParam;
};
