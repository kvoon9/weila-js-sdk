;(function () {
  //#region rolldown:runtime
  var __commonJSMin = (cb, mod) => () => (
    mod || cb((mod = { exports: {} }).exports, mod), mod.exports
  )

  //#endregion

  //#region src/audio/weila_audio_data.ts
  var WLAudioRecorderEvent = /* @__PURE__ */ (function (WLAudioRecorderEvent) {
    WLAudioRecorderEvent[(WLAudioRecorderEvent['WL_WORKLET_NODE_OPEN_REQ'] = 0)] =
      'WL_WORKLET_NODE_OPEN_REQ'
    WLAudioRecorderEvent[(WLAudioRecorderEvent['WL_WORKLET_NODE_OPEN_RSP'] = 1)] =
      'WL_WORKLET_NODE_OPEN_RSP'
    WLAudioRecorderEvent[(WLAudioRecorderEvent['WL_WORKLET_NODE_CLOSE_REQ'] = 2)] =
      'WL_WORKLET_NODE_CLOSE_REQ'
    WLAudioRecorderEvent[(WLAudioRecorderEvent['WL_WORKLET_NODE_CLOSE_RSP'] = 3)] =
      'WL_WORKLET_NODE_CLOSE_RSP'
    WLAudioRecorderEvent[(WLAudioRecorderEvent['WL_WORKLET_NODE_START_REQ'] = 4)] =
      'WL_WORKLET_NODE_START_REQ'
    WLAudioRecorderEvent[(WLAudioRecorderEvent['WL_WORKLET_NODE_START_RSP'] = 5)] =
      'WL_WORKLET_NODE_START_RSP'
    WLAudioRecorderEvent[(WLAudioRecorderEvent['WL_WORKLET_NODE_STOP_REQ'] = 6)] =
      'WL_WORKLET_NODE_STOP_REQ'
    WLAudioRecorderEvent[(WLAudioRecorderEvent['WL_WORKLET_NODE_STOP_RSP'] = 7)] =
      'WL_WORKLET_NODE_STOP_RSP'
    WLAudioRecorderEvent[(WLAudioRecorderEvent['WL_WORKLET_NODE_DATA_IND'] = 8)] =
      'WL_WORKLET_NODE_DATA_IND'
    return WLAudioRecorderEvent
  })(WLAudioRecorderEvent || {})

  //#endregion
  //#region src/audio/weila_ringbuffer.ts
  var WeilaRingBuffer = class {
    readIndex
    writeIndex
    framesAvailable
    frameBuffer
    frameCount
    constructor(frameCount, useFloat32) {
      this.readIndex = 0
      this.writeIndex = 0
      this.framesAvailable = 0
      this.frameCount = frameCount
      if (useFloat32) this.frameBuffer = new Float32Array(this.frameCount)
      else this.frameBuffer = new Int16Array(this.frameCount)
    }
    get frameAvailable() {
      return this.framesAvailable
    }
    push(frameBuffer) {
      let sourceLen = frameBuffer.length
      if (this.framesAvailable + sourceLen > this.frameCount) {
        frameBuffer = frameBuffer.slice(0, this.frameCount - this.framesAvailable)
        sourceLen = frameBuffer.length
      }
      if (sourceLen + this.writeIndex <= this.frameCount) {
        this.frameBuffer.set(frameBuffer, this.writeIndex)
        this.writeIndex += sourceLen
      } else {
        const splitIndex = this.frameCount - this.writeIndex
        const firstPart = frameBuffer.subarray(0, splitIndex)
        const secondPart = frameBuffer.subarray(splitIndex)
        this.frameBuffer.set(firstPart, this.writeIndex)
        this.frameBuffer.set(secondPart, 0)
        this.writeIndex = secondPart.length
      }
      this.framesAvailable += sourceLen
      return sourceLen
    }
    pull(frameBuffer) {
      let bufferLen = frameBuffer.length
      if (this.framesAvailable < bufferLen) bufferLen = this.framesAvailable
      if (this.readIndex + bufferLen <= this.frameCount) {
        frameBuffer.set(this.frameBuffer.slice(this.readIndex, this.readIndex + bufferLen))
        this.readIndex += bufferLen
      } else {
        const leftLen = bufferLen + this.readIndex - this.frameCount
        frameBuffer.set(this.frameBuffer.slice(this.readIndex), 0)
        frameBuffer.set(this.frameBuffer.slice(0, leftLen), this.frameCount - this.readIndex)
        this.readIndex = leftLen
      }
      this.framesAvailable -= bufferLen
      return bufferLen
    }
    clear() {
      this.readIndex = 0
      this.writeIndex = 0
      this.framesAvailable = 0
    }
    destroy() {
      this.clear()
      this.frameBuffer = null
    }
  }

  //#endregion
  //#region src/audio/opus.js
  var opus_module = (function () {
    var _scriptDir =
      typeof document !== 'undefined' && document.currentScript
        ? document.currentScript.src
        : void 0
    return function (opus_module) {
      opus_module = opus_module || {}
      var Module = typeof opus_module !== 'undefined' ? opus_module : {}
      var readyPromiseResolve, readyPromiseReject
      Module['ready'] = new Promise(function (resolve, reject) {
        readyPromiseResolve = resolve
        readyPromiseReject = reject
      })
      if (!Object.getOwnPropertyDescriptor(Module['ready'], '_main')) {
        Object.defineProperty(Module['ready'], '_main', {
          configurable: true,
          get: function () {
            abort(
              'You are getting _main on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], '_main', {
          configurable: true,
          set: function () {
            abort(
              'You are setting _main on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      if (!Object.getOwnPropertyDescriptor(Module['ready'], '_Opus_initDecoder')) {
        Object.defineProperty(Module['ready'], '_Opus_initDecoder', {
          configurable: true,
          get: function () {
            abort(
              'You are getting _Opus_initDecoder on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], '_Opus_initDecoder', {
          configurable: true,
          set: function () {
            abort(
              'You are setting _Opus_initDecoder on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      if (!Object.getOwnPropertyDescriptor(Module['ready'], '_Opus_decode')) {
        Object.defineProperty(Module['ready'], '_Opus_decode', {
          configurable: true,
          get: function () {
            abort(
              'You are getting _Opus_decode on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], '_Opus_decode', {
          configurable: true,
          set: function () {
            abort(
              'You are setting _Opus_decode on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      if (!Object.getOwnPropertyDescriptor(Module['ready'], '_Opus_encode')) {
        Object.defineProperty(Module['ready'], '_Opus_encode', {
          configurable: true,
          get: function () {
            abort(
              'You are getting _Opus_encode on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], '_Opus_encode', {
          configurable: true,
          set: function () {
            abort(
              'You are setting _Opus_encode on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      if (!Object.getOwnPropertyDescriptor(Module['ready'], '_Opus_initEncoder')) {
        Object.defineProperty(Module['ready'], '_Opus_initEncoder', {
          configurable: true,
          get: function () {
            abort(
              'You are getting _Opus_initEncoder on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], '_Opus_initEncoder', {
          configurable: true,
          set: function () {
            abort(
              'You are setting _Opus_initEncoder on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      if (!Object.getOwnPropertyDescriptor(Module['ready'], '_Opus_destroyEncoder')) {
        Object.defineProperty(Module['ready'], '_Opus_destroyEncoder', {
          configurable: true,
          get: function () {
            abort(
              'You are getting _Opus_destroyEncoder on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], '_Opus_destroyEncoder', {
          configurable: true,
          set: function () {
            abort(
              'You are setting _Opus_destroyEncoder on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      if (!Object.getOwnPropertyDescriptor(Module['ready'], '_Opus_destroyDecoder')) {
        Object.defineProperty(Module['ready'], '_Opus_destroyDecoder', {
          configurable: true,
          get: function () {
            abort(
              'You are getting _Opus_destroyDecoder on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], '_Opus_destroyDecoder', {
          configurable: true,
          set: function () {
            abort(
              'You are setting _Opus_destroyDecoder on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      if (!Object.getOwnPropertyDescriptor(Module['ready'], '_malloc')) {
        Object.defineProperty(Module['ready'], '_malloc', {
          configurable: true,
          get: function () {
            abort(
              'You are getting _malloc on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], '_malloc', {
          configurable: true,
          set: function () {
            abort(
              'You are setting _malloc on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      if (!Object.getOwnPropertyDescriptor(Module['ready'], '_free')) {
        Object.defineProperty(Module['ready'], '_free', {
          configurable: true,
          get: function () {
            abort(
              'You are getting _free on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], '_free', {
          configurable: true,
          set: function () {
            abort(
              'You are setting _free on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      if (!Object.getOwnPropertyDescriptor(Module['ready'], '_say_hello')) {
        Object.defineProperty(Module['ready'], '_say_hello', {
          configurable: true,
          get: function () {
            abort(
              'You are getting _say_hello on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], '_say_hello', {
          configurable: true,
          set: function () {
            abort(
              'You are setting _say_hello on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      if (!Object.getOwnPropertyDescriptor(Module['ready'], '_emscripten_stack_get_end')) {
        Object.defineProperty(Module['ready'], '_emscripten_stack_get_end', {
          configurable: true,
          get: function () {
            abort(
              'You are getting _emscripten_stack_get_end on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], '_emscripten_stack_get_end', {
          configurable: true,
          set: function () {
            abort(
              'You are setting _emscripten_stack_get_end on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      if (!Object.getOwnPropertyDescriptor(Module['ready'], '_emscripten_stack_get_free')) {
        Object.defineProperty(Module['ready'], '_emscripten_stack_get_free', {
          configurable: true,
          get: function () {
            abort(
              'You are getting _emscripten_stack_get_free on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], '_emscripten_stack_get_free', {
          configurable: true,
          set: function () {
            abort(
              'You are setting _emscripten_stack_get_free on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      if (!Object.getOwnPropertyDescriptor(Module['ready'], '_emscripten_stack_init')) {
        Object.defineProperty(Module['ready'], '_emscripten_stack_init', {
          configurable: true,
          get: function () {
            abort(
              'You are getting _emscripten_stack_init on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], '_emscripten_stack_init', {
          configurable: true,
          set: function () {
            abort(
              'You are setting _emscripten_stack_init on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      if (!Object.getOwnPropertyDescriptor(Module['ready'], '_stackSave')) {
        Object.defineProperty(Module['ready'], '_stackSave', {
          configurable: true,
          get: function () {
            abort(
              'You are getting _stackSave on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], '_stackSave', {
          configurable: true,
          set: function () {
            abort(
              'You are setting _stackSave on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      if (!Object.getOwnPropertyDescriptor(Module['ready'], '_stackRestore')) {
        Object.defineProperty(Module['ready'], '_stackRestore', {
          configurable: true,
          get: function () {
            abort(
              'You are getting _stackRestore on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], '_stackRestore', {
          configurable: true,
          set: function () {
            abort(
              'You are setting _stackRestore on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      if (!Object.getOwnPropertyDescriptor(Module['ready'], '_stackAlloc')) {
        Object.defineProperty(Module['ready'], '_stackAlloc', {
          configurable: true,
          get: function () {
            abort(
              'You are getting _stackAlloc on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], '_stackAlloc', {
          configurable: true,
          set: function () {
            abort(
              'You are setting _stackAlloc on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      if (!Object.getOwnPropertyDescriptor(Module['ready'], '___wasm_call_ctors')) {
        Object.defineProperty(Module['ready'], '___wasm_call_ctors', {
          configurable: true,
          get: function () {
            abort(
              'You are getting ___wasm_call_ctors on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], '___wasm_call_ctors', {
          configurable: true,
          set: function () {
            abort(
              'You are setting ___wasm_call_ctors on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      if (!Object.getOwnPropertyDescriptor(Module['ready'], '_fflush')) {
        Object.defineProperty(Module['ready'], '_fflush', {
          configurable: true,
          get: function () {
            abort(
              'You are getting _fflush on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], '_fflush', {
          configurable: true,
          set: function () {
            abort(
              'You are setting _fflush on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      if (!Object.getOwnPropertyDescriptor(Module['ready'], '___errno_location')) {
        Object.defineProperty(Module['ready'], '___errno_location', {
          configurable: true,
          get: function () {
            abort(
              'You are getting ___errno_location on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], '___errno_location', {
          configurable: true,
          set: function () {
            abort(
              'You are setting ___errno_location on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      if (!Object.getOwnPropertyDescriptor(Module['ready'], 'onRuntimeInitialized')) {
        Object.defineProperty(Module['ready'], 'onRuntimeInitialized', {
          configurable: true,
          get: function () {
            abort(
              'You are getting onRuntimeInitialized on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
        Object.defineProperty(Module['ready'], 'onRuntimeInitialized', {
          configurable: true,
          set: function () {
            abort(
              'You are setting onRuntimeInitialized on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js',
            )
          },
        })
      }
      var moduleOverrides = {}
      var key
      for (key in Module) if (Module.hasOwnProperty(key)) moduleOverrides[key] = Module[key]
      var arguments_ = []
      var thisProgram = './this.program'
      var quit_ = function (status, toThrow) {
        throw toThrow
      }
      var ENVIRONMENT_IS_WEB = false
      var ENVIRONMENT_IS_WORKER = true
      var ENVIRONMENT_IS_NODE = false
      var ENVIRONMENT_IS_SHELL = false
      if (Module['ENVIRONMENT'])
        throw new Error(
          'Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -s ENVIRONMENT=web or -s ENVIRONMENT=node)',
        )
      var scriptDirectory = ''
      function locateFile(path) {
        if (Module['locateFile']) return Module['locateFile'](path, scriptDirectory)
        return scriptDirectory + path
      }
      var readBinary
      if (ENVIRONMENT_IS_SHELL) {
        if (
          (typeof process === 'object' && typeof require === 'function') ||
          typeof window === 'object' ||
          typeof importScripts === 'function'
        )
          throw new Error(
            'not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)',
          )
        if (typeof read != 'undefined') {
        }
        readBinary = function readBinary$1(f) {
          var data
          if (typeof readbuffer === 'function') return new Uint8Array(readbuffer(f))
          data = read(f, 'binary')
          assert(typeof data === 'object')
          return data
        }
        if (typeof scriptArgs != 'undefined') arguments_ = scriptArgs
        else if (typeof arguments != 'undefined') arguments_ = arguments
        if (typeof quit === 'function')
          quit_ = function (status) {
            quit(status)
          }
        if (typeof print !== 'undefined') {
          if (typeof console === 'undefined') console = {}
          console.log = print
          console.warn = console.error = typeof printErr !== 'undefined' ? printErr : print
        }
      } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
        if (ENVIRONMENT_IS_WORKER) scriptDirectory = ''
        else if (typeof document !== 'undefined' && document.currentScript)
          scriptDirectory = document.currentScript.src
        if (_scriptDir) scriptDirectory = _scriptDir
        if (scriptDirectory.indexOf('blob:') !== 0)
          scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf('/') + 1)
        else scriptDirectory = ''
        if (ENVIRONMENT_IS_WORKER)
          readBinary = function (url) {
            var xhr = new XMLHttpRequest()
            xhr.open('GET', url, false)
            xhr.responseType = 'arraybuffer'
            xhr.send(null)
            return new Uint8Array(xhr.response)
          }
      } else throw new Error('environment detection error')
      var out = Module['print'] || console.log.bind(console)
      var err = Module['printErr'] || console.warn.bind(console)
      for (key in moduleOverrides)
        if (moduleOverrides.hasOwnProperty(key)) Module[key] = moduleOverrides[key]
      moduleOverrides = null
      if (Module['arguments']) arguments_ = Module['arguments']
      if (!Object.getOwnPropertyDescriptor(Module, 'arguments'))
        Object.defineProperty(Module, 'arguments', {
          configurable: true,
          get: function () {
            abort(
              'Module.arguments has been replaced with plain arguments_ (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)',
            )
          },
        })
      if (Module['thisProgram']) thisProgram = Module['thisProgram']
      if (!Object.getOwnPropertyDescriptor(Module, 'thisProgram'))
        Object.defineProperty(Module, 'thisProgram', {
          configurable: true,
          get: function () {
            abort(
              'Module.thisProgram has been replaced with plain thisProgram (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)',
            )
          },
        })
      if (Module['quit']) quit_ = Module['quit']
      if (!Object.getOwnPropertyDescriptor(Module, 'quit'))
        Object.defineProperty(Module, 'quit', {
          configurable: true,
          get: function () {
            abort(
              'Module.quit has been replaced with plain quit_ (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)',
            )
          },
        })
      assert(
        typeof Module['memoryInitializerPrefixURL'] === 'undefined',
        'Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead',
      )
      assert(
        typeof Module['pthreadMainPrefixURL'] === 'undefined',
        'Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead',
      )
      assert(
        typeof Module['cdInitializerPrefixURL'] === 'undefined',
        'Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead',
      )
      assert(
        typeof Module['filePackagePrefixURL'] === 'undefined',
        'Module.filePackagePrefixURL option was removed, use Module.locateFile instead',
      )
      assert(
        typeof Module['read'] === 'undefined',
        'Module.read option was removed (modify read_ in JS)',
      )
      assert(
        typeof Module['readAsync'] === 'undefined',
        'Module.readAsync option was removed (modify readAsync in JS)',
      )
      assert(
        typeof Module['readBinary'] === 'undefined',
        'Module.readBinary option was removed (modify readBinary in JS)',
      )
      assert(
        typeof Module['setWindowTitle'] === 'undefined',
        'Module.setWindowTitle option was removed (modify setWindowTitle in JS)',
      )
      assert(
        typeof Module['TOTAL_MEMORY'] === 'undefined',
        'Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY',
      )
      if (!Object.getOwnPropertyDescriptor(Module, 'read'))
        Object.defineProperty(Module, 'read', {
          configurable: true,
          get: function () {
            abort(
              'Module.read has been replaced with plain read_ (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)',
            )
          },
        })
      if (!Object.getOwnPropertyDescriptor(Module, 'readAsync'))
        Object.defineProperty(Module, 'readAsync', {
          configurable: true,
          get: function () {
            abort(
              'Module.readAsync has been replaced with plain readAsync (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)',
            )
          },
        })
      if (!Object.getOwnPropertyDescriptor(Module, 'readBinary'))
        Object.defineProperty(Module, 'readBinary', {
          configurable: true,
          get: function () {
            abort(
              'Module.readBinary has been replaced with plain readBinary (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)',
            )
          },
        })
      if (!Object.getOwnPropertyDescriptor(Module, 'setWindowTitle'))
        Object.defineProperty(Module, 'setWindowTitle', {
          configurable: true,
          get: function () {
            abort(
              'Module.setWindowTitle has been replaced with plain setWindowTitle (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)',
            )
          },
        })
      assert(
        !ENVIRONMENT_IS_WEB,
        "web environment detected but not enabled at build time.  Add 'web' to `-s ENVIRONMENT` to enable.",
      )
      assert(
        !ENVIRONMENT_IS_NODE,
        "node environment detected but not enabled at build time.  Add 'node' to `-s ENVIRONMENT` to enable.",
      )
      assert(
        !ENVIRONMENT_IS_SHELL,
        "shell environment detected but not enabled at build time.  Add 'shell' to `-s ENVIRONMENT` to enable.",
      )
      function warnOnce(text) {
        if (!warnOnce.shown) warnOnce.shown = {}
        if (!warnOnce.shown[text]) {
          warnOnce.shown[text] = 1
          err(text)
        }
      }
      var setTempRet0 = function (value) {}
      var wasmBinary
      if (Module['wasmBinary']) wasmBinary = Module['wasmBinary']
      if (!Object.getOwnPropertyDescriptor(Module, 'wasmBinary'))
        Object.defineProperty(Module, 'wasmBinary', {
          configurable: true,
          get: function () {
            abort(
              'Module.wasmBinary has been replaced with plain wasmBinary (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)',
            )
          },
        })
      var noExitRuntime = Module['noExitRuntime'] || true
      if (!Object.getOwnPropertyDescriptor(Module, 'noExitRuntime'))
        Object.defineProperty(Module, 'noExitRuntime', {
          configurable: true,
          get: function () {
            abort(
              'Module.noExitRuntime has been replaced with plain noExitRuntime (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)',
            )
          },
        })
      if (typeof WebAssembly !== 'object') abort('no native wasm support detected')
      var wasmMemory
      var ABORT = false
      var EXITSTATUS
      /** @type {function(*, string=)} */
      function assert(condition, text) {
        if (!condition) abort('Assertion failed: ' + text)
      }
      function getCFunc(ident) {
        var func = Module['_' + ident]
        assert(func, 'Cannot call unknown function ' + ident + ', make sure it is exported')
        return func
      }
      /** @param {string|null=} returnType
			@param {Array=} argTypes
			@param {Arguments|Array=} args
			@param {Object=} opts */
      function ccall(ident, returnType, argTypes, args, opts) {
        var toC = {
          string: function (str) {
            var ret$1 = 0
            if (str !== null && str !== void 0 && str !== 0) {
              var len = (str.length << 2) + 1
              ret$1 = stackAlloc(len)
              stringToUTF8(str, ret$1, len)
            }
            return ret$1
          },
          array: function (arr) {
            var ret$1 = stackAlloc(arr.length)
            writeArrayToMemory(arr, ret$1)
            return ret$1
          },
        }
        function convertReturnValue(ret$1) {
          if (returnType === 'string') return UTF8ToString(ret$1)
          if (returnType === 'boolean') return Boolean(ret$1)
          return ret$1
        }
        var func = getCFunc(ident)
        var cArgs = []
        var stack = 0
        assert(returnType !== 'array', 'Return type should not be "array".')
        if (args)
          for (var i = 0; i < args.length; i++) {
            var converter = toC[argTypes[i]]
            if (converter) {
              if (stack === 0) stack = stackSave()
              cArgs[i] = converter(args[i])
            } else cArgs[i] = args[i]
          }
        var ret = func.apply(null, cArgs)
        function onDone(ret$1) {
          if (stack !== 0) stackRestore(stack)
          return convertReturnValue(ret$1)
        }
        ret = onDone(ret)
        return ret
      }
      /** @param {string=} returnType
			@param {Array=} argTypes
			@param {Object=} opts */
      function cwrap(ident, returnType, argTypes, opts) {
        return function () {
          return ccall(ident, returnType, argTypes, arguments, opts)
        }
      }
      var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : void 0
      /**
       * @param {number} idx
       * @param {number=} maxBytesToRead
       * @return {string}
       */
      function UTF8ArrayToString(heap, idx, maxBytesToRead) {
        var endIdx = idx + maxBytesToRead
        var endPtr = idx
        while (heap[endPtr] && !(endPtr >= endIdx)) ++endPtr
        if (endPtr - idx > 16 && heap.subarray && UTF8Decoder)
          return UTF8Decoder.decode(heap.subarray(idx, endPtr))
        else {
          var str = ''
          while (idx < endPtr) {
            var u0 = heap[idx++]
            if (!(u0 & 128)) {
              str += String.fromCharCode(u0)
              continue
            }
            var u1 = heap[idx++] & 63
            if ((u0 & 224) == 192) {
              str += String.fromCharCode(((u0 & 31) << 6) | u1)
              continue
            }
            var u2 = heap[idx++] & 63
            if ((u0 & 240) == 224) u0 = ((u0 & 15) << 12) | (u1 << 6) | u2
            else {
              if ((u0 & 248) != 240)
                warnOnce(
                  'Invalid UTF-8 leading byte 0x' +
                    u0.toString(16) +
                    ' encountered when deserializing a UTF-8 string in wasm memory to a JS string!',
                )
              u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heap[idx++] & 63)
            }
            if (u0 < 65536) str += String.fromCharCode(u0)
            else {
              var ch = u0 - 65536
              str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023))
            }
          }
        }
        return str
      }
      /**
       * @param {number} ptr
       * @param {number=} maxBytesToRead
       * @return {string}
       */
      function UTF8ToString(ptr, maxBytesToRead) {
        return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : ''
      }
      function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
        if (!(maxBytesToWrite > 0)) return 0
        var startIdx = outIdx
        var endIdx = outIdx + maxBytesToWrite - 1
        for (var i = 0; i < str.length; ++i) {
          var u = str.charCodeAt(i)
          if (u >= 55296 && u <= 57343) {
            var u1 = str.charCodeAt(++i)
            u = (65536 + ((u & 1023) << 10)) | (u1 & 1023)
          }
          if (u <= 127) {
            if (outIdx >= endIdx) break
            heap[outIdx++] = u
          } else if (u <= 2047) {
            if (outIdx + 1 >= endIdx) break
            heap[outIdx++] = 192 | (u >> 6)
            heap[outIdx++] = 128 | (u & 63)
          } else if (u <= 65535) {
            if (outIdx + 2 >= endIdx) break
            heap[outIdx++] = 224 | (u >> 12)
            heap[outIdx++] = 128 | ((u >> 6) & 63)
            heap[outIdx++] = 128 | (u & 63)
          } else {
            if (outIdx + 3 >= endIdx) break
            if (u >= 2097152)
              warnOnce(
                'Invalid Unicode code point 0x' +
                  u.toString(16) +
                  ' encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x1FFFFF).',
              )
            heap[outIdx++] = 240 | (u >> 18)
            heap[outIdx++] = 128 | ((u >> 12) & 63)
            heap[outIdx++] = 128 | ((u >> 6) & 63)
            heap[outIdx++] = 128 | (u & 63)
          }
        }
        heap[outIdx] = 0
        return outIdx - startIdx
      }
      function stringToUTF8(str, outPtr, maxBytesToWrite) {
        assert(
          typeof maxBytesToWrite == 'number',
          'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!',
        )
        return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
      }
      function lengthBytesUTF8(str) {
        var len = 0
        for (var i = 0; i < str.length; ++i) {
          var u = str.charCodeAt(i)
          if (u >= 55296 && u <= 57343)
            u = (65536 + ((u & 1023) << 10)) | (str.charCodeAt(++i) & 1023)
          if (u <= 127) ++len
          else if (u <= 2047) len += 2
          else if (u <= 65535) len += 3
          else len += 4
        }
        return len
      }
      typeof TextDecoder !== 'undefined' && new TextDecoder('utf-16le')
      function allocateUTF8OnStack(str) {
        var size = lengthBytesUTF8(str) + 1
        var ret = stackAlloc(size)
        stringToUTF8Array(str, HEAP8, ret, size)
        return ret
      }
      function writeArrayToMemory(array, buffer$1) {
        assert(
          array.length >= 0,
          'writeArrayToMemory array must have a length (should be an array or typed array)',
        )
        HEAP8.set(array, buffer$1)
      }
      var buffer, HEAP8, HEAPU8, HEAP32, HEAPU32
      function updateGlobalBufferAndViews(buf) {
        buffer = buf
        Module['HEAP8'] = HEAP8 = new Int8Array(buf)
        Module['HEAP16'] = new Int16Array(buf)
        Module['HEAP32'] = HEAP32 = new Int32Array(buf)
        Module['HEAPU8'] = HEAPU8 = new Uint8Array(buf)
        Module['HEAPU16'] = new Uint16Array(buf)
        Module['HEAPU32'] = HEAPU32 = new Uint32Array(buf)
        Module['HEAPF32'] = new Float32Array(buf)
        Module['HEAPF64'] = new Float64Array(buf)
      }
      var TOTAL_STACK = 5242880
      if (Module['TOTAL_STACK'])
        assert(
          TOTAL_STACK === Module['TOTAL_STACK'],
          'the stack size can no longer be determined at runtime',
        )
      var INITIAL_MEMORY = Module['INITIAL_MEMORY'] || 16777216
      if (!Object.getOwnPropertyDescriptor(Module, 'INITIAL_MEMORY'))
        Object.defineProperty(Module, 'INITIAL_MEMORY', {
          configurable: true,
          get: function () {
            abort(
              'Module.INITIAL_MEMORY has been replaced with plain INITIAL_MEMORY (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)',
            )
          },
        })
      assert(
        INITIAL_MEMORY >= TOTAL_STACK,
        'INITIAL_MEMORY should be larger than TOTAL_STACK, was ' +
          INITIAL_MEMORY +
          '! (TOTAL_STACK=' +
          TOTAL_STACK +
          ')',
      )
      assert(
        typeof Int32Array !== 'undefined' &&
          typeof Float64Array !== 'undefined' &&
          Int32Array.prototype.subarray !== void 0 &&
          Int32Array.prototype.set !== void 0,
        'JS engine does not provide full typed array support',
      )
      if (Module['wasmMemory']) wasmMemory = Module['wasmMemory']
      else
        wasmMemory = new WebAssembly.Memory({
          initial: INITIAL_MEMORY / 65536,
          maximum: INITIAL_MEMORY / 65536,
        })
      if (wasmMemory) buffer = wasmMemory.buffer
      INITIAL_MEMORY = buffer.byteLength
      assert(INITIAL_MEMORY % 65536 === 0)
      updateGlobalBufferAndViews(buffer)
      var wasmTable
      function writeStackCookie() {
        var max = _emscripten_stack_get_end()
        assert((max & 3) == 0)
        HEAPU32[(max >> 2) + 1] = 34821223
        HEAPU32[(max >> 2) + 2] = 2310721022
        HEAP32[0] = 1668509029
      }
      function checkStackCookie() {
        if (ABORT) return
        var max = _emscripten_stack_get_end()
        var cookie1 = HEAPU32[(max >> 2) + 1]
        var cookie2 = HEAPU32[(max >> 2) + 2]
        if (cookie1 != 34821223 || cookie2 != 2310721022)
          abort(
            'Stack overflow! Stack cookie has been overwritten, expected hex dwords 0x89BACDFE and 0x2135467, but received 0x' +
              cookie2.toString(16) +
              ' ' +
              cookie1.toString(16),
          )
        if (HEAP32[0] !== 1668509029)
          abort('Runtime error: The application has corrupted its heap memory area (address zero)!')
      }
      ;(function () {
        var h16 = new Int16Array(1)
        var h8 = new Int8Array(h16.buffer)
        h16[0] = 25459
        if (h8[0] !== 115 || h8[1] !== 99)
          throw 'Runtime error: expected the system to be little-endian! (Run with -s SUPPORT_BIG_ENDIAN=1 to bypass)'
      })()
      var __ATPRERUN__ = []
      var __ATINIT__ = []
      var __ATMAIN__ = []
      var __ATPOSTRUN__ = []
      var runtimeInitialized = false
      var runtimeExited = false
      var runtimeKeepaliveCounter = 0
      function keepRuntimeAlive() {
        return noExitRuntime || runtimeKeepaliveCounter > 0
      }
      function preRun() {
        if (Module['preRun']) {
          if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']]
          while (Module['preRun'].length) addOnPreRun(Module['preRun'].shift())
        }
        callRuntimeCallbacks(__ATPRERUN__)
      }
      function initRuntime() {
        checkStackCookie()
        assert(!runtimeInitialized)
        runtimeInitialized = true
        callRuntimeCallbacks(__ATINIT__)
      }
      function preMain() {
        checkStackCookie()
        callRuntimeCallbacks(__ATMAIN__)
      }
      function exitRuntime() {
        checkStackCookie()
        runtimeExited = true
      }
      function postRun() {
        checkStackCookie()
        if (Module['postRun']) {
          if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']]
          while (Module['postRun'].length) addOnPostRun(Module['postRun'].shift())
        }
        callRuntimeCallbacks(__ATPOSTRUN__)
      }
      function addOnPreRun(cb) {
        __ATPRERUN__.unshift(cb)
      }
      function addOnInit(cb) {
        __ATINIT__.unshift(cb)
      }
      function addOnPostRun(cb) {
        __ATPOSTRUN__.unshift(cb)
      }
      assert(
        Math.imul,
        'This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill',
      )
      assert(
        Math.fround,
        'This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill',
      )
      assert(
        Math.clz32,
        'This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill',
      )
      assert(
        Math.trunc,
        'This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill',
      )
      var runDependencies = 0
      var runDependencyWatcher = null
      var dependenciesFulfilled = null
      var runDependencyTracking = {}
      function addRunDependency(id) {
        runDependencies++
        if (Module['monitorRunDependencies']) Module['monitorRunDependencies'](runDependencies)
        if (id) {
          assert(!runDependencyTracking[id])
          runDependencyTracking[id] = 1
          if (runDependencyWatcher === null && typeof setInterval !== 'undefined')
            runDependencyWatcher = setInterval(function () {
              if (ABORT) {
                clearInterval(runDependencyWatcher)
                runDependencyWatcher = null
                return
              }
              var shown = false
              for (var dep in runDependencyTracking) {
                if (!shown) {
                  shown = true
                  err('still waiting on run dependencies:')
                }
                err('dependency: ' + dep)
              }
              if (shown) err('(end of list)')
            }, 1e4)
        } else err('warning: run dependency added without ID')
      }
      function removeRunDependency(id) {
        runDependencies--
        if (Module['monitorRunDependencies']) Module['monitorRunDependencies'](runDependencies)
        if (id) {
          assert(runDependencyTracking[id])
          delete runDependencyTracking[id]
        } else err('warning: run dependency removed without ID')
        if (runDependencies == 0) {
          if (runDependencyWatcher !== null) {
            clearInterval(runDependencyWatcher)
            runDependencyWatcher = null
          }
          if (dependenciesFulfilled) {
            var callback = dependenciesFulfilled
            dependenciesFulfilled = null
            callback()
          }
        }
      }
      Module['preloadedImages'] = {}
      Module['preloadedAudios'] = {}
      /** @param {string|number=} what */
      function abort(what) {
        if (Module['onAbort']) Module['onAbort'](what)
        what += ''
        err(what)
        ABORT = true
        EXITSTATUS = 1
        what = 'abort(' + what + ') at ' + stackTrace()
        var e = new WebAssembly.RuntimeError(what)
        readyPromiseReject(e)
        throw e
      }
      var FS = {
        error: function () {
          abort(
            'Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with  -s FORCE_FILESYSTEM=1',
          )
        },
        init: function () {
          FS.error()
        },
        createDataFile: function () {
          FS.error()
        },
        createPreloadedFile: function () {
          FS.error()
        },
        createLazyFile: function () {
          FS.error()
        },
        open: function () {
          FS.error()
        },
        mkdev: function () {
          FS.error()
        },
        registerDevice: function () {
          FS.error()
        },
        analyzePath: function () {
          FS.error()
        },
        loadFilesFromDB: function () {
          FS.error()
        },
        ErrnoError: function ErrnoError() {
          FS.error()
        },
      }
      Module['FS_createDataFile'] = FS.createDataFile
      Module['FS_createPreloadedFile'] = FS.createPreloadedFile
      var dataURIPrefix = 'data:application/octet-stream;base64,'
      function isDataURI(filename) {
        return filename.startsWith(dataURIPrefix)
      }
      function isFileURI(filename) {
        return filename.startsWith('file://')
      }
      function createExportWrapper(name, fixedasm) {
        return function () {
          var displayName = name
          var asm = fixedasm
          if (!fixedasm) asm = Module['asm']
          assert(
            runtimeInitialized,
            'native function `' + displayName + '` called before runtime initialization',
          )
          assert(
            !runtimeExited,
            'native function `' +
              displayName +
              '` called after runtime exit (use NO_EXIT_RUNTIME to keep it alive after main() exits)',
          )
          if (!asm[name])
            assert(asm[name], 'exported native function `' + displayName + '` not found')
          return asm[name].apply(null, arguments)
        }
      }
      var wasmBinaryFile = 'opus.wasm'
      if (!isDataURI(wasmBinaryFile)) wasmBinaryFile = locateFile(wasmBinaryFile)
      function getBinary(file) {
        try {
          if (file == wasmBinaryFile && wasmBinary) return new Uint8Array(wasmBinary)
          if (readBinary) return readBinary(file)
          else throw 'both async and sync fetching of the wasm failed'
        } catch (err$1) {
          abort(err$1)
        }
      }
      function getBinaryPromise() {
        if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
          if (typeof fetch === 'function')
            return fetch(wasmBinaryFile, { credentials: 'same-origin' })
              .then(function (response) {
                if (!response['ok'])
                  throw "failed to load wasm binary file at '" + wasmBinaryFile + "'"
                return response['arrayBuffer']()
              })
              .catch(function () {
                return getBinary(wasmBinaryFile)
              })
        }
        return Promise.resolve().then(function () {
          return getBinary(wasmBinaryFile)
        })
      }
      function createWasm() {
        var info = {
          env: asmLibraryArg,
          wasi_snapshot_preview1: asmLibraryArg,
        }
        /** @param {WebAssembly.Module=} module*/
        function receiveInstance(instance, module) {
          Module['asm'] = instance.exports
          wasmTable = Module['asm']['__indirect_function_table']
          assert(wasmTable, 'table not found in wasm exports')
          addOnInit(Module['asm']['__wasm_call_ctors'])
          removeRunDependency('wasm-instantiate')
        }
        addRunDependency('wasm-instantiate')
        var trueModule = Module
        function receiveInstantiationResult(result) {
          assert(
            Module === trueModule,
            'the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?',
          )
          trueModule = null
          receiveInstance(result['instance'])
        }
        function instantiateArrayBuffer(receiver) {
          return getBinaryPromise()
            .then(function (binary) {
              return WebAssembly.instantiate(binary, info)
            })
            .then(function (instance) {
              return instance
            })
            .then(receiver, function (reason) {
              err('failed to asynchronously prepare wasm: ' + reason)
              if (isFileURI(wasmBinaryFile))
                err(
                  'warning: Loading from a file URI (' +
                    wasmBinaryFile +
                    ') is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing',
                )
              abort(reason)
            })
        }
        function instantiateAsync() {
          if (
            !wasmBinary &&
            typeof WebAssembly.instantiateStreaming === 'function' &&
            !isDataURI(wasmBinaryFile) &&
            typeof fetch === 'function'
          )
            return fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function (response) {
              return WebAssembly.instantiateStreaming(response, info).then(
                receiveInstantiationResult,
                function (reason) {
                  err('wasm streaming compile failed: ' + reason)
                  err('falling back to ArrayBuffer instantiation')
                  return instantiateArrayBuffer(receiveInstantiationResult)
                },
              )
            })
          else return instantiateArrayBuffer(receiveInstantiationResult)
        }
        if (Module['instantiateWasm'])
          try {
            return Module['instantiateWasm'](info, receiveInstance)
          } catch (e) {
            err('Module.instantiateWasm callback failed with error: ' + e)
            return false
          }
        instantiateAsync().catch(readyPromiseReject)
        return {}
      }
      function callRuntimeCallbacks(callbacks) {
        while (callbacks.length > 0) {
          var callback = callbacks.shift()
          if (typeof callback == 'function') {
            callback(Module)
            continue
          }
          var func = callback.func
          if (typeof func === 'number')
            if (callback.arg === void 0) wasmTable.get(func)()
            else wasmTable.get(func)(callback.arg)
          else func(callback.arg === void 0 ? null : callback.arg)
        }
      }
      function demangle(func) {
        warnOnce('warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling')
        return func
      }
      function demangleAll(text) {
        return text.replace(/\b_Z[\w\d_]+/g, function (x) {
          var y = demangle(x)
          return x === y ? x : y + ' [' + x + ']'
        })
      }
      function handleException(e) {
        if (e instanceof ExitStatus || e == 'unwind') return EXITSTATUS
        var toLog = e
        if (e && typeof e === 'object' && e.stack) toLog = [e, e.stack]
        err('exception thrown: ' + toLog)
        quit_(1, e)
      }
      function jsStackTrace() {
        var error = /* @__PURE__ */ new Error()
        if (!error.stack) {
          try {
            throw new Error()
          } catch (e) {
            error = e
          }
          if (!error.stack) return '(no stack trace available)'
        }
        return error.stack.toString()
      }
      function stackTrace() {
        var js = jsStackTrace()
        if (Module['extraStackTrace']) js += '\n' + Module['extraStackTrace']()
        return demangleAll(js)
      }
      function _abort() {
        abort()
      }
      function _emscripten_memcpy_big(dest, src, num) {
        HEAPU8.copyWithin(dest, src, src + num)
      }
      function abortOnCannotGrowMemory(requestedSize) {
        abort(
          'Cannot enlarge memory arrays to size ' +
            requestedSize +
            ' bytes (OOM). Either (1) compile with  -s INITIAL_MEMORY=X  with X higher than the current value ' +
            HEAP8.length +
            ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ',
        )
      }
      function _emscripten_resize_heap(requestedSize) {
        HEAPU8.length
        requestedSize = requestedSize >>> 0
        abortOnCannotGrowMemory(requestedSize)
      }
      var SYSCALLS = {
        mappings: {},
        buffers: [null, [], []],
        printChar: function (stream, curr) {
          var buffer$1 = SYSCALLS.buffers[stream]
          assert(buffer$1)
          if (curr === 0 || curr === 10) {
            ;(stream === 1 ? out : err)(UTF8ArrayToString(buffer$1, 0))
            buffer$1.length = 0
          } else buffer$1.push(curr)
        },
        varargs: void 0,
        get: function () {
          assert(SYSCALLS.varargs != void 0)
          SYSCALLS.varargs += 4
          return HEAP32[(SYSCALLS.varargs - 4) >> 2]
        },
        getStr: function (ptr) {
          return UTF8ToString(ptr)
        },
        get64: function (low, high) {
          if (low >= 0) assert(high === 0)
          else assert(high === -1)
          return low
        },
      }
      function _fd_close(fd) {
        abort('it should not be possible to operate on streams when !SYSCALLS_REQUIRE_FILESYSTEM')
        return 0
      }
      function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
        abort('it should not be possible to operate on streams when !SYSCALLS_REQUIRE_FILESYSTEM')
      }
      function flush_NO_FILESYSTEM() {
        if (typeof _fflush !== 'undefined') _fflush(0)
        var buffers = SYSCALLS.buffers
        if (buffers[1].length) SYSCALLS.printChar(1, 10)
        if (buffers[2].length) SYSCALLS.printChar(2, 10)
      }
      function _fd_write(fd, iov, iovcnt, pnum) {
        var num = 0
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAP32[(iov + i * 8) >> 2]
          var len = HEAP32[(iov + (i * 8 + 4)) >> 2]
          for (var j = 0; j < len; j++) SYSCALLS.printChar(fd, HEAPU8[ptr + j])
          num += len
        }
        HEAP32[pnum >> 2] = num
        return 0
      }
      function _setTempRet0(val) {
        setTempRet0(val)
      }
      var asmLibraryArg = {
        abort: _abort,
        emscripten_memcpy_big: _emscripten_memcpy_big,
        emscripten_resize_heap: _emscripten_resize_heap,
        fd_close: _fd_close,
        fd_seek: _fd_seek,
        fd_write: _fd_write,
        memory: wasmMemory,
        setTempRet0: _setTempRet0,
      }
      createWasm()
      Module['___wasm_call_ctors'] = createExportWrapper('__wasm_call_ctors')
      Module['_Opus_initDecoder'] = createExportWrapper('Opus_initDecoder')
      Module['_malloc'] = createExportWrapper('malloc')
      Module['_Opus_destroyDecoder'] = createExportWrapper('Opus_destroyDecoder')
      Module['_Opus_destroyEncoder'] = createExportWrapper('Opus_destroyEncoder')
      Module['_Opus_initEncoder'] = createExportWrapper('Opus_initEncoder')
      Module['_Opus_encode'] = createExportWrapper('Opus_encode')
      Module['_Opus_decode'] = createExportWrapper('Opus_decode')
      Module['_say_hello'] = createExportWrapper('say_hello')
      Module['_main'] = createExportWrapper('main')
      Module['_free'] = createExportWrapper('free')
      /** @type {function(...*):?} */
      var _fflush = (Module['_fflush'] = createExportWrapper('fflush'))
      Module['___errno_location'] = createExportWrapper('__errno_location')
      /** @type {function(...*):?} */
      var _emscripten_stack_get_end = (Module['_emscripten_stack_get_end'] = function () {
        return (_emscripten_stack_get_end = Module['_emscripten_stack_get_end'] =
          Module['asm']['emscripten_stack_get_end']).apply(null, arguments)
      })
      /** @type {function(...*):?} */
      var stackSave = (Module['stackSave'] = createExportWrapper('stackSave'))
      /** @type {function(...*):?} */
      var stackRestore = (Module['stackRestore'] = createExportWrapper('stackRestore'))
      /** @type {function(...*):?} */
      var stackAlloc = (Module['stackAlloc'] = createExportWrapper('stackAlloc'))
      /** @type {function(...*):?} */
      var _emscripten_stack_init = (Module['_emscripten_stack_init'] = function () {
        return (_emscripten_stack_init = Module['_emscripten_stack_init'] =
          Module['asm']['emscripten_stack_init']).apply(null, arguments)
      })
      /** @type {function(...*):?} */
      var _emscripten_stack_get_free = (Module['_emscripten_stack_get_free'] = function () {
        return (_emscripten_stack_get_free = Module['_emscripten_stack_get_free'] =
          Module['asm']['emscripten_stack_get_free']).apply(null, arguments)
      })
      Module['dynCall_jiji'] = createExportWrapper('dynCall_jiji')
      if (!Object.getOwnPropertyDescriptor(Module, 'intArrayFromString'))
        Module['intArrayFromString'] = function () {
          abort(
            "'intArrayFromString' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'intArrayToString'))
        Module['intArrayToString'] = function () {
          abort(
            "'intArrayToString' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      Module['ccall'] = ccall
      Module['cwrap'] = cwrap
      if (!Object.getOwnPropertyDescriptor(Module, 'setValue'))
        Module['setValue'] = function () {
          abort("'setValue' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'getValue'))
        Module['getValue'] = function () {
          abort("'getValue' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'allocate'))
        Module['allocate'] = function () {
          abort("'allocate' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'UTF8ArrayToString'))
        Module['UTF8ArrayToString'] = function () {
          abort(
            "'UTF8ArrayToString' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'UTF8ToString'))
        Module['UTF8ToString'] = function () {
          abort("'UTF8ToString' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'stringToUTF8Array'))
        Module['stringToUTF8Array'] = function () {
          abort(
            "'stringToUTF8Array' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'stringToUTF8'))
        Module['stringToUTF8'] = function () {
          abort("'stringToUTF8' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'lengthBytesUTF8'))
        Module['lengthBytesUTF8'] = function () {
          abort(
            "'lengthBytesUTF8' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'stackTrace'))
        Module['stackTrace'] = function () {
          abort("'stackTrace' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'addOnPreRun'))
        Module['addOnPreRun'] = function () {
          abort("'addOnPreRun' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'addOnInit'))
        Module['addOnInit'] = function () {
          abort("'addOnInit' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'addOnPreMain'))
        Module['addOnPreMain'] = function () {
          abort("'addOnPreMain' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'addOnExit'))
        Module['addOnExit'] = function () {
          abort("'addOnExit' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'addOnPostRun'))
        Module['addOnPostRun'] = function () {
          abort("'addOnPostRun' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'writeStringToMemory'))
        Module['writeStringToMemory'] = function () {
          abort(
            "'writeStringToMemory' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      Module['writeArrayToMemory'] = writeArrayToMemory
      if (!Object.getOwnPropertyDescriptor(Module, 'writeAsciiToMemory'))
        Module['writeAsciiToMemory'] = function () {
          abort(
            "'writeAsciiToMemory' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'addRunDependency'))
        Module['addRunDependency'] = function () {
          abort(
            "'addRunDependency' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'removeRunDependency'))
        Module['removeRunDependency'] = function () {
          abort(
            "'removeRunDependency' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'FS_createFolder'))
        Module['FS_createFolder'] = function () {
          abort(
            "'FS_createFolder' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'FS_createPath'))
        Module['FS_createPath'] = function () {
          abort(
            "'FS_createPath' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'FS_createDataFile'))
        Module['FS_createDataFile'] = function () {
          abort(
            "'FS_createDataFile' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'FS_createPreloadedFile'))
        Module['FS_createPreloadedFile'] = function () {
          abort(
            "'FS_createPreloadedFile' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'FS_createLazyFile'))
        Module['FS_createLazyFile'] = function () {
          abort(
            "'FS_createLazyFile' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'FS_createLink'))
        Module['FS_createLink'] = function () {
          abort(
            "'FS_createLink' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'FS_createDevice'))
        Module['FS_createDevice'] = function () {
          abort(
            "'FS_createDevice' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'FS_unlink'))
        Module['FS_unlink'] = function () {
          abort(
            "'FS_unlink' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'getLEB'))
        Module['getLEB'] = function () {
          abort("'getLEB' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'getFunctionTables'))
        Module['getFunctionTables'] = function () {
          abort(
            "'getFunctionTables' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'alignFunctionTables'))
        Module['alignFunctionTables'] = function () {
          abort(
            "'alignFunctionTables' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'registerFunctions'))
        Module['registerFunctions'] = function () {
          abort(
            "'registerFunctions' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'addFunction'))
        Module['addFunction'] = function () {
          abort("'addFunction' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'removeFunction'))
        Module['removeFunction'] = function () {
          abort(
            "'removeFunction' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'getFuncWrapper'))
        Module['getFuncWrapper'] = function () {
          abort(
            "'getFuncWrapper' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'prettyPrint'))
        Module['prettyPrint'] = function () {
          abort("'prettyPrint' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'dynCall'))
        Module['dynCall'] = function () {
          abort("'dynCall' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'getCompilerSetting'))
        Module['getCompilerSetting'] = function () {
          abort(
            "'getCompilerSetting' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'print'))
        Module['print'] = function () {
          abort("'print' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'printErr'))
        Module['printErr'] = function () {
          abort("'printErr' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'getTempRet0'))
        Module['getTempRet0'] = function () {
          abort("'getTempRet0' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'setTempRet0'))
        Module['setTempRet0'] = function () {
          abort("'setTempRet0' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'callMain'))
        Module['callMain'] = function () {
          abort("'callMain' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'abort'))
        Module['abort'] = function () {
          abort("'abort' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'keepRuntimeAlive'))
        Module['keepRuntimeAlive'] = function () {
          abort(
            "'keepRuntimeAlive' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'zeroMemory'))
        Module['zeroMemory'] = function () {
          abort("'zeroMemory' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'stringToNewUTF8'))
        Module['stringToNewUTF8'] = function () {
          abort(
            "'stringToNewUTF8' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'setFileTime'))
        Module['setFileTime'] = function () {
          abort("'setFileTime' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'abortOnCannotGrowMemory'))
        Module['abortOnCannotGrowMemory'] = function () {
          abort(
            "'abortOnCannotGrowMemory' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'emscripten_realloc_buffer'))
        Module['emscripten_realloc_buffer'] = function () {
          abort(
            "'emscripten_realloc_buffer' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'ENV'))
        Module['ENV'] = function () {
          abort("'ENV' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'ERRNO_CODES'))
        Module['ERRNO_CODES'] = function () {
          abort("'ERRNO_CODES' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'ERRNO_MESSAGES'))
        Module['ERRNO_MESSAGES'] = function () {
          abort(
            "'ERRNO_MESSAGES' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'setErrNo'))
        Module['setErrNo'] = function () {
          abort("'setErrNo' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'inetPton4'))
        Module['inetPton4'] = function () {
          abort("'inetPton4' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'inetNtop4'))
        Module['inetNtop4'] = function () {
          abort("'inetNtop4' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'inetPton6'))
        Module['inetPton6'] = function () {
          abort("'inetPton6' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'inetNtop6'))
        Module['inetNtop6'] = function () {
          abort("'inetNtop6' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'readSockaddr'))
        Module['readSockaddr'] = function () {
          abort("'readSockaddr' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'writeSockaddr'))
        Module['writeSockaddr'] = function () {
          abort(
            "'writeSockaddr' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'DNS'))
        Module['DNS'] = function () {
          abort("'DNS' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'getHostByName'))
        Module['getHostByName'] = function () {
          abort(
            "'getHostByName' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'GAI_ERRNO_MESSAGES'))
        Module['GAI_ERRNO_MESSAGES'] = function () {
          abort(
            "'GAI_ERRNO_MESSAGES' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'Protocols'))
        Module['Protocols'] = function () {
          abort("'Protocols' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'Sockets'))
        Module['Sockets'] = function () {
          abort("'Sockets' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'getRandomDevice'))
        Module['getRandomDevice'] = function () {
          abort(
            "'getRandomDevice' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'traverseStack'))
        Module['traverseStack'] = function () {
          abort(
            "'traverseStack' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'UNWIND_CACHE'))
        Module['UNWIND_CACHE'] = function () {
          abort("'UNWIND_CACHE' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'withBuiltinMalloc'))
        Module['withBuiltinMalloc'] = function () {
          abort(
            "'withBuiltinMalloc' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'readAsmConstArgsArray'))
        Module['readAsmConstArgsArray'] = function () {
          abort(
            "'readAsmConstArgsArray' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'readAsmConstArgs'))
        Module['readAsmConstArgs'] = function () {
          abort(
            "'readAsmConstArgs' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'mainThreadEM_ASM'))
        Module['mainThreadEM_ASM'] = function () {
          abort(
            "'mainThreadEM_ASM' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'jstoi_q'))
        Module['jstoi_q'] = function () {
          abort("'jstoi_q' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'jstoi_s'))
        Module['jstoi_s'] = function () {
          abort("'jstoi_s' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'getExecutableName'))
        Module['getExecutableName'] = function () {
          abort(
            "'getExecutableName' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'listenOnce'))
        Module['listenOnce'] = function () {
          abort("'listenOnce' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'autoResumeAudioContext'))
        Module['autoResumeAudioContext'] = function () {
          abort(
            "'autoResumeAudioContext' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'dynCallLegacy'))
        Module['dynCallLegacy'] = function () {
          abort(
            "'dynCallLegacy' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'getDynCaller'))
        Module['getDynCaller'] = function () {
          abort("'getDynCaller' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'dynCall'))
        Module['dynCall'] = function () {
          abort("'dynCall' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'callRuntimeCallbacks'))
        Module['callRuntimeCallbacks'] = function () {
          abort(
            "'callRuntimeCallbacks' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'handleException'))
        Module['handleException'] = function () {
          abort(
            "'handleException' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'runtimeKeepalivePush'))
        Module['runtimeKeepalivePush'] = function () {
          abort(
            "'runtimeKeepalivePush' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'runtimeKeepalivePop'))
        Module['runtimeKeepalivePop'] = function () {
          abort(
            "'runtimeKeepalivePop' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'callUserCallback'))
        Module['callUserCallback'] = function () {
          abort(
            "'callUserCallback' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'maybeExit'))
        Module['maybeExit'] = function () {
          abort("'maybeExit' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'safeSetTimeout'))
        Module['safeSetTimeout'] = function () {
          abort(
            "'safeSetTimeout' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'asmjsMangle'))
        Module['asmjsMangle'] = function () {
          abort("'asmjsMangle' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'asyncLoad'))
        Module['asyncLoad'] = function () {
          abort("'asyncLoad' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'alignMemory'))
        Module['alignMemory'] = function () {
          abort("'alignMemory' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'mmapAlloc'))
        Module['mmapAlloc'] = function () {
          abort("'mmapAlloc' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'reallyNegative'))
        Module['reallyNegative'] = function () {
          abort(
            "'reallyNegative' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'unSign'))
        Module['unSign'] = function () {
          abort("'unSign' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'reSign'))
        Module['reSign'] = function () {
          abort("'reSign' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'formatString'))
        Module['formatString'] = function () {
          abort("'formatString' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'PATH'))
        Module['PATH'] = function () {
          abort("'PATH' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'PATH_FS'))
        Module['PATH_FS'] = function () {
          abort("'PATH_FS' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'SYSCALLS'))
        Module['SYSCALLS'] = function () {
          abort("'SYSCALLS' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'syscallMmap2'))
        Module['syscallMmap2'] = function () {
          abort("'syscallMmap2' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'syscallMunmap'))
        Module['syscallMunmap'] = function () {
          abort(
            "'syscallMunmap' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'getSocketFromFD'))
        Module['getSocketFromFD'] = function () {
          abort(
            "'getSocketFromFD' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'getSocketAddress'))
        Module['getSocketAddress'] = function () {
          abort(
            "'getSocketAddress' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'JSEvents'))
        Module['JSEvents'] = function () {
          abort("'JSEvents' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'registerKeyEventCallback'))
        Module['registerKeyEventCallback'] = function () {
          abort(
            "'registerKeyEventCallback' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'specialHTMLTargets'))
        Module['specialHTMLTargets'] = function () {
          abort(
            "'specialHTMLTargets' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'maybeCStringToJsString'))
        Module['maybeCStringToJsString'] = function () {
          abort(
            "'maybeCStringToJsString' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'findEventTarget'))
        Module['findEventTarget'] = function () {
          abort(
            "'findEventTarget' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'findCanvasEventTarget'))
        Module['findCanvasEventTarget'] = function () {
          abort(
            "'findCanvasEventTarget' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'getBoundingClientRect'))
        Module['getBoundingClientRect'] = function () {
          abort(
            "'getBoundingClientRect' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'fillMouseEventData'))
        Module['fillMouseEventData'] = function () {
          abort(
            "'fillMouseEventData' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'registerMouseEventCallback'))
        Module['registerMouseEventCallback'] = function () {
          abort(
            "'registerMouseEventCallback' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'registerWheelEventCallback'))
        Module['registerWheelEventCallback'] = function () {
          abort(
            "'registerWheelEventCallback' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'registerUiEventCallback'))
        Module['registerUiEventCallback'] = function () {
          abort(
            "'registerUiEventCallback' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'registerFocusEventCallback'))
        Module['registerFocusEventCallback'] = function () {
          abort(
            "'registerFocusEventCallback' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'fillDeviceOrientationEventData'))
        Module['fillDeviceOrientationEventData'] = function () {
          abort(
            "'fillDeviceOrientationEventData' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'registerDeviceOrientationEventCallback'))
        Module['registerDeviceOrientationEventCallback'] = function () {
          abort(
            "'registerDeviceOrientationEventCallback' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'fillDeviceMotionEventData'))
        Module['fillDeviceMotionEventData'] = function () {
          abort(
            "'fillDeviceMotionEventData' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'registerDeviceMotionEventCallback'))
        Module['registerDeviceMotionEventCallback'] = function () {
          abort(
            "'registerDeviceMotionEventCallback' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'screenOrientation'))
        Module['screenOrientation'] = function () {
          abort(
            "'screenOrientation' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'fillOrientationChangeEventData'))
        Module['fillOrientationChangeEventData'] = function () {
          abort(
            "'fillOrientationChangeEventData' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'registerOrientationChangeEventCallback'))
        Module['registerOrientationChangeEventCallback'] = function () {
          abort(
            "'registerOrientationChangeEventCallback' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'fillFullscreenChangeEventData'))
        Module['fillFullscreenChangeEventData'] = function () {
          abort(
            "'fillFullscreenChangeEventData' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'registerFullscreenChangeEventCallback'))
        Module['registerFullscreenChangeEventCallback'] = function () {
          abort(
            "'registerFullscreenChangeEventCallback' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'registerRestoreOldStyle'))
        Module['registerRestoreOldStyle'] = function () {
          abort(
            "'registerRestoreOldStyle' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'hideEverythingExceptGivenElement'))
        Module['hideEverythingExceptGivenElement'] = function () {
          abort(
            "'hideEverythingExceptGivenElement' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'restoreHiddenElements'))
        Module['restoreHiddenElements'] = function () {
          abort(
            "'restoreHiddenElements' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'setLetterbox'))
        Module['setLetterbox'] = function () {
          abort("'setLetterbox' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'currentFullscreenStrategy'))
        Module['currentFullscreenStrategy'] = function () {
          abort(
            "'currentFullscreenStrategy' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'restoreOldWindowedStyle'))
        Module['restoreOldWindowedStyle'] = function () {
          abort(
            "'restoreOldWindowedStyle' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'softFullscreenResizeWebGLRenderTarget'))
        Module['softFullscreenResizeWebGLRenderTarget'] = function () {
          abort(
            "'softFullscreenResizeWebGLRenderTarget' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'doRequestFullscreen'))
        Module['doRequestFullscreen'] = function () {
          abort(
            "'doRequestFullscreen' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'fillPointerlockChangeEventData'))
        Module['fillPointerlockChangeEventData'] = function () {
          abort(
            "'fillPointerlockChangeEventData' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'registerPointerlockChangeEventCallback'))
        Module['registerPointerlockChangeEventCallback'] = function () {
          abort(
            "'registerPointerlockChangeEventCallback' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'registerPointerlockErrorEventCallback'))
        Module['registerPointerlockErrorEventCallback'] = function () {
          abort(
            "'registerPointerlockErrorEventCallback' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'requestPointerLock'))
        Module['requestPointerLock'] = function () {
          abort(
            "'requestPointerLock' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'fillVisibilityChangeEventData'))
        Module['fillVisibilityChangeEventData'] = function () {
          abort(
            "'fillVisibilityChangeEventData' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'registerVisibilityChangeEventCallback'))
        Module['registerVisibilityChangeEventCallback'] = function () {
          abort(
            "'registerVisibilityChangeEventCallback' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'registerTouchEventCallback'))
        Module['registerTouchEventCallback'] = function () {
          abort(
            "'registerTouchEventCallback' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'fillGamepadEventData'))
        Module['fillGamepadEventData'] = function () {
          abort(
            "'fillGamepadEventData' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'registerGamepadEventCallback'))
        Module['registerGamepadEventCallback'] = function () {
          abort(
            "'registerGamepadEventCallback' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'registerBeforeUnloadEventCallback'))
        Module['registerBeforeUnloadEventCallback'] = function () {
          abort(
            "'registerBeforeUnloadEventCallback' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'fillBatteryEventData'))
        Module['fillBatteryEventData'] = function () {
          abort(
            "'fillBatteryEventData' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'battery'))
        Module['battery'] = function () {
          abort("'battery' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'registerBatteryEventCallback'))
        Module['registerBatteryEventCallback'] = function () {
          abort(
            "'registerBatteryEventCallback' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'setCanvasElementSize'))
        Module['setCanvasElementSize'] = function () {
          abort(
            "'setCanvasElementSize' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'getCanvasElementSize'))
        Module['getCanvasElementSize'] = function () {
          abort(
            "'getCanvasElementSize' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'polyfillSetImmediate'))
        Module['polyfillSetImmediate'] = function () {
          abort(
            "'polyfillSetImmediate' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'demangle'))
        Module['demangle'] = function () {
          abort("'demangle' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'demangleAll'))
        Module['demangleAll'] = function () {
          abort("'demangleAll' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'jsStackTrace'))
        Module['jsStackTrace'] = function () {
          abort("'jsStackTrace' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'stackTrace'))
        Module['stackTrace'] = function () {
          abort("'stackTrace' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'getEnvStrings'))
        Module['getEnvStrings'] = function () {
          abort(
            "'getEnvStrings' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'checkWasiClock'))
        Module['checkWasiClock'] = function () {
          abort(
            "'checkWasiClock' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'flush_NO_FILESYSTEM'))
        Module['flush_NO_FILESYSTEM'] = function () {
          abort(
            "'flush_NO_FILESYSTEM' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'writeI53ToI64'))
        Module['writeI53ToI64'] = function () {
          abort(
            "'writeI53ToI64' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'writeI53ToI64Clamped'))
        Module['writeI53ToI64Clamped'] = function () {
          abort(
            "'writeI53ToI64Clamped' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'writeI53ToI64Signaling'))
        Module['writeI53ToI64Signaling'] = function () {
          abort(
            "'writeI53ToI64Signaling' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'writeI53ToU64Clamped'))
        Module['writeI53ToU64Clamped'] = function () {
          abort(
            "'writeI53ToU64Clamped' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'writeI53ToU64Signaling'))
        Module['writeI53ToU64Signaling'] = function () {
          abort(
            "'writeI53ToU64Signaling' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'readI53FromI64'))
        Module['readI53FromI64'] = function () {
          abort(
            "'readI53FromI64' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'readI53FromU64'))
        Module['readI53FromU64'] = function () {
          abort(
            "'readI53FromU64' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'convertI32PairToI53'))
        Module['convertI32PairToI53'] = function () {
          abort(
            "'convertI32PairToI53' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'convertU32PairToI53'))
        Module['convertU32PairToI53'] = function () {
          abort(
            "'convertU32PairToI53' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'uncaughtExceptionCount'))
        Module['uncaughtExceptionCount'] = function () {
          abort(
            "'uncaughtExceptionCount' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'exceptionLast'))
        Module['exceptionLast'] = function () {
          abort(
            "'exceptionLast' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'exceptionCaught'))
        Module['exceptionCaught'] = function () {
          abort(
            "'exceptionCaught' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'ExceptionInfo'))
        Module['ExceptionInfo'] = function () {
          abort(
            "'ExceptionInfo' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'CatchInfo'))
        Module['CatchInfo'] = function () {
          abort("'CatchInfo' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'exception_addRef'))
        Module['exception_addRef'] = function () {
          abort(
            "'exception_addRef' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'exception_decRef'))
        Module['exception_decRef'] = function () {
          abort(
            "'exception_decRef' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'Browser'))
        Module['Browser'] = function () {
          abort("'Browser' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'funcWrappers'))
        Module['funcWrappers'] = function () {
          abort("'funcWrappers' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'getFuncWrapper'))
        Module['getFuncWrapper'] = function () {
          abort(
            "'getFuncWrapper' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'setMainLoop'))
        Module['setMainLoop'] = function () {
          abort("'setMainLoop' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'wget'))
        Module['wget'] = function () {
          abort("'wget' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'FS'))
        Module['FS'] = function () {
          abort("'FS' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'MEMFS'))
        Module['MEMFS'] = function () {
          abort("'MEMFS' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'TTY'))
        Module['TTY'] = function () {
          abort("'TTY' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'PIPEFS'))
        Module['PIPEFS'] = function () {
          abort("'PIPEFS' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'SOCKFS'))
        Module['SOCKFS'] = function () {
          abort("'SOCKFS' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, '_setNetworkCallback'))
        Module['_setNetworkCallback'] = function () {
          abort(
            "'_setNetworkCallback' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'tempFixedLengthArray'))
        Module['tempFixedLengthArray'] = function () {
          abort(
            "'tempFixedLengthArray' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'miniTempWebGLFloatBuffers'))
        Module['miniTempWebGLFloatBuffers'] = function () {
          abort(
            "'miniTempWebGLFloatBuffers' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'heapObjectForWebGLType'))
        Module['heapObjectForWebGLType'] = function () {
          abort(
            "'heapObjectForWebGLType' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'heapAccessShiftForWebGLHeap'))
        Module['heapAccessShiftForWebGLHeap'] = function () {
          abort(
            "'heapAccessShiftForWebGLHeap' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'GL'))
        Module['GL'] = function () {
          abort("'GL' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'emscriptenWebGLGet'))
        Module['emscriptenWebGLGet'] = function () {
          abort(
            "'emscriptenWebGLGet' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'computeUnpackAlignedImageSize'))
        Module['computeUnpackAlignedImageSize'] = function () {
          abort(
            "'computeUnpackAlignedImageSize' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'emscriptenWebGLGetTexPixelData'))
        Module['emscriptenWebGLGetTexPixelData'] = function () {
          abort(
            "'emscriptenWebGLGetTexPixelData' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'emscriptenWebGLGetUniform'))
        Module['emscriptenWebGLGetUniform'] = function () {
          abort(
            "'emscriptenWebGLGetUniform' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'webglGetUniformLocation'))
        Module['webglGetUniformLocation'] = function () {
          abort(
            "'webglGetUniformLocation' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'webglPrepareUniformLocationsBeforeFirstUse'))
        Module['webglPrepareUniformLocationsBeforeFirstUse'] = function () {
          abort(
            "'webglPrepareUniformLocationsBeforeFirstUse' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'webglGetLeftBracePos'))
        Module['webglGetLeftBracePos'] = function () {
          abort(
            "'webglGetLeftBracePos' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'emscriptenWebGLGetVertexAttrib'))
        Module['emscriptenWebGLGetVertexAttrib'] = function () {
          abort(
            "'emscriptenWebGLGetVertexAttrib' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'writeGLArray'))
        Module['writeGLArray'] = function () {
          abort("'writeGLArray' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'AL'))
        Module['AL'] = function () {
          abort("'AL' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'SDL_unicode'))
        Module['SDL_unicode'] = function () {
          abort("'SDL_unicode' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'SDL_ttfContext'))
        Module['SDL_ttfContext'] = function () {
          abort(
            "'SDL_ttfContext' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'SDL_audio'))
        Module['SDL_audio'] = function () {
          abort("'SDL_audio' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'SDL'))
        Module['SDL'] = function () {
          abort("'SDL' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'SDL_gfx'))
        Module['SDL_gfx'] = function () {
          abort("'SDL_gfx' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'GLUT'))
        Module['GLUT'] = function () {
          abort("'GLUT' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'EGL'))
        Module['EGL'] = function () {
          abort("'EGL' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'GLFW_Window'))
        Module['GLFW_Window'] = function () {
          abort("'GLFW_Window' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'GLFW'))
        Module['GLFW'] = function () {
          abort("'GLFW' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'GLEW'))
        Module['GLEW'] = function () {
          abort("'GLEW' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'IDBStore'))
        Module['IDBStore'] = function () {
          abort("'IDBStore' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'runAndAbortIfError'))
        Module['runAndAbortIfError'] = function () {
          abort(
            "'runAndAbortIfError' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'warnOnce'))
        Module['warnOnce'] = function () {
          abort("'warnOnce' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'stackSave'))
        Module['stackSave'] = function () {
          abort("'stackSave' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'stackRestore'))
        Module['stackRestore'] = function () {
          abort("'stackRestore' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'stackAlloc'))
        Module['stackAlloc'] = function () {
          abort("'stackAlloc' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'AsciiToString'))
        Module['AsciiToString'] = function () {
          abort(
            "'AsciiToString' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'stringToAscii'))
        Module['stringToAscii'] = function () {
          abort(
            "'stringToAscii' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'UTF16ToString'))
        Module['UTF16ToString'] = function () {
          abort(
            "'UTF16ToString' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'stringToUTF16'))
        Module['stringToUTF16'] = function () {
          abort(
            "'stringToUTF16' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'lengthBytesUTF16'))
        Module['lengthBytesUTF16'] = function () {
          abort(
            "'lengthBytesUTF16' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'UTF32ToString'))
        Module['UTF32ToString'] = function () {
          abort(
            "'UTF32ToString' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'stringToUTF32'))
        Module['stringToUTF32'] = function () {
          abort(
            "'stringToUTF32' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'lengthBytesUTF32'))
        Module['lengthBytesUTF32'] = function () {
          abort(
            "'lengthBytesUTF32' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'allocateUTF8'))
        Module['allocateUTF8'] = function () {
          abort("'allocateUTF8' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)")
        }
      if (!Object.getOwnPropertyDescriptor(Module, 'allocateUTF8OnStack'))
        Module['allocateUTF8OnStack'] = function () {
          abort(
            "'allocateUTF8OnStack' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
          )
        }
      Module['writeStackCookie'] = writeStackCookie
      Module['checkStackCookie'] = checkStackCookie
      if (!Object.getOwnPropertyDescriptor(Module, 'ALLOC_NORMAL'))
        Object.defineProperty(Module, 'ALLOC_NORMAL', {
          configurable: true,
          get: function () {
            abort(
              "'ALLOC_NORMAL' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
            )
          },
        })
      if (!Object.getOwnPropertyDescriptor(Module, 'ALLOC_STACK'))
        Object.defineProperty(Module, 'ALLOC_STACK', {
          configurable: true,
          get: function () {
            abort(
              "'ALLOC_STACK' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)",
            )
          },
        })
      var calledRun
      /**
       * @constructor
       * @this {ExitStatus}
       */
      function ExitStatus(status) {
        this.name = 'ExitStatus'
        this.message = 'Program terminated with exit(' + status + ')'
        this.status = status
      }
      dependenciesFulfilled = function runCaller() {
        if (!calledRun) run()
        if (!calledRun) dependenciesFulfilled = runCaller
      }
      function callMain(args) {
        assert(
          runDependencies == 0,
          'cannot call main when async dependencies remain! (listen on Module["onRuntimeInitialized"])',
        )
        assert(
          __ATPRERUN__.length == 0,
          'cannot call main when preRun functions remain to be called',
        )
        var entryFunction = Module['_main']
        args = args || []
        var argc = args.length + 1
        var argv = stackAlloc((argc + 1) * 4)
        HEAP32[argv >> 2] = allocateUTF8OnStack(thisProgram)
        for (var i = 1; i < argc; i++) HEAP32[(argv >> 2) + i] = allocateUTF8OnStack(args[i - 1])
        HEAP32[(argv >> 2) + argc] = 0
        try {
          var ret = entryFunction(argc, argv)
          exit(ret, true)
          return ret
        } catch (e) {
          return handleException(e)
        }
      }
      function stackCheckInit() {
        _emscripten_stack_init()
        writeStackCookie()
      }
      /** @type {function(Array=)} */
      function run(args) {
        args = args || arguments_
        if (runDependencies > 0) return
        stackCheckInit()
        preRun()
        if (runDependencies > 0) return
        function doRun() {
          if (calledRun) return
          calledRun = true
          Module['calledRun'] = true
          if (ABORT) return
          initRuntime()
          preMain()
          readyPromiseResolve(Module)
          if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']()
          if (shouldRunNow) callMain(args)
          postRun()
        }
        if (Module['setStatus']) {
          Module['setStatus']('Running...')
          setTimeout(function () {
            setTimeout(function () {
              Module['setStatus']('')
            }, 1)
            doRun()
          }, 1)
        } else doRun()
        checkStackCookie()
      }
      Module['run'] = run
      function checkUnflushedContent() {
        var oldOut = out
        var oldErr = err
        var has = false
        out = err = function (x) {
          has = true
        }
        try {
          var flush = flush_NO_FILESYSTEM
          if (flush) flush()
        } catch (e) {}
        out = oldOut
        err = oldErr
        if (has) {
          warnOnce(
            'stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the FAQ), or make sure to emit a newline when you printf etc.',
          )
          warnOnce(
            '(this may also be due to not including full filesystem support - try building with -s FORCE_FILESYSTEM=1)',
          )
        }
      }
      /** @param {boolean|number=} implicit */
      function exit(status, implicit) {
        EXITSTATUS = status
        checkUnflushedContent()
        if (keepRuntimeAlive()) {
          if (!implicit) {
            var msg =
              'program exited (with status: ' +
              status +
              '), but EXIT_RUNTIME is not set, so halting execution but not exiting the runtime or preventing further async execution (build with EXIT_RUNTIME=1, if you want a true shutdown)'
            readyPromiseReject(msg)
            err(msg)
          }
        } else exitRuntime()
        procExit(status)
      }
      function procExit(code) {
        EXITSTATUS = code
        if (!keepRuntimeAlive()) {
          if (Module['onExit']) Module['onExit'](code)
          ABORT = true
        }
        quit_(code, new ExitStatus(code))
      }
      if (Module['preInit']) {
        if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']]
        while (Module['preInit'].length > 0) Module['preInit'].pop()()
      }
      var shouldRunNow = true
      if (Module['noInitialRun']) shouldRunNow = false
      run()
      return opus_module.ready
    }
  })()
  var opus_default = opus_module

  //#endregion
  //#region ../../node_modules/.pnpm/ms@2.1.3/node_modules/ms/index.js
  var require_ms = /* @__PURE__ */ __commonJSMin((exports, module) => {
    /**
     * Helpers.
     */
    var s = 1e3
    var m = s * 60
    var h = m * 60
    var d = h * 24
    var w = d * 7
    var y = d * 365.25
    /**
     * Parse or format the given `val`.
     *
     * Options:
     *
     *  - `long` verbose formatting [false]
     *
     * @param {String|Number} val
     * @param {Object} [options]
     * @throws {Error} throw an error if val is not a non-empty string or a number
     * @return {String|Number}
     * @api public
     */
    module.exports = function (val, options) {
      options = options || {}
      var type = typeof val
      if (type === 'string' && val.length > 0) return parse(val)
      else if (type === 'number' && isFinite(val))
        return options.long ? fmtLong(val) : fmtShort(val)
      throw new Error('val is not a non-empty string or a valid number. val=' + JSON.stringify(val))
    }
    /**
     * Parse the given `str` and return milliseconds.
     *
     * @param {String} str
     * @return {Number}
     * @api private
     */
    function parse(str) {
      str = String(str)
      if (str.length > 100) return
      var match =
        /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
          str,
        )
      if (!match) return
      var n = parseFloat(match[1])
      switch ((match[2] || 'ms').toLowerCase()) {
        case 'years':
        case 'year':
        case 'yrs':
        case 'yr':
        case 'y':
          return n * y
        case 'weeks':
        case 'week':
        case 'w':
          return n * w
        case 'days':
        case 'day':
        case 'd':
          return n * d
        case 'hours':
        case 'hour':
        case 'hrs':
        case 'hr':
        case 'h':
          return n * h
        case 'minutes':
        case 'minute':
        case 'mins':
        case 'min':
        case 'm':
          return n * m
        case 'seconds':
        case 'second':
        case 'secs':
        case 'sec':
        case 's':
          return n * s
        case 'milliseconds':
        case 'millisecond':
        case 'msecs':
        case 'msec':
        case 'ms':
          return n
        default:
          return
      }
    }
    /**
     * Short format for `ms`.
     *
     * @param {Number} ms
     * @return {String}
     * @api private
     */
    function fmtShort(ms) {
      var msAbs = Math.abs(ms)
      if (msAbs >= d) return Math.round(ms / d) + 'd'
      if (msAbs >= h) return Math.round(ms / h) + 'h'
      if (msAbs >= m) return Math.round(ms / m) + 'm'
      if (msAbs >= s) return Math.round(ms / s) + 's'
      return ms + 'ms'
    }
    /**
     * Long format for `ms`.
     *
     * @param {Number} ms
     * @return {String}
     * @api private
     */
    function fmtLong(ms) {
      var msAbs = Math.abs(ms)
      if (msAbs >= d) return plural(ms, msAbs, d, 'day')
      if (msAbs >= h) return plural(ms, msAbs, h, 'hour')
      if (msAbs >= m) return plural(ms, msAbs, m, 'minute')
      if (msAbs >= s) return plural(ms, msAbs, s, 'second')
      return ms + ' ms'
    }
    /**
     * Pluralization helper.
     */
    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5
      return Math.round(ms / n) + ' ' + name + (isPlural ? 's' : '')
    }
  })

  //#endregion
  //#region ../../node_modules/.pnpm/debug@4.4.3/node_modules/debug/src/common.js
  var require_common = /* @__PURE__ */ __commonJSMin((exports, module) => {
    /**
     * This is the common logic for both the Node.js and web browser
     * implementations of `debug()`.
     */
    function setup(env) {
      createDebug.debug = createDebug
      createDebug.default = createDebug
      createDebug.coerce = coerce
      createDebug.disable = disable
      createDebug.enable = enable
      createDebug.enabled = enabled
      createDebug.humanize = require_ms()
      createDebug.destroy = destroy
      Object.keys(env).forEach((key) => {
        createDebug[key] = env[key]
      })
      /**
       * The currently active debug mode names, and names to skip.
       */
      createDebug.names = []
      createDebug.skips = []
      /**
       * Map of special "%n" handling functions, for the debug "format" argument.
       *
       * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
       */
      createDebug.formatters = {}
      /**
       * Selects a color for a debug namespace
       * @param {String} namespace The namespace string for the debug instance to be colored
       * @return {Number|String} An ANSI color code for the given namespace
       * @api private
       */
      function selectColor(namespace) {
        let hash = 0
        for (let i = 0; i < namespace.length; i++) {
          hash = (hash << 5) - hash + namespace.charCodeAt(i)
          hash |= 0
        }
        return createDebug.colors[Math.abs(hash) % createDebug.colors.length]
      }
      createDebug.selectColor = selectColor
      /**
       * Create a debugger with the given `namespace`.
       *
       * @param {String} namespace
       * @return {Function}
       * @api public
       */
      function createDebug(namespace) {
        let prevTime
        let enableOverride = null
        let namespacesCache
        let enabledCache
        function debug$1(...args) {
          if (!debug$1.enabled) return
          const self = debug$1
          const curr = Number(/* @__PURE__ */ new Date())
          self.diff = curr - (prevTime || curr)
          self.prev = prevTime
          self.curr = curr
          prevTime = curr
          args[0] = createDebug.coerce(args[0])
          if (typeof args[0] !== 'string') args.unshift('%O')
          let index = 0
          args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
            if (match === '%%') return '%'
            index++
            const formatter = createDebug.formatters[format]
            if (typeof formatter === 'function') {
              const val = args[index]
              match = formatter.call(self, val)
              args.splice(index, 1)
              index--
            }
            return match
          })
          createDebug.formatArgs.call(self, args)
          ;(self.log || createDebug.log).apply(self, args)
        }
        debug$1.namespace = namespace
        debug$1.useColors = createDebug.useColors()
        debug$1.color = createDebug.selectColor(namespace)
        debug$1.extend = extend
        debug$1.destroy = createDebug.destroy
        Object.defineProperty(debug$1, 'enabled', {
          enumerable: true,
          configurable: false,
          get: () => {
            if (enableOverride !== null) return enableOverride
            if (namespacesCache !== createDebug.namespaces) {
              namespacesCache = createDebug.namespaces
              enabledCache = createDebug.enabled(namespace)
            }
            return enabledCache
          },
          set: (v) => {
            enableOverride = v
          },
        })
        if (typeof createDebug.init === 'function') createDebug.init(debug$1)
        return debug$1
      }
      function extend(namespace, delimiter) {
        const newDebug = createDebug(
          this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace,
        )
        newDebug.log = this.log
        return newDebug
      }
      /**
       * Enables a debug mode by namespaces. This can include modes
       * separated by a colon and wildcards.
       *
       * @param {String} namespaces
       * @api public
       */
      function enable(namespaces) {
        createDebug.save(namespaces)
        createDebug.namespaces = namespaces
        createDebug.names = []
        createDebug.skips = []
        const split = (typeof namespaces === 'string' ? namespaces : '')
          .trim()
          .replace(/\s+/g, ',')
          .split(',')
          .filter(Boolean)
        for (const ns of split)
          if (ns[0] === '-') createDebug.skips.push(ns.slice(1))
          else createDebug.names.push(ns)
      }
      /**
       * Checks if the given string matches a namespace template, honoring
       * asterisks as wildcards.
       *
       * @param {String} search
       * @param {String} template
       * @return {Boolean}
       */
      function matchesTemplate(search, template) {
        let searchIndex = 0
        let templateIndex = 0
        let starIndex = -1
        let matchIndex = 0
        while (searchIndex < search.length)
          if (
            templateIndex < template.length &&
            (template[templateIndex] === search[searchIndex] || template[templateIndex] === '*')
          )
            if (template[templateIndex] === '*') {
              starIndex = templateIndex
              matchIndex = searchIndex
              templateIndex++
            } else {
              searchIndex++
              templateIndex++
            }
          else if (starIndex !== -1) {
            templateIndex = starIndex + 1
            matchIndex++
            searchIndex = matchIndex
          } else return false
        while (templateIndex < template.length && template[templateIndex] === '*') templateIndex++
        return templateIndex === template.length
      }
      /**
       * Disable debug output.
       *
       * @return {String} namespaces
       * @api public
       */
      function disable() {
        const namespaces = [
          ...createDebug.names,
          ...createDebug.skips.map((namespace) => '-' + namespace),
        ].join(',')
        createDebug.enable('')
        return namespaces
      }
      /**
       * Returns true if the given mode name is enabled, false otherwise.
       *
       * @param {String} name
       * @return {Boolean}
       * @api public
       */
      function enabled(name) {
        for (const skip of createDebug.skips) if (matchesTemplate(name, skip)) return false
        for (const ns of createDebug.names) if (matchesTemplate(name, ns)) return true
        return false
      }
      /**
       * Coerce `val`.
       *
       * @param {Mixed} val
       * @return {Mixed}
       * @api private
       */
      function coerce(val) {
        if (val instanceof Error) return val.stack || val.message
        return val
      }
      /**
       * XXX DO NOT USE. This is a temporary stub function.
       * XXX It WILL be removed in the next major release.
       */
      function destroy() {
        console.warn(
          'Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.',
        )
      }
      createDebug.enable(createDebug.load())
      return createDebug
    }
    module.exports = setup
  })

  //#endregion
  //#region ../../node_modules/.pnpm/debug@4.4.3/node_modules/debug/src/browser.js
  var require_browser = /* @__PURE__ */ __commonJSMin((exports, module) => {
    /**
     * This is the web browser implementation of `debug()`.
     */
    exports.formatArgs = formatArgs
    exports.save = save
    exports.load = load
    exports.useColors = useColors
    exports.storage = localstorage()
    exports.destroy = (() => {
      let warned = false
      return () => {
        if (!warned) {
          warned = true
          console.warn(
            'Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.',
          )
        }
      }
    })()
    /**
     * Colors.
     */
    exports.colors = [
      '#0000CC',
      '#0000FF',
      '#0033CC',
      '#0033FF',
      '#0066CC',
      '#0066FF',
      '#0099CC',
      '#0099FF',
      '#00CC00',
      '#00CC33',
      '#00CC66',
      '#00CC99',
      '#00CCCC',
      '#00CCFF',
      '#3300CC',
      '#3300FF',
      '#3333CC',
      '#3333FF',
      '#3366CC',
      '#3366FF',
      '#3399CC',
      '#3399FF',
      '#33CC00',
      '#33CC33',
      '#33CC66',
      '#33CC99',
      '#33CCCC',
      '#33CCFF',
      '#6600CC',
      '#6600FF',
      '#6633CC',
      '#6633FF',
      '#66CC00',
      '#66CC33',
      '#9900CC',
      '#9900FF',
      '#9933CC',
      '#9933FF',
      '#99CC00',
      '#99CC33',
      '#CC0000',
      '#CC0033',
      '#CC0066',
      '#CC0099',
      '#CC00CC',
      '#CC00FF',
      '#CC3300',
      '#CC3333',
      '#CC3366',
      '#CC3399',
      '#CC33CC',
      '#CC33FF',
      '#CC6600',
      '#CC6633',
      '#CC9900',
      '#CC9933',
      '#CCCC00',
      '#CCCC33',
      '#FF0000',
      '#FF0033',
      '#FF0066',
      '#FF0099',
      '#FF00CC',
      '#FF00FF',
      '#FF3300',
      '#FF3333',
      '#FF3366',
      '#FF3399',
      '#FF33CC',
      '#FF33FF',
      '#FF6600',
      '#FF6633',
      '#FF9900',
      '#FF9933',
      '#FFCC00',
      '#FFCC33',
    ]
    /**
     * Currently only WebKit-based Web Inspectors, Firefox >= v31,
     * and the Firebug extension (any Firefox version) are known
     * to support "%c" CSS customizations.
     *
     * TODO: add a `localStorage` variable to explicitly enable/disable colors
     */
    function useColors() {
      if (
        typeof window !== 'undefined' &&
        window.process &&
        (window.process.type === 'renderer' || window.process.__nwjs)
      )
        return true
      if (
        typeof navigator !== 'undefined' &&
        navigator.userAgent &&
        navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)
      )
        return false
      let m
      return (
        (typeof document !== 'undefined' &&
          document.documentElement &&
          document.documentElement.style &&
          document.documentElement.style.WebkitAppearance) ||
        (typeof window !== 'undefined' &&
          window.console &&
          (window.console.firebug || (window.console.exception && window.console.table))) ||
        (typeof navigator !== 'undefined' &&
          navigator.userAgent &&
          (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) &&
          parseInt(m[1], 10) >= 31) ||
        (typeof navigator !== 'undefined' &&
          navigator.userAgent &&
          navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/))
      )
    }
    /**
     * Colorize log arguments if enabled.
     *
     * @api public
     */
    function formatArgs(args) {
      args[0] =
        (this.useColors ? '%c' : '') +
        this.namespace +
        (this.useColors ? ' %c' : ' ') +
        args[0] +
        (this.useColors ? '%c ' : ' ') +
        '+' +
        module.exports.humanize(this.diff)
      if (!this.useColors) return
      const c = 'color: ' + this.color
      args.splice(1, 0, c, 'color: inherit')
      let index = 0
      let lastC = 0
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === '%%') return
        index++
        if (match === '%c') lastC = index
      })
      args.splice(lastC, 0, c)
    }
    /**
     * Invokes `console.debug()` when available.
     * No-op when `console.debug` is not a "function".
     * If `console.debug` is not available, falls back
     * to `console.log`.
     *
     * @api public
     */
    exports.log = console.debug || console.log || (() => {})
    /**
     * Save `namespaces`.
     *
     * @param {String} namespaces
     * @api private
     */
    function save(namespaces) {
      try {
        if (namespaces) exports.storage.setItem('debug', namespaces)
        else exports.storage.removeItem('debug')
      } catch (error) {}
    }
    /**
     * Load `namespaces`.
     *
     * @return {String} returns the previously persisted debug modes
     * @api private
     */
    function load() {
      let r
      try {
        r = exports.storage.getItem('debug') || exports.storage.getItem('DEBUG')
      } catch (error) {}
      if (!r && typeof process !== 'undefined' && 'env' in process) r = process.env.DEBUG
      return r
    }
    /**
     * Localstorage attempts to return the localstorage.
     *
     * This is necessary because safari throws
     * when a user disables cookies/localstorage
     * and you attempt to access it.
     *
     * @return {LocalStorage}
     * @api private
     */
    function localstorage() {
      try {
        return localStorage
      } catch (error) {}
    }
    module.exports = require_common()(exports)
    const { formatters } = module.exports
    /**
     * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
     */
    formatters.j = function (v) {
      try {
        return JSON.stringify(v)
      } catch (error) {
        return '[UnexpectedJSONParseError]: ' + error.message
      }
    }
  })

  //#endregion
  //#region src/log/weila_log.ts
  var import_browser = require_browser()
  /**
   * 获取logger
   * 例子： getLogger('CORE:info'), 返回的logger可以直接用来打印信息，前缀为CORE:info
   * @param loggerName
   */
  function getLogger(loggerName) {
    const logger = (0, import_browser.debug)(loggerName)
    logger.log = console.log.bind(console)
    return logger
  }

  //#endregion
  //#region src/audio/weila_recorder.worklet.js
  const wllog = getLogger('AUDIO:recorder_worker:info')
  getLogger('AUDIO:recorder_worker:err')
  const RECORD_OPENING = 0
  const RECORD_OPENED = 1
  const RECORD_CLOSING = 2
  const RECORD_CLOSED = 3
  const RECORD_STARTING = 4
  const RECORD_STARTED = 5
  const RECORD_STOPPING = 9
  const RECORD_STOPPED = 10
  var WLRecorderWorklet = class extends AudioWorkletProcessor {
    constructor(options) {
      super(options)
      this.state = RECORD_CLOSED
      this.wasmData = options.processorOptions.wasmData
      this.port.onmessage = this.onMessage.bind(this)
      this.opusModule = null
      this.encoder = 0
      this.pcmBuffer = 0
      this.encodedData = 0
      this.sampleRate = 48e3
      this.bitRate = 15e3
      this.pcmArray = null
      this.frameRingBuffer = null
      this.transportWithList = options.processorOptions.transportWithList
      wllog('传输类型:%s', this.transportWithList ? '数组' : '缓存')
    }
    reportRspEvent(event, result, errorMsg) {
      this.port.postMessage({
        event,
        data: {
          result,
          errorMsg,
        },
      })
    }
    reset() {
      if (this.encoder) {
        this.opusModule._Opus_destroyEncoder(this.encoder)
        this.encoder = 0
      }
      if (this.pcmBuffer) {
        this.opusModule._free(this.pcmBuffer)
        this.pcmBuffer = 0
      }
      if (this.encodedData) {
        this.opusModule._free(this.encodedData)
        this.encodedData = 0
      }
      this.opusModule = null
    }
    onMessage(event) {
      const ev = event.data
      wllog('录音器收到事件:%d', ev.event)
      switch (ev.event) {
        case WLAudioRecorderEvent.WL_WORKLET_NODE_OPEN_REQ:
          {
            this.sampleRate = ev.data.sampleRate
            this.bitRate = ev.data.bitRate
            this.state = RECORD_OPENING
            this.frameRingBuffer = new WeilaRingBuffer(this.sampleRate * 60, false)
            this.processFrameCount = Math.ceil(this.sampleRate / 50)
            this.pcmArray = new Int16Array(this.processFrameCount)
            const Module = {}
            Module['wasmBinary'] = this.wasmData
            opus_default(Module)
              .then(async (value) => {
                if (this.state === RECORD_CLOSING) {
                  this.reset()
                  return
                }
                this.opusModule = value
                this.encoder = this.opusModule._Opus_initEncoder(this.sampleRate, 1, this.bitRate)
                if (!this.encoder) {
                  this.reset()
                  this.reportRspEvent(
                    WLAudioRecorderEvent.WL_WORKLET_NODE_OPEN_RSP,
                    false,
                    '编码器初始化失败',
                  )
                  return
                }
                this.pcmBuffer = this.opusModule._malloc(
                  this.processFrameCount * Int16Array.BYTES_PER_ELEMENT,
                )
                if (!this.pcmBuffer) {
                  this.reset()
                  this.reportRspEvent(
                    WLAudioRecorderEvent.WL_WORKLET_NODE_OPEN_RSP,
                    false,
                    '申请内存失败',
                  )
                  return
                }
                this.encodedData = this.opusModule._malloc(256)
                if (!this.encodedData) {
                  this.reset()
                  this.reportRspEvent(
                    WLAudioRecorderEvent.WL_WORKLET_NODE_OPEN_RSP,
                    false,
                    '申请内存失败',
                  )
                  return
                }
                this.state = RECORD_OPENED
                this.reportRspEvent(WLAudioRecorderEvent.WL_WORKLET_NODE_OPEN_RSP, true)
              })
              .catch((reason) => {
                this.reportRspEvent(
                  WLAudioRecorderEvent.WL_WORKLET_NODE_OPEN_RSP,
                  false,
                  '出现异常:' + reason,
                )
                this.reset()
              })
          }
          break
        case WLAudioRecorderEvent.WL_WORKLET_NODE_START_REQ:
          this.state = RECORD_STARTING
          break
        case WLAudioRecorderEvent.WL_WORKLET_NODE_STOP_REQ:
          this.state = RECORD_STOPPING
          break
        case WLAudioRecorderEvent.WL_WORKLET_NODE_CLOSE_REQ:
          if (this.state === RECORD_STARTED) this.state = RECORD_CLOSING
          else {
            this.state = RECORD_CLOSING
            this.closeRecorder()
          }
          break
      }
    }
    static get parameterDescriptors() {
      return [
        {
          name: 'gainChannel_0',
          defaultValue: 0.5,
          minValue: 0,
          maxValue: 1,
          automationRate: 'k-rate',
        },
        {
          name: 'gainChannel_1',
          defaultValue: 0.5,
          minValue: 0,
          maxValue: 1,
          automationRate: 'k-rate',
        },
      ]
    }
    encodeData() {
      if (this.state === RECORD_STARTED) {
        this.frameRingBuffer.pull(this.pcmArray)
        const bytesBuffer = new Uint8Array(this.pcmArray.buffer)
        this.opusModule.writeArrayToMemory(bytesBuffer, this.pcmBuffer)
        const encodedLen = this.opusModule._Opus_encode(
          this.encoder,
          this.pcmBuffer,
          this.processFrameCount,
          this.encodedData,
          128,
        )
        if (encodedLen > 0) {
          const dataBuffer = new Uint8Array(
            this.opusModule.HEAPU8.buffer,
            this.encodedData,
            encodedLen,
          )
          if (this.transportWithList) {
            const dataList = []
            dataBuffer.forEach((value) => {
              dataList.push(value)
            })
            this.port.postMessage({
              event: WLAudioRecorderEvent.WL_WORKLET_NODE_DATA_IND,
              data: {
                type: 'array',
                data: dataList,
              },
            })
          } else
            try {
              this.port.postMessage(
                {
                  event: WLAudioRecorderEvent.WL_WORKLET_NODE_DATA_IND,
                  data: {
                    type: 'buffer',
                    data: dataBuffer,
                  },
                },
                [dataBuffer.buffer],
              )
            } catch (e) {
              this.transportWithList = true
              const dataList = []
              dataBuffer.forEach((value) => {
                dataList.push(value)
              })
              this.port.postMessage({
                event: WLAudioRecorderEvent.WL_WORKLET_NODE_DATA_IND,
                data: {
                  type: 'array',
                  data: dataList,
                },
              })
            }
        }
      }
    }
    closeRecorder() {
      this.reset()
      if (this.frameRingBuffer) {
        this.frameRingBuffer.clear()
        this.frameRingBuffer = null
      }
      this.pcmArray = null
      this.state = RECORD_CLOSED
      this.reportRspEvent(WLAudioRecorderEvent.WL_WORKLET_NODE_CLOSE_RSP, true)
    }
    process(inputs, outputs, params) {
      if (this.state !== RECORD_STARTED) {
        if (this.state === RECORD_STARTING) {
          this.frameRingBuffer.clear()
          this.state = RECORD_STARTED
          this.reportRspEvent(WLAudioRecorderEvent.WL_WORKLET_NODE_START_RSP, true)
        } else if (this.state === RECORD_STOPPING) {
          this.state = RECORD_STOPPED
          this.frameRingBuffer.clear()
          this.reportRspEvent(WLAudioRecorderEvent.WL_WORKLET_NODE_STOP_RSP, true)
        } else if (this.state === RECORD_CLOSING) this.closeRecorder()
        return true
      }
      const inputBuffer = inputs[0][0]
      params['gainChannel_0']
      if (this.frameRingBuffer == null) return true
      this.frameRingBuffer.push(
        new Int16Array(
          inputBuffer.map((v) => {
            return Math.ceil(v * 32768)
          }),
        ),
      )
      if (this.frameRingBuffer.frameAvailable >= this.processFrameCount) this.encodeData()
      return true
    }
  }
  registerProcessor('weila_recorder_processor', WLRecorderWorklet)

  //#endregion
})()
