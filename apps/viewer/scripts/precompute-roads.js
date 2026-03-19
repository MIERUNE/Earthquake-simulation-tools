// 道路閉塞率データの事前計算スクリプト
// 使用方法: node scripts/precompute-roads.js

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 動的インポート
const { precomputeAllRoadBlockages } = await import('../src/lib/roadBlockagePrecompute.ts');

console.log('=== 道路閉塞率データの事前計算 ===\n');

const startTime = Date.now();
const data = precomputeAllRoadBlockages();
const endTime = Date.now();

console.log(`\n計算完了: ${endTime - startTime}ms`);
console.log(`道路数: ${data.length}`);

// JSONファイルとして保存
const outputPath = join(__dirname, '../src/lib/data/precomputed-road-blockages.json');
writeFileSync(outputPath, JSON.stringify(data, null, 2));

console.log(`\n保存完了: ${outputPath}`);
console.log(`ファイルサイズ: ${(JSON.stringify(data).length / 1024).toFixed(2)} KB`);
