export interface Position {
  x: number;
  y: number;
}

export interface PlayerState {
  id: string;
  name: string;
  money: number;
  stamina: number;
  maxStamina: number;
  position: Position;
  currentOrderId: string | null;
  completedOrders: number;
  totalRating: number;
  hasRainGear: boolean;
  rainGearUsesLeft: number;
  totalWaitCost: number;
  totalRainGearCost: number;
  totalRainPremium: number;
  totalExtraBatteryCost: number;
}

export interface VehicleState {
  id: string;
  battery: number;
  maxBattery: number;
  durability: number;
  maxDurability: number;
  speed: number;
  baseSpeed: number;
  position: Position;
  direction: 'up' | 'down' | 'left' | 'right';
}

export type OrderStatus = 'available' | 'accepted' | 'pickedup' | 'delivering' | 'completed' | 'failed';

export interface Order {
  id: string;
  pickupLocation: Position & { name: string };
  deliveryLocation: Position & { name: string };
  reward: number;
  baseReward: number;
  deadline: number;
  maxDeadline: number;
  status: OrderStatus;
  customerUrgency: number;
  distance: number;
  createdAt: number;
  weatherPremium: number;
  isRainOrder: boolean;
  acceptedWithRainGear: boolean;
  acceptedAfterWait: number;
  extraBatteryDrain: number;
  weatherTypeAtAccept: WeatherType;
}

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'heavy_rain' | 'storm';

export interface WeatherEffect {
  speedModifier: number;
  batteryDrainModifier: number;
  patienceModifier: number;
  description: string;
}

export interface WeatherForecastSlot {
  type: WeatherType;
  intensity: number;
  duration: number;
  effect: WeatherEffect;
}

export interface WeatherState {
  type: WeatherType;
  intensity: number;
  speedModifier: number;
  batteryDrainModifier: number;
  patienceModifier: number;
  nextChangeTime: number;
  currentSlotIndex: number;
  forecast: WeatherForecastSlot[];
  elapsedInSlot: number;
}

export interface Road {
  id: string;
  type: 'horizontal' | 'vertical' | 'intersection';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Building {
  id: string;
  name: string;
  type: 'residential' | 'commercial' | 'industrial';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface LocationPoint {
  id: string;
  name: string;
  type: 'charging' | 'repair' | 'pickup' | 'delivery';
  x: number;
  y: number;
}

export interface MapData {
  width: number;
  height: number;
  gridSize: number;
  roads: Road[];
  buildings: Building[];
  chargingStations: LocationPoint[];
  repairShops: LocationPoint[];
}

export interface IncomeRecord {
  id: string;
  orderId: string;
  baseReward: number;
  latePenalty: number;
  bonus: number;
  rainPremium: number;
  waitCost: number;
  rainGearCost: number;
  extraBatteryCost: number;
  finalAmount: number;
  rating: number;
  completedAt: number;
  details: string;
  weatherAtCompletion: WeatherType;
  weatherAtAccept: WeatherType;
}

export interface GameState {
  player: PlayerState;
  vehicle: VehicleState;
  weather: WeatherState;
  orders: Order[];
  incomeRecords: IncomeRecord[];
  map: MapData;
  gameTime: number;
  isPaused: boolean;
  isGameOver: boolean;
  showSettlement: boolean;
  lastSettlement: IncomeRecord | null;
  plannedPath: Position[];
  isCharging: boolean;
  isRepairing: boolean;
  isResting: boolean;
}

export interface GameSave {
  version: string;
  savedAt: number;
  player: PlayerState;
  vehicle: VehicleState;
  weather: WeatherState;
  orders: Order[];
  incomeRecords: IncomeRecord[];
  gameTime: number;
  map: MapData;
}

export type GameAction =
  | { type: 'MOVE'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'ACCEPT_ORDER'; orderId: string; withRainGear?: boolean; waitSeconds?: number }
  | { type: 'PICKUP_ORDER'; orderId: string }
  | { type: 'DELIVER_ORDER'; orderId: string }
  | { type: 'START_CHARGING' }
  | { type: 'STOP_CHARGING' }
  | { type: 'START_REPAIRING' }
  | { type: 'STOP_REPAIRING' }
  | { type: 'START_RESTING' }
  | { type: 'STOP_RESTING' }
  | { type: 'GENERATE_ORDERS' }
  | { type: 'TICK'; deltaTime: number }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'CLOSE_SETTLEMENT' }
  | { type: 'PLAN_PATH'; path: Position[] }
  | { type: 'CLEAR_PATH' }
  | { type: 'NEW_GAME' }
  | { type: 'LOAD_GAME'; save: GameSave }
  | { type: 'GAME_OVER' }
  | { type: 'BUY_RAIN_GEAR' }
  | { type: 'START_WAITING_WEATHER' }
  | { type: 'STOP_WAITING_WEATHER' }
  | { type: 'REFRESH_FORECAST' };
