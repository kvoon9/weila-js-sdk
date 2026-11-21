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
  resource_url?: string | null
  resource_data?: Uint8Array
  version: number
  latestTime: number
}

interface IConfigItem {
  id: number
  data: IConfigData
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
  id: WL_ConfigID
  url: string
  version: number
}

function validateWasmData(data: ArrayBuffer, url: string): void {
  const bytes = new Uint8Array(data, 0, Math.min(data.byteLength, 4))
  const isWasm = bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d

  if (!isWasm) {
    const magic = Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join(' ')

    throw new Error(`获取 WASM 资源失败:${url} 返回的不是 WASM 文件，magic=${magic}`)
  }
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

const WLConfig = {
  async loadResource(): Promise<boolean> {
    const db = new WLConfigDB()

    for (let item of configItemInfo) {
      wllog('id:%d url:%s', item.id, item.url)

      const configDataItem: IConfigData = {
        latestTime: new Date().getTime(),
        version: item.version,
      }

      let dbItem: IConfigItem | undefined
      let responseData: any

      dbItem = await db.configTable.get(item.id)

      if (dbItem) {
        const configItem = dbItem.data

        if (configItem.version >= item.version) {
          continue
        }
      } else {
        dbItem = { id: item.id, data: configDataItem }
      }

      if (item.dataType === 'data_url') {
        responseData = await this.fetchUrl(item.url, 'blob')
        dbItem = await new Promise<IConfigItem>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            configDataItem.resource_url =
              reader.result instanceof ArrayBuffer ? null : reader.result
            const dbDataItem: IConfigItem = { id: item.id, data: configDataItem }
            resolve(dbDataItem)
          }

          reader.addEventListener('error', () => {
            reject('reading blog error')
          })
          reader.readAsDataURL(responseData)
        })
      } else if (item.dataType === 'buffer') {
        responseData = await this.fetchUrl(item.url, 'arraybuffer')

        if (item.id === WL_ConfigID.WL_RES_DATA_OPUS_WASM_ID)
          validateWasmData(responseData, item.url)
        configDataItem.resource_data = new Uint8Array(responseData)
        dbItem.id = item.id
        dbItem.data = configDataItem
      }

      await db.configTable.bulkPut([dbItem], undefined, { allKeys: true })
    }

    return true
  },

  fetchUrl(url: string, dataType: XMLHttpRequestResponseType): Promise<any> {
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
  },

  async getConfigData(id: WL_ConfigID): Promise<IConfigData | undefined> {
    const db = new WLConfigDB()

    try {
      const item = await db.configTable.get(id)

      return item?.data
    } catch (e) {
      wlerr('获取配置信息出错:' + e)
      throw e
    }
  },
}

export { WLConfig, WL_ConfigID, setConfigData }

export type { SetConfigDataParam }
