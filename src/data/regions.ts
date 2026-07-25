export type NormalizedPoint = {
  x: number;
  z: number;
};

export type RegionDefinition = {
  id: string;
  name: string;
  description: string;
  center: NormalizedPoint;
  radius: NormalizedPoint;
  baseColor: number;
  highColor: number;
  labelPosition: NormalizedPoint;
  labelScale: number;
  boundary: NormalizedPoint[];
};

export type GeographyLabelDefinition = {
  id: string;
  name: string;
  position: NormalizedPoint;
  scale: number;
  tone: 'snow' | 'sand' | 'green' | 'fire' | 'mountain' | 'gold';
  vertical?: boolean;
  lift?: number;
};

export type SectKind =
  | 'imperial'
  | 'star'
  | 'dao'
  | 'sword'
  | 'law'
  | 'ice'
  | 'buddha'
  | 'sun'
  | 'demon'
  | 'blood'
  | 'soul'
  | 'beast'
  | 'neutral'
  | 'alchemy'
  | 'array';

export type SectDefinition = {
  id: string;
  name: string;
  category: '仙帝宗门' | '魔道宗门' | '妖族势力' | '中立势力' | '其他宗门';
  area: string;
  position: NormalizedPoint;
  kind: SectKind;
  importance: number;
  tone: GeographyLabelDefinition['tone'];
  lift?: number;
  landmarkModelId?: string;
  externalDecorations?: Array<{
    modelId: string;
    offset: { x: number; y: number; z: number };
    scale: number;
    rotationY?: number;
  }>;
};

export const REGIONS: RegionDefinition[] = [
  {
    id: 'north-snowfield',
    name: '北冥雪原',
    description: '北部高寒冰原，海拔偏高，雪色和冰蓝色覆盖大地。',
    center: { x: 0.47, z: 0.2 },
    radius: { x: 0.28, z: 0.2 },
    baseColor: 0xdde8ef,
    highColor: 0xf8fbff,
    labelPosition: { x: 0.42, z: 0.18 },
    labelScale: 46,
    boundary: [
      { x: 0.24, z: 0.08 },
      { x: 0.52, z: 0.04 },
      { x: 0.75, z: 0.13 },
      { x: 0.72, z: 0.32 },
      { x: 0.51, z: 0.38 },
      { x: 0.27, z: 0.34 },
    ],
  },
  {
    id: 'west-desert',
    name: '西漠佛国',
    description: '西部沙漠与佛国城邦，沙丘连绵，黄褐色调明显。',
    center: { x: 0.18, z: 0.54 },
    radius: { x: 0.2, z: 0.31 },
    baseColor: 0xb98542,
    highColor: 0xe5c37a,
    labelPosition: { x: 0.17, z: 0.58 },
    labelScale: 42,
    boundary: [
      { x: 0.05, z: 0.26 },
      { x: 0.27, z: 0.28 },
      { x: 0.35, z: 0.46 },
      { x: 0.31, z: 0.72 },
      { x: 0.11, z: 0.78 },
      { x: 0.03, z: 0.61 },
    ],
  },
  {
    id: 'central-divine',
    name: '中央神州',
    description: '中心平原与丘陵地带，河谷纵横，是宗门和王朝最密集的地区。',
    center: { x: 0.5, z: 0.56 },
    radius: { x: 0.28, z: 0.24 },
    baseColor: 0x5f8c4a,
    highColor: 0x9fb86d,
    labelPosition: { x: 0.5, z: 0.57 },
    labelScale: 52,
    boundary: [
      { x: 0.31, z: 0.35 },
      { x: 0.52, z: 0.38 },
      { x: 0.69, z: 0.46 },
      { x: 0.67, z: 0.68 },
      { x: 0.48, z: 0.75 },
      { x: 0.28, z: 0.66 },
    ],
  },
  {
    id: 'east-forest',
    name: '东极青木域',
    description: '东部森林、丘陵与谷地，绿色浓重，灵木和山谷交织。',
    center: { x: 0.79, z: 0.53 },
    radius: { x: 0.22, z: 0.28 },
    baseColor: 0x2f6f43,
    highColor: 0x70a85a,
    labelPosition: { x: 0.82, z: 0.56 },
    labelScale: 43,
    boundary: [
      { x: 0.67, z: 0.29 },
      { x: 0.9, z: 0.25 },
      { x: 0.97, z: 0.48 },
      { x: 0.91, z: 0.76 },
      { x: 0.68, z: 0.73 },
      { x: 0.64, z: 0.48 },
    ],
  },
  {
    id: 'south-fire',
    name: '南离火洲',
    description: '南部火山岩陆与熔岩裂谷，黑红色调，地势破碎灼热。',
    center: { x: 0.53, z: 0.84 },
    radius: { x: 0.32, z: 0.16 },
    baseColor: 0x3b211d,
    highColor: 0xb23b22,
    labelPosition: { x: 0.52, z: 0.86 },
    labelScale: 50,
    boundary: [
      { x: 0.23, z: 0.71 },
      { x: 0.48, z: 0.68 },
      { x: 0.79, z: 0.72 },
      { x: 0.83, z: 0.94 },
      { x: 0.49, z: 0.98 },
      { x: 0.19, z: 0.91 },
    ],
  },
  {
    id: 'endless-mountains',
    name: '无尽山脉',
    description: '东北与外环的高耸山脉，是世界边界和视觉屏障。',
    center: { x: 0.89, z: 0.28 },
    radius: { x: 0.14, z: 0.31 },
    baseColor: 0x4f5a61,
    highColor: 0xb4c0c8,
    labelPosition: { x: 0.9, z: 0.36 },
    labelScale: 40,
    boundary: [
      { x: 0.78, z: 0.06 },
      { x: 0.98, z: 0.08 },
      { x: 0.99, z: 0.77 },
      { x: 0.88, z: 0.84 },
      { x: 0.82, z: 0.56 },
      { x: 0.73, z: 0.25 },
    ],
  },
];

