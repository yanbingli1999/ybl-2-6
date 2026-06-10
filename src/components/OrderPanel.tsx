import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore, selectCurrentOrder, selectAvailableOrders } from '../store/gameStore';
import { getOrderStatusText, getUrgencyText } from '../game/OrderSystem';
import { formatMoney } from '../game/EconomySystem';
import { getWeatherIcon, isRaining } from '../game/WeatherSystem';
import {
  Package,
  MapPin,
  Clock,
  AlertTriangle,
  Check,
  Umbrella,
  Timer,
  CloudRain,
  Info,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  WEATHER_NAMES,
  WEATHER_COLORS,
  RAIN_GEAR_COST,
  RAIN_GEAR_USES,
  WAIT_COST_PER_SECOND,
  FORECAST_SLOT_DURATION,
} from '../game/constants';
import type { Order } from '../game/types';

export default function OrderPanel() {
  const dispatch = useGameStore((state) => state.dispatch);
  const player = useGameStore((state) => state.player);
  const weather = useGameStore((state) => state.weather);
  const currentOrder = useGameStore(useShallow(selectCurrentOrder));
  const availableOrders = useGameStore(useShallow(selectAvailableOrders));
  const isResting = useGameStore((state) => state.isResting);

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, { withRainGear: boolean; waitSeconds: number }>>({});

  const formatDeadline = (seconds: number) => {
    if (seconds <= 0) return '已超时';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDeadlineColor = (deadline: number, maxDeadline: number) => {
    const ratio = deadline / maxDeadline;
    if (ratio < 0.3) return 'text-game-danger animate-pulse';
    if (ratio < 0.6) return 'text-game-streetLight';
    return 'text-game-success';
  };

  const getOption = (orderId: string) => {
    return selectedOptions[orderId] || { withRainGear: false, waitSeconds: 0 };
  };

  const setOption = (orderId: string, options: Partial<{ withRainGear: boolean; waitSeconds: number }>) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [orderId]: { ...getOption(orderId), ...options },
    }));
  };

  const handleAcceptOrder = (orderId: string) => {
    if (player.currentOrderId) return;
    const options = getOption(orderId);
    dispatch({
      type: 'ACCEPT_ORDER',
      orderId,
      withRainGear: options.withRainGear,
      waitSeconds: options.waitSeconds,
    });
    setExpandedOrder(null);
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrder((prev) => (prev === orderId ? null : orderId));
  };

  const handleStartWaiting = () => {
    if (player.currentOrderId) return;
    dispatch({ type: 'START_WAITING_WEATHER' });
  };

  const handleStopWaiting = () => {
    dispatch({ type: 'STOP_WAITING_WEATHER' });
  };

  const calculateNetReward = (order: Order) => {
    const options = getOption(order.id);
    let net = order.reward;

    if (options.withRainGear) {
      net -= RAIN_GEAR_COST;
    }
    if (options.waitSeconds > 0) {
      net -= options.waitSeconds * WAIT_COST_PER_SECOND;
    }
    return Math.max(0, net);
  };

  const canAffordRainGear = (order: Order) => {
    const options = getOption(order.id);
    if (!options.withRainGear) return true;
    const existingGear = player.hasRainGear && player.rainGearUsesLeft > 0;
    if (existingGear) return true;
    return player.money >= RAIN_GEAR_COST;
  };

  const canAffordWait = (order: Order) => {
    const options = getOption(order.id);
    const waitCost = options.waitSeconds * WAIT_COST_PER_SECOND;
    return player.money >= waitCost;
  };

  const currentWeatherIcon = getWeatherIcon(weather.type);

  const getWeatherForecastImpact = (order: Order, waitSeconds: number) => {
    const currentSlotRemaining = weather.nextChangeTime / 1000;
    const totalDuration = currentSlotRemaining;
    let slotIndex = weather.currentSlotIndex;
    let remaining = waitSeconds;
    let finalWeatherIndex = slotIndex;

    if (remaining < totalDuration) {
      finalWeatherIndex = slotIndex;
    } else {
      remaining -= totalDuration;
      for (let i = slotIndex + 1; i < weather.forecast.length; i++) {
        if (remaining < weather.forecast[i].duration) {
          finalWeatherIndex = i;
          break;
        }
        remaining -= weather.forecast[i].duration;
        finalWeatherIndex = i;
      }
    }
    return weather.forecast[Math.min(finalWeatherIndex, weather.forecast.length - 1)];
  };

  return (
    <div className="game-card p-4 w-88 space-y-4 max-h-[720px] flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="font-pixel text-sm text-game-neon glow-text">订单中心</h3>
        <div className="flex items-center gap-1">
          <span className="text-xl">{currentWeatherIcon}</span>
          <span className="font-retro text-xs" style={{ color: WEATHER_COLORS[weather.type] }}>
            {WEATHER_NAMES[weather.type]}
          </span>
        </div>
      </div>

      {!player.currentOrderId && (
        <div className="bg-game-nightLight/20 border border-game-neon/20 rounded p-2 space-y-2">
          <div className="font-retro text-xs text-game-neon flex items-center gap-1">
            🎯 天气策略
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleStartWaiting}
              disabled={isResting || player.money < 2}
              className={`flex-1 pixel-btn text-xs py-1.5 flex items-center justify-center gap-1 ${
                isResting ? 'bg-game-success/30 text-game-success' : ''
              } ${player.money < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Timer size={12} />
              {isResting ? '等待中...' : '等待转好'}
            </button>
            {isResting && (
              <button
                onClick={handleStopWaiting}
                className="pixel-btn pixel-btn-danger text-xs py-1.5 flex items-center justify-center"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div className="font-retro text-xs text-gray-500">
            等待花费: ¥{WAIT_COST_PER_SECOND.toFixed(1)}/秒 + 消耗体力
          </div>
        </div>
      )}

      {currentOrder && (
        <div className="bg-game-neon/10 border-2 border-game-neon rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-pixel text-xs text-game-neon">当前订单</span>
            <span className={`font-retro text-xs px-2 py-0.5 rounded ${
              currentOrder.status === 'accepted' ? 'bg-blue-500/30 text-blue-400' :
              'bg-orange-500/30 text-orange-400'
            }`}>
              {getOrderStatusText(currentOrder.status)}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-game-success mt-1 flex-shrink-0" />
              <div>
                <div className="font-retro text-xs text-gray-400">取货点</div>
                <div className="font-retro text-sm text-game-success">{currentOrder.pickupLocation.name}</div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-game-danger mt-1 flex-shrink-0" />
              <div>
                <div className="font-retro text-xs text-gray-400">送货点</div>
                <div className="font-retro text-sm text-game-danger">{currentOrder.deliveryLocation.name}</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Clock size={14} className={getDeadlineColor(currentOrder.deadline, currentOrder.maxDeadline)} />
                <span className={`font-retro text-sm ${getDeadlineColor(currentOrder.deadline, currentOrder.maxDeadline)}`}>
                  {formatDeadline(currentOrder.deadline)}
                </span>
              </div>
              <div className="text-right">
                <div className="font-retro text-lg text-game-streetLight">{formatMoney(currentOrder.reward)}</div>
                <div className="font-retro text-xs text-gray-500">距离: {currentOrder.distance}格</div>
              </div>
            </div>

            {currentOrder.isRainOrder && (
              <div className="flex items-center gap-1 bg-blue-500/20 rounded px-2 py-1">
                <CloudRain size={12} className="text-blue-400" />
                <span className="font-retro text-xs text-blue-400">
                  雨天加价单 (+{Math.round(currentOrder.weatherPremium * 100)}%)
                </span>
              </div>
            )}

            {currentOrder.acceptedWithRainGear && (
              <div className="flex items-center gap-1 bg-purple-500/20 rounded px-2 py-1">
                <Umbrella size={12} className="text-purple-400" />
                <span className="font-retro text-xs text-purple-400">已使用雨具</span>
              </div>
            )}

            {currentOrder.acceptedAfterWait > 0 && (
              <div className="flex items-center gap-1 bg-yellow-500/20 rounded px-2 py-1">
                <Timer size={12} className="text-yellow-400" />
                <span className="font-retro text-xs text-yellow-400">
                  等待 {Math.round(currentOrder.acceptedAfterWait)}秒后接单
                </span>
              </div>
            )}

            {currentOrder.customerUrgency >= 4 && (
              <div className="flex items-center gap-1 bg-game-danger/20 rounded px-2 py-1">
                <AlertTriangle size={12} className="text-game-danger" />
                <span className="font-retro text-xs text-game-danger">
                  {getUrgencyText(currentOrder.customerUrgency)}！客户在催单
                </span>
              </div>
            )}

            <div className="text-xs font-retro text-gray-400 mt-2 p-2 bg-game-night/70 rounded border border-game-neon/30">
              {currentOrder.status === 'accepted' && '🎯 第一步：沿青色虚线路径开到绿色标记的取货点'}
              {currentOrder.status === 'pickedup' && '🎯 第二步：沿青色虚线路径开到红色标记的送货点'}
              {currentOrder.status === 'delivering' && '🎯 正在配送中，请沿路径行驶至送货点'}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2">
        <h4 className="font-pixel text-xs text-gray-400 sticky top-0 bg-game-nightLight py-1">
          可用订单 ({availableOrders.length})
        </h4>

        {availableOrders.length === 0 ? (
          <div className="text-center py-8">
            <Package size={32} className="mx-auto text-gray-600 mb-2" />
            <p className="font-retro text-sm text-gray-500">暂无可用订单</p>
            <p className="font-retro text-xs text-gray-600">请稍候，新订单即将到来...</p>
          </div>
        ) : (
          availableOrders.map((order) => {
            const isExpanded = expandedOrder === order.id;
            const options = getOption(order.id);
            const netReward = calculateNetReward(order);
            const affordable = canAffordRainGear(order) && canAffordWait(order);
            const forecastAfterWait = options.waitSeconds > 0
              ? getWeatherForecastImpact(order, options.waitSeconds)
              : null;

            return (
              <div
                key={order.id}
                className={`bg-game-night/50 border rounded transition-all ${
                  isExpanded ? 'border-game-neon/70' : 'border-gray-700 hover:border-game-neon/50'
                }`}
              >
                <div
                  className="p-3 space-y-2 cursor-pointer"
                  onClick={() => toggleExpand(order.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-retro text-xs text-gray-400">
                        {order.pickupLocation.name} → {order.deliveryLocation.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-retro text-lg text-game-streetLight">{formatMoney(order.reward)}</span>
                        {order.isRainOrder && (
                          <span className="font-retro text-xs text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">
                            🌧️ +{Math.round(order.weatherPremium * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-retro text-xs ${getDeadlineColor(order.deadline, order.maxDeadline)}`}>
                        ⏱ {formatDeadline(order.deadline)}
                      </span>
                      <div className="mt-1">
                        {isExpanded ? (
                          <ChevronUp size={14} className="text-game-neon ml-auto" />
                        ) : (
                          <ChevronDown size={14} className="text-gray-500 ml-auto" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs font-retro text-gray-400">
                      <span>距离: {order.distance}格</span>
                      <span className={order.customerUrgency >= 4 ? 'text-game-danger' : ''}>
                        {'⭐'.repeat(order.customerUrgency)}
                      </span>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-gray-700/50 pt-3">
                    <div className="bg-game-night/60 rounded p-2 space-y-1.5 text-xs">
                      <div className="font-retro text-game-neon flex items-center gap-1">
                        <Info size={12} /> 接单策略选项
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="flex items-center gap-1 mt-0.5">
                          <input
                            type="checkbox"
                            checked={options.withRainGear}
                            onChange={(e) => setOption(order.id, { withRainGear: e.target.checked })}
                            className="w-3.5 h-3.5 rounded accent-game-neon"
                            disabled={!!player.currentOrderId}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-retro text-gray-300 flex items-center gap-1">
                            <Umbrella size={12} className="text-blue-400" />
                            使用雨具
                          </div>
                          <div className="font-retro text-gray-500 mt-0.5">
                            {player.hasRainGear && player.rainGearUsesLeft > 0
                              ? `剩余${player.rainGearUsesLeft}次可用 (下次消耗1次)`
                              : `购买: ¥${RAIN_GEAR_COST}, 可用${RAIN_GEAR_USES}次`}
                          </div>
                          <div className="font-retro text-green-400 mt-0.5">
                            效果: 雨天速度+15%, 耗电-20%
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="font-retro text-gray-300 flex items-center gap-1">
                          <Timer size={12} className="text-yellow-400" />
                          等待天气 (秒)
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="90"
                            step="5"
                            value={options.waitSeconds}
                            onChange={(e) => setOption(order.id, { waitSeconds: parseInt(e.target.value) })}
                            className="flex-1 accent-game-neon"
                            disabled={!!player.currentOrderId}
                          />
                          <span className="font-retro text-sm text-game-streetLight w-10 text-right">
                            {options.waitSeconds}s
                          </span>
                        </div>
                        <div className="font-retro text-gray-500">
                          花费: ¥{(options.waitSeconds * WAIT_COST_PER_SECOND).toFixed(1)} |
                          预计时长: 约{FORECAST_SLOT_DURATION}秒/天气段
                        </div>
                        {forecastAfterWait && (
                          <div className="font-retro text-xs flex items-center gap-1 mt-1 p-1.5 bg-game-nightLight/30 rounded">
                            <span>等待后预计天气:</span>
                            <span className="text-lg">{getWeatherIcon(forecastAfterWait.type)}</span>
                            <span style={{ color: WEATHER_COLORS[forecastAfterWait.type] }}>
                              {WEATHER_NAMES[forecastAfterWait.type]}
                            </span>
                            <span className="text-gray-500 ml-auto">
                              速度{Math.round(forecastAfterWait.effect.speedModifier * 100)}%
                            </span>
                          </div>
                        )}
                      </div>

                      {(options.withRainGear || options.waitSeconds > 0) && (
                        <div className="border-t border-gray-700/50 pt-2 mt-2 space-y-1">
                          <div className="flex justify-between font-retro">
                            <span className="text-gray-400">订单金额</span>
                            <span className="text-game-streetLight">{formatMoney(order.reward)}</span>
                          </div>
                          {options.withRainGear && !(player.hasRainGear && player.rainGearUsesLeft > 0) && (
                            <div className="flex justify-between font-retro">
                              <span className="text-gray-400">雨具费用</span>
                              <span className="text-purple-400">-{formatMoney(RAIN_GEAR_COST)}</span>
                            </div>
                          )}
                          {options.waitSeconds > 0 && (
                            <div className="flex justify-between font-retro">
                              <span className="text-gray-400">等待成本</span>
                              <span className="text-yellow-400">
                                -{formatMoney(options.waitSeconds * WAIT_COST_PER_SECOND)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between font-retro border-t border-gray-700/50 pt-1">
                            <span className="text-game-neon">预计净收入</span>
                            <span className="text-game-success text-sm">{formatMoney(netReward)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleAcceptOrder(order.id)}
                      disabled={!!player.currentOrderId || !affordable}
                      className={`pixel-btn pixel-btn-success text-xs w-full ${
                        player.currentOrderId || !affordable ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Check size={12} className="inline mr-1" />
                      {!affordable ? '资金不足' : options.withRainGear || options.waitSeconds > 0
                        ? '策略接单'
                        : '直接接单'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {!player.currentOrderId && availableOrders.length > 0 && (
        <div className="text-xs font-retro text-gray-500 text-center border-t border-gray-700 pt-2">
          💡 点击订单展开查看策略选项
        </div>
      )}
    </div>
  );
}
