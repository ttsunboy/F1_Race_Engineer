/**
 * Pit Stop Prediction - 进站掉位预测.
 *
 * 后端内置每站固定进站损失表 (绿旗基准, SC/VSC 按比例折算), 实时计算:
 * 当前位置 + 当前条件下进站会掉到第几名。三种条件 (绿旗/SC/DS) 分开显示。
 */
import React from 'react';
import { useTelemetryStore } from '@/store/telemetryStore';
import { Flag, Shield, AlertTriangle } from 'lucide-react';
import type { PitCondition } from '@/types/telemetry';

const CONDITION_META: Record<
  PitCondition,
  { label: string; icon: React.ReactNode; rowClass: string }
> = {
  green: { label: '绿旗进站', icon: <Flag className="w-4 h-4 text-green-400" />, rowClass: 'border-green-900/50' },
  sc: { label: 'SC 安全车', icon: <Shield className="w-4 h-4 text-yellow-400" />, rowClass: 'border-yellow-900/50' },
  ds: { label: 'DS/VSC', icon: <AlertTriangle className="w-4 h-4 text-orange-400" />, rowClass: 'border-orange-900/50' },
};

const CONDITIONS: PitCondition[] = ['green', 'sc', 'ds'];

function formatLoss(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export const PitStopPrediction: React.FC = () => {
  const pitLoss = useTelemetryStore((state) => state.pit_loss);

  if (!pitLoss || !pitLoss.losses) return null;

  const trackId = pitLoss.track_id ?? '—';
  const currentPos = pitLoss.prediction?.current_position ?? null;
  const predicted = pitLoss.prediction?.predicted ?? {};

  return (
    <div className="bg-f1-darker rounded-lg p-4 border border-f1-gray">
      {/* Track + current position header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Pit Stop Prediction</div>
          <div className="text-sm text-gray-300 mt-0.5">{trackId}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">当前位置</div>
          <div className="text-3xl font-bold text-white leading-none mt-0.5">
            {currentPos ? `P${currentPos}` : '—'}
          </div>
        </div>
      </div>

      {/* Per-condition predicted position */}
      <div className="grid grid-cols-3 gap-2">
        {CONDITIONS.map((cond) => {
          const meta = CONDITION_META[cond];
          const info = pitLoss.losses[cond];
          const isCurrent = pitLoss.condition === cond;
          const predPos = predicted[cond];
          const drop = currentPos && predPos != null ? predPos - currentPos : null;

          return (
            <div
              key={cond}
              className={`rounded-lg p-2 text-center border ${
                isCurrent ? 'bg-f1-dark ring-1 ring-white/30' : 'bg-f1-dark/60'
              } ${meta.rowClass}`}
            >
              <div className="flex items-center justify-center gap-1 text-xs text-gray-300 mb-1">
                {meta.icon}
                <span>{meta.label}</span>
              </div>
              <div className="text-[10px] text-gray-500">损失 {formatLoss(info?.loss_ms ?? 0)}</div>
              <div className="text-xl font-bold text-white mt-1">
                {predPos != null ? `P${predPos}` : '—'}
              </div>
              <div className="text-[10px] mt-0.5">
                {isCurrent ? (
                  <span className="text-gray-400">当前条件</span>
                ) : drop != null && drop !== 0 ? (
                  <span className={drop > 0 ? 'text-red-400' : 'text-green-400'}>
                    {drop > 0 ? `掉 ${drop} 位` : `升 ${-drop} 位`}
                  </span>
                ) : (
                  <span className="text-gray-600">不掉位</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-600 mt-2">
        基于内置标准进站损失表 · 后方车辆 gap ≤ 我方差距 + 损失时间即会超过
      </p>
    </div>
  );
};
