import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioEngine } from './hooks/useAudioEngine';
import Overlay    from './components/Overlay';
import Header     from './components/Header';
import Pedalboard from './components/Pedalboard';

// ── Pedal configuration ────────────────────────────────────────────────────
const INITIAL_PEDALS = [
  {
    id: 'noiseGate', name: 'NOISE GATE', type: 'dynamics', color: '#888888',
    enabled: false,
    params: [
      { id: 'threshold', label: 'Threshold', min: -80, max: -20, value: -60, step: 1,   default: -60, format: v => `${v} dB` },
      { id: 'attack',    label: 'Attack',    min: 1,   max: 100,  value: 5,   step: 1,   default: 5,   format: v => `${v} ms` },
      { id: 'release',   label: 'Release',   min: 10,  max: 500,  value: 80,  step: 5,   default: 80,  format: v => `${v} ms` },
    ],
  },
  {
    id: 'compressor', name: 'COMPRESSOR', type: 'dynamics', color: '#888888',
    enabled: true, hasReduction: true,
    params: [
      { id: 'threshold', label: 'Threshold', min: -60, max: 0,    value: -24, step: 1,   default: -24, format: v => `${v} dB` },
      { id: 'ratio',     label: 'Ratio',     min: 1,   max: 20,   value: 4,   step: 0.5, default: 4,   format: v => `${v}:1` },
      { id: 'attack',    label: 'Attack',    min: 0,   max: 200,  value: 10,  step: 1,   default: 10,  format: v => `${v} ms` },
      { id: 'release',   label: 'Release',   min: 10,  max: 1000, value: 150, step: 10,  default: 150, format: v => `${v} ms` },
    ],
  },
  {
    id: 'distortion', name: 'OVERDRIVE', type: 'drive', color: '#e03050',
    enabled: true,
    params: [
      { id: 'drive', label: 'Drive', min: 0,   max: 400,  value: 80,   step: 5,    default: 80,   format: v => `${v}` },
      { id: 'tone',  label: 'Tone',  min: 500, max: 8000, value: 3000, step: 100,  default: 3000, format: v => `${(v/1000).toFixed(1)}k` },
      { id: 'level', label: 'Level', min: 0,   max: 2,    value: 1,    step: 0.05, default: 1,    format: v => `${Math.round(v*100)}%` },
    ],
  },
  {
    id: 'eq', name: '3-BAND EQ', type: 'eq', color: '#cc9900',
    enabled: true,
    params: [
      { id: 'bass',   label: 'Bass',   min: -12, max: 12, value: 0, step: 0.5, default: 0, format: v => `${v >= 0 ? '+' : ''}${v}` },
      { id: 'mid',    label: 'Mid',    min: -12, max: 12, value: 0, step: 0.5, default: 0, format: v => `${v >= 0 ? '+' : ''}${v}` },
      { id: 'treble', label: 'Treble', min: -12, max: 12, value: 0, step: 0.5, default: 0, format: v => `${v >= 0 ? '+' : ''}${v}` },
    ],
  },
  {
    id: 'chorus', name: 'CHORUS', type: 'mod', color: '#2266dd',
    enabled: false,
    params: [
      { id: 'rate',     label: 'Rate',     min: 0.1, max: 8,   value: 0.8, step: 0.1,  default: 0.8, format: v => `${v.toFixed(1)}Hz` },
      { id: 'depth',    label: 'Depth',    min: 0,   max: 20,  value: 5,   step: 0.5,  default: 5,   format: v => `${v}ms` },
      { id: 'mix',      label: 'Mix',      min: 0,   max: 1,   value: 0.4, step: 0.01, default: 0.4, format: v => `${Math.round(v*100)}%` },
      { id: 'feedback', label: 'Feedback', min: 0,   max: 0.9, value: 0,   step: 0.01, default: 0,   format: v => `${Math.round(v*100)}%` },
    ],
  },
  {
    id: 'reverb', name: 'REVERB', type: 'time', color: '#8833cc',
    enabled: false,
    params: [
      { id: 'duration', label: 'Size',     min: 0.2, max: 5,   value: 1.5, step: 0.1,  default: 1.5, format: v => `${v.toFixed(1)}s` },
      { id: 'decay',    label: 'Decay',    min: 1,   max: 6,   value: 3,   step: 0.1,  default: 3,   format: v => `${v.toFixed(1)}` },
      { id: 'preDelay', label: 'Pre-Dly',  min: 0,   max: 100, value: 10,  step: 1,    default: 10,  format: v => `${v}ms` },
      { id: 'mix',      label: 'Mix',      min: 0,   max: 1,   value: 0.3, step: 0.01, default: 0.3, format: v => `${Math.round(v*100)}%` },
    ],
  },
  {
    id: 'delay', name: 'DELAY', type: 'time', color: '#8833cc',
    enabled: false, hasTapTempo: true,
    params: [
      { id: 'time',     label: 'Time',     min: 0.01, max: 2,    value: 0.375, step: 0.005, default: 0.375, format: v => `${Math.round(v*1000)}ms` },
      { id: 'feedback', label: 'Feedback', min: 0,    max: 0.95, value: 0.35,  step: 0.01,  default: 0.35,  format: v => `${Math.round(v*100)}%` },
      { id: 'mix',      label: 'Mix',      min: 0,    max: 1,    value: 0.3,   step: 0.01,  default: 0.3,   format: v => `${Math.round(v*100)}%` },
    ],
  },
];

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [pedals, setPedals]                   = useState(INITIAL_PEDALS);
  const [selectedDevice, setSelectedDevice]   = useState('');
  const [selectedOutput, setSelectedOutput]   = useState('');
  const [masterVolume, setMasterVolumeState]  = useState(1.0);

  const engine = useAudioEngine();

  // DOM refs for 60fps metrics (bypasses React re-renders)
  const vuLeftRef       = useRef(null);
  const vuRightRef      = useRef(null);
  const compReducRef    = useRef(null);
  const latencyRef      = useRef(null);

  // Register metrics callback → direct DOM updates at 60fps
  useEffect(() => {
    engine.setMetricsCallback(({ vuLeft, vuRight, compReduction, latencyMs }) => {
      if (vuLeftRef.current)    vuLeftRef.current.style.setProperty('--vu', `${(vuLeft * 100).toFixed(1)}%`);
      if (vuRightRef.current)   vuRightRef.current.style.setProperty('--vu', `${(vuRight * 100).toFixed(1)}%`);
      if (compReducRef.current) compReducRef.current.style.width = `${(compReduction * 100).toFixed(1)}%`;
      if (latencyRef.current)   latencyRef.current.textContent  = `${latencyMs.toFixed(1)} ms`;
    });
  }, [engine.setMetricsCallback]);

  // Load device list on mount (labels empty until permission granted)
  useEffect(() => { engine.initDevices(); }, []);

  const handleStart = useCallback(async () => {
    await engine.start(selectedDevice, selectedOutput, pedals);
  }, [engine.start, selectedDevice, selectedOutput, pedals]);

  const handleStop = useCallback(() => {
    engine.stop();
  }, [engine.stop]);

  const handleDeviceChange = useCallback((deviceId) => {
    setSelectedDevice(deviceId);
    if (engine.running) {
      engine.stop();
      setTimeout(() => engine.start(deviceId, selectedOutput, pedals), 200);
    }
  }, [engine, selectedOutput, pedals]);

  const handleOutputChange = useCallback((deviceId) => {
    setSelectedOutput(deviceId);
    engine.setOutputDevice(deviceId);
  }, [engine.setOutputDevice]);

  const handleToggle = useCallback((pedalId, enabled) => {
    setPedals(prev => prev.map(p => p.id === pedalId ? { ...p, enabled } : p));
    engine.setEffectEnabled(pedalId, enabled);
  }, [engine.setEffectEnabled]);

  const handleParamChange = useCallback((pedalId, paramId, value) => {
    setPedals(prev => prev.map(p =>
      p.id === pedalId
        ? { ...p, params: p.params.map(param => param.id === paramId ? { ...param, value } : param) }
        : p
    ));
    engine.setEffectParam(pedalId, paramId, value);
  }, [engine.setEffectParam]);

  const handleMasterVolume = useCallback((val) => {
    setMasterVolumeState(val);
    engine.setMasterVolume(val);
  }, [engine.setMasterVolume]);

  const handleTapTempo = useCallback((sec) => {
    const actual = engine.setDelayTime(sec);
    // Update delay time param in state
    setPedals(prev => prev.map(p =>
      p.id === 'delay'
        ? { ...p, params: p.params.map(param => param.id === 'time' ? { ...param, value: actual ?? sec } : param) }
        : p
    ));
  }, [engine.setDelayTime]);

  return (
    <div className="app">
      <Header
        running={engine.running}
        devices={engine.devices}
        outputDevices={engine.outputDevices}
        selectedDevice={selectedDevice}
        selectedOutput={selectedOutput}
        onDeviceChange={handleDeviceChange}
        onOutputChange={handleOutputChange}
        audioInfo={engine.audioInfo}
        latencyRef={latencyRef}
        masterVolume={masterVolume}
        onMasterVolume={handleMasterVolume}
        vuLeftRef={vuLeftRef}
        vuRightRef={vuRightRef}
        onStop={handleStop}
      />

      <Pedalboard
        pedals={pedals}
        onToggle={handleToggle}
        onParamChange={handleParamChange}
        onTapTempo={handleTapTempo}
        compReductionRef={compReducRef}
      />

      {!engine.running && (
        <Overlay
          devices={engine.devices}
          outputDevices={engine.outputDevices}
          selectedDevice={selectedDevice}
          selectedOutput={selectedOutput}
          onDeviceChange={setSelectedDevice}
          onOutputChange={setSelectedOutput}
          onStart={handleStart}
          error={engine.error}
        />
      )}
    </div>
  );
}
