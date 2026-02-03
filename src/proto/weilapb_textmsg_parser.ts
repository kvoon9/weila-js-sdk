import {enc, lib, AES, mode, pad} from "crypto-js";
import {getStringFromBase64, hexStr2Uint8Array, uint8Array2HexStr, uint8Array2Utf8Str} from "./weilapb_utils";
import {WL_IDbFileData, WL_IDbLocationShared, WL_IDbMsgData, WL_IDbMsgDataType} from "db/weila_db_data";

class TextMsgDataParser {
    static readonly BASE_FILE_TYPE_URL = "https://weilaavatar.oss-cn-shenzhen.aliyuncs.com/file/";
    static readonly FILE_TYPE_DOC = "DOC.png";
    static readonly FILE_TYPE_HTML = "HTML.png";
    static readonly FILE_TYPE_MP3 = "MP3.png";
    static readonly FILE_TYPE_PDF = "PDF.png";
    static readonly FILE_TYPE_PPT = "PPT.png";
    static readonly FILE_TYPE_RAR = "RAR.png";
    static readonly FILE_TYPE_RAW = "RAW.png";
    static readonly FILE_TYPE_TXT = "TXT.png";
    static readonly FILE_TYPE_XLS = "XLS.png";
    static readonly FILE_TYPE_ZIP = "ZIP.png";
    static readonly FILE_TYPE_WAV = "WAV.png";
    static readonly FILE_TYPE_VIDEO = "video.jpg";
    static readonly FILE_TYPE_UNKOWN = "UNKOWN.png";

    static readonly EXTEND_START_FLAG = '&$#@~^@[{:';
    static readonly EXTEND_END_FLAG = ':}]&$~@#@';
    static readonly EXTEND_MSG_PATTERN = /&\$#@~\^@\[{:(.*):}\]&\$~@#@/;
    static readonly CMD_MSG_PATTERN = /\*&\^@~\^\(\[{:(.*):}\]\)\^\*#@#@/;
    static readonly SERVICE_TYPE_KEY: string = "serviceType";
    static readonly SERVICE_TYPE_LOCATION: string = "location";
    static readonly LOCATION_TYPE_KEY: string = "locationType";
    static readonly LATITUDE_KEY: string = "latitude";
    static readonly LONGITUDE_KEY: string = "longitude";
    static readonly LOCATION_NAME_KEY: string = "name";
    static readonly LOCATION_ADDRESS_KEY: string = "address";
    static readonly SERVICE_TYPE_VIDEO: string = "video";
    static readonly SERVICE_TYPE_FILE: string = "file";
    static readonly FILE_URL_KEY: string = "fileUrl";
    static readonly FILE_SIZE_KEY: string = "fileSize";
    static readonly FILE_NAME_KEY: string = "fileName";
    static readonly SERVICE_TYPE_QR_CODE: string = "qrcode";
    static readonly QR_CODE_NAME_KEY: string = "qrName";
    static readonly QR_CODE_DESC_KEY: string = "qrDesc";
    static readonly QR_CODE_SESSION_TYPE_KEY: string = "qrSessionType";
    static readonly QR_CODE_PEER_ID_KEY: string = "qrPeerId";
    static readonly NORMAL_BUSINESS_SERVICE_TYPE: string = "business"; //通用订单类型
    static readonly DEFAULT_BUSINESS_SERVICE_TYPE: string = "order";//默认订单类型 打车

    private static getCK(): lib.WordArray {
        const k = [];
        for (let j = 0; j < 3; j++) {
            for (let i = 1; i < 11; i++) {
                if (i == 10) {
                    k.push(0);
                } else {
                    k.push(i);
                }
            }
        }
        k.push(1);
        k.push(2);
        return enc.Utf8.parse(k.join(''));
    }

    private static getFileExt(filePath: string): string | undefined {
        const extPattern = /\.[a-zA-Z0-9]{1,5}$/;

        if (extPattern.test(filePath)) {
            return extPattern.exec(filePath)![0];
        } else {
            return undefined
        }
    }

