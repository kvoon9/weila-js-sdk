import { WLConfig } from 'main/weila_config';

class WeilaRingPlayer {
  private static ringCache: Map<number, string> = new Map<number, string>();
  public static async weila_playRing(id: number): Promise<boolean> {
    try {
      let url = '';
      if (this.ringCache.has(id)) {
        url = this.ringCache.get(id);
      } else {
        const configData = await WLConfig.getConfigData(id);
        if (configData) {
          url = configData.resource_url;
        } else {
          return Promise.reject('没有对应的资源');
        }

        this.ringCache.set(id, url);
      }

      return new Promise<boolean>((resolve, reject) => {
        const audio = document.createElement('audio');
        audio.id = 'ring';
        audio.src = url;
        audio.preload = 'auto';
        audio
          .play()
          .then((value) => {
            console.log('播放成功');
            resolve(true);
          })
          .catch((reason) => {
            console.log('播放失败', reason);
            reject('播放铃声失败');
          });
      });
    } catch (e) {
      throw e;
    }
  }
}

export default WeilaRingPlayer;
