/**
 * Audio utility composable for Weila SDK UI components.
 *
 * Opus codec frame duration is fixed at 20ms (0.02s) for the SDK's 16kHz sample rate.
 * The core SDK batches 25 frames per packet (`WLPttFsm.FRAME_COUNT = 25`).
 */

/** Opus frame duration in seconds (20ms per frame at 16kHz) */
const OPUS_FRAME_DURATION_SEC = 0.02

/**
 * 将 Opus 帧数转换为音频时长（秒）
 * @param frameCount Opus 帧数量（来自 WL_IDbAudioData.frameCount）
 * @returns 时长（秒），最小返回 1
 */
export function framesToDuration(frameCount: number): number {
  if (!frameCount || frameCount <= 0) return 1
  return Math.max(1, Math.round(frameCount * OPUS_FRAME_DURATION_SEC))
}