    public static getExtendFileFormatUrl(filePath: string): string {
        let extStr = this.getFileExt(filePath);
        let fileFormatUrl = this.BASE_FILE_TYPE_URL;

        if (extStr == undefined) {
            extStr = '';
        }
        extStr = extStr.toLowerCase();

        switch (extStr) {
            case '.txt': {
                fileFormatUrl += this.FILE_TYPE_TXT;
            }
                break;

            case '.doc':
            case '.docx': {
                fileFormatUrl += this.FILE_TYPE_DOC;
            }
                break;

            case '.ppt': {
                fileFormatUrl += this.FILE_TYPE_PPT;
            }
                break;

            case '.pdf': {
                fileFormatUrl += this.FILE_TYPE_PDF;
            }
                break;

            case '.xls': {
                fileFormatUrl += this.FILE_TYPE_XLS;
            }
                break;

            case '.mp3': {
                fileFormatUrl += this.FILE_TYPE_MP3;
            }
                break;

            case '.wav': {
                fileFormatUrl += this.FILE_TYPE_WAV;
            }
                break;

            case '.html': {
                fileFormatUrl += this.FILE_TYPE_HTML;
            }
                break;

            case '.rar': {
                fileFormatUrl += this.FILE_TYPE_RAR;
            }
                break;

            case '.zip': {
                fileFormatUrl += this.FILE_TYPE_ZIP;
            }
                break;

            case '.raw': {
                fileFormatUrl += this.FILE_TYPE_RAW;
            }
                break;

            default: {
                fileFormatUrl += this.FILE_TYPE_UNKOWN;
            }
            break;
        }

        return fileFormatUrl;
    }

    private static getExtendFileInfo(filePath: string, fileUrl: string, fileSize: number, serviceType: string): string {
        const fileFormatUrl = this.getExtendFileFormatUrl(filePath);

        let filename = "未知文件";
        if (filePath !== '') {
            filename = enc.Base64.stringify(enc.Utf8.parse(filePath));
        } else {
            filename = enc.Base64.stringify(enc.Utf8.parse(filename));
        }

        let extendString = this.EXTEND_START_FLAG;
        extendString += (fileFormatUrl + "?");
        extendString += (this.SERVICE_TYPE_KEY + "=" + serviceType + "&");
        extendString += (this.FILE_URL_KEY + "=" + fileUrl + "&");
        extendString += (this.FILE_SIZE_KEY + "=" + fileSize);
        extendString += ("&" + this.FILE_NAME_KEY + "=" + filename);
        extendString += this.EXTEND_END_FLAG;

        return extendString;
    }

    public static encodeSessionTextMsg(data: WL_IDbFileData|WL_IDbLocationShared|string, dataType: WL_IDbMsgDataType): string|undefined {
        let extendText: string | undefined = undefined;

        switch (dataType) {
            // 纯文字
            case WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE: {
                extendText = data as string;
            }
            break;

            // 图片信息,先上传,成功后再上传
            case WL_IDbMsgDataType.WL_DB_MSG_DATA_IMAGE_TYPE: {
                extendText = this.EXTEND_START_FLAG + (data as string) + this.EXTEND_END_FLAG;
            }
            break;

            case WL_IDbMsgDataType.WL_DB_MSG_DATA_VIDEO_TYPE: {
                const fileInfo: WL_IDbFileData = data as WL_IDbFileData;
                fileInfo.fileThumbnail = this.getExtendFileFormatUrl(fileInfo.fileName);
                extendText = this.getExtendFileInfo(fileInfo.fileName, fileInfo.fileUrl, fileInfo.fileSize, this.SERVICE_TYPE_VIDEO);
            }
            break;

            case WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE: {
                const fileInfo: WL_IDbFileData = data as WL_IDbFileData;
                fileInfo.fileThumbnail = this.getExtendFileFormatUrl(fileInfo.fileName);
                extendText = this.getExtendFileInfo(fileInfo.fileName, fileInfo.fileUrl, fileInfo.fileSize, this.SERVICE_TYPE_FILE);
            }
            break;

            case WL_IDbMsgDataType.WL_DB_MSG_DATA_LOCATION_TYPE: {
                const locationInfo: WL_IDbLocationShared = data as WL_IDbLocationShared;
                extendText = this.EXTEND_START_FLAG + locationInfo.mapUrl + "?";
                extendText += (this.SERVICE_TYPE_KEY + "=" + this.SERVICE_TYPE_LOCATION);
                extendText += ("&" + this.LOCATION_TYPE_KEY + "=" + locationInfo.locationType);
                extendText += ("&" + this.LATITUDE_KEY + "=" + locationInfo.latitude);
                extendText += ("&" + this.LONGITUDE_KEY + "=" + locationInfo.longitude);
                extendText += ("&" + this.LOCATION_NAME_KEY + "=" + enc.Base64.stringify(enc.Utf8.parse(locationInfo.name)));
                extendText += ("&" + this.LOCATION_ADDRESS_KEY + "=" + enc.Base64.stringify(enc.Utf8.parse(locationInfo.address)));
                extendText += this.EXTEND_END_FLAG;

                console.log('encode ', extendText)
            }
            break;

            case WL_IDbMsgDataType.WL_DB_MSG_DATA_COMMAND_TYPE: {
                // TODO: 暂时未实现
            }
            break;
        }

        if (extendText) {
            const textWordArray = enc.Utf8.parse(extendText);
            const bufferLen = textWordArray.sigBytes + 4;
            let left = 0;
            if (bufferLen % 16 > 0) {
                left = 16 - (bufferLen % 16);
            }

            const lenDataBuffer = new ArrayBuffer(4 + left);
            const lenDataView = new DataView(lenDataBuffer);
            lenDataView.setInt32(lenDataBuffer.byteLength - 4, textWordArray.sigBytes);
            const lenDataHexStr = uint8Array2HexStr(new Uint8Array(lenDataBuffer));
            const lenDataWordArray = enc.Hex.parse(lenDataHexStr);

            try {
                const encrypted = AES.encrypt(
                    textWordArray.concat(lenDataWordArray),
                    this.getCK(),
                    {mode: mode.ECB, padding: pad.ZeroPadding});

                return encrypted.toString();
            }catch (e) {
                console.log(e);
            }
        }

        return undefined;
    }

    public static decodeSessionTextMsg(data: string): WL_IDbMsgData|undefined {
        const dbMsgData = {} as WL_IDbMsgData;
        let extendText = '';

        dbMsgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_UNKNOWN_TYPE;

        // 1. 解密 AES.decrypt(encrypted(string类型), key(WordArray类型), cfg({mode: , pad:, });
        let decryptedHexText;
        try {
            decryptedHexText = AES.decrypt(data, this.getCK(), {mode: mode.ECB, padding: pad.ZeroPadding});
        } catch (e) {
            return undefined;
        }

        const textUnit8Data = hexStr2Uint8Array(enc.Hex.stringify(decryptedHexText));

        if (textUnit8Data && textUnit8Data.length > 0) {
            // 获取实际的扩展字串的长度
            const textDataLen = new DataView(textUnit8Data.buffer).getInt32(textUnit8Data.length - 4);
            extendText = uint8Array2Utf8Str(textUnit8Data.subarray(0, textDataLen));
        } else {
            return undefined;
        }

        if (extendText == '') {
            return undefined;
        }
        console.log('extendText', extendText);

        // 2. 判断是否是原始的文字
        if (this.EXTEND_MSG_PATTERN.test(extendText)) {
            const result = this.EXTEND_MSG_PATTERN.exec(extendText);
            this.EXTEND_MSG_PATTERN.exec(''); // 还原正则模板
            if (result && result[1]) {
                if (/\?/.test(result[1])) {
                    const params = result[1].match(/([^=&?]*=[^=&]*)/g);
                    if (params && params.length) {
                        for (const p of params) {
                            const pair = p.split('=');
                            if (pair && pair.length == 2) {
                                switch (pair[0]) {
                                    case this.SERVICE_TYPE_KEY: {
                                        const urlPattern = /(http[s]?:\/\/.*)\?/;
                                        let fileUrl: string;
                                        if (urlPattern.test(result[1])) {
                                            fileUrl = urlPattern.exec(result[1])![1];
                                        } else {
                                            fileUrl = '';
                                        }
                                        if (pair[1] == this.SERVICE_TYPE_LOCATION) {
                                            dbMsgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_LOCATION_TYPE;
                                            dbMsgData.location = {} as WL_IDbLocationShared;
                                            dbMsgData.location.mapUrl = fileUrl;
                                        } else if (pair[1] == this.SERVICE_TYPE_VIDEO) {
                                            dbMsgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_VIDEO_TYPE;
                                            dbMsgData.fileInfo = {} as WL_IDbFileData;
                                            dbMsgData.fileInfo.fileUrl = fileUrl;
                                        } else if (pair[1] == this.SERVICE_TYPE_FILE) {
                                            dbMsgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_FILE_TYPE;
                                            dbMsgData.fileInfo = {} as WL_IDbFileData;
                                            dbMsgData.fileInfo.fileUrl = fileUrl;
                                        }
                                    }
                                    break;

                                    case this.LOCATION_TYPE_KEY: {
                                        dbMsgData.location.locationType = pair[1];
                                    }
                                    break;

                                    case this.LATITUDE_KEY: {
                                        try {
                                            dbMsgData.location.latitude = parseFloat(pair[1]);
                                        } catch (e) {
                                            dbMsgData.location.latitude = 0;
                                        }
                                    }
                                    break;

                                    case this.LONGITUDE_KEY: {
                                        try {
                                            dbMsgData.location.longitude = parseFloat(pair[1]);
                                        } catch (e) {
                                            dbMsgData.location.longitude = 0;
                                        }
                                    }
                                    break;

                                    case this.LOCATION_NAME_KEY: {
                                        dbMsgData.location.name = getStringFromBase64(pair[1]);
                                    }
                                    break;

                                    case this.LOCATION_ADDRESS_KEY: {
                                        dbMsgData.location.address = getStringFromBase64(pair[1]);
                                    }
                                    break;

                                    case this.FILE_URL_KEY: {
                                        dbMsgData.fileInfo!.fileUrl = pair[1];
                                    }
                                    break;

                                    case this.FILE_NAME_KEY: {
                                        dbMsgData.fileInfo!.fileName = enc.Base64.parse(pair[1]).toString(enc.Utf8);
                                        dbMsgData.fileInfo!.fileThumbnail = this.getExtendFileFormatUrl(dbMsgData.fileInfo!.fileName!);
                                    }
                                    break;

                                    case this.FILE_SIZE_KEY: {
                                        try {
                                            dbMsgData.fileInfo!.fileSize = parseInt(pair[1]);
                                        } catch (e) {
                                            dbMsgData.fileInfo!.fileSize = 0;
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    }
                } else {
                    // 普通图片的内容
                    dbMsgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_IMAGE_TYPE;
                    dbMsgData.fileInfo = {} as WL_IDbFileData;
                    dbMsgData.fileInfo.fileUrl = result[1];
                    dbMsgData.fileInfo.fileName = '';
                }
            }
        } else if (this.CMD_MSG_PATTERN.test(extendText)) {
            const result = this.CMD_MSG_PATTERN.exec(extendText);
            this.CMD_MSG_PATTERN.exec(''); // 还原模板
            if (result && result[1]) {
                dbMsgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_COMMAND_TYPE;
                dbMsgData.command = result[1];
            }
        } else {
            dbMsgData.msgType = WL_IDbMsgDataType.WL_DB_MSG_DATA_TEXT_TYPE;
            dbMsgData.textData = extendText;
        }

        return dbMsgData;
    }
}

export {TextMsgDataParser}
