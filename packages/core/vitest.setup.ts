// jsdom lacks the worklet-scope globals the audio module evaluates against
// at import time. Shimming them here lets specs load the genuine module
// graph that reaches the audio worklets.
Object.assign(globalThis, {
  AudioWorkletProcessor: class {
    port: MessagePort | null = null
  },
  registerProcessor: () => {},
})
