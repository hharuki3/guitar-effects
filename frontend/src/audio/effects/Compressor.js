export class Compressor {
  constructor(ctx) {
    this.ctx = ctx;
    this.inputNode  = ctx.createGain();
    this.outputNode = ctx.createGain();
    this._enabled   = true;

    this._comp = ctx.createDynamicsCompressor();
    this._comp.threshold.value = -24;
    this._comp.knee.value      = 30;
    this._comp.ratio.value     = 4;
    this._comp.attack.value    = 0.010;
    this._comp.release.value   = 0.150;

    this._bypass = ctx.createGain();
    this._reconnect();
  }

  _reconnect() {
    this.inputNode.disconnect();
    if (this._enabled) {
      this.inputNode.connect(this._comp);
      this._comp.connect(this.outputNode);
    } else {
      this.inputNode.connect(this._bypass);
      this._bypass.connect(this.outputNode);
    }
  }

  set enabled(v) { this._enabled = v; this._reconnect(); }
  get enabled()  { return this._enabled; }

  setParam(name, val) {
    const t = this.ctx.currentTime;
    if (name === 'threshold') this._comp.threshold.setValueAtTime(val, t);
    if (name === 'ratio')     this._comp.ratio.setValueAtTime(val, t);
    if (name === 'attack')    this._comp.attack.setValueAtTime(val / 1000, t);
    if (name === 'release')   this._comp.release.setValueAtTime(val / 1000, t);
  }

  get reduction() { return Math.min(1, Math.abs(this._comp.reduction) / 30); }
}
