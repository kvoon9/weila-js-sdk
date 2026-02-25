class WeilaRingBuffer {
  private readIndex: number;
  private writeIndex: number;
  private framesAvailable: number;
  private frameBuffer: Int16Array | Float32Array | null;
  private frameCount: number;

  constructor(frameCount: number, useFloat32: boolean) {
    this.readIndex = 0;
    this.writeIndex = 0;
    this.framesAvailable = 0;
    this.frameCount = frameCount;

    if (useFloat32) {
      this.frameBuffer = new Float32Array(this.frameCount);
    } else {
      this.frameBuffer = new Int16Array(this.frameCount);
    }
  }

  public get frameAvailable() {
    return this.framesAvailable;
  }

  public push(frameBuffer: Int16Array | Float32Array): number {
    let sourceLen = frameBuffer.length;

    if (this.framesAvailable + sourceLen > this.frameCount) {
      frameBuffer = frameBuffer.slice(0, this.frameCount - this.framesAvailable);
      sourceLen = frameBuffer.length;
    }

    if (sourceLen + this.writeIndex <= this.frameCount) {
      this.frameBuffer!.set(frameBuffer, this.writeIndex);
      this.writeIndex += sourceLen;
    } else {
      const splitIndex = this.frameCount - this.writeIndex;
      const firstPart = frameBuffer.subarray(0, splitIndex);
      const secondPart = frameBuffer.subarray(splitIndex);
      this.frameBuffer!.set(firstPart, this.writeIndex);
      this.frameBuffer!.set(secondPart, 0);
      this.writeIndex = secondPart.length;
    }

    this.framesAvailable += sourceLen;

    return sourceLen;
  }

  public pull(frameBuffer: Int16Array | Float32Array): number {
    let bufferLen = frameBuffer.length;

    if (this.framesAvailable < bufferLen) {
      bufferLen = this.framesAvailable;
    }

    if (this.readIndex + bufferLen <= this.frameCount) {
      frameBuffer.set(this.frameBuffer!.slice(this.readIndex, this.readIndex + bufferLen));
      this.readIndex += bufferLen;
    } else {
      const leftLen = bufferLen + this.readIndex - this.frameCount;
      frameBuffer.set(this.frameBuffer!.slice(this.readIndex), 0);
      frameBuffer.set(this.frameBuffer!.slice(0, leftLen), this.frameCount - this.readIndex);
      this.readIndex = leftLen;
    }

    this.framesAvailable -= bufferLen;

    return bufferLen;
  }

  public clear(): void {
    this.readIndex = 0;
    this.writeIndex = 0;
    this.framesAvailable = 0;
  }

  public destroy(): void {
    this.clear();
    this.frameBuffer = null;
  }
}

export { WeilaRingBuffer };
