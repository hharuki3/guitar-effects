export class ThreeBandEQ {
  constructor(ctx) {
    this.ctx = ctx;
    this.inputNode  = ctx.createGain();
    this.outputNode = ctx.createGain();
    this._enabled   = true;

    this._bass            = ctx.createBiquadFilter();
    this._bass.type       = 'lowshelf';
    this._bass.frequency.value = 250;

    this._mid             = ctx.createBiquadFilter();
    this._mid.type        = 'peaking';
    this._mid.frequency.value = 1000;
    this._mid.Q.value     = 1.0;

    this._treble          = ctx.createBiquadFilter();
    this._treble.type     = 'highshelf';
    this._treble.frequency.value = 4000;

    this._bypass = ctx.createGain();
    this._reconnect();
  }

  _reconnect() {
    this.inputNode.disconnect();
    if (this._enabled) {
      this.inputNode.connect(this._bass);
      this._bass.connect(this._mid);
      this._mid.connect(this._treble);
      this._treble.connect(this.outputNode);
    } else {
      this.inputNode.connect(this._bypass);
      this._bypass.connect(this.outputNode);
    }
  }

  set enabled(v) { this._enabled = v; this._reconnect(); }
  get enabled()  { return this._enabled; }

  setParam(name, val) {
    const t = this.ctx.currentTime;
    if (name === 'bass')   this._bass.gain.setValueAtTime(val, t);
    if (name === 'mid')    this._mid.gain.setValueAtTime(val, t);
    if (name === 'treble') this._treble.gain.setValueAtTime(val, t);
  }
}
