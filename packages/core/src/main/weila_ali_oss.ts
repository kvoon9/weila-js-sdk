import { WeilaDB } from 'db/weila_db'
import { fetchWithTimeout } from 'main/weila_utils'
import { WL } from 'proto/weilapb'
import OSS from 'ali-oss'
import { getLogger } from 'log/weila_log'
import { WL_IDbSettingID } from 'db/weila_db_data'

const wllog = getLogger('ALI-OSS:info')
const wlerr = getLogger('ALI-OSS:err')

enum WL_UploadClientType {
  CACHE_BUCKET_TYPE,
  AVATAR_BUCKET_TYPE,
}

interface WL_UploadParams {
  remoteUrl: string
  fileName: string
  fileData: Blob
  resolve: (value: WL_UploadResult) => void
  reject: (err: any) => void
  checkPoint: any
  clientType: number
}

interface WL_UploadResult {
  statusCode: number
  statusMessage: string
  remoteUrl: string
}

class AliOssHelper {
  private uploadSeq: number
  private expireTimeout: number
  private isUploading: boolean
  private uploadingQueue: WL_UploadParams[]
  private static instance: AliOssHelper = null
  private cacheClient: OSS
  private avatarClient: OSS
  private inited: boolean

  constructor() {
    this.expireTimeout = 0
    this.isUploading = false
    this.uploadingQueue = []
    this.uploadSeq = 0
    this.cacheClient = null
    this.avatarClient = null
    this.inited = false
  }

  public static getInstance(): AliOssHelper {
    if (this.instance === null) {
      this.instance = new AliOssHelper()
    }

    return this.instance
  }

  private async getKeysFromServer(): Promise<{
    accessKeyId: string
    accessKeySecret: string
    stsToken: string
  }> {
    try {
      const weilaTokenItem = await WeilaDB.getInstance().getSettingItem(
        WL_IDbSettingID.SETTING_LOGIN_TOKEN,
      )
      const weilaToken = weilaTokenItem.data
      let response = await fetchWithTimeout('/v1/aliyun/sts?access-token=' + weilaToken, {
        method: 'GET',
      })
      const keyData: any = await response.json()
      if (keyData.errcode === 0) {
        wllog('关键数据:', keyData)
        this.expireTimeout = keyData.data.Expiration
        return {
          accessKeyId: keyData.data.AccessKeyId,
          accessKeySecret: keyData.data.AccessKeySecret,
          stsToken: keyData.data.SecurityToken,
        }
      } else {
        return Promise.reject('获取OSS健值失败')
      }
    } catch (e) {
      return Promise.reject(e)
    }
  }

  public async init(): Promise<boolean> {
    if (!this.inited) {
      const result = await this.getKeysFromServer()
      const interval = this.expireTimeout * 1000 - new Date().getTime()

      this.inited = true
      this.cacheClient = new OSS({
        region: 'oss-cn-shenzhen',
        accessKeyId: result.accessKeyId,
        accessKeySecret: result.accessKeySecret,
        stsToken: result.stsToken,
        bucket: 'weilacache',
        refreshSTSToken: this.getKeysFromServer.bind(this),
        refreshSTSTokenInterval: interval,
      })

      this.avatarClient = new OSS({
        region: 'oss-cn-shenzhen',
        accessKeyId: result.accessKeyId,
        accessKeySecret: result.accessKeySecret,
        stsToken: result.stsToken,
        bucket: 'weilaavatar',
        refreshSTSToken: this.getKeysFromServer.bind(this),
        refreshSTSTokenInterval: interval,
      })
    }

    return true
  }

  private getUploadUrl(
    senderId: number,
    sessionId: string,
    sessionType: number,
    fileName: string,
  ): string {
    // url format:  /YYYY-MM-DD/[user|group|company]_sessionId/senderId-HH-MM-SS-seq-uploadSeq-extraStr.ext
    // get date str
    let curDate = new Date()

    let dateStr = '' + curDate.getFullYear()
    dateStr +=
      '-' + (curDate.getMonth() + 1 < 10 ? '0' + (curDate.getMonth() + 1) : curDate.getMonth() + 1)
    dateStr += '-' + (curDate.getDate() < 10 ? '0' + curDate.getDate() : curDate.getDate())

    // get string str
    let timeStr = '' + (curDate.getHours() < 10 ? '0' + curDate.getHours() : curDate.getHours())
    timeStr += '-' + (curDate.getMinutes() < 10 ? '0' + curDate.getMinutes() : curDate.getMinutes())
    timeStr += '-' + (curDate.getSeconds() < 10 ? '0' + curDate.getSeconds() : curDate.getSeconds())

    // get user session
    let userStr = 'unknown_'
    switch (sessionType) {
      case WL.Common.SessionType.SESSION_TYPE_SINGLE:
        {
          userStr = 'user_' + sessionId
        }
        break

      case WL.Common.SessionType.SESSION_TYPE_GROUP:
        {
          userStr = 'group_' + sessionId
        }
        break

      case WL.Common.SessionType.SESSION_TYPE_SERVICE:
        {
          userStr = 'company_' + sessionId
        }
        break
    }

    let url =
      '/cache/' +
      dateStr +
      '/' +
      userStr +
      '/' +
      timeStr +
      '-user_' +
      senderId +
      '-seq_' +
      this.uploadSeq++
    let extResult = fileName.match(/\.([a-z0-9]{1,6})$/)
    if (extResult && extResult.length >= 2) {
      url += extResult[0]
    } else {
      url += '.unknown'
    }

    if (this.uploadSeq > Number.MAX_VALUE - 100) {
      this.uploadSeq = 0
    }

    return url
  }

