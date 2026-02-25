export function hexStr2Uint8Array(hexStr: string): Uint8Array|undefined {
    if (hexStr.length % 2 == 0) {
        const hexArray = hexStr.match(/.{1,2}/g);
        if (hexArray) {
            return Uint8Array.from(hexArray.map(v => parseInt(v, 16)));
        }
    }

    return undefined;
}

export function uint8Array2HexStr(arrayBuffer: Uint8Array): string {
    if (arrayBuffer.length) {
        return arrayBuffer.reduce((previousValue, currentValue) => previousValue + currentValue.toString(16).padStart(2, '0'), '');
    }

    return '';
}

export function getStringFromBase64(base64Str: string): string {
    const asciiStr = window.atob(base64Str);
    return decodeURIComponent(escape(asciiStr));
}

// http://www.onicos.com/staff/iz/amuse/javascript/expert/utf.txt

/* utf.js - UTF-8 <=> UTF-16 convertion
 *
 * Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0
 * LastModified: Dec 25 1999
 * This library is free.  You can redistribute it and/or modify it.
 */

export function uint8Array2Utf8Str(arrayBuffer: Uint8Array): string {
    let out, i, len, c;
    let char2, char3;

    out = "";
    len = arrayBuffer.length;
    i = 0;
    while(i < len) {
        c = arrayBuffer[i++];
        switch(c >> 4)
        {
            case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
            // 0xxxxxxx
            out += String.fromCharCode(c);
            break;
            case 12: case 13:
            // 110x xxxx   10xx xxxx
            char2 = arrayBuffer[i++];
            out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
            break;
            case 14:
                // 1110 xxxx  10xx xxxx  10xx xxxx
                char2 = arrayBuffer[i++];
                char3 = arrayBuffer[i++];
                out += String.fromCharCode(((c & 0x0F) << 12) |
                    ((char2 & 0x3F) << 6) |
                    ((char3 & 0x3F) << 0));
                break;
        }
    }

    return out;
}
