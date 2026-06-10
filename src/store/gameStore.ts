import { create } from 'zustand';
import type { GameState, GameAction, GameSave, Order, WeatherState } from '../game/types';
import { generateMapData, findPath } from '../game/mapData';
import { generateOrder, updateOrderDeadlines, isAtLocation, canAcceptOrder, updateOrderExtraBattery } from '../game/OrderSystem';
import { updateWeather, createInitialWeather, forceAdvanceWeather, isRaining } from '../game/WeatherSystem';
import {
  moveVehicle,
  createInitialVehicle,
  chargeVehicle,
  repairVehicle,
  restPlayer,
  isNearChargingStation,
  isNearRepairShop,
} from '../game/VehicleSystem';
import { calculateSettlement } from '../game/EconomySystem';
import { saveGame, loadGame } from '../game/Storage';
import {
  PLAYER_START,
  MAX_AVAILABLE_ORDERS,
  ORDER_GENERATION_INTERVAL,
  RAIN_GEAR_COST,
  RAIN_GEAR_USES,
  WAIT_COST_PER_SECOND,
  WAIT_STAMINA_DRAIN_PER_SECOND,
} from '../game/constants';

export function createInitialState(): GameState {
  const map = generateMapData();
  return {
    player: {
      id: 'player-1',
      name: '送货员',
      money: 100,
      stamina: 100,
      maxStamina: 100,
      position: { ...PLAYER_START },
      currentOrderId: null,
      completedOrders: 0,
      totalRating: 0,
      hasRainGear: false,
      rainGearUsesLeft: 0,
      totalWaitCost: 0,
      totalRainGearCost: 0,
      totalRainPremium: 0,
      totalExtraBatteryCost: 0,
    },
    vehicle: createInitialVehicle(),
    weather: createInitialWeather(),
    orders: [],
    incomeRecords: [],
    map,
    gameTime: 0,
    isPaused: false,
    isGameOver: false,
    showSettlement: false,
    lastSettlement: null,
    plannedPath: [],
    isCharging: false,
    isRepairing: false,
    isResting: false,
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'MOVE': {
      if (state.isPaused || state.isGameOver || state.isCharging || state.isRepairing || state.isResting) {
        return state;
      }

      const { vehicle, moved, staminaDrain, extraBatteryDrain } = moveVehicle(
        state.vehicle,
        action.direction,
        state.weather,
        1 / 60,
        state.map.roads,
        state.player.stamina,
        state.player.hasRainGear && state.player.rainGearUsesLeft > 0
      );

      if (!moved) return state;

      const newPlayer = {
        ...state.player,
        position: vehicle.position,
        stamina: Math.max(0, state.player.stamina - staminaDrain),
      };
      let newPlannedPath = state.plannedPath;

      if (newPlannedPath.length > 0) {
        const nextPoint = newPlannedPath[0];
        if (isAtLocation(vehicle.position, nextPoint, 20)) {
          newPlannedPath = newPlannedPath.slice(1);
        }
      }

      let newOrders = state.orders;
      if (newPlayer.currentOrderId && extraBatteryDrain > 0) {
        newOrders = updateOrderExtraBattery(newOrders, newPlayer.currentOrderId, extraBatteryDrain);
      }

      return {
        ...state,
        player: newPlayer,
        vehicle,
        plannedPath: newPlannedPath,
        orders: newOrders,
      };
    }

    case 'ACCEPT_ORDER': {
      const order = state.orders.find((o) => o.id === action.orderId);
      if (!order || !canAcceptOrder(order, state.player)) return state;

      const withRainGear = action.withRainGear || false;
      const waitSeconds = action.waitSeconds || 0;

      let newPlayer = { ...state.player };
      let newWeather = state.weather;
      let newMoney = state.player.money;
      let newStamina = state.player.stamina;
      let newRainGearUses = state.player.rainGearUsesLeft;
      let totalWaitCost = state.player.totalWaitCost;
      let totalRainGearCost = state.player.totalRainGearCost;

      if (withRainGear) {
        if (!state.player.hasRainGear || state.player.rainGearUsesLeft <= 0) {
          newMoney -= RAIN_GEAR_COST;
          newRainGearUses = RAIN_GEAR_USES;
          totalRainGearCost += RAIN_GEAR_COST;
        }
        newRainGearUses = Math.max(0, newRainGearUses - 1);
      }

      if (waitSeconds > 0) {
        const waitCost = waitSeconds * WAIT_COST_PER_SECOND;
        const staminaCost = waitSeconds * WAIT_STAMINA_DRAIN_PER_SECOND;
        newMoney -= waitCost;
        newStamina = Math.max(0, newStamina - staminaCost);
        totalWaitCost += waitCost;
        newWeather = forceAdvanceWeather(newWeather, waitSeconds);
      }

      newPlayer = {
        ...newPlayer,
        money: Math.max(0, newMoney),
        stamina: newStamina,
        hasRainGear: withRainGear || state.player.hasRainGear,
        rainGearUsesLeft: withRainGear ? newRainGearUses : state.player.rainGearUsesLeft,
        totalWaitCost,
        totalRainGearCost,
      };

      const path = findPath(
        state.vehicle.position.x,
        state.vehicle.position.y,
        order.pickupLocation.x,
        order.pickupLocation.y,
        state.map.roads,
        state.map.gridSize
      );

      return {
        ...state,
        player: newPlayer,
        weather: newWeather,
        orders: state.orders.map((o) =>
          o.id === action.orderId ? {
            ...o,
            status: 'accepted' as const,
            acceptedWithRainGear: withRainGear,
            acceptedAfterWait: waitSeconds,
            weatherTypeAtAccept: newWeather.type,
          } : o
        ),
        plannedPath: path,
      };
    }

    case 'PICKUP_ORDER': {
      const order = state.orders.find((o) => o.id === action.orderId);
      if (!order || order.status !== 'accepted') return state;

      if (!isAtLocation(state.player.position, order.pickupLocation, 50)) return state;

      const path = findPath(
        state.vehicle.position.x,
        state.vehicle.position.y,
        order.deliveryLocation.x,
        order.deliveryLocation.y,
        state.map.roads,
        state.map.gridSize
      );

      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.orderId ? { ...o, status: 'pickedup' as const } : o
        ),
        plannedPath: path,
      };
    }

    case 'DELIVER_ORDER': {
      const order = state.orders.find((o) => o.id === action.orderId);
      if (!order || (order.status !== 'pickedup' && order.status !== 'delivering')) return state;

      if (!isAtLocation(state.player.position, order.deliveryLocation, 50)) return state;

      const settlement = calculateSettlement(
        order,
        state.player.stamina,
        state.weather.type
      );

      const rainPremiumAmount = settlement.record.rainPremium;

      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.orderId ? { ...o, status: 'completed' as const } : o
        ),
        player: {
          ...state.player,
          money: state.player.money + settlement.record.finalAmount,
          currentOrderId: null,
          completedOrders: state.player.completedOrders + 1,
          totalRating: state.player.totalRating + settlement.rating,
          totalRainPremium: state.player.totalRainPremium + rainPremiumAmount,
          totalExtraBatteryCost: state.player.totalExtraBatteryCost + settlement.record.extraBatteryCost,
        },
        incomeRecords: [...state.incomeRecords, settlement.record],
        showSettlement: true,
        lastSettlement: settlement.record,
        plannedPath: [],
      };
    }

    case 'START_CHARGING': {
      if (!isNearChargingStation(state.player.position, state.map.chargingStations)) return state;
      return { ...state, isCharging: true, isRepairing: false, isResting: false };
    }

    case 'STOP_CHARGING': {
      return { ...state, isCharging: false };
    }

    case 'START_REPAIRING': {
      if (!isNearRepairShop(state.player.position, state.map.repairShops)) return state;
      return { ...state, isRepairing: true, isCharging: false, isResting: false };
    }

    case 'STOP_REPAIRING': {
      return { ...state, isRepairing: false };
    }

    case 'START_RESTING': {
      return { ...state, isResting: true, isCharging: false, isRepairing: false };
    }

    case 'STOP_RESTING': {
      return { ...state, isResting: false };
    }

    case 'BUY_RAIN_GEAR': {
      if (state.player.money < RAIN_GEAR_COST) return state;
      return {
        ...state,
        player: {
          ...state.player,
          money: state.player.money - RAIN_GEAR_COST,
          hasRainGear: true,
          rainGearUsesLeft: RAIN_GEAR_USES,
          totalRainGearCost: state.player.totalRainGearCost + RAIN_GEAR_COST,
        },
      };
    }

    case 'START_WAITING_WEATHER': {
      if (state.player.currentOrderId) return state;
      return { ...state, isResting: true, isCharging: false, isRepairing: false };
    }

    case 'STOP_WAITING_WEATHER': {
      return { ...state, isResting: false };
    }

    case 'REFRESH_FORECAST': {
      return state;
    }

    case 'GENERATE_ORDERS': {
      const availableOrders = state.orders.filter((o) => o.status === 'available');
      if (availableOrders.length >= MAX_AVAILABLE_ORDERS) return state;

      const newOrder = generateOrder(
        state.map,
        state.player.position,
        state.gameTime,
        state.orders,
        state.weather
      );

      if (!newOrder) return state;

      return { ...state, orders: [...state.orders, newOrder] };
    }

    case 'TICK': {
      if (state.isPaused || state.isGameOver) return state;

      let newState = {
        ...state,
        gameTime: state.gameTime + action.deltaTime,
      };

      newState.orders = updateOrderDeadlines(newState.orders, action.deltaTime);
      newState.weather = updateWeather(newState.weather, action.deltaTime);

      if (newState.isCharging) {
        const { vehicle, cost } = chargeVehicle(newState.vehicle, action.deltaTime);
        newState.vehicle = vehicle;
        newState.player = {
          ...newState.player,
          money: Math.max(0, newState.player.money - cost),
        };
        if (vehicle.battery >= vehicle.maxBattery) {
          newState.isCharging = false;
        }
      }

      if (newState.isRepairing) {
        const { vehicle, cost } = repairVehicle(newState.vehicle, action.deltaTime);
        newState.vehicle = vehicle;
        newState.player = {
          ...newState.player,
          money: Math.max(0, newState.player.money - cost),
        };
        if (vehicle.durability >= vehicle.maxDurability) {
          newState.isRepairing = false;
        }
      }

      if (newState.isResting && !newState.player.currentOrderId) {
        const stamina = Math.min(
          newState.player.maxStamina,
          newState.player.stamina + 5 * action.deltaTime
        );
        const waitCost = WAIT_COST_PER_SECOND * action.deltaTime;
        newState.player = {
          ...newState.player,
          stamina,
          money: Math.max(0, newState.player.money - waitCost),
          totalWaitCost: newState.player.totalWaitCost + waitCost,
        };
        if (stamina >= newState.player.maxStamina) {
          newState.isResting = false;
        }
      } else if (newState.isResting) {
        const { stamina, cost } = restPlayer(
          newState.player.stamina,
          newState.player.maxStamina,
          action.deltaTime
        );
        newState.player = {
          ...newState.player,
          stamina,
          money: Math.max(0, newState.player.money - cost),
        };
        if (stamina >= newState.player.maxStamina) {
          newState.isResting = false;
        }
      }

      const currentOrder = newState.orders.find((o) => o.id === newState.player.currentOrderId);
      if (currentOrder && currentOrder.status === 'accepted') {
        if (isAtLocation(newState.player.position, currentOrder.pickupLocation, 50)) {
          newState = gameReducer(newState, { type: 'PICKUP_ORDER', orderId: currentOrder.id });
        }
      }
      if (currentOrder && (currentOrder.status === 'pickedup' || currentOrder.status === 'delivering')) {
        if (isAtLocation(newState.player.position, currentOrder.deliveryLocation, 50)) {
          newState = gameReducer(newState, { type: 'DELIVER_ORDER', orderId: currentOrder.id });
        }
      }

      const failedOrders = newState.orders.filter((o) => o.status === 'failed' && o.id === newState.player.currentOrderId);
      if (failedOrders.length > 0) {
        newState.player = { ...newState.player, currentOrderId: null };
        newState.plannedPath = [];
      }

      if (newState.player.money < 0 && newState.player.stamina < 10 && newState.vehicle.battery < 10) {
        newState.isGameOver = true;
      }

      return newState;
    }

    case 'TOGGLE_PAUSE': {
      return { ...state, isPaused: !state.isPaused };
    }

    case 'CLOSE_SETTLEMENT': {
      return { ...state, showSettlement: false };
    }

    case 'PLAN_PATH': {
      return { ...state, plannedPath: action.path };
    }

    case 'CLEAR_PATH': {
      return { ...state, plannedPath: [] };
    }

    case 'NEW_GAME': {
      const newState = createInitialState();
      const initialOrders: typeof newState.orders = [];
      for (let i = 0; i < 3; i++) {
        const order = generateOrder(
          newState.map,
          newState.player.position,
          0,
          initialOrders,
          newState.weather
        );
        if (order) initialOrders.push(order);
      }
      return { ...newState, orders: initialOrders };
    }

    case 'LOAD_GAME': {
      const save = action.save;
      return {
        ...createInitialState(),
        player: save.player,
        vehicle: save.vehicle,
        weather: save.weather,
        orders: save.orders,
        incomeRecords: save.incomeRecords,
        gameTime: save.gameTime,
        map: save.map,
      };
    }

    case 'GAME_OVER': {
      return { ...state, isGameOver: true };
    }

    default:
      return state;
  }
}

