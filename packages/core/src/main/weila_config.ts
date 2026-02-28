import { Dexie } from 'dexie'
//@ts-ignore
import start_play_wav from '../assets/start_player.wav'
//@ts-ignore
import stop_play_wav from '../assets/stop_player.wav'
//@ts-ignore
import start_record_wav from '../assets/start_record.wav'
//@ts-ignore
import stop_record_wav from '../assets/stop_record.wav'
//@ts-ignore
import opus_lib_wasm from '../assets/opuslibs.wasm'

import { getLogger } from 'log/weila_log'

const wllog = getLogger('CFG:info')
const wlerr = getLogger('CFG:err')

enum WL_ConfigID {
  WL_RES_RING_START_PLAY_ID,
  WL_RES_RING_STOP_PLAY_ID,
  WL_RES_RING_START_RECORD_ID,
  WL_RES_RING_STOP_RECORD_ID,
  WL_RES_DATA_OPUS_WASM_ID,
}

const configItemInfo = [
  {
    id: WL_ConfigID.WL_RES_RING_START_PLAY_ID,
    url: start_play_wav,
    dataType: 'data_url',
    version: 1,
  },
  {
    id: WL_ConfigID.WL_RES_RING_STOP_PLAY_ID,
    url: stop_play_wav,
    dataType: 'data_url',
    version: 1,
  },
  {
    id: WL_ConfigID.WL_RES_RING_START_RECORD_ID,
    url: start_record_wav,
    dataType: 'data_url',
    version: 1,
  },
  {
    id: WL_ConfigID.WL_RES_RING_STOP_RECORD_ID,
    url: stop_record_wav,
    dataType: 'data_url',
    version: 1,
  },
  { id: WL_ConfigID.WL_RES_DATA_OPUS_WASM_ID, url: opus_lib_wasm, dataType: 'buffer', version: 1 },
]

interface IConfigData {
  resource_url?: string
  resource_data?: Uint8Array
  version: number
  latestTime: number
}

interface IConfigItem {
  id: number
  data: any
}

class WLConfigDB extends Dexie {
  public configTable!: Dexie.Table<IConfigItem, number>

  constructor() {
    super('WeilaConfigDB')
    this.version(1).stores({
      configTable: 'id',
    })
  }
}

interface SetConfigDataParam {
  id: number
  url: string
  version: number
}

function setConfigData(params: SetConfigDataParam[]) {
  for (let param of params) {
    wllog('setConfigData id:%d url:%s', param.id, param.url)
    for (let item of configItemInfo) {
      if (param.id === item.id) {
        item.url = param.url
        item.version = param.version
      }
    }
  }
}

class WLConfig {
  public static async loadResource(): Promise<boolean> {
    const db = new WLConfigDB()
    for (let item of configItemInfo) {
      wllog('id:%d url:%s', item.id, item.url)
      const configDataItem = {} as IConfigData
      let dbItem = {} as IConfigItem
      let responseData
      configDataItem.latestTime = new Date().getTime()
      configDataItem.version = item.version

      dbItem = await db.configTable.get(item.id)
      if (dbItem) {
        const configItem = dbItem.data as IConfigData
        if (configItem.version >= item.version) {
          continue
        }
      } else {
        dbItem = {} as IConfigItem
      }

      if (item.dataType === 'data_url') {
        responseData = await this.fetchUrl(item.url, 'blob')
        dbItem = await new Promise<IConfigItem>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            configDataItem.resource_url = reader.result as string
            const dbDataItem = {} as IConfigItem
            dbDataItem.data = configDataItem
            dbDataItem.id = item.id
            resolve(dbDataItem)
          }
          reader.addEventListener('error', () => {
            reject('reading blog error')
          })
          reader.readAsDataURL(responseData)
        })
      } else if (item.dataType === 'buffer') {
        responseData = await this.fetchUrl(item.url, 'arraybuffer')
        configDataItem.resource_data = new Uint8Array(responseData)
        dbItem.id = item.id
        dbItem.data = configDataItem
      }

      await db.configTable.bulkPut([dbItem], null, { allKeys: true })
    }

    return true
  }

  private static fetchUrl(url: string, dataType: XMLHttpRequestResponseType): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      wllog('获取URL:' + url + ' 的数据')
      const xhr = new XMLHttpRequest()
      xhr.responseType = dataType
      xhr.open('GET', url)
      xhr.onloadend = () => {
        wllog('获取数据结束:', xhr.readyState)
        if (xhr.readyState === XMLHttpRequest.DONE) {
          resolve(xhr.response)
        } else {
          reject(new Error('获取资源失败:' + xhr.statusText))
        }
      }
      xhr.addEventListener('error', () => {
        reject('获取资源异常:' + xhr.statusText)
      })
      xhr.send(null)
    })
  }

  public static async getConfigData(id: WL_ConfigID): Promise<IConfigData | undefined> {
    const db = new WLConfigDB()
    try {
      const item = await db.configTable.get(id)
      return item.data as IConfigData
    } catch (e) {
      wlerr('获取配置信息出错:' + e)
      throw e
    }
  }
}

export { WLConfig, IConfigData, WL_ConfigID, SetConfigDataParam, setConfigData }