export const GEOGRAPHY_LABELS: GeographyLabelDefinition[] = [
  { id: 'sighing-desert', name: '叹息沙海', position: { x: 0.08, z: 0.42 }, scale: 31, tone: 'sand', vertical: true },
  { id: 'west-buddha', name: '西漠佛国', position: { x: 0.18, z: 0.56 }, scale: 33, tone: 'sand', vertical: true },
  { id: 'sumeru-domain', name: '须弥山域', position: { x: 0.18, z: 0.39 }, scale: 22, tone: 'gold' },
  { id: 'buddha-caves', name: '十万佛窟', position: { x: 0.09, z: 0.34 }, scale: 17, tone: 'sand' },
  { id: 'north-snow', name: '北冥雪原', position: { x: 0.42, z: 0.18 }, scale: 35, tone: 'snow' },
  { id: 'polar-frozen-earth', name: '极地冻土', position: { x: 0.34, z: 0.08 }, scale: 20, tone: 'snow' },
  { id: 'lost-ice-valley', name: '绝迹冰谷', position: { x: 0.5, z: 0.34 }, scale: 21, tone: 'snow' },
  { id: 'north-abyss', name: '万丈深渊', position: { x: 0.53, z: 0.37 }, scale: 17, tone: 'mountain' },
  { id: 'central-shenzhou', name: '中央神州', position: { x: 0.5, z: 0.58 }, scale: 40, tone: 'gold' },
  { id: 'east-green', name: '东极青木域', position: { x: 0.86, z: 0.58 }, scale: 32, tone: 'green', vertical: true },
  { id: 'world-tree', name: '建木', position: { x: 0.755, z: 0.46 }, scale: 23, tone: 'gold' },
  { id: 'cloud-forest', name: '沂云森林·青丘国', position: { x: 0.86, z: 0.43 }, scale: 19, tone: 'green' },
  { id: 'ten-thousand-demon-mountains', name: '万妖山脉', position: { x: 0.7, z: 0.59 }, scale: 18, tone: 'mountain', vertical: true },
  { id: 'south-fire', name: '南离火洲', position: { x: 0.52, z: 0.88 }, scale: 37, tone: 'fire' },
  { id: 'unfailing-blood-sea', name: '不枯血海', position: { x: 0.5, z: 0.835 }, scale: 24, tone: 'fire' },
  { id: 'ten-thousand-foot-volcano', name: '万丈火山', position: { x: 0.705, z: 0.825 }, scale: 22, tone: 'fire' },
  { id: 'charred-bone-waste', name: '炽骨荒原', position: { x: 0.47, z: 0.96 }, scale: 19, tone: 'fire' },
  { id: 'endless-mountain', name: '无尽山脉', position: { x: 0.94, z: 0.36 }, scale: 30, tone: 'mountain', vertical: true },
  { id: 'star-sea-boundary', name: '星墟护罩', position: { x: 0.5, z: 1.02 }, scale: 18, tone: 'mountain' },
  { id: 'spirit-mirror', name: '神镜族', position: { x: 0.72, z: 0.56 }, scale: 19, tone: 'green' },
  { id: 'willow-snake', name: '柳蛇族', position: { x: 0.82, z: 0.5 }, scale: 19, tone: 'green' },
  { id: 'demon-dragon', name: '蛟龙一族', position: { x: 0.56, z: 0.355 }, scale: 18, tone: 'snow' },
  { id: 'cold-palace', name: '广寒宫', position: { x: 0.48, z: 0.16 }, scale: 16, tone: 'snow' },
  { id: 'star-road', name: '星道宗', position: { x: 0.52, z: 0.49 }, scale: 22, tone: 'gold', lift: 92 },
  { id: 'great-zhou', name: '大周仙朝', position: { x: 0.5, z: 0.48 }, scale: 23, tone: 'gold' },
  { id: 'heaven-machine', name: '天机阁', position: { x: 0.66, z: 0.51 }, scale: 18, tone: 'gold' },
  { id: 'green-jade', name: '青玉宗', position: { x: 0.36, z: 0.49 }, scale: 18, tone: 'green' },
  { id: 'ten-thousand-laws', name: '万法宗', position: { x: 0.63, z: 0.61 }, scale: 18, tone: 'gold' },
  { id: 'corpse-demon', name: '尸魔宗', position: { x: 0.53, z: 0.745 }, scale: 20, tone: 'fire' },
  { id: 'blood-palace', name: '血神宫', position: { x: 0.5, z: 0.835 }, scale: 18, tone: 'fire' },
  { id: 'soul-palace', name: '万魂殿', position: { x: 0.34, z: 0.865 }, scale: 18, tone: 'fire' },
];

