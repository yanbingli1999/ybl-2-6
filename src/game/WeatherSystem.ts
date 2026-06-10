import { WeatherState, WeatherType, WeatherForecastSlot, WeatherEffect } from './types';
import {
  WEATHER_SPEED_MODIFIERS,
  WEATHER_BATTERY_MODIFIERS,
  WEATHER_PATIENCE_MODIFIERS,
  WEATHER_DESCRIPTIONS,
  FORECAST_SLOT_COUNT,
  FORECAST_SLOT_DURATION,
  RAIN_GEAR_SPEED_BOOST,
  RAIN_GEAR_BATTERY_REDUCTION,
  WAIT_SLOT_DURATION_MIN,
  WAIT_SLOT_DURATION_MAX,
} from './constants';

export function getWeatherEffect(type: WeatherType): WeatherEffect {
  return {
    speedModifier: WEATHER_SPEED_MODIFIERS[type],
    batteryDrainModifier: WEATHER_BATTERY_MODIFIERS[type],
    patienceModifier: WEATHER_PATIENCE_MODIFIERS[type],
    description: WEATHER_DESCRIPTIONS[type],
  };
}

export function getWeatherIntensity(type: WeatherType): number {
  const intensityMap: Record<WeatherType, number> = {
    sunny: 0,
    cloudy: 10,
    rainy: 40,
    heavy_rain: 70,
    storm: 100,
  };
  return intensityMap[type] + Math.random() * 15 - 7.5;
}

function generateWeatherType(prevType?: WeatherType): WeatherType {
  const weatherTypes: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'heavy_rain', 'storm'];

  if (!prevType) {
    const weights = [0.45, 0.3, 0.15, 0.07, 0.03];
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i < weatherTypes.length; i++) {
      cumulative += weights[i];
      if (rand < cumulative) return weatherTypes[i];
    }
    return 'sunny';
  }

  const currentIndex = weatherTypes.indexOf(prevType);
  const transitionMatrix: number[][] = [
    [0.50, 0.35, 0.12, 0.03, 0.00],
    [0.30, 0.35, 0.25, 0.08, 0.02],
    [0.15, 0.25, 0.35, 0.20, 0.05],
    [0.05, 0.15, 0.35, 0.30, 0.15],
    [0.02, 0.08, 0.30, 0.35, 0.25],
  ];

  const weights = transitionMatrix[currentIndex];
  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < weatherTypes.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) return weatherTypes[i];
  }
  return weatherTypes[currentIndex];
}

function generateForecastSlot(prevType?: WeatherType, forceType?: WeatherType): WeatherForecastSlot {
  const type = forceType || generateWeatherType(prevType);
  const intensity = getWeatherIntensity(type);
  const duration = FORECAST_SLOT_DURATION + Math.random() * 15 - 7.5;

  return {
    type,
    intensity,
    duration,
    effect: getWeatherEffect(type),
  };
}

export function generateForecast(initialType?: WeatherType): WeatherForecastSlot[] {
  const forecast: WeatherForecastSlot[] = [];
  let prevType = initialType;

  for (let i = 0; i < FORECAST_SLOT_COUNT; i++) {
    const slot = generateForecastSlot(prevType, i === 0 && initialType ? initialType : undefined);
    forecast.push(slot);
    prevType = slot.type;
  }

  return forecast;
}

export function createInitialWeather(): WeatherState {
  const forecast = generateForecast();
  const firstSlot = forecast[0];

  return {
    type: firstSlot.type,
    intensity: firstSlot.intensity,
    speedModifier: firstSlot.effect.speedModifier,
    batteryDrainModifier: firstSlot.effect.batteryDrainModifier,
    patienceModifier: firstSlot.effect.patienceModifier,
    nextChangeTime: firstSlot.duration,
    currentSlotIndex: 0,
    forecast,
    elapsedInSlot: 0,
  };
}

