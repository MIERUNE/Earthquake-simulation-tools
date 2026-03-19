export const mockRegions = [
  { id: 'kanto', name: '関東地方', prefectures: ['東京都', '神奈川県', '千葉県', '埼玉県', '茨城県', '栃木県', '群馬県'] },
  { id: 'tokai', name: '東海地方', prefectures: ['静岡県', '愛知県', '岐阜県', '三重県'] },
  { id: 'kansai', name: '関西地方', prefectures: ['大阪府', '京都府', '兵庫県', '奈良県', '和歌山県', '滋賀県'] },
  { id: 'tohoku', name: '東北地方', prefectures: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'] },
  { id: 'kyushu', name: '九州地方', prefectures: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県'] },
  { id: 'hokkaido', name: '北海道地方', prefectures: ['北海道'] },
  { id: 'chugoku', name: '中国地方', prefectures: ['広島県', '岡山県', '山口県', '鳥取県', '島根県'] },
  { id: 'shikoku', name: '四国地方', prefectures: ['香川県', '愛媛県', '徳島県', '高知県'] }
];

export const mockMeshCodes = {
  kanto: [
    { code: '5339-45', name: '東京都心部', bounds: [139.7, 35.65, 139.8, 35.7], region: 'kanto' },
    { code: '5339-46', name: '東京湾岸', bounds: [139.8, 35.6, 139.9, 35.65], region: 'kanto' },
    { code: '5339-35', name: '多摩地区', bounds: [139.3, 35.65, 139.4, 35.7], region: 'kanto' },
    { code: '5239-76', name: '横浜市北部', bounds: [139.5, 35.5, 139.6, 35.55], region: 'kanto' },
    { code: '5239-77', name: '横浜市南部', bounds: [139.6, 35.45, 139.7, 35.5], region: 'kanto' }
  ],
  tokai: [
    { code: '5238-00', name: '静岡市', bounds: [138.3, 34.95, 138.4, 35.0], region: 'tokai' },
    { code: '5238-01', name: '浜松市', bounds: [137.7, 34.7, 137.8, 34.75], region: 'tokai' },
    { code: '5237-17', name: '名古屋市', bounds: [136.9, 35.15, 137.0, 35.2], region: 'tokai' },
    { code: '5238-10', name: '富士市', bounds: [138.65, 35.15, 138.75, 35.2], region: 'tokai' },
    { code: '5237-27', name: '豊橋市', bounds: [137.35, 34.75, 137.45, 34.8], region: 'tokai' }
  ],
  kansai: [
    { code: '5235-34', name: '大阪市北部', bounds: [135.45, 34.7, 135.55, 34.75], region: 'kansai' },
    { code: '5235-35', name: '大阪市南部', bounds: [135.45, 34.65, 135.55, 34.7], region: 'kansai' },
    { code: '5235-14', name: '京都市', bounds: [135.7, 35.0, 135.8, 35.05], region: 'kansai' },
    { code: '5234-67', name: '神戸市', bounds: [135.15, 34.65, 135.25, 34.7], region: 'kansai' },
    { code: '5235-15', name: '奈良市', bounds: [135.8, 34.65, 135.9, 34.7], region: 'kansai' }
  ]
};

export const mockSimulationData = {
  region: 'tokai',
  meshCodes: ['5238-00', '5238-01'],
  parameters: {
    epicenter: {
      latitude: 34.7,
      longitude: 137.8,
      depth: 30
    },
    magnitude: 7.5,
    earthquakeType: 'plate_boundary',
    faultParameters: {
      strike: 230,
      dip: 15,
      rake: 90,
      length: 100,
      width: 50
    }
  },
  priority: 'high',
  userId: 'user123',
  createdAt: new Date()
};

export const mockReservationResponse = {
  reservationId: 'RES-2024-001234',
  estimatedStartTime: new Date(Date.now() + 30 * 60 * 1000),
  estimatedMinutes: 120,
  status: 'pending'
};

export const earthquakeTypes = [
  { value: 'plate_boundary', label: 'プレート境界型', description: '海溝型地震・プレート間地震' },
  { value: 'inland', label: '内陸直下型', description: '活断層による地震' },
  { value: 'deep', label: '深発地震', description: '深さ60km以上の地震' }
];

export const priorityOptions = [
  { value: 'high', label: '高', color: 'text-red-600' },
  { value: 'medium', label: '中', color: 'text-yellow-600' },
  { value: 'low', label: '低', color: 'text-green-600' }
];

export const earthquakeScenarios = [
  {
    id: 'tokai_m8',
    name: '東海地震 (M8.0)',
    description: '想定東海地震',
    region: 'tokai',
    parameters: {
      epicenter: { latitude: 34.5, longitude: 138.2, depth: 20 },
      magnitude: 8.0,
      earthquakeType: 'plate_boundary',
      faultParameters: {
        strike: 230,
        dip: 15,
        rake: 90,
        length: 150,
        width: 70
      }
    }
  },
  {
    id: 'nankai_m8.4',
    name: '南海トラフ地震 (M8.4)',
    description: '南海トラフ巨大地震',
    region: 'tokai',
    parameters: {
      epicenter: { latitude: 33.0, longitude: 136.0, depth: 10 },
      magnitude: 8.4,
      earthquakeType: 'plate_boundary',
      faultParameters: {
        strike: 240,
        dip: 10,
        rake: 90,
        length: 300,
        width: 100
      }
    }
  },
  {
    id: 'tokyo_inland_m7',
    name: '首都直下地震 (M7.0)',
    description: '東京湾北部地震',
    region: 'kanto',
    parameters: {
      epicenter: { latitude: 35.6, longitude: 139.8, depth: 30 },
      magnitude: 7.0,
      earthquakeType: 'inland',
      faultParameters: {
        strike: 180,
        dip: 45,
        rake: 90,
        length: 40,
        width: 20
      }
    }
  },
  {
    id: 'kansai_m7.5',
    name: '上町断層帯地震 (M7.5)',
    description: '大阪府内陸地震',
    region: 'kansai',
    parameters: {
      epicenter: { latitude: 34.7, longitude: 135.5, depth: 15 },
      magnitude: 7.5,
      earthquakeType: 'inland',
      faultParameters: {
        strike: 10,
        dip: 85,
        rake: 90,
        length: 42,
        width: 18
      }
    }
  },
  {
    id: 'custom',
    name: 'カスタムパラメータ',
    description: '手動でパラメータを入力',
    region: 'all',
    parameters: null
  }
];