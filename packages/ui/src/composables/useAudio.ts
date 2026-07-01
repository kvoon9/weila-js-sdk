import { calculateAudioDuration } from '@vois/weila-sdk-core'

/**
 * 将 Opus 帧数转换为音频时长（秒）
 * @param frameCount Opus 帧数量（来自 WL_IDbAudioData.frameCount）
 * @returns 时长（秒），无帧数时返回 0
 */
export function framesToDuration(frameCount: number): number {
  return calculateAudioDuration(frameCount)
}
