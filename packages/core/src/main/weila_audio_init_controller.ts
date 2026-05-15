export interface WL_AudioInitializable {
  weila_audioInit(): Promise<boolean>
}

export interface WL_AudioInitControllerOptions {
  getCore: () => WL_AudioInitializable | null | undefined
  setInitialized?: (initialized: boolean) => void
  onDeferredInitError?: (error: unknown) => void
  onInitialInitError?: (error: unknown) => void
  targetWindow?: Window
  gestureEvents?: Array<keyof WindowEventMap>
}

export interface WL_AudioInitController {
  ensureInitialized(): Promise<boolean>
  initializeWithUserGestureRetry(): void
  reset(): void
  isInitialized(): boolean
}

const DEFAULT_GESTURE_EVENTS: Array<keyof WindowEventMap> = [
  'pointerdown',
  'keydown',
  'touchstart',
]

export function createWeilaAudioInitController(
  options: WL_AudioInitControllerOptions,
): WL_AudioInitController {
  let initialized = false
  let initPromise: Promise<boolean> | null = null
  let listenerArmed = false

  const gestureEvents = options.gestureEvents ?? DEFAULT_GESTURE_EVENTS

  function getTargetWindow(): Window | undefined {
    if (options.targetWindow)
      return options.targetWindow
    if (typeof window === 'undefined')
      return undefined
    return window
  }

  function setInitialized(initializedValue: boolean): void {
    initialized = initializedValue
    options.setInitialized?.(initializedValue)
  }

  function disarmInitListener(): void {
    const targetWindow = getTargetWindow()
    if (!listenerArmed || !targetWindow)
      return

    listenerArmed = false
    for (const eventName of gestureEvents)
      targetWindow.removeEventListener(eventName, handleDeferredAudioInit)
  }

  async function ensureInitialized(): Promise<boolean> {
    const core = options.getCore()
    if (!core)
      return false
    if (initialized)
      return true
    if (initPromise)
      return initPromise

    initPromise = core
      .weila_audioInit()
      .then((result) => {
        setInitialized(Boolean(result))
        if (initialized)
          disarmInitListener()
        return result
      })
      .catch((error) => {
        setInitialized(false)
        throw error
      })
      .finally(() => {
        initPromise = null
      })

    return initPromise
  }

  function armInitListener(): void {
    const targetWindow = getTargetWindow()
    if (initialized || listenerArmed || !targetWindow)
      return

    listenerArmed = true
    for (const eventName of gestureEvents)
      targetWindow.addEventListener(eventName, handleDeferredAudioInit, { once: true })
  }

  function handleDeferredAudioInit(): void {
    void ensureInitialized().catch((error) => {
      options.onDeferredInitError?.(error)
      armInitListener()
    })
  }

  function initializeWithUserGestureRetry(): void {
    void ensureInitialized().catch((error) => {
      options.onInitialInitError?.(error)
      armInitListener()
    })
  }

  function reset(): void {
    disarmInitListener()
    setInitialized(false)
    initPromise = null
  }

  return {
    ensureInitialized,
    initializeWithUserGestureRetry,
    reset,
    isInitialized: () => initialized,
  }
}
