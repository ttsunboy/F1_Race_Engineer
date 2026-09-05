/**
 * Pit Stop Prediction - 进站掉位预测.
 *
 * 后端内置每站固定进站损失表, 实时计算:
 * 当前位置 + 当前条件下进站会掉到第几名。合并显示为两个条件 (绿旗 / SC+VSC)。
 */
import React from 'react';
import { useTelemetryStore } from '@/store/telemetryStore';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { PitCondition } from '@/types/telemetry';

// 两张卡: 绿旗 / SC+VSC (损失时间相同)
const CONDITIONS: PitCondition[] = ['green', 'sc'];

const CONDITION_LABEL: Record<string, string> = {
  green: 'GREEN',
  sc: 'SC / VSC',
};

function formatLoss(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

// delta 样式: 箭头 + 数字 (gain=绿上行, loss=红下行)
function DeltaBadge({ value }: { value: number }) {
  const isGain = value < 0; // 掉位是正数, 所以负数是 gain (位置变好了)
  const isFlat = value === 0;
  const color = isFlat ? '#888888' : isGain ? '#00D656' : '#FF3838';
  const Icon = isFlat ? Minus : isGain ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center gap-1">
      <Icon className="w-3.5 h-3.5" style={{ color }} />
      <span className="text-sm font-mono font-bold" style={{ color }}>
        {isFlat ? '0' : `${Math.abs(value)}`}
      </span>
    </div>
  );
}

export const PitStopPrediction: React.FC = () => {
  const pitLoss = useTelemetryStore((state) => state.pit_loss);

  if (!pitLoss || !pitLoss.losses) return null;

  const currentPos = pitLoss.prediction?.current_position ?? null;
  const predicted = pitLoss.prediction?.predicted ?? {};

  return (
    <div className="bg-f1-darker rounded-lg p-3 border border-f1-gray">
      {/* Two cards side by side */}
      <div className="grid grid-cols-2 gap-2">
        {CONDITIONS.map((cond) => {
          const info = pitLoss.losses[cond];
          const isCurrent = pitLoss.condition === cond;
          const predPos = predicted[cond];
          const drop = currentPos && predPos != null ? predPos - currentPos : null;

          const cardClass =
            cond === 'green'
              ? 'border-green-900/50'
              : 'border-yellow-900/50';

          const accent =
            cond === 'green'
              ? 'text-green-400'
              : 'text-yellow-400';

          return (
            <div
              key={cond}
              className={`rounded-lg p-3 border ${
                isCurrent ? 'bg-f1-dark ring-1 ring-white/30' : 'bg-f1-dark/60'
              } ${cardClass}`}
            >
              <div className={`text-[10px] font-semibold uppercase tracking-wide ${accent}`}>
                {CONDITION_LABEL[cond]}
              </div>

              <div className="flex items-end justify-between mt-2">
                <div>
                  <div className="text-[10px] text-gray-500">{formatLoss(info?.loss_ms ?? 0)} loss</div>
                  <div className="text-2xl font-bold text-white leading-tight mt-0.5">
                    {predPos != null ? `P${predPos}` : '—'}
                  </div>
                </div>

                {drop != null ? (
                  <DeltaBadge value={drop} />
                ) : (
                  <span className="text-xs text-gray-600">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
