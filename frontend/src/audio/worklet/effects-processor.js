class ChorusProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'rate',        defaultValue: 0.8,   minValue: 0.01, maxValue: 10 },
      { name: 'depth',       defaultValue: 0.005, minValue: 0,    maxValue: 0.02 },
      { name: 'mix',         defaultValue: 0.4,   minValue: 0,    maxValue: 1 },
      { name: 'feedback',    defaultValue: 0.0,   minValue: 0,    maxValue: 0.95 },
      { name: 'flangerMode', defaultValue: 0,     minValue: 0,    maxValue: 1 },
    ];
  }

  constructor() {
    super();
    this._phase = 0;
    this._buf = null;
    this._wp = 0;
  }

  process(inputs, outputs, parameters) {
    const inp = inputs[0]?.[0];
    const out = outputs[0]?.[0];
    if (!inp || !out) return true;

    const sr = sampleRate;
    if (!this._buf) this._buf = new Float32Array(sr);

    const rateArr  = parameters.rate;
    const depth    = parameters.depth[0];
    const mix      = parameters.mix[0];
    const feedback = parameters.feedback[0];
    const flanger  = parameters.flangerMode[0] > 0.5;
    const base     = (flanger ? 0.005 : 0.020) * sr;

    for (let i = 0; i < inp.length; i++) {
      const lfo = Math.sin(2 * Math.PI * this._phase);
      this._phase += (rateArr.length > 1 ? rateArr[i] : rateArr[0]) / sr;
      if (this._phase >= 1) this._phase -= 1;

      const delay = base + lfo * depth * sr;
      const rp    = (this._wp - delay + sr * 2) % sr;
      const rf    = Math.floor(rp);
      const frac  = rp - rf;
      const delayed = this._buf[rf % sr] + frac * (this._buf[(rf + 1) % sr] - this._buf[rf % sr]);

      this._buf[this._wp] = inp[i] + delayed * feedback;
      this._wp = (this._wp + 1) % sr;
      out[i] = inp[i] * (1 - mix) + delayed * mix;
    }
    return true;
  }
}

registerProcessor('chorus-processor', ChorusProcessor);