export const SECTS: SectDefinition[] = [
  {
    id: 'great-zhou',
    name: '大周仙朝',
    category: '仙帝宗门',
    area: '中州',
    position: { x: 0.5, z: 0.48 },
    kind: 'imperial',
    importance: 1,
    tone: 'gold',
    externalDecorations: [
      { modelId: 'cc0_arch_banner', offset: { x: 0, y: 1.4, z: 7.2 }, scale: 1.05 },
      { modelId: 'cc0_temple_shrine', offset: { x: -6.4, y: 1.4, z: 4.6 }, scale: 0.92 },
      { modelId: 'cc0_temple_shrine', offset: { x: 6.4, y: 1.4, z: 4.6 }, scale: 0.92 },
    ],
  },
  {
    id: 'star-road',
    name: '星道宗',
    category: '仙帝宗门',
    area: '中州高空',
    position: { x: 0.52, z: 0.49 },
    kind: 'star',
    importance: 1,
    tone: 'gold',
    lift: 72,
  },
  {
    id: 'kunlun-dao',
    name: '昆仑道门',
    category: '仙帝宗门',
    area: '中州西部',
    position: { x: 0.39, z: 0.58 },
    kind: 'dao',
    importance: 0.9,
    tone: 'gold',
  },
  {
    id: 'shu-mountain',
    name: '蜀山剑门',
    category: '仙帝宗门',
    area: '中州西部',
    position: { x: 0.33, z: 0.64 },
    kind: 'sword',
    importance: 0.86,
    tone: 'mountain',
  },
  {
    id: 'ten-thousand-laws',
    name: '万法宗',
    category: '仙帝宗门',
    area: '中州东南高空',
    position: { x: 0.63, z: 0.61 },
    kind: 'law',
    importance: 0.88,
    tone: 'gold',
    lift: 18,
  },
  {
    id: 'cold-palace',
    name: '广寒宫',
    category: '仙帝宗门',
    area: '北冥雪原',
    position: { x: 0.48, z: 0.16 },
    kind: 'ice',
    importance: 0.82,
    tone: 'snow',
    externalDecorations: [
      { modelId: 'cc0_crystal_cluster', offset: { x: -4.8, y: 1.1, z: 2.4 }, scale: 0.34 },
      { modelId: 'cc0_crystal_cluster', offset: { x: 5.1, y: 1.1, z: -1.8 }, scale: 0.28, rotationY: 1.4 },
    ],
  },
  {
    id: 'great-thunder-temple',
    name: '大雷音寺',
    category: '仙帝宗门',
    area: '西漠佛国',
    position: { x: 0.19, z: 0.47 },
    kind: 'buddha',
    importance: 0.82,
    tone: 'sand',
    externalDecorations: [
      { modelId: 'cc0_arch_banner', offset: { x: 0, y: 1.4, z: 7 }, scale: 1.1 },
      { modelId: 'cc0_temple_shrine', offset: { x: -6.2, y: 1.4, z: 3.8 }, scale: 0.9 },
      { modelId: 'cc0_temple_shrine', offset: { x: 6.2, y: 1.4, z: 3.8 }, scale: 0.9 },
    ],
  },
  {
    id: 'sun-palace',
    name: '太阳神宫',
    category: '仙帝宗门',
    area: '南离火洲',
    position: { x: 0.705, z: 0.805 },
    kind: 'sun',
    importance: 0.84,
    tone: 'fire',
  },
  {
    id: 'corpse-demon',
    name: '尸魔宗',
    category: '魔道宗门',
    area: '南离火洲北境',
    position: { x: 0.53, z: 0.745 },
    kind: 'demon',
    importance: 0.76,
    tone: 'fire',
  },
  {
    id: 'blood-palace',
    name: '血神宫',
    category: '魔道宗门',
    area: '南离火洲',
    position: { x: 0.5, z: 0.835 },
    kind: 'blood',
    importance: 0.72,
    tone: 'fire',
  },
  {
    id: 'soul-palace',
    name: '万魂殿',
    category: '魔道宗门',
    area: '南离火洲',
    position: { x: 0.34, z: 0.865 },
    kind: 'soul',
    importance: 0.72,
    tone: 'fire',
  },
  {
    id: 'spirit-mirror',
    name: '神镜族',
    category: '妖族势力',
    area: '东极青木域万妖山脉',
    position: { x: 0.72, z: 0.56 },
    kind: 'beast',
    importance: 0.68,
    tone: 'green',
  },
  {
    id: 'nine-tail',
    name: '九尾天狐族',
    category: '妖族势力',
    area: '东极青木域东部',
    position: { x: 0.87, z: 0.42 },
    kind: 'beast',
    importance: 0.68,
    tone: 'green',
  },
  {
    id: 'five-peacock',
    name: '五色孔雀族',
    category: '妖族势力',
    area: '东极青木域南部',
    position: { x: 0.76, z: 0.7 },
    kind: 'beast',
    importance: 0.66,
    tone: 'green',
  },
  {
    id: 'divine-ape',
    name: '神猿族',
    category: '妖族势力',
    area: '东极青木域万妖山脉',
    position: { x: 0.67, z: 0.62 },
    kind: 'beast',
    importance: 0.69,
    tone: 'green',
  },
  {
    id: 'willow-snake',
    name: '柳蛇族',
    category: '妖族势力',
    area: '东极青木域北部',
    position: { x: 0.82, z: 0.5 },
    kind: 'beast',
    importance: 0.64,
    tone: 'green',
  },
  {
    id: 'demon-dragon',
    name: '蛟龙一族',
    category: '妖族势力',
    area: '北冥雪原万丈深渊',
    position: { x: 0.56, z: 0.355 },
    kind: 'beast',
    importance: 0.7,
    tone: 'snow',
    externalDecorations: [
      { modelId: 'cc0_dragon', offset: { x: 0, y: 4.6, z: 0 }, scale: 0.46, rotationY: 0.65 },
      { modelId: 'cc0_crystal_base', offset: { x: 0, y: 1.4, z: 0 }, scale: 1.35 },
    ],
  },
  {
    id: 'heaven-machine',
    name: '天机阁',
    category: '中立势力',
    area: '跨域海峡',
    position: { x: 0.66, z: 0.51 },
    kind: 'neutral',
    importance: 0.75,
    tone: 'gold',
  },
  {
    id: 'hehuan',
    name: '合欢宗',
    category: '其他宗门',
    area: '中州',
    position: { x: 0.43, z: 0.55 },
    kind: 'neutral',
    importance: 0.55,
    tone: 'gold',
  },
  {
    id: 'green-jade',
    name: '青玉宗',
    category: '其他宗门',
    area: '中州西南',
    position: { x: 0.36, z: 0.49 },
    kind: 'dao',
    importance: 0.58,
    tone: 'green',
  },
  {
    id: 'yance',
    name: '衍策门',
    category: '其他宗门',
    area: '中州北部',
    position: { x: 0.45, z: 0.39 },
    kind: 'neutral',
    importance: 0.54,
    tone: 'gold',
  },
  {
    id: 'array-sky',
    name: '阵天宗',
    category: '其他宗门',
    area: '中州中部',
    position: { x: 0.56, z: 0.43 },
    kind: 'array',
    importance: 0.56,
    tone: 'gold',
  },
  {
    id: 'dun-dan',
    name: '遁丹宗',
    category: '其他宗门',
    area: '中州南部',
    position: { x: 0.5, z: 0.63 },
    kind: 'alchemy',
    importance: 0.54,
    tone: 'gold',
  },
  {
    id: 'spirit-ruins',
    name: '灵墟宗',
    category: '其他宗门',
    area: '中州东部边缘',
    position: { x: 0.61, z: 0.68 },
    kind: 'dao',
    importance: 0.54,
    tone: 'green',
  },
];