export function advanceWeatherSlot(weather: WeatherState): WeatherState {
  const nextIndex = weather.currentSlotIndex + 1;

  if (nextIndex >= weather.forecast.length) {
    const newForecast = generateForecast(weather.forecast[weather.forecast.length - 1].type);
    const firstSlot = newForecast[0];

    return {
      ...weather,
      type: firstSlot.type,
      intensity: firstSlot.intensity,
      speedModifier: firstSlot.effect.speedModifier,
      batteryDrainModifier: firstSlot.effect.batteryDrainModifier,
      patienceModifier: firstSlot.effect.patienceModifier,
      nextChangeTime: firstSlot.duration,
      currentSlotIndex: 0,
      forecast: newForecast,
      elapsedInSlot: 0,
    };
  }

  const nextSlot = weather.forecast[nextIndex];
  return {
    ...weather,
    type: nextSlot.type,
    intensity: nextSlot.intensity,
    speedModifier: nextSlot.effect.speedModifier,
    batteryDrainModifier: nextSlot.effect.batteryDrainModifier,
    patienceModifier: nextSlot.effect.patienceModifier,
    nextChangeTime: nextSlot.duration,
    currentSlotIndex: nextIndex,
    elapsedInSlot: 0,
  };
}

export function updateWeather(weather: WeatherState, deltaTime: number): WeatherState {
  let newWeather = { ...weather };
  newWeather.nextChangeTime -= deltaTime * 1000;
  newWeather.elapsedInSlot += deltaTime;

  if (newWeather.nextChangeTime <= 0) {
    newWeather = advanceWeatherSlot(newWeather);
  }

  return newWeather;
}

export function applyRainGearEffect(
  weather: WeatherState,
  hasRainGear: boolean
): { speedModifier: number; batteryDrainModifier: number } {
  if (!hasRainGear || !isRaining(weather.type)) {
    return {
      speedModifier: weather.speedModifier,
      batteryDrainModifier: weather.batteryDrainModifier,
    };
  }

  return {
    speedModifier: Math.min(1.0, weather.speedModifier + RAIN_GEAR_SPEED_BOOST),
    batteryDrainModifier: weather.batteryDrainModifier * (1 - RAIN_GEAR_BATTERY_REDUCTION),
  };
}

export function forceAdvanceWeather(weather: WeatherState, seconds: number): WeatherState {
  let newWeather = { ...weather };
  let remainingMs = seconds * 1000;

  while (remainingMs > 0) {
    if (remainingMs >= newWeather.nextChangeTime) {
      remainingMs -= newWeather.nextChangeTime;
      newWeather = advanceWeatherSlot(newWeather);
    } else {
      newWeather.nextChangeTime -= remainingMs;
      newWeather.elapsedInSlot += remainingMs / 1000;
      remainingMs = 0;
    }
  }

  return newWeather;
}

export function getRainParticleCount(intensity: number): number {
  return Math.floor(intensity * 1.5);
}

export function isRaining(type: WeatherType): boolean {
  return type === 'rainy' || type === 'heavy_rain' || type === 'storm';
}

export function getWeatherEffectDescription(type: WeatherType): string {
  return WEATHER_DESCRIPTIONS[type];
}

export function calculateWaitDuration(): number {
  return WAIT_SLOT_DURATION_MIN + Math.random() * (WAIT_SLOT_DURATION_MAX - WAIT_SLOT_DURATION_MIN);
}

export function getForecastSummary(forecast: WeatherForecastSlot[]): string {
  return forecast
    .map((slot, i) => {
      const icon = getWeatherIcon(slot.type);
      return `第${i + 1}段:${icon}`;
    })
    .join(' ');
}

export function getWeatherIcon(type: WeatherType): string {
  return {
    sunny: '☀️',
    cloudy: '⛅',
    rainy: '🌧️',
    heavy_rain: '⛈️',
    storm: '🌪️',
  }[type];
}
