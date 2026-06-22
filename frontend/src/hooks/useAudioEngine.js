import { useState, useRef, useCallback } from 'react';
import { NoiseGate }   from '../audio/effects/NoiseGate';
import { Compressor }  from '../audio/effects/Compressor';
import { Distortion }  from '../audio/effects/Distortion';
import { ThreeBandEQ } from '../audio/effects/EQ';
import { Chorus }      from '../audio/effects/Chorus';
import { Reverb }      from '../audio/effects/Reverb';
import { Delay }       from '../audio/effects/Delay';
import workletUrl      from '../audio/worklet/effects-processor.js?url';

function rmsToFraction(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.min(1, Math.sqrt(s / buf.length) * 8);
}

export function useAudioEngine() {
  const [running,       setRunning]      = useState(false);
  const [devices,       setDevices]      = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);
  const [error,         setError]        = useState(null);
  const [audioInfo,     setAudioInfo]    = useState(null);

  const ctxRef       = useRef(null);
  const streamRef    = useRef(null);
  const fxRef        = useRef({});
  const masterRef    = useRef(null);
  const rafRef       = useRef(null);
  const analyserLRef = useRef(null);
  const analyserRRef = useRef(null);
  const metricsRef   = useRef(null);

  const setMetricsCallback = useCallback(cb => { metricsRef.current = cb; }, []);

  const _populateDevices = useCallback(async () => {
    const all     = await navigator.mediaDevices.enumerateDevices();
    const inputs  = all.filter(d => d.kind === 'audioinput');
    const outputs = all.filter(d => d.kind === 'audiooutput');
    setDevices(inputs);
    setOutputDevices(outputs);
    return inputs;
  }, []);

  // outputDeviceId が指定されていれば AudioContext の出力先を変更
  const _applySinkId = useCallback(async (ctx, outputDeviceId) => {
    if (!outputDeviceId) return;
    try {
      if (typeof ctx.setSinkId === 'function') {
        await ctx.setSinkId(outputDeviceId);
      }
    } catch (e) {
      console.warn('setSinkId failed:', e.message);
    }
  }, []);

  const start = useCallback(async (deviceId, outputDeviceId, pedalStates) => {
    setError(null);

    // Step 1: 権限取得（ラベル表示のため）
    let permStream;
    try {
      permStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      setError('マイクへのアクセスを許可してください: ' + e.message);
      return false;
    }
    await _populateDevices();
    permStream.getTracks().forEach(t => t.stop());

    // Step 2: ギター向け制約でデバイスを開く
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId:         deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false,  // ギターに必須
          noiseSuppression: false,  // ギターに必須
          autoGainControl:  false,  // ギターに必須（サステイン保護）
          channelCount:     { ideal: 1 },
        },
      });
    } catch (e) {
      setError('デバイス接続エラー: ' + e.message);
      return false;
    }

    streamRef.current = stream;
    const track = stream.getAudioTracks()[0];
    const sr    = track.getSettings().sampleRate;

    // Step 3: AudioContext 作成 → 出力デバイス設定
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    await ctx.resume();
    await _applySinkId(ctx, outputDeviceId);
    ctxRef.current = ctx;
    setAudioInfo({ sampleRate: sr || ctx.sampleRate });

    // Step 4: AudioWorklet ロード
    try {
      await ctx.audioWorklet.addModule(workletUrl);
    } catch (e) {
      setError('AudioWorklet ロード失敗: ' + e.message);
      return false;
    }

    // Step 5: エフェクトを生成
    const fx = {
      noiseGate:  new NoiseGate(ctx),
      compressor: new Compressor(ctx),
      distortion: new Distortion(ctx),
      eq:         new ThreeBandEQ(ctx),
      chorus:     new Chorus(ctx),
      reverb:     new Reverb(ctx),
      delay:      new Delay(ctx),
    };
    fx.chorus.init();
    fxRef.current = fx;

    // Step 6: React state の初期値をエフェクトに反映
    if (pedalStates) {
      for (const p of pedalStates) {
        const f = fx[p.id];
        if (!f) continue;
        f.enabled = p.enabled;
        for (const param of p.params) f.setParam(param.id, param.value);
      }
    }

    // Step 7: オーディオグラフ配線
    const master = ctx.createGain();
    master.gain.value = 1.0;
    masterRef.current = master;

    const splitter = ctx.createChannelSplitter(2);
    const aL = ctx.createAnalyser(); aL.fftSize = 256;
    const aR = ctx.createAnalyser(); aR.fftSize = 256;
    analyserLRef.current = aL;
    analyserRRef.current = aR;

    const chain = [fx.noiseGate, fx.compressor, fx.distortion, fx.eq, fx.chorus, fx.reverb, fx.delay];
    const source = ctx.createMediaStreamSource(stream);
    let node = source;
    for (const effect of chain) { node.connect(effect.inputNode); node = effect.outputNode; }
    node.connect(master);
    master.connect(splitter);
    splitter.connect(aL, 0);
    splitter.connect(aR, 1);
    master.connect(ctx.destination);

    // Step 8: RAF ループ（60fps メトリクス更新）
    const lBuf = new Float32Array(256);
    const rBuf = new Float32Array(256);
    const loop = () => {
      fx.noiseGate.tick();
      aL.getFloatTimeDomainData(lBuf);
      aR.getFloatTimeDomainData(rBuf);
      if (metricsRef.current) {
        metricsRef.current({
          vuLeft:        rmsToFraction(lBuf),
          vuRight:       rmsToFraction(rBuf),
          compReduction: fx.compressor.reduction,
          latencyMs:     (ctx.baseLatency + (ctx.outputLatency || 0)) * 1000,
        });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    setRunning(true);
    return true;
  }, [_populateDevices, _applySinkId]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    ctxRef.current?.close();
    ctxRef.current = null;
    streamRef.current = null;
    fxRef.current = {};
    masterRef.current = null;
    setRunning(false);
    setAudioInfo(null);
  }, []);

  const setEffectEnabled = useCallback((id, enabled) => {
    const f = fxRef.current[id];
    if (f) f.enabled = enabled;
  }, []);

  const setEffectParam = useCallback((id, paramId, value) => {
    const f = fxRef.current[id];
    if (f) f.setParam(paramId, value);
  }, []);

  const setMasterVolume = useCallback((value) => {
    if (masterRef.current && ctxRef.current)
      masterRef.current.gain.setValueAtTime(value, ctxRef.current.currentTime);
  }, []);

  const setDelayTime = useCallback((sec) => {
    const f = fxRef.current.delay;
    if (f) return f.setDelayFromTap(sec);
    return sec;
  }, []);

  // 実行中でも出力デバイスをホットスイッチ
  const setOutputDevice = useCallback(async (outputDeviceId) => {
    if (!ctxRef.current) return;
    await _applySinkId(ctxRef.current, outputDeviceId);
  }, [_applySinkId]);

  const initDevices = useCallback(() => _populateDevices(), [_populateDevices]);

  return {
    running, devices, outputDevices, error, audioInfo,
    start, stop,
    setEffectEnabled, setEffectParam, setMasterVolume, setDelayTime,
    setOutputDevice, setMetricsCallback, initDevices,
  };
}
