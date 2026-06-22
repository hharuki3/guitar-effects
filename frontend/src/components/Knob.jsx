import { useCallback } from 'react';

const CX = 30, CY = 30, R = 22, R_PTR = 14;
const START = -135, SWEEP = 270;

function polar(deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
}

function ptrPolar(deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + R_PTR * Math.cos(rad), y: CY + R_PTR * Math.sin(rad) };
}

function arcPath(startDeg, endDeg) {
  if (Math.abs(endDeg - startDeg) < 0.5) return '';
  const s = polar(startDeg);
  const e = polar(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${s.x.toFixed(2)},${s.y.toFixed(2)} A${R},${R} 0 ${large} 1 ${e.x.toFixed(2)},${e.y.toFixed(2)}`;
}

export default function Knob({ value, min, max, step = 1, defaultValue, label, format, onChange, color = '#5566ff' }) {
  const pct    = (value - min) / (max - min);
  const angle  = START + pct * SWEEP;
  const endAngle = START + SWEEP;

  const snap = useCallback((raw) => {
    const snapped = Math.round(raw / step) * step;
    return parseFloat(Math.max(min, Math.min(max, snapped)).toFixed(10));
  }, [min, max, step]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startVal = value;
    const range = max - min;

    const onMove = (e) => onChange(snap(startVal + ((startY - e.clientY) / 130) * range));
    const onUp   = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [value, min, max, snap, onChange]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    onChange(snap(value + (e.deltaY < 0 ? step : -step)));
  }, [value, step, snap, onChange]);

  const handleDblClick = useCallback(() => {
    if (defaultValue !== undefined) onChange(defaultValue);
  }, [defaultValue, onChange]);

  const trackPath = arcPath(START, endAngle);
  const valuePath = arcPath(START, angle);
  const ptr = ptrPolar(angle);

  return (
    <div className="knob-wrap" title={`ドラッグ / ホイールで変更\nダブルクリックでリセット`}>
      <svg
        width="64" height="64" viewBox="0 0 60 60"
        className="knob-svg"
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        onDoubleClick={handleDblClick}
        style={{ cursor: 'ns-resize', userSelect: 'none', touchAction: 'none' }}
      >
        <circle cx={CX} cy={CY} r="26" fill="#141420" stroke="#2a2a38" strokeWidth="1" />
        <path d={trackPath} fill="none" stroke="#2e2e42" strokeWidth="4" strokeLinecap="round" />
        {valuePath && (
          <path d={valuePath} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color}99)` }} />
        )}
        <circle cx={CX} cy={CY} r="12" fill="#1c1c2c" stroke="#3a3a52" strokeWidth="2" />
        <circle cx={ptr.x.toFixed(2)} cy={ptr.y.toFixed(2)} r="2.8" fill="#e8e8f8" />
      </svg>
      <span className="knob-value">{format(value)}</span>
      <span className="knob-label">{label}</span>
    </div>
  );
}
