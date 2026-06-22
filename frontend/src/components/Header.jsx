export default function Header({
  running, devices, outputDevices,
  selectedDevice, selectedOutput,
  onDeviceChange, onOutputChange,
  audioInfo, latencyRef,
  masterVolume, onMasterVolume,
  vuLeftRef, vuRightRef, onStop,
}) {
  return (
    <header className="header">
      <div className="header__brand">🎸 Guitar Effects</div>

      <div className="header__center">
        <div className="header__device-group">
          <span className="header__device-icon">🎤</span>
          <select
            className="header__select"
            value={selectedDevice}
            onChange={e => onDeviceChange(e.target.value)}
            disabled={!running}
            title="入力デバイス"
          >
            <option value="">-- Input --</option>
            {devices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Input (${d.deviceId.slice(0, 8)})`}
              </option>
            ))}
          </select>
        </div>

        <div className="header__device-group">
          <span className="header__device-icon">🔊</span>
          <select
            className="header__select"
            value={selectedOutput}
            onChange={e => onOutputChange(e.target.value)}
            title="出力デバイス"
          >
            <option value="">-- Output (system) --</option>
            {(outputDevices || []).map(d => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Output (${d.deviceId.slice(0, 8)})`}
              </option>
            ))}
          </select>
        </div>

        {audioInfo && (
          <span className="header__chip">{audioInfo.sampleRate.toLocaleString()} Hz</span>
        )}
        {running && (
          <span className="header__chip" ref={latencyRef}>-- ms</span>
        )}
      </div>

      <div className="header__right">
        {running && (
          <>
            <div className="vu-meter">
              <div className="vu-meter__bar" ref={vuLeftRef} />
              <div className="vu-meter__bar" ref={vuRightRef} />
            </div>
            <label className="header__vol-label">
              VOL
              <input
                type="range" className="header__vol-knob"
                min="0" max="2" step="0.01" value={masterVolume}
                onChange={e => onMasterVolume(parseFloat(e.target.value))}
              />
              <span>{Math.round(masterVolume * 100)}%</span>
            </label>
            <button className="btn btn--stop" onClick={onStop}>■ STOP</button>
          </>
        )}
        {!running && (
          <span className="header__stopped">停止中</span>
        )}
      </div>
    </header>
  );
}
