import { WLConfig, WL_ConfigID } from 'main/weila_config'

/** One ring element for the whole page: a new ring replaces the last one. */
let ringAudio: HTMLAudioElement | null = null

const WeilaRingPlayer = {
  ringCache: new Map<number, string>(),

  async weila_playRing(id: WL_ConfigID): Promise<boolean> {
    let url = ''

    if (this.ringCache.has(id)) {
      url = this.ringCache.get(id) ?? ''
    } else {
      const configData = await WLConfig.getConfigData(id)

      if (configData) {
        url = configData.resource_url ?? ''
      } else {
        return Promise.reject('没有对应的资源')
      }

      this.ringCache.set(id, url)
    }

    if (!ringAudio) {
      ringAudio = document.createElement('audio')
      ringAudio.id = 'ring'
      ringAudio.preload = 'auto'
    }

    ringAudio.pause()
    ringAudio.src = url

    return ringAudio
      .play()
      .then(() => true)
      .catch(() => Promise.reject('播放铃声失败'))
  },
}

export default WeilaRingPlayer
