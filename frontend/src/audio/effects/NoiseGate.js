export class NoiseGate {
  constructor(ctx) {
    this.ctx = ctx;
    this.inputNode  = ctx.createGain();
    this.outputNode = ctx.createGain();
    this._enabled   = true;

    this._analyser         = ctx.createAnalyser();
    this._analyser.fftSize = 256;
    this._timeBuf          = new Float32Array(this._analyser.fftSize);
    this._gate             = ctx.createGain();
    this._gate.gain.value  = 1;

    this._threshold = -50;
    this._attackMs  = 5;
    this._releaseMs = 80;
    this._open      = true;

    this.inputNode.connect(this._analyser);
    this._analyser.connect(this._gate);
    this._gate.connect(this.outputNode);
  }

  set enabled(v) {
    this._enabled = v;
    if (!v) this._gate.gain.setTargetAtTime(1, this.ctx.currentTime, 0.005);
  }
  get enabled() { return this._enabled; }

  setParam(name, val) {
    if (name === 'threshold') this._threshold = val;
    if (name === 'attack')    this._attackMs  = val;
    if (name === 'release')   this._releaseMs = val;
  }

  tick() {
    if (!this._enabled) return;
    this._analyser.getFloatTimeDomainData(this._timeBuf);
    let sum = 0;
    for (let i = 0; i < this._timeBuf.length; i++) sum += this._timeBuf[i] ** 2;
    const dB = 20 * Math.log10(Math.sqrt(sum / this._timeBuf.length) || 1e-9);
    const shouldOpen = dB > this._threshold;
    if (shouldOpen !== this._open) {
      this._open = shouldOpen;
      const tc = (this._open ? this._attackMs : this._releaseMs) / 1000 / 3;
      this._gate.gain.setTargetAtTime(this._open ? 1 : 0, this.ctx.currentTime, tc);
    }
  }
}
