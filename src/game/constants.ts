export const GRID_SIZE = 40;
export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 700;
export const COLS = Math.floor(MAP_WIDTH / GRID_SIZE);
export const ROWS = Math.floor(MAP_HEIGHT / GRID_SIZE);

export const PLAYER_START = { x: GRID_SIZE * 8 + GRID_SIZE / 2, y: GRID_SIZE * 6 + GRID_SIZE / 2 };

export const BASE_SPEED = 140;
export const BATTERY_DRAIN_RATE = 1.0;
export const DURABILITY_DRAIN_RATE = 0.25;
export const STAMINA_DRAIN_RATE = 0.6;
export const CHARGE_RATE = 15;
export const REPAIR_RATE = 10;
export const REST_RATE = 20;

export const WEATHER_SPEED_MODIFIERS: Record<string, number> = {
  sunny: 1.0,
  cloudy: 0.95,
  rainy: 0.75,
  heavy_rain: 0.55,
  storm: 0.35,
};

export const WEATHER_BATTERY_MODIFIERS: Record<string, number> = {
  sunny: 1.0,
  cloudy: 1.05,
  rainy: 1.3,
  heavy_rain: 1.6,
  storm: 2.0,
};

export const WEATHER_PATIENCE_MODIFIERS: Record<string, number> = {
  sunny: 1.0,
  cloudy: 0.95,
  rainy: 0.75,
  heavy_rain: 0.5,
  storm: 0.3,
};

export const WEATHER_RAIN_PREMIUM_RATE: Record<string, number> = {
  sunny: 0,
  cloudy: 0,
  rainy: 0.25,
  heavy_rain: 0.5,
  storm: 0.8,
};

export const WEATHER_NAMES: Record<string, string> = {
  sunny: '晴天',
  cloudy: '多云',
  rainy: '小雨',
  heavy_rain: '大雨',
  storm: '暴雨',
};

export const WEATHER_COLORS: Record<string, string> = {
  sunny: '#ffcc4d',
  cloudy: '#b2bec3',
  rainy: '#4a6fa5',
  heavy_rain: '#2d3436',
  storm: '#1a1a2e',
};

export const WEATHER_DESCRIPTIONS: Record<string, string> = {
  sunny: '阳光明媚，适合出行',
  cloudy: '多云天气，稍有不便',
  rainy: '小雨绵绵，请注意安全',
  heavy_rain: '大雨倾盆，速度大幅下降',
  storm: '暴雨来袭，请小心驾驶',
};

export const RAIN_GEAR_COST = 30;
export const RAIN_GEAR_USES = 3;
export const RAIN_GEAR_SPEED_BOOST = 0.15;
export const RAIN_GEAR_BATTERY_REDUCTION = 0.2;

export const WAIT_COST_PER_SECOND = 0.4;
export const WAIT_STAMINA_DRAIN_PER_SECOND = 0.3;
export const WAIT_SLOT_DURATION_MIN = 20;
export const WAIT_SLOT_DURATION_MAX = 45;

export const FORECAST_SLOT_COUNT = 3;
export const FORECAST_SLOT_DURATION = 35;

export const LATE_PENALTY_RATE = 0.15;
export const EARLY_BONUS_RATE = 0.1;
export const URGENCY_BONUS_RATE = 0.08;

export const MIN_ORDER_REWARD = 30;
export const MAX_ORDER_REWARD = 150;
export const MIN_ORDER_DISTANCE = 2;
export const MAX_ORDER_DISTANCE = 15;

export const CHARGE_COST = 0.5;
export const REPAIR_COST = 1;

export const MAX_AVAILABLE_ORDERS = 5;
export const ORDER_GENERATION_INTERVAL = 15000;
export const WEATHER_CHANGE_INTERVAL = 30000;

export const STORAGE_KEY = 'city_delivery_game_save';
export const SAVE_VERSION = '1.0.0';

export const LOCATION_NAMES = [
  '幸福小区', '阳光花园', '城市广场', '中心医院', '科技大厦',
  '购物中心', '美食街', '火车站', '体育馆', '图书馆',
  '公园北门', '商业街', '写字楼A座', '公寓楼', '学校门口',
  '咖啡店', '花店', '超市', '餐厅', '银行',
];

export const BUILDING_NAMES = [
  '居民区', '商业中心', '工厂', '仓库', '办公楼',
  '酒店', '医院', '学校', '公园', '停车场',
];
