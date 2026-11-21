import { WLConfig, WL_ConfigID } from 'main/weila_config'

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

    return new Promise<boolean>((resolve, reject) => {
      const audio = document.createElement('audio')
      audio.id = 'ring'
      audio.src = url
      audio.preload = 'auto'
      audio
        .play()
        .then(() => {
          resolve(true)
        })
        .catch(() => {
          reject('播放铃声失败')
        })
    })
  },
}

export default WeilaRingPlayer
