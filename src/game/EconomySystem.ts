import { Order, IncomeRecord, WeatherType } from './types';
import {
  LATE_PENALTY_RATE,
  EARLY_BONUS_RATE,
  URGENCY_BONUS_RATE,
  WEATHER_RAIN_PREMIUM_RATE,
  RAIN_GEAR_COST,
  WAIT_COST_PER_SECOND,
  CHARGE_COST,
} from './constants';

export interface SettlementResult {
  record: IncomeRecord;
  rating: number;
  details: string[];
}

export function calculateSettlement(
  order: Order,
  playerStamina: number,
  weatherAtCompletion: WeatherType,
  totalBatteryUsed: number = 0
): SettlementResult {
  const details: string[] = [];
  const baseReward = order.baseReward;
  details.push(`基础报酬: ¥${baseReward}`);

  const weatherPremium = order.isRainOrder && order.weatherPremium > 0
    ? Math.floor(baseReward * order.weatherPremium)
    : 0;
  if (weatherPremium > 0) {
    details.push(`雨天加价补贴: +¥${weatherPremium}`);
  }

  const timeRatio = order.deadline / order.maxDeadline;
  let latePenalty = 0;
  let earlyBonus = 0;

  if (timeRatio < 0.3) {
    latePenalty = Math.floor(baseReward * LATE_PENALTY_RATE * 2);
    details.push(`迟到严重: -¥${latePenalty}`);
  } else if (timeRatio < 0.6) {
    latePenalty = Math.floor(baseReward * LATE_PENALTY_RATE);
    details.push(`迟到扣款: -¥${latePenalty}`);
  } else if (timeRatio > 0.85) {
    earlyBonus = Math.floor(baseReward * EARLY_BONUS_RATE);
    details.push(`提早送达奖励: +¥${earlyBonus}`);
  }

  let urgencyBonus = 0;
  if (order.customerUrgency >= 4 && timeRatio > 0.5) {
    urgencyBonus = Math.floor(baseReward * URGENCY_BONUS_RATE * order.customerUrgency);
    details.push(`紧急单奖励: +¥${urgencyBonus}`);
  }

  let staminaPenalty = 0;
  if (playerStamina < 20) {
    staminaPenalty = Math.floor(baseReward * 0.2);
    details.push(`体力透支: -¥${staminaPenalty}`);
  } else if (playerStamina < 40) {
    staminaPenalty = Math.floor(baseReward * 0.1);
    details.push(`体力不足: -¥${staminaPenalty}`);
  }

  const waitCost = Math.floor(order.acceptedAfterWait * WAIT_COST_PER_SECOND);
  if (waitCost > 0) {
    details.push(`等待天气成本: -¥${waitCost}`);
  }

  const rainGearCost = order.acceptedWithRainGear ? RAIN_GEAR_COST / 1 : 0;
  if (rainGearCost > 0) {
    details.push(`雨具使用费: -¥${Math.floor(rainGearCost)}`);
  }

  const extraBatteryCost = Math.floor(order.extraBatteryDrain * CHARGE_COST);
  if (extraBatteryCost > 0) {
    details.push(`额外耗电成本: -¥${extraBatteryCost}`);
  }

  let bonus = earlyBonus + urgencyBonus + weatherPremium;
  let deductions = latePenalty + staminaPenalty + waitCost + Math.floor(rainGearCost) + extraBatteryCost;
  let finalAmount = baseReward + weatherPremium - latePenalty - staminaPenalty - waitCost - Math.floor(rainGearCost) - extraBatteryCost + earlyBonus + urgencyBonus;

  if (finalAmount < 0) {
    finalAmount = 0;
  }

  const rating = calculateRating(timeRatio, order.customerUrgency, latePenalty > 0, playerStamina, weatherAtCompletion);
  details.push(`客户评分: ${'⭐'.repeat(rating)}`);

  const finalDetails = details.join(' | ');

  return {
    record: {
      id: `income-${Date.now()}`,
      orderId: order.id,
      baseReward,
      latePenalty,
      bonus: earlyBonus + urgencyBonus,
      rainPremium: weatherPremium,
      waitCost,
      rainGearCost: Math.floor(rainGearCost),
      extraBatteryCost,
      finalAmount,
      rating,
      completedAt: Date.now(),
      details: finalDetails,
      weatherAtCompletion,
      weatherAtAccept: order.weatherTypeAtAccept,
    },
    rating,
    details,
  };
}

function calculateRating(
  timeRatio: number,
  urgency: number,
  isLate: boolean,
  stamina: number,
  weather: WeatherType
): number {
  let rating = 3;

  if (timeRatio > 0.9) {
    rating += 1;
  } else if (timeRatio > 0.75) {
    rating += 0.5;
  } else if (timeRatio < 0.3) {
    rating -= 2;
  } else if (timeRatio < 0.5) {
    rating -= 1;
  }

  if (urgency >= 4 && !isLate) {
    rating += 0.5;
  }

  if (stamina < 20) {
    rating -= 1;
  } else if (stamina < 40) {
    rating -= 0.5;
  }

  if (weather === 'storm') {
    rating += 0.5;
  } else if (weather === 'heavy_rain') {
    rating += 0.3;
  } else if (weather === 'rainy') {
    rating += 0.2;
  }

  rating = Math.max(1, Math.min(5, rating));
  return Math.round(rating);
}

export function calculateTotalRating(records: IncomeRecord[]): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / records.length) * 10) / 10;
}

export function formatMoney(amount: number): string {
  return `¥${amount.toFixed(0)}`;
}

export function getRatingStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  return '⭐'.repeat(fullStars) + (hasHalf ? '☆' : '');
}

export function getWeatherPremiumRate(weatherType: WeatherType): number {
  return WEATHER_RAIN_PREMIUM_RATE[weatherType] || 0;
}

export function calculateExtraBatteryCost(
  baseBatteryUsed: number,
  weatherBatteryModifier: number,
  rainGearActive: boolean
): number {
  const extraModifier = rainGearActive ? 0.8 : 1;
  const modifiedBattery = baseBatteryUsed * weatherBatteryModifier * extraModifier;
  return Math.max(0, modifiedBattery - baseBatteryUsed);
}
