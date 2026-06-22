export class Distortion {
  constructor(ctx) {
    this.ctx = ctx;
    this.inputNode  = ctx.createGain();
    this.outputNode = ctx.createGain();
    this._enabled   = true;

    this._shaper            = ctx.createWaveShaper();
    this._shaper.oversample = '4x';
    this._shaper.curve      = makeCurve(80);

    this._tone            = ctx.createBiquadFilter();
    this._tone.type       = 'lowpass';
    this._tone.frequency.value = 3000;

    this._level           = ctx.createGain();
    this._level.gain.value = 1;
    this._bypass          = ctx.createGain();

    this._reconnect();
  }

  _reconnect() {
    this.inputNode.disconnect();
    if (this._enabled) {
      this.inputNode.connect(this._shaper);
      this._shaper.connect(this._tone);
      this._tone.connect(this._level);
      this._level.connect(this.outputNode);
    } else {
      this.inputNode.connect(this._bypass);
      this._bypass.connect(this.outputNode);
    }
  }

  set enabled(v) { this._enabled = v; this._reconnect(); }
  get enabled()  { return this._enabled; }

  setParam(name, val) {
    const t = this.ctx.currentTime;
    if (name === 'drive') this._shaper.curve = makeCurve(val);
    if (name === 'tone')  this._tone.frequency.setValueAtTime(val, t);
    if (name === 'level') this._level.gain.setValueAtTime(val, t);
  }
}

function makeCurve(amount) {
  const n = 512;
  const k = Math.max(0.001, amount);
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    c[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
  }
  return c;
}
