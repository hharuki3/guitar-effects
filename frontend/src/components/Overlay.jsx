export default function Overlay({
  devices, outputDevices,
  selectedDevice, selectedOutput,
  onDeviceChange, onOutputChange,
  onStart, error,
}) {
  return (
    <div className="overlay">
      <div className="overlay__card">
        <div className="overlay__icon">🎸</div>
        <h1 className="overlay__title">Guitar Effects</h1>

        {error && <p className="overlay__error">⚠ {error}</p>}

        <div className="overlay__devices">
          <div className="overlay__device-row">
            <label className="overlay__device-label">🎤 Input Device（入力）</label>
            <select
              className="overlay__select"
              value={selectedDevice}
              onChange={e => onDeviceChange(e.target.value)}
            >
              <option value="">-- Select Audio Input --</option>
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Audio Input (${d.deviceId.slice(0, 8) || 'default'})`}
                </option>
              ))}
            </select>
          </div>

          <div className="overlay__device-row">
            <label className="overlay__device-label">🔊 Output Device（出力）</label>
            <select
              className="overlay__select"
              value={selectedOutput}
              onChange={e => onOutputChange(e.target.value)}
            >
              <option value="">-- System Default --</option>
              {outputDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Audio Output (${d.deviceId.slice(0, 8) || 'default'})`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button className="btn btn--start" onClick={onStart}>▶ START</button>

        <div className="overlay__checklist">
          <p className="overlay__checklist-title">⚠️ 音が聞こえない場合のチェックリスト</p>
          <ol className="overlay__checklist-items">
            <li>
              <strong>UR22C の MIX ノブを DAW 側（右）に回す</strong><br />
              <span>INPUT 側だとハードウェア直通になり、エフェクトが通りません</span>
            </li>
            <li>
              <strong>出力デバイスを UR22C に設定する</strong><br />
              <span>上の「Output Device」で UR22C を選択、または macOS のサウンド設定で出力を UR22C に変更</span>
            </li>
            <li>
              <strong>Overdrive ペダルの LED（●）が緑に点灯しているか確認</strong><br />
              <span>LED が消灯しているとバイパスされます</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
