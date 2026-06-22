export class Delay {
  constructor(ctx) {
    this.ctx = ctx;
    this.inputNode  = ctx.createGain();
    this.outputNode = ctx.createGain();
    this._enabled   = true;

    this._delay    = ctx.createDelay(2.0);
    this._feedback = ctx.createGain();
    this._wet      = ctx.createGain();
    this._dry      = ctx.createGain();
    this._limiter  = ctx.createDynamicsCompressor();
    this._bypass   = ctx.createGain();

    this._delay.delayTime.value = 0.375;
    this._feedback.gain.value   = 0.35;
    this._wet.gain.value        = 0.3;
    this._dry.gain.value        = 1.0;
    this._limiter.threshold.value = -1;
    this._limiter.ratio.value     = 20;
    this._limiter.attack.value    = 0.001;
    this._limiter.release.value   = 0.01;

    this._reconnect();
  }

  _reconnect() {
    this.inputNode.disconnect();
    if (this._enabled) {
      this.inputNode.connect(this._dry);
      this.inputNode.connect(this._delay);
      this._delay.connect(this._limiter);
      this._limiter.connect(this._feedback);
      this._feedback.connect(this._delay);
      this._limiter.connect(this._wet);
      this._dry.connect(this.outputNode);
      this._wet.connect(this.outputNode);
    } else {
      this.inputNode.connect(this._bypass);
      this._bypass.connect(this.outputNode);
    }
  }

  set enabled(v) { this._enabled = v; this._reconnect(); }
  get enabled()  { return this._enabled; }

  setParam(name, val) {
    const t = this.ctx.currentTime;
    if (name === 'time')     this._delay.delayTime.setValueAtTime(val, t);
    if (name === 'feedback') this._feedback.gain.setValueAtTime(Math.min(0.95, val), t);
    if (name === 'mix') {
      this._wet.gain.setValueAtTime(val, t);
      this._dry.gain.setValueAtTime(1 - val * 0.5, t);
    }
  }

  setDelayFromTap(sec) {
    const v = Math.max(0.01, Math.min(2.0, sec));
    this._delay.delayTime.setValueAtTime(v, this.ctx.currentTime);
    return v;
  }
}