  private processUploadData(): void {
    this.init()
      .then((_value) => {
        if (!this.isUploading && this.uploadingQueue.length > 0) {
          this.isUploading = true
          const uploadParams = this.uploadingQueue.shift()!
          let client = null as OSS | null

          if (uploadParams.clientType === WL_UploadClientType.CACHE_BUCKET_TYPE) {
            client = this.cacheClient
          } else {
            client = this.avatarClient
          }

          client
            .put(uploadParams.remoteUrl, uploadParams.fileData, { timeout: 30000 })
            .then((objResult) => {
              const uploadResult = {} as WL_UploadResult
              uploadResult.remoteUrl = objResult.url
              uploadResult.statusCode = objResult.res.status
              uploadResult.statusMessage = ''
              uploadParams.resolve(uploadResult)
              wllog('上传结果:', objResult)
            })
            .catch((reason) => {
              uploadParams.reject(reason)
            })
            .finally(() => {
              this.isUploading = false
              setTimeout(this.processUploadData.bind(this), 0)
            })
        }
      })
      .catch((reason) => {
        wlerr('!!!!严重错误，获取key失败!!!!!', reason)
      })
  }

  public async uploadToCache(
    senderId: number,
    sessionId: string,
    sessionType: number,
    fileName: string,
    fileData: File,
  ): Promise<WL_UploadResult> {
    return new Promise<WL_UploadResult>((resolve, reject) => {
      const uploadParams = {} as WL_UploadParams
      uploadParams.checkPoint = null
      uploadParams.fileName = fileName
      uploadParams.fileData = fileData
      uploadParams.reject = reject
      uploadParams.resolve = resolve
      uploadParams.remoteUrl = this.getUploadUrl(senderId, sessionId, sessionType, fileName)
      uploadParams.clientType = WL_UploadClientType.CACHE_BUCKET_TYPE
      this.uploadingQueue.push(uploadParams)
      this.processUploadData()
    })
  }

  public async uploadToAvatar(
    userId: number,
    group: boolean,
    imageData: Blob,
    width: number,
    height: number,
  ): Promise<WL_UploadResult> {
    return new Promise<WL_UploadResult>((resolve, reject) => {
      // get date str
      let curDate = new Date()

      let dateStr = '' + curDate.getFullYear()
      dateStr +=
        '-' +
        (curDate.getMonth() + 1 < 10 ? '0' + (curDate.getMonth() + 1) : curDate.getMonth() + 1)
      dateStr += '-' + (curDate.getDate() < 10 ? '0' + curDate.getDate() : curDate.getDate())

      // get string str
      let timeStr = '' + (curDate.getHours() < 10 ? '0' + curDate.getHours() : curDate.getHours())
      timeStr +=
        '-' + (curDate.getMinutes() < 10 ? '0' + curDate.getMinutes() : curDate.getMinutes())
      timeStr +=
        '-' + (curDate.getSeconds() < 10 ? '0' + curDate.getSeconds() : curDate.getSeconds())

      let url = 'user_' + userId + '_' + dateStr + '_' + timeStr + '_' + this.uploadSeq++
      url += '-' + (width + 'x' + height) + '.jpg'

      if (this.uploadSeq > Number.MAX_VALUE - 100) {
        this.uploadSeq = 0
      }

      if (group) {
        url = 'group/' + url
      }

      url = '/avatar/' + url

      const uploadParam = {} as WL_UploadParams
      uploadParam.clientType = WL_UploadClientType.AVATAR_BUCKET_TYPE
      uploadParam.remoteUrl = url
      uploadParam.resolve = resolve
      uploadParam.reject = reject
      uploadParam.fileData = imageData
      this.uploadingQueue.push(uploadParam)
      this.processUploadData()
    })
  }
}

export { AliOssHelper, WL_UploadResult }
