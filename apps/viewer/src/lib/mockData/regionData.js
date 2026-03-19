// 都道府県データ
export const prefectures = [
  { id: 'hokkaido', name: '北海道', region: '北海道' },
  { id: 'aomori', name: '青森県', region: '東北' },
  { id: 'iwate', name: '岩手県', region: '東北' },
  { id: 'miyagi', name: '宮城県', region: '東北' },
  { id: 'akita', name: '秋田県', region: '東北' },
  { id: 'yamagata', name: '山形県', region: '東北' },
  { id: 'fukushima', name: '福島県', region: '東北' },
  { id: 'ibaraki', name: '茨城県', region: '関東' },
  { id: 'tochigi', name: '栃木県', region: '関東' },
  { id: 'gunma', name: '群馬県', region: '関東' },
  { id: 'saitama', name: '埼玉県', region: '関東' },
  { id: 'chiba', name: '千葉県', region: '関東' },
  { id: 'tokyo', name: '東京都', region: '関東' },
  { id: 'kanagawa', name: '神奈川県', region: '関東' },
  { id: 'niigata', name: '新潟県', region: '中部' },
  { id: 'toyama', name: '富山県', region: '中部' },
  { id: 'ishikawa', name: '石川県', region: '中部' },
  { id: 'fukui', name: '福井県', region: '中部' },
  { id: 'yamanashi', name: '山梨県', region: '中部' },
  { id: 'nagano', name: '長野県', region: '中部' },
  { id: 'gifu', name: '岐阜県', region: '中部' },
  { id: 'shizuoka', name: '静岡県', region: '中部' },
  { id: 'aichi', name: '愛知県', region: '中部' },
  { id: 'mie', name: '三重県', region: '近畿' },
  { id: 'shiga', name: '滋賀県', region: '近畿' },
  { id: 'kyoto', name: '京都府', region: '近畿' },
  { id: 'osaka', name: '大阪府', region: '近畿' },
  { id: 'hyogo', name: '兵庫県', region: '近畿' },
  { id: 'nara', name: '奈良県', region: '近畿' },
  { id: 'wakayama', name: '和歌山県', region: '近畿' },
  { id: 'tottori', name: '鳥取県', region: '中国' },
  { id: 'shimane', name: '島根県', region: '中国' },
  { id: 'okayama', name: '岡山県', region: '中国' },
  { id: 'hiroshima', name: '広島県', region: '中国' },
  { id: 'yamaguchi', name: '山口県', region: '中国' },
  { id: 'tokushima', name: '徳島県', region: '四国' },
  { id: 'kagawa', name: '香川県', region: '四国' },
  { id: 'ehime', name: '愛媛県', region: '四国' },
  { id: 'kochi', name: '高知県', region: '四国' },
  { id: 'fukuoka', name: '福岡県', region: '九州' },
  { id: 'saga', name: '佐賀県', region: '九州' },
  { id: 'nagasaki', name: '長崎県', region: '九州' },
  { id: 'kumamoto', name: '熊本県', region: '九州' },
  { id: 'oita', name: '大分県', region: '九州' },
  { id: 'miyazaki', name: '宮崎県', region: '九州' },
  { id: 'kagoshima', name: '鹿児島県', region: '九州' },
  { id: 'okinawa', name: '沖縄県', region: '沖縄' }
];