interface GameStore extends GameState {
  dispatch: (action: GameAction) => void;
  save: () => boolean;
  load: () => boolean;
  orderGenerationTimer: number;
}

export const useGameStore = create<GameStore>((set, get) => {
  const initialState = createInitialState();
  let orderGenTimer = 0;

  const initialOrders: typeof initialState.orders = [];
  for (let i = 0; i < 3; i++) {
    const order = generateOrder(
      initialState.map,
      initialState.player.position,
      0,
      initialOrders,
      initialState.weather
    );
    if (order) initialOrders.push(order);
  }

  return {
    ...initialState,
    orders: initialOrders,
    orderGenerationTimer: 0,

    dispatch: (action) => {
      set((state) => gameReducer(state, action));
    },

    save: () => {
      const state = get();
      return saveGame(
        state.player,
        state.vehicle,
        state.weather,
        state.orders,
        state.incomeRecords,
        state.gameTime,
        state.map
      );
    },

    load: () => {
      const save = loadGame();
      if (save) {
        set((state) => gameReducer(state, { type: 'LOAD_GAME', save }));
        return true;
      }
      return false;
    },
  };
});

export const selectCurrentOrder = (state: GameState): Order | null => {
  if (!state.player.currentOrderId) return null;
  return state.orders.find((o) => o.id === state.player.currentOrderId) || null;
};

export const selectAvailableOrders = (state: GameState): Order[] => {
  return state.orders.filter((o) => o.status === 'available');
};

export const selectIsNearCharging = (state: GameState): boolean => {
  return isNearChargingStation(state.player.position, state.map.chargingStations);
};

export const selectIsNearRepair = (state: GameState): boolean => {
  return isNearRepairShop(state.player.position, state.map.repairShops);
};

export function useCurrentOrder(): Order | null {
  return useGameStore(selectCurrentOrder);
}

export function useAvailableOrders(): Order[] {
  return useGameStore(selectAvailableOrders);
}

export function useIsNearCharging(): boolean {
  return useGameStore(selectIsNearCharging);
}

export function useIsNearRepair(): boolean {
  return useGameStore(selectIsNearRepair);
}
