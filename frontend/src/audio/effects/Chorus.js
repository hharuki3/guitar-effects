export class Chorus {
  constructor(ctx) {
    this.ctx = ctx;
    this.inputNode  = ctx.createGain();
    this.outputNode = ctx.createGain();
    this._enabled   = true;
    this._node      = null;
    this._bypass    = ctx.createGain();
    this._pending   = { rate: 0.8, depth: 5, mix: 0.4, feedback: 0 };
  }

  init() {
    this._node = new AudioWorkletNode(this.ctx, 'chorus-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    for (const [k, v] of Object.entries(this._pending)) this._applyParam(k, v);
    this._reconnect();
  }

  _applyParam(name, val) {
    if (!this._node) return;
    const key = name === 'depth' ? 'depth' : name;
    const p = this._node.parameters.get(key);
    if (!p) return;
    p.setValueAtTime(name === 'depth' ? val / 1000 : val, this.ctx.currentTime);
  }

  _reconnect() {
    this.inputNode.disconnect();
    if (this._enabled && this._node) {
      this.inputNode.connect(this._node);
      this._node.connect(this.outputNode);
    } else {
      this.inputNode.connect(this._bypass);
      this._bypass.connect(this.outputNode);
    }
  }

  set enabled(v) { this._enabled = v; this._reconnect(); }
  get enabled()  { return this._enabled; }

  setParam(name, val) {
    this._pending[name] = val;
    this._applyParam(name, val);
  }
}