// 市区町村データ（主要都市のみのサンプル）
export const municipalities = {
  tokyo: [
    { id: 'chiyoda', name: '千代田区', prefecture: 'tokyo' },
    { id: 'chuo', name: '中央区', prefecture: 'tokyo' },
    { id: 'minato', name: '港区', prefecture: 'tokyo' },
    { id: 'shinjuku', name: '新宿区', prefecture: 'tokyo' },
    { id: 'bunkyo', name: '文京区', prefecture: 'tokyo' },
    { id: 'taito', name: '台東区', prefecture: 'tokyo' },
    { id: 'sumida', name: '墨田区', prefecture: 'tokyo' },
    { id: 'koto', name: '江東区', prefecture: 'tokyo' },
    { id: 'shinagawa', name: '品川区', prefecture: 'tokyo' },
    { id: 'meguro', name: '目黒区', prefecture: 'tokyo' },
    { id: 'ota', name: '大田区', prefecture: 'tokyo' },
    { id: 'setagaya', name: '世田谷区', prefecture: 'tokyo' },
    { id: 'shibuya', name: '渋谷区', prefecture: 'tokyo' },
    { id: 'nakano', name: '中野区', prefecture: 'tokyo' },
    { id: 'suginami', name: '杉並区', prefecture: 'tokyo' },
    { id: 'toshima', name: '豊島区', prefecture: 'tokyo' },
    { id: 'kita', name: '北区', prefecture: 'tokyo' },
    { id: 'arakawa', name: '荒川区', prefecture: 'tokyo' },
    { id: 'itabashi', name: '板橋区', prefecture: 'tokyo' },
    { id: 'nerima', name: '練馬区', prefecture: 'tokyo' },
    { id: 'adachi', name: '足立区', prefecture: 'tokyo' },
    { id: 'katsushika', name: '葛飾区', prefecture: 'tokyo' },
    { id: 'edogawa', name: '江戸川区', prefecture: 'tokyo' }
  ],
  kanagawa: [
    { id: 'yokohama', name: '横浜市', prefecture: 'kanagawa' },
    { id: 'kawasaki', name: '川崎市', prefecture: 'kanagawa' },
    { id: 'sagamihara', name: '相模原市', prefecture: 'kanagawa' },
    { id: 'yokosuka', name: '横須賀市', prefecture: 'kanagawa' },
    { id: 'hiratsuka', name: '平塚市', prefecture: 'kanagawa' },
    { id: 'kamakura', name: '鎌倉市', prefecture: 'kanagawa' },
    { id: 'fujisawa', name: '藤沢市', prefecture: 'kanagawa' },
    { id: 'odawara', name: '小田原市', prefecture: 'kanagawa' },
    { id: 'chigasaki', name: '茅ヶ崎市', prefecture: 'kanagawa' },
    { id: 'zushi', name: '逗子市', prefecture: 'kanagawa' },
    { id: 'yamato', name: '大和市', prefecture: 'kanagawa' },
    { id: 'atsugi', name: '厚木市', prefecture: 'kanagawa' }
  ],
  shizuoka: [
    { id: 'shizuoka-shi', name: '静岡市', prefecture: 'shizuoka' },
    { id: 'hamamatsu', name: '浜松市', prefecture: 'shizuoka' },
    { id: 'numazu', name: '沼津市', prefecture: 'shizuoka' },
    { id: 'atami', name: '熱海市', prefecture: 'shizuoka' },
    { id: 'mishima', name: '三島市', prefecture: 'shizuoka' },
    { id: 'fujinomiya', name: '富士宮市', prefecture: 'shizuoka' },
    { id: 'ito', name: '伊東市', prefecture: 'shizuoka' },
    { id: 'shimada', name: '島田市', prefecture: 'shizuoka' },
    { id: 'fuji', name: '富士市', prefecture: 'shizuoka' },
    { id: 'iwata', name: '磐田市', prefecture: 'shizuoka' },
    { id: 'yaizu', name: '焼津市', prefecture: 'shizuoka' },
    { id: 'kakegawa', name: '掛川市', prefecture: 'shizuoka' },
    { id: 'fujieda', name: '藤枝市', prefecture: 'shizuoka' },
    { id: 'gotemba', name: '御殿場市', prefecture: 'shizuoka' },
    { id: 'fukuroi', name: '袋井市', prefecture: 'shizuoka' },
    { id: 'shimoda', name: '下田市', prefecture: 'shizuoka' },
    { id: 'susono', name: '裾野市', prefecture: 'shizuoka' },
    { id: 'kosai', name: '湖西市', prefecture: 'shizuoka' },
    { id: 'izu', name: '伊豆市', prefecture: 'shizuoka' },
    { id: 'omaezaki', name: '御前崎市', prefecture: 'shizuoka' },
    { id: 'kikugawa', name: '菊川市', prefecture: 'shizuoka' },
    { id: 'izunokuni', name: '伊豆の国市', prefecture: 'shizuoka' },
    { id: 'makinohara', name: '牧之原市', prefecture: 'shizuoka' }
  ],
  aichi: [
    { id: 'nagoya', name: '名古屋市', prefecture: 'aichi' },
    { id: 'toyohashi', name: '豊橋市', prefecture: 'aichi' },
    { id: 'okazaki', name: '岡崎市', prefecture: 'aichi' },
    { id: 'ichinomiya', name: '一宮市', prefecture: 'aichi' },
    { id: 'seto', name: '瀬戸市', prefecture: 'aichi' },
    { id: 'kasugai', name: '春日井市', prefecture: 'aichi' },
    { id: 'toyokawa', name: '豊川市', prefecture: 'aichi' },
    { id: 'kariya', name: '刈谷市', prefecture: 'aichi' },
    { id: 'toyota', name: '豊田市', prefecture: 'aichi' },
    { id: 'anjo', name: '安城市', prefecture: 'aichi' }
  ],
  osaka: [
    { id: 'osaka-shi', name: '大阪市', prefecture: 'osaka' },
    { id: 'sakai', name: '堺市', prefecture: 'osaka' },
    { id: 'kishiwada', name: '岸和田市', prefecture: 'osaka' },
    { id: 'toyonaka', name: '豊中市', prefecture: 'osaka' },
    { id: 'ikeda', name: '池田市', prefecture: 'osaka' },
    { id: 'suita', name: '吹田市', prefecture: 'osaka' },
    { id: 'takatsuki', name: '高槻市', prefecture: 'osaka' },
    { id: 'kaizuka', name: '貝塚市', prefecture: 'osaka' },
    { id: 'moriguchi', name: '守口市', prefecture: 'osaka' },
    { id: 'hirakata', name: '枚方市', prefecture: 'osaka' },
    { id: 'ibaraki-shi', name: '茨木市', prefecture: 'osaka' },
    { id: 'yao', name: '八尾市', prefecture: 'osaka' },
    { id: 'izumisano', name: '泉佐野市', prefecture: 'osaka' },
    { id: 'tondabayashi', name: '富田林市', prefecture: 'osaka' },
    { id: 'neyagawa', name: '寝屋川市', prefecture: 'osaka' }
  ],
  fukuoka: [
    { id: 'fukuoka-shi', name: '福岡市', prefecture: 'fukuoka' },
    { id: 'kitakyushu', name: '北九州市', prefecture: 'fukuoka' },
    { id: 'kurume', name: '久留米市', prefecture: 'fukuoka' },
    { id: 'nogata', name: '直方市', prefecture: 'fukuoka' },
    { id: 'iizuka', name: '飯塚市', prefecture: 'fukuoka' },
    { id: 'tagawa', name: '田川市', prefecture: 'fukuoka' },
    { id: 'yanagawa', name: '柳川市', prefecture: 'fukuoka' },
    { id: 'yame', name: '八女市', prefecture: 'fukuoka' },
    { id: 'chikugo', name: '筑後市', prefecture: 'fukuoka' },
    { id: 'okawa', name: '大川市', prefecture: 'fukuoka' }
  ],
  // 他の都道府県も必要に応じて追加
  miyagi: [
    { id: 'sendai', name: '仙台市', prefecture: 'miyagi' },
    { id: 'ishinomaki', name: '石巻市', prefecture: 'miyagi' },
    { id: 'shiogama', name: '塩竈市', prefecture: 'miyagi' },
    { id: 'kesennuma', name: '気仙沼市', prefecture: 'miyagi' },
    { id: 'shiroishi', name: '白石市', prefecture: 'miyagi' },
    { id: 'natori', name: '名取市', prefecture: 'miyagi' },
    { id: 'kakuda', name: '角田市', prefecture: 'miyagi' },
    { id: 'tagajo', name: '多賀城市', prefecture: 'miyagi' },
    { id: 'iwanuma', name: '岩沼市', prefecture: 'miyagi' },
    { id: 'tome', name: '登米市', prefecture: 'miyagi' },
    { id: 'kurihara', name: '栗原市', prefecture: 'miyagi' },
    { id: 'higashimatsushima', name: '東松島市', prefecture: 'miyagi' },
    { id: 'osaki', name: '大崎市', prefecture: 'miyagi' }
  ],
  hiroshima: [
    { id: 'hiroshima-shi', name: '広島市', prefecture: 'hiroshima' },
    { id: 'kure', name: '呉市', prefecture: 'hiroshima' },
    { id: 'takehara', name: '竹原市', prefecture: 'hiroshima' },
    { id: 'mihara', name: '三原市', prefecture: 'hiroshima' },
    { id: 'onomichi', name: '尾道市', prefecture: 'hiroshima' },
    { id: 'fukuyama', name: '福山市', prefecture: 'hiroshima' },
    { id: 'fuchu-shi', name: '府中市', prefecture: 'hiroshima' },
    { id: 'miyoshi', name: '三次市', prefecture: 'hiroshima' },
    { id: 'shobara', name: '庄原市', prefecture: 'hiroshima' },
    { id: 'otake', name: '大竹市', prefecture: 'hiroshima' },
    { id: 'higashihiroshima', name: '東広島市', prefecture: 'hiroshima' },
    { id: 'hatsukaichi', name: '廿日市市', prefecture: 'hiroshima' },
    { id: 'akitakata', name: '安芸高田市', prefecture: 'hiroshima' },
    { id: 'etajima', name: '江田島市', prefecture: 'hiroshima' }
  ]
};

