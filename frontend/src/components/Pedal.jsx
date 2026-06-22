import { useCallback, useRef } from 'react';
import Knob from './Knob';

export default function Pedal({ pedal, onToggle, onParamChange, onTapTempo, compReductionRef }) {
  const tapTimesRef = useRef([]);

  const handleTap = useCallback(() => {
    const now = performance.now();
    const taps = tapTimesRef.current;
    taps.push(now);
    if (taps.length > 4) taps.shift();
    if (taps.length >= 2) {
      let total = 0;
      for (let i = 1; i < taps.length; i++) total += taps[i] - taps[i - 1];
      const avgMs = total / (taps.length - 1);
      onTapTempo?.(avgMs / 1000);
    }
  }, [onTapTempo]);

  return (
    <div className={`pedal pedal--${pedal.type}${!pedal.enabled ? ' pedal--bypassed' : ''}`}>
      <div className="pedal__header">
        <button
          className={`pedal__led ${pedal.enabled ? 'pedal__led--on' : ''}`}
          onClick={() => onToggle(pedal.id, !pedal.enabled)}
          title={pedal.enabled ? 'OFF にする' : 'ON にする'}
          aria-label={`${pedal.name} ${pedal.enabled ? 'オン' : 'オフ'}`}
        />
        <span className="pedal__name">{pedal.name}</span>
      </div>

      <div className="pedal__knobs">
        {pedal.params.map(param => (
          <Knob
            key={param.id}
            value={param.value}
            min={param.min}
            max={param.max}
            step={param.step}
            defaultValue={param.default}
            label={param.label}
            format={param.format}
            color={pedal.color}
            onChange={val => onParamChange(pedal.id, param.id, val)}
          />
        ))}
      </div>

      {pedal.hasReduction && (
        <div className="pedal__meter-wrap">
          <div className="pedal__meter-bar" ref={compReductionRef} />
        </div>
      )}

      {pedal.hasTapTempo && (
        <button className="pedal__tap" onClick={handleTap}>TAP</button>
      )}
    </div>
  );
}
