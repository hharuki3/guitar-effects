export class Reverb {
  constructor(ctx) {
    this.ctx = ctx;
    this.inputNode  = ctx.createGain();
    this.outputNode = ctx.createGain();
    this._enabled   = true;

    this._conv  = ctx.createConvolver();
    this._wet   = ctx.createGain();
    this._dry   = ctx.createGain();
    this._bypass = ctx.createGain();

    this._p = { duration: 1.5, decay: 3.0, preDelay: 0.01, mix: 0.3 };
    this._wet.gain.value = 0.3;
    this._dry.gain.value = 0.7;
    this._conv.buffer = this._genIR();
    this._timer = null;

    this._reconnect();
  }

  _genIR() {
    const { duration, decay, preDelay } = this._p;
    const sr  = this.ctx.sampleRate;
    const pre = Math.floor(preDelay * sr);
    const len = Math.floor(duration * sr) + pre;
    const buf = this.ctx.createBuffer(2, len, sr);
    const earlyEnd = Math.floor(0.08 * sr) + pre;

    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = pre; i < Math.min(earlyEnd, len); i++)
        d[i] = Math.random() < 0.025 ? (Math.random() * 2 - 1) * 0.8 : 0;
      for (let i = earlyEnd; i < len; i++) {
        const t = (i - pre) / sr;
        d[i] = (Math.random() * 2 - 1) * Math.pow(10, -decay * t / duration);
      }
    }
    return buf;
  }

  _scheduleRegen() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => { this._conv.buffer = this._genIR(); }, 400);
  }

  _reconnect() {
    this.inputNode.disconnect();
    if (this._enabled) {
      this.inputNode.connect(this._dry);
      this.inputNode.connect(this._conv);
      this._conv.connect(this._wet);
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
    if (name === 'mix') {
      this._p.mix = val;
      this._wet.gain.setValueAtTime(val, this.ctx.currentTime);
      this._dry.gain.setValueAtTime(1 - val, this.ctx.currentTime);
    } else {
      this._p[name] = name === 'preDelay' ? val / 1000 : val;
      this._scheduleRegen();
    }
  }
}
