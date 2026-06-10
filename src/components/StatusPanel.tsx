import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../store/gameStore';
import { WEATHER_NAMES, WEATHER_COLORS, RAIN_GEAR_COST } from '../game/constants';
import { calculateTotalRating, formatMoney } from '../game/EconomySystem';
import { getWeatherIcon, isRaining } from '../game/WeatherSystem';
import { Zap, Heart, Wrench, DollarSign, Cloud, Clock, Star, Umbrella, AlertTriangle, TrendingDown } from 'lucide-react';

export default function StatusPanel() {
  const dispatch = useGameStore((state) => state.dispatch);
  const player = useGameStore((state) => state.player);
  const vehicle = useGameStore((state) => state.vehicle);
  const weather = useGameStore((state) => state.weather);
  const gameTime = useGameStore((state) => state.gameTime);
  const incomeRecords = useGameStore(useShallow((state) => state.incomeRecords));
  const isCharging = useGameStore((state) => state.isCharging);
  const isRepairing = useGameStore((state) => state.isRepairing);
  const isResting = useGameStore((state) => state.isResting);

  const avgRating = calculateTotalRating(incomeRecords);
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number) => {
    const secs = Math.max(0, Math.ceil(seconds));
    return `${secs}秒`;
  };

  const getProgressClass = (value: number) => {
    if (value < 20) return 'danger';
    if (value < 50) return 'warning';
    return '';
  };

  const weatherIcon = getWeatherIcon(weather.type);
  const currentSlotRemaining = weather.nextChangeTime / 1000;

  const handleBuyRainGear = () => {
    dispatch({ type: 'BUY_RAIN_GEAR' });
  };

  return (
    <div className="game-card p-4 w-80 space-y-4 max-h-[720px] overflow-y-auto">
      <h3 className="font-pixel text-sm text-game-neon glow-text">状态面板</h3>

      <div className="flex items-center gap-2">
        <DollarSign size={18} className="text-game-streetLight" />
        <span className="font-retro text-2xl text-game-streetLight">{formatMoney(player.money)}</span>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <Zap size={14} className="text-game-neon" />
              <span className="font-retro text-sm">电量</span>
            </div>
            <span className={`font-retro text-sm ${vehicle.battery < 20 ? 'text-game-danger animate-pulse' : ''}`}>
              {Math.floor(vehicle.battery)}%
              {isCharging && <span className="text-game-success ml-1">⚡充电中</span>}
            </span>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-bar-fill ${getProgressClass(vehicle.battery)}`}
              style={{ width: `${vehicle.battery}%` }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <Heart size={14} className="text-game-danger" />
              <span className="font-retro text-sm">体力</span>
            </div>
            <span className={`font-retro text-sm ${player.stamina < 20 ? 'text-game-danger animate-pulse' : ''}`}>
              {Math.floor(player.stamina)}%
              {isResting && <span className="text-game-success ml-1">💤休息中</span>}
            </span>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-bar-fill ${getProgressClass(player.stamina)}`}
              style={{ width: `${player.stamina}%`, background: 'linear-gradient(90deg, #ff4757 0%, #ff6b81 100%)' }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <Wrench size={14} className="text-game-streetLight" />
              <span className="font-retro text-sm">耐久度</span>
            </div>
            <span className={`font-retro text-sm ${vehicle.durability < 20 ? 'text-game-danger animate-pulse' : ''}`}>
              {Math.floor(vehicle.durability)}%
              {isRepairing && <span className="text-game-success ml-1">🔧维修中</span>}
            </span>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-bar-fill ${getProgressClass(vehicle.durability)}`}
              style={{ width: `${vehicle.durability}%`, background: 'linear-gradient(90deg, #ffcc4d 0%, #ffda79 100%)' }}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-game-neon/30 pt-3 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud size={16} style={{ color: WEATHER_COLORS[weather.type] }} />
              <span className="font-retro text-2xl">{weatherIcon}</span>
            </div>
            <div className="text-right">
              <span className="font-retro text-sm" style={{ color: WEATHER_COLORS[weather.type] }}>
                {WEATHER_NAMES[weather.type]}
              </span>
              <div className="font-retro text-xs text-gray-500">
                剩余: {formatDuration(currentSlotRemaining)}
              </div>
            </div>
          </div>

          <div className="bg-game-night/50 rounded p-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400 flex items-center gap-1">
                <TrendingDown size={12} /> 速度影响
              </span>
              <span className={`font-retro ${weather.speedModifier < 0.7 ? 'text-game-danger' : weather.speedModifier < 0.9 ? 'text-game-streetLight' : 'text-game-success'}`}>
                {weather.speedModifier >= 1 ? '正常' : `×${weather.speedModifier.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 flex items-center gap-1">
                <Zap size={12} /> 耗电倍率
              </span>
              <span className={`font-retro ${weather.batteryDrainModifier > 1.3 ? 'text-game-danger' : weather.batteryDrainModifier > 1.1 ? 'text-game-streetLight' : 'text-game-success'}`}>
                ×{weather.batteryDrainModifier.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 flex items-center gap-1">
                <AlertTriangle size={12} /> 客户耐心
              </span>
              <span className={`font-retro ${weather.patienceModifier < 0.6 ? 'text-game-danger' : weather.patienceModifier < 0.85 ? 'text-game-streetLight' : 'text-game-success'}`}>
                ×{weather.patienceModifier.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-game-nightLight/30 border border-game-neon/20 rounded p-2">
          <div className="font-retro text-xs text-game-neon mb-2 flex items-center gap-1">
            📡 三段天气预报
          </div>
          <div className="space-y-1.5">
            {weather.forecast.map((slot, index) => {
              const isCurrent = index === weather.currentSlotIndex;
              const icon = getWeatherIcon(slot.type);
              const speedPct = Math.round(slot.effect.speedModifier * 100);

              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-1.5 rounded text-xs ${
                    isCurrent
                      ? 'bg-game-neon/20 border border-game-neon/40'
                      : 'bg-game-night/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-retro ${isCurrent ? 'text-game-neon' : 'text-gray-500'}`}>
                      {isCurrent ? '●现在' : `第${index + 1}段`}
                    </span>
                    <span className="text-lg">{icon}</span>
                    <span className="font-retro" style={{ color: WEATHER_COLORS[slot.type] }}>
                      {WEATHER_NAMES[slot.type]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-retro ${speedPct < 70 ? 'text-game-danger' : speedPct < 90 ? 'text-game-streetLight' : 'text-gray-400'}`}>
                      速度{speedPct}%
                    </span>
                    <span className="font-retro text-gray-500">
                      ~{Math.ceil(slot.duration)}s
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Umbrella size={14} className={player.hasRainGear && player.rainGearUsesLeft > 0 ? 'text-blue-400' : 'text-gray-500'} />
              <span className="font-retro text-sm">雨具状态</span>
            </div>
            <span className={`font-retro text-xs ${
              player.hasRainGear && player.rainGearUsesLeft > 0
                ? 'text-blue-400'
                : 'text-gray-500'
            }`}>
              {player.hasRainGear && player.rainGearUsesLeft > 0
                ? `剩余${player.rainGearUsesLeft}次`
                : '未装备'}
            </span>
          </div>

          {isRaining(weather.type) && (!player.hasRainGear || player.rainGearUsesLeft <= 0) && (
            <button
              onClick={handleBuyRainGear}
              disabled={player.money < RAIN_GEAR_COST}
              className={`w-full pixel-btn text-xs py-1.5 ${
                player.money < RAIN_GEAR_COST
                  ? 'opacity-50 cursor-not-allowed bg-gray-700'
                  : 'bg-blue-600/80 hover:bg-blue-500'
              }`}
            >
              <Umbrella size={12} className="inline mr-1" />
              购买雨具 ({formatMoney(RAIN_GEAR_COST)})
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-game-neon/30 pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <Clock size={14} className="text-gray-400" />
          <span className="font-retro text-sm text-gray-300">{formatTime(gameTime)}</span>
        </div>

        <div className="flex items-center justify-between">
          <Star size={14} className="text-game-streetLight" />
          <span className="font-retro text-sm text-game-streetLight">
            评分: {avgRating > 0 ? avgRating.toFixed(1) : '-'}/5.0
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-retro text-sm text-gray-400">完成订单</span>
          <span className="font-retro text-sm text-game-success">{player.completedOrders}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-retro text-sm text-gray-400">累计雨天补贴</span>
          <span className="font-retro text-sm text-blue-400">+{formatMoney(player.totalRainPremium)}</span>
        </div>
      </div>

      {(isCharging || isRepairing || isResting) && (
        <div className="bg-game-neon/10 border border-game-neon/50 rounded p-2 text-center">
          <span className="font-retro text-xs text-game-neon">
            {isCharging && '正在充电中...'}
            {isRepairing && '正在维修中...'}
            {isResting && !player.currentOrderId && '等待天气转好中...'}
            {isResting && player.currentOrderId && '正在休息中...'}
          </span>
        </div>
      )}
    </div>
  );
}
