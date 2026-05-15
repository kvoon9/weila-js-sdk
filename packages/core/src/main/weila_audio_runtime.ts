const PATCH_MARK = '__weilaAudioRuntimePatched__'

export interface WL_AudioRuntimePatchOptions {
  playerWorkletUrl?: string
  recorderWorkletUrl?: string
}

interface WL_PatchedWindow extends Window {
  [PATCH_MARK]?: boolean
}

function patchAudioWorkletAddModule(options: Required<WL_AudioRuntimePatchOptions>): void {
  if (typeof AudioWorklet === 'undefined' || !AudioWorklet.prototype?.addModule)
    return

  const originalAddModule = AudioWorklet.prototype.addModule
  const workletRedirects = [options.playerWorkletUrl, options.recorderWorkletUrl]
  const workletMap: Record<string, string> = {
    'weila_player.worklet.js': options.playerWorkletUrl,
    'weila_recorder.worklet.js': options.recorderWorkletUrl,
  }
  let workletCallIndex = 0

  AudioWorklet.prototype.addModule = async function (moduleURL: string | URL, ...args: [WorkletOptions?]) {
    const url = String(moduleURL)

    if (url.startsWith('blob:') && workletCallIndex < workletRedirects.length) {
      return originalAddModule.call(this, workletRedirects[workletCallIndex++], ...args)
    }

    const fileName = url.split('/').pop()
    const redirectTarget = fileName ? workletMap[fileName] : undefined
    if (redirectTarget)
      return originalAddModule.call(this, redirectTarget, ...args)

    return originalAddModule.call(this, moduleURL, ...args)
  }
}

function patchAudioWorkletNodePortStart(): void {
  if (typeof window === 'undefined' || typeof window.AudioWorkletNode === 'undefined')
    return

  const OriginalAudioWorkletNode = window.AudioWorkletNode

  window.AudioWorkletNode = (function AudioWorkletNode(
    context: BaseAudioContext,
    name: string,
    options?: AudioWorkletNodeOptions,
  ) {
    const node = new OriginalAudioWorkletNode(context, name, options)
    node.port.start()
    return node
  } as unknown) as typeof AudioWorkletNode

  window.AudioWorkletNode.prototype = OriginalAudioWorkletNode.prototype
}

export function installWeilaAudioRuntimePatch(options: WL_AudioRuntimePatchOptions = {}): void {
  if (typeof window === 'undefined')
    return

  const patchedWindow = window as WL_PatchedWindow
  if (patchedWindow[PATCH_MARK])
    return

  patchedWindow[PATCH_MARK] = true
  patchAudioWorkletAddModule({
    playerWorkletUrl: options.playerWorkletUrl ?? '/weila_player.worklet.iife.js',
    recorderWorkletUrl: options.recorderWorkletUrl ?? '/weila_recorder.worklet.iife.js',
  })
  patchAudioWorkletNodePortStart()
}
