// 把array数组组合成一个大的arraybuffer，然后可以变回array数组
class CompoUint8Array {
  private lengthList: number[]

  constructor(
    private compoArrays?: Uint8Array,
    lengthList?: number[],
  ) {
    if (lengthList) {
      this.lengthList = lengthList
    } else {
      this.lengthList = []
    }
  }

  public putArrays(arrayList: Uint8Array[]): void {
    let totalSize = 0
    arrayList.forEach((value) => {
      totalSize += value.length
      this.lengthList.push(value.length)
    })

    let offset = 0
    if (this.compoArrays) {
      const newArrays = new Uint8Array(this.compoArrays.length + totalSize)
      newArrays.set(this.compoArrays, 0)
      offset += this.compoArrays.length
      this.compoArrays = newArrays
    } else {
      this.compoArrays = new Uint8Array(totalSize)
    }

    arrayList.forEach((value) => {
      this.compoArrays!.set(value, offset)
      offset += value.length
    })
  }

  public putArray(array: Uint8Array): void {
    let offset = 0
    if (this.compoArrays) {
      const newArrays = new Uint8Array(this.compoArrays.length + array.length)
      newArrays.set(this.compoArrays, 0)
      offset += this.compoArrays.length
      this.compoArrays = newArrays
    } else {
      this.compoArrays = new Uint8Array(array.length)
    }
    this.lengthList.push(array.length)
    this.compoArrays!.set(array, offset)
  }

  public getCompoArray(): Uint8Array | null {
    return this.compoArrays!
  }

  public getCompoLengthList(): number[] {
    return this.lengthList
  }

  public parseArrayList(): Uint8Array[] | null {
    if (this.compoArrays) {
      const arrayList = [] as Uint8Array[]
      let offset = 0

      this.lengthList.forEach((value) => {
        const array = this.compoArrays!.subarray(offset, offset + value)
        arrayList.push(array)
        offset += value
      })

      return arrayList
    }

    return null
  }
}

export default CompoUint8Array
