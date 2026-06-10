import { useGameStore } from '../store/gameStore';
import { formatMoney, getRatingStars } from '../game/EconomySystem';
import { getWeatherIcon } from '../game/WeatherSystem';
import { WEATHER_NAMES, WEATHER_COLORS } from '../game/constants';
import {
  X,
  Star,
  TrendingUp,
  TrendingDown,
  Award,
  Cloud,
  Umbrella,
  Timer,
  Zap,
  CloudRain,
} from 'lucide-react';

export default function SettlementModal() {
  const dispatch = useGameStore((state) => state.dispatch);
  const showSettlement = useGameStore((state) => state.showSettlement);
  const lastSettlement = useGameStore((state) => state.lastSettlement);

  if (!showSettlement || !lastSettlement) return null;

  const details = lastSettlement.details.split(' | ');

  const getDetailType = (detail: string): 'positive' | 'negative' | 'neutral' | 'rating' => {
    if (detail.includes('客户评分')) return 'rating';
    if (detail.includes('+') || detail.includes('奖励') || detail.includes('基础') || detail.includes('补贴') || detail.includes('加价')) {
      return 'positive';
    }
    if (detail.includes('-') || detail.includes('扣款') || detail.includes('迟到') || detail.includes('透支') || detail.includes('不足') || detail.includes('成本') || detail.includes('费用')) {
      return 'negative';
    }
    return 'neutral';
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="game-card p-6 w-full max-w-md animate-[fadeIn_0.3s_ease-out] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-pixel text-lg text-game-neon glow-text">订单结算</h3>
          <button
            onClick={() => dispatch({ type: 'CLOSE_SETTLEMENT' })}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="flex justify-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={32}
                className={star <= lastSettlement.rating ? 'text-game-streetLight fill-game-streetLight' : 'text-gray-600'}
              />
            ))}
          </div>
          <p className="font-retro text-2xl text-game-streetLight">
            {getRatingStars(lastSettlement.rating)}
          </p>
        </div>

        {(lastSettlement.weatherAtAccept || lastSettlement.weatherAtCompletion) && (
          <div className="bg-game-nightLight/20 border border-game-neon/20 rounded p-3 mb-4 space-y-2">
            <div className="font-retro text-xs text-game-neon mb-1 flex items-center gap-1">
              <Cloud size={12} /> 天气记录
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-game-night/50 rounded p-2">
                <div className="font-retro text-gray-500">接单时</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-lg">{getWeatherIcon(lastSettlement.weatherAtAccept)}</span>
                  <span className="font-retro" style={{ color: WEATHER_COLORS[lastSettlement.weatherAtAccept] }}>
                    {WEATHER_NAMES[lastSettlement.weatherAtAccept]}
                  </span>
                </div>
              </div>
              <div className="bg-game-night/50 rounded p-2">
                <div className="font-retro text-gray-500">送达时</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-lg">{getWeatherIcon(lastSettlement.weatherAtCompletion)}</span>
                  <span className="font-retro" style={{ color: WEATHER_COLORS[lastSettlement.weatherAtCompletion] }}>
                    {WEATHER_NAMES[lastSettlement.weatherAtCompletion]}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2 mb-6">
          {details.map((detail, index) => {
            const type = getDetailType(detail);
            if (type === 'rating') return null;

            const parts = detail.split(':');
            const label = parts[0]?.trim() || detail;
            const value = parts[1]?.trim() || '';

            const getIcon = () => {
              if (label.includes('雨天') || label.includes('加价')) return <CloudRain size={16} className="text-blue-400" />;
              if (label.includes('雨具')) return <Umbrella size={16} className="text-purple-400" />;
              if (label.includes('等待')) return <Timer size={16} className="text-yellow-400" />;
              if (label.includes('耗电')) return <Zap size={16} className="text-orange-400" />;
              if (type === 'positive') return <TrendingUp size={16} className="text-game-success" />;
              if (type === 'negative') return <TrendingDown size={16} className="text-game-danger" />;
              return null;
            };

            const getBgClass = () => {
              if (type === 'positive') return 'bg-game-success/10';
              if (type === 'negative') return 'bg-game-danger/10';
              return 'bg-game-night/50';
            };

            const getValueClass = () => {
              if (type === 'positive') return 'text-game-success';
              if (type === 'negative') return 'text-game-danger';
              return 'text-gray-300';
            };

            return (
              <div
                key={index}
                className={`flex justify-between items-center p-2.5 rounded ${getBgClass()}`}
              >
                <div className="flex items-center gap-2">
                  {getIcon()}
                  <span className="font-retro text-sm text-gray-300">
                    {label}
                  </span>
                </div>
                <span className={`font-retro text-sm ${getValueClass()}`}>
                  {value}
                </span>
              </div>
            );
          })}
        </div>

        {lastSettlement.rainPremium > 0 || lastSettlement.waitCost > 0 || lastSettlement.rainGearCost > 0 || lastSettlement.extraBatteryCost > 0 ? (
          <div className="bg-game-night/50 rounded p-3 mb-4 space-y-2 border border-game-neon/20">
            <div className="font-retro text-xs text-game-neon mb-1">📊 策略效果汇总</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {lastSettlement.rainPremium > 0 && (
                <div className="flex justify-between">
                  <span className="text-blue-400 font-retro flex items-center gap-1">
                    <CloudRain size={12} /> 雨天补贴
                  </span>
                  <span className="text-game-success font-retro">+{formatMoney(lastSettlement.rainPremium)}</span>
                </div>
              )}
              {lastSettlement.waitCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-yellow-400 font-retro flex items-center gap-1">
                    <Timer size={12} /> 等待成本
                  </span>
                  <span className="text-game-danger font-retro">-{formatMoney(lastSettlement.waitCost)}</span>
                </div>
              )}
              {lastSettlement.rainGearCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-purple-400 font-retro flex items-center gap-1">
                    <Umbrella size={12} /> 雨具费用
                  </span>
                  <span className="text-game-danger font-retro">-{formatMoney(lastSettlement.rainGearCost)}</span>
                </div>
              )}
              {lastSettlement.extraBatteryCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-orange-400 font-retro flex items-center gap-1">
                    <Zap size={12} /> 额外耗电
                  </span>
                  <span className="text-game-danger font-retro">-{formatMoney(lastSettlement.extraBatteryCost)}</span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="border-t border-game-neon/30 pt-4">
          <div className="flex justify-between items-center mb-4">
            <span className="font-pixel text-sm text-gray-400">实际收入</span>
            <span className="font-pixel text-2xl text-game-streetLight glow-text">
              {formatMoney(lastSettlement.finalAmount)}
            </span>
          </div>

          <button
            onClick={() => dispatch({ type: 'CLOSE_SETTLEMENT' })}
            className="pixel-btn w-full flex items-center justify-center gap-2"
          >
            <Award size={16} />
            继续接单
          </button>
        </div>
      </div>
    </div>
  );
}
