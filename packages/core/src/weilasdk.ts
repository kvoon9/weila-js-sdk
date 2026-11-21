/* eslint-disable */
export { WeilaCore } from './main/weila_core'
export type { WL_FileUploader, WL_InitOptions, WL_LoginOptions } from './main/weila_core'
export { createWeilaAudioInitController } from './main/weila_audio_init_controller'
export type {
  WL_AudioInitializable,
  WL_AudioInitController,
  WL_AudioInitControllerOptions,
} from './main/weila_audio_init_controller'
export { installWeilaAudioRuntimePatch } from './main/weila_audio_runtime'
export type { WL_AudioRuntimePatchOptions } from './main/weila_audio_runtime'
export { calculateAudioDuration, getErrorMsg } from './main/weila_utils'
export type { SetConfigDataParam } from './main/weila_config'
export { setConfigData, WL_ConfigID } from './main/weila_config'
export { initLogger, getLogger, setLoggerEnabled, isLoggerEnabled } from './log/weila_log'
export * from './weilasdk_data'

const buildId = process.env.WL_BUILD_ID ?? 'dev'
export const WL_BUILD_ID = buildId