// メッシュコードは市区町村に紐付け
export const meshCodesByMunicipality = {
  // 東京都
  'chiyoda': [
    { code: '5339-45-11', name: '千代田区丸の内', bounds: [139.75, 35.68, 139.77, 35.69] },
    { code: '5339-45-12', name: '千代田区大手町', bounds: [139.76, 35.68, 139.78, 35.69] },
    { code: '5339-45-13', name: '千代田区霞が関', bounds: [139.74, 35.67, 139.76, 35.68] }
  ],
  'chuo': [
    { code: '5339-45-21', name: '中央区銀座', bounds: [139.76, 35.67, 139.78, 35.68] },
    { code: '5339-45-22', name: '中央区日本橋', bounds: [139.77, 35.68, 139.79, 35.69] },
    { code: '5339-45-23', name: '中央区築地', bounds: [139.77, 35.66, 139.78, 35.67] }
  ],
  'minato': [
    { code: '5339-45-31', name: '港区新橋', bounds: [139.75, 35.66, 139.76, 35.67] },
    { code: '5339-45-32', name: '港区六本木', bounds: [139.73, 35.66, 139.74, 35.67] },
    { code: '5339-45-33', name: '港区品川', bounds: [139.73, 35.63, 139.75, 35.64] }
  ],
  'shinjuku': [
    { code: '5339-35-11', name: '新宿区新宿', bounds: [139.69, 35.68, 139.71, 35.70] },
    { code: '5339-35-12', name: '新宿区西新宿', bounds: [139.68, 35.68, 139.70, 35.70] },
    { code: '5339-35-13', name: '新宿区高田馬場', bounds: [139.70, 35.71, 139.71, 35.72] }
  ],
  'bunkyo': [
    { code: '5339-45-41', name: '文京区本郷', bounds: [139.75, 35.71, 139.76, 35.72] },
    { code: '5339-45-42', name: '文京区湯島', bounds: [139.76, 35.70, 139.77, 35.71] },
    { code: '5339-45-43', name: '文京区後楽', bounds: [139.74, 35.70, 139.75, 35.71] }
  ],
  'taito': [
    { code: '5339-45-51', name: '台東区上野', bounds: [139.77, 35.71, 139.78, 35.72] },
    { code: '5339-45-52', name: '台東区浅草', bounds: [139.79, 35.71, 139.80, 35.72] },
    { code: '5339-45-53', name: '台東区蔵前', bounds: [139.78, 35.70, 139.79, 35.71] }
  ],
  'shibuya': [
    { code: '5339-35-21', name: '渋谷区渋谷', bounds: [139.70, 35.65, 139.71, 35.67] },
    { code: '5339-35-22', name: '渋谷区原宿', bounds: [139.70, 35.66, 139.71, 35.68] },
    { code: '5339-35-23', name: '渋谷区恵比寿', bounds: [139.71, 35.64, 139.72, 35.65] }
  ],
  'shizuoka-shi': [
    { code: '5238-00', name: '静岡市葵区', bounds: [138.3, 34.95, 138.4, 35.0] },
    { code: '5238-01', name: '静岡市駿河区', bounds: [138.35, 34.93, 138.45, 34.98] },
    { code: '5238-02', name: '静岡市清水区', bounds: [138.45, 34.98, 138.55, 35.03] }
  ],
  'hamamatsu': [
    { code: '5238-10', name: '浜松市中区', bounds: [137.7, 34.7, 137.8, 34.75] },
    { code: '5238-11', name: '浜松市東区', bounds: [137.75, 34.72, 137.85, 34.77] },
    { code: '5238-12', name: '浜松市西区', bounds: [137.65, 34.68, 137.75, 34.73] },
    { code: '5238-13', name: '浜松市南区', bounds: [137.7, 34.65, 137.8, 34.7] },
    { code: '5238-14', name: '浜松市北区', bounds: [137.7, 34.75, 137.8, 34.8] }
  ],
  'fuji': [
    { code: '5238-20', name: '富士市中央', bounds: [138.65, 35.15, 138.75, 35.2] },
    { code: '5238-21', name: '富士市南部', bounds: [138.65, 35.12, 138.75, 35.17] },
    { code: '5238-22', name: '富士市北部', bounds: [138.65, 35.18, 138.75, 35.23] }
  ],
  'yokohama': [
    { code: '5339-50', name: '横浜市中区', bounds: [139.62, 35.44, 139.68, 35.46] },
    { code: '5339-51', name: '横浜市西区', bounds: [139.60, 35.45, 139.64, 35.47] },
    { code: '5339-52', name: '横浜市南区', bounds: [139.60, 35.42, 139.65, 35.44] },
    { code: '5339-53', name: '横浜市港南区', bounds: [139.58, 35.39, 139.63, 35.42] },
    { code: '5339-54', name: '横浜市保土ケ谷区', bounds: [139.57, 35.45, 139.61, 35.48] },
    { code: '5339-55', name: '横浜市旭区', bounds: [139.52, 35.47, 139.57, 35.50] },
    { code: '5339-56', name: '横浜市磯子区', bounds: [139.60, 35.38, 139.65, 35.42] },
    { code: '5339-57', name: '横浜市金沢区', bounds: [139.60, 35.33, 139.65, 35.37] }
  ],
  'nagoya': [
    { code: '5237-30', name: '名古屋市中区', bounds: [136.90, 35.16, 136.92, 35.18] },
    { code: '5237-31', name: '名古屋市東区', bounds: [136.92, 35.17, 136.94, 35.19] },
    { code: '5237-32', name: '名古屋市北区', bounds: [136.90, 35.19, 136.93, 35.21] },
    { code: '5237-33', name: '名古屋市西区', bounds: [136.88, 35.18, 136.90, 35.20] },
    { code: '5237-34', name: '名古屋市中村区', bounds: [136.86, 35.16, 136.88, 35.18] },
    { code: '5237-35', name: '名古屋市中川区', bounds: [136.84, 35.13, 136.87, 35.16] }
  ],
  'sendai': [
    { code: '5740-00', name: '仙台市青葉区', bounds: [140.86, 38.26, 140.89, 38.28] },
    { code: '5740-01', name: '仙台市宮城野区', bounds: [140.89, 38.26, 140.92, 38.28] },
    { code: '5740-02', name: '仙台市若林区', bounds: [140.89, 38.24, 140.92, 38.26] },
    { code: '5740-03', name: '仙台市太白区', bounds: [140.84, 38.22, 140.87, 38.24] },
    { code: '5740-04', name: '仙台市泉区', bounds: [140.86, 38.30, 140.89, 38.32] }
  ],
  'osaka-shi': [
    { code: '5235-40', name: '大阪市北区', bounds: [135.50, 34.70, 135.52, 34.72] },
    { code: '5235-41', name: '大阪市中央区', bounds: [135.50, 34.68, 135.52, 34.70] },
    { code: '5235-42', name: '大阪市西区', bounds: [135.48, 34.68, 135.50, 34.70] },
    { code: '5235-43', name: '大阪市浪速区', bounds: [135.49, 34.66, 135.51, 34.68] },
    { code: '5235-44', name: '大阪市東淀川区', bounds: [135.52, 34.73, 135.54, 34.75] },
    { code: '5235-45', name: '大阪市東成区', bounds: [135.53, 34.67, 135.55, 34.69] }
  ],
  'fukuoka-shi': [
    { id: '5030-00', name: '福岡市博多区', bounds: [130.41, 33.59, 130.43, 33.61] },
    { id: '5030-01', name: '福岡市中央区', bounds: [130.39, 33.58, 130.41, 33.60] },
    { id: '5030-02', name: '福岡市南区', bounds: [130.42, 33.56, 130.44, 33.58] },
    { id: '5030-03', name: '福岡市西区', bounds: [130.32, 33.58, 130.35, 33.60] },
    { id: '5030-04', name: '福岡市城南区', bounds: [130.36, 33.57, 130.38, 33.59] },
    { id: '5030-05', name: '福岡市早良区', bounds: [130.34, 33.58, 130.37, 33.60] },
    { id: '5030-06', name: '福岡市東区', bounds: [130.41, 33.61, 130.44, 33.63] }
  ],
  // デフォルト（選択されていない場合）
  default: []
};