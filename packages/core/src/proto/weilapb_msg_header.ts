import { WLMsgHeader } from './weilapb_wrapper_data';

export default class WeilaMsgHeader {
  public value: WLMsgHeader;
  static readonly msgHeaderLen = 16;
  static globalSeqNum = 0;

  constructor() {
    this.value = {
      length: 0,
      version: 0,
      flag: 0,
      serviceID: 0,
      commandID: 0,
      seqNum: 0,
      reserved: 0,
    };
  }

  public getValue(): WLMsgHeader {
    return this.value;
  }

  static parseFromBuffer(buffer: Uint8Array): WeilaMsgHeader | undefined {
    if (buffer && buffer.length >= WeilaMsgHeader.msgHeaderLen) {
      const weilaMsgHeader: WeilaMsgHeader = new WeilaMsgHeader();
      const data = new DataView(buffer.buffer);

      weilaMsgHeader.value.length = data.getInt32(0);
      weilaMsgHeader.value.version = data.getInt16(4);
      weilaMsgHeader.value.flag = data.getInt16(6);
      weilaMsgHeader.value.serviceID = data.getInt16(8);
      weilaMsgHeader.value.commandID = data.getInt16(10);
      weilaMsgHeader.value.seqNum = data.getInt16(12);
      weilaMsgHeader.value.reserved = data.getInt16(14);

      return weilaMsgHeader;
    }

    return undefined;
  }

  static buildWeilaMsgHeader(
    serviceId: number,
    commandId: number,
    dataLength: number,
  ): WeilaMsgHeader {
    const weilaMsgHeader: WeilaMsgHeader = new WeilaMsgHeader();
    weilaMsgHeader.value.commandID = (serviceId << 8) | commandId;
    weilaMsgHeader.value.serviceID = 15;
    weilaMsgHeader.value.length = dataLength + WeilaMsgHeader.msgHeaderLen;
    weilaMsgHeader.value.seqNum = WeilaMsgHeader.globalSeqNum;

    if (WeilaMsgHeader.globalSeqNum > 999999999) {
      WeilaMsgHeader.globalSeqNum = 0;
    } else {
      WeilaMsgHeader.globalSeqNum += 1;
    }

    return weilaMsgHeader;
  }

  serializeToBuffer(): Uint8Array {
    const buffer: Uint8Array = new Uint8Array(WeilaMsgHeader.msgHeaderLen);
    const data: DataView = new DataView(buffer.buffer);
    let offset = 0;
    data.setInt32(offset, this.value.length);
    offset += 4;
    data.setInt16(offset, this.value.version);
    offset += 2;
    data.setInt16(offset, this.value.flag);
    offset += 2;
    data.setInt16(offset, this.value.serviceID);
    offset += 2;
    data.setInt16(offset, this.value.commandID);
    offset += 2;
    data.setInt16(offset, this.value.seqNum);
    offset += 2;
    data.setInt16(offset, 0);
    return buffer;
  }
}
