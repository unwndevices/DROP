// DFU implementation based on webdfu library
// Extracted and adapted from https://github.com/devanlai/webdfu

export const DFU = {
  DETACH: 0x00,
  DNLOAD: 0x01,
  UPLOAD: 0x02,
  GETSTATUS: 0x03,
  CLRSTATUS: 0x04,
  GETSTATE: 0x05,
  ABORT: 0x06,
};

export const DFU_STATE = {
  appIDLE: 0,
  appDETACH: 1,
  dfuIDLE: 2,
  dfuDNLOAD_SYNC: 3,
  dfuDNBUSY: 4,
  dfuDNLOAD_IDLE: 5,
  dfuMANIFEST_SYNC: 6,
  dfuMANIFEST: 7,
  dfuMANIFEST_WAIT_RESET: 8,
  dfuUPLOAD_IDLE: 9,
  dfuERROR: 10,
};

export const DFU_STATUS = {
  OK: 0x00,
};

// DfuSe specific commands
const DFUSE_SET_ADDRESS = 0x21;
const DFUSE_ERASE_SECTOR = 0x41;

export interface DFUInterface {
  configuration: USBConfiguration;
  interface: USBInterface;
  alternate: USBAlternateInterface;
  name: string | null;
}

interface MemorySegment {
  start: number;
  end: number;
  sectorSize: number;
  readable: boolean;
  erasable: boolean;
  writable: boolean;
}

interface MemoryInfo {
  name: string;
  segments: MemorySegment[];
}

export class DFUDevice {
  private device: USBDevice;
  private interface: DFUInterface;
  private interfaceNumber: number;
  public transferSize: number = 4096;
  public startAddress: number = 0x90040000; // Default for Daisy
  private memoryInfo: MemoryInfo | null = null;

  // Logging callbacks
  public logProgress?: (done: number, total: number) => void;
  public logInfo?: (msg: string) => void;
  public logWarning?: (msg: string) => void;
  public logError?: (msg: string) => void;
  public logDebug?: (msg: string) => void;

  constructor(device: USBDevice, dfu_interface: DFUInterface) {
    this.device = device;
    this.interface = dfu_interface;
    this.interfaceNumber = dfu_interface.interface.interfaceNumber;

    // Parse memory info from interface name if available
    if (dfu_interface.name) {
      try {
        this.memoryInfo = this.parseMemoryDescriptor(dfu_interface.name);
      } catch (e) {
        console.warn('Failed to parse memory descriptor:', e);
      }
    }

    // If no memory info, use default for Daisy Seed
    if (!this.memoryInfo) {
      this.memoryInfo = {
        name: "Flash",
        segments: [{
          start: 0x90000000,
          end: 0x90800000,  // 8MB QSPI
          sectorSize: 4096,
          readable: true,
          erasable: true,
          writable: true
        }]
      };
    }
  }

  private parseMemoryDescriptor(desc: string): MemoryInfo {
    const nameEndIndex = desc.indexOf("/");
    if (!desc.startsWith("@") || nameEndIndex === -1) {
      throw `Not a DfuSe memory descriptor: "${desc}"`;
    }

    const name = desc.substring(1, nameEndIndex).trim();
    const segmentString = desc.substring(nameEndIndex);

    const segments: MemorySegment[] = [];

    const sectorMultipliers: { [key: string]: number } = {
      ' ': 1,
      'B': 1,
      'K': 1024,
      'M': 1048576
    };

    const contiguousSegmentRegex = /\/\s*(0x[0-9a-fA-F]{1,8})\s*\/(\s*[0-9]+\s*\*\s*[0-9]+\s?[ BKM]\s*[abcdefg]\s*,?\s*)+/g;
    let contiguousSegmentMatch;

    while (contiguousSegmentMatch = contiguousSegmentRegex.exec(segmentString)) {
      const segmentRegex = /([0-9]+)\s*\*\s*([0-9]+)\s?([ BKM])\s*([abcdefg])\s*,?\s*/g;
      let startAddress = parseInt(contiguousSegmentMatch[1], 16);
      let segmentMatch;

      while (segmentMatch = segmentRegex.exec(contiguousSegmentMatch[0])) {
        const sectorCount = parseInt(segmentMatch[1], 10);
        const sectorSize = parseInt(segmentMatch[2]) * sectorMultipliers[segmentMatch[3]];
        const properties = segmentMatch[4].charCodeAt(0) - 'a'.charCodeAt(0) + 1;

        const segment: MemorySegment = {
          start: startAddress,
          sectorSize: sectorSize,
          end: startAddress + sectorSize * sectorCount,
          readable: (properties & 0x1) !== 0,
          erasable: (properties & 0x2) !== 0,
          writable: (properties & 0x4) !== 0
        };

        segments.push(segment);
        startAddress += sectorSize * sectorCount;
      }
    }

    return { name, segments };
  }

  async open(): Promise<void> {
    await this.device.open();
    const confValue = this.interface.configuration.configurationValue;
    if (this.device.configuration?.configurationValue !== confValue) {
      await this.device.selectConfiguration(confValue);
    }

    const intfNumber = this.interfaceNumber;
    const claimed = this.device.configuration?.interfaces[intfNumber]?.claimed;
    if (!claimed) {
      await this.device.claimInterface(intfNumber);
    }

    const altSetting = this.interface.alternate.alternateSetting;
    const intf = this.device.configuration?.interfaces[intfNumber];
    if (intf && (intf.alternate === null ||
      intf.alternate.alternateSetting !== altSetting ||
      intf.alternates.length > 1)) {
      try {
        await this.device.selectAlternateInterface(intfNumber, altSetting);
      } catch (error) {
        // Ignore redundant SET_INTERFACE errors
        if (intf.alternate?.alternateSetting === altSetting &&
          error instanceof Error && error.message.includes("Unable to set device interface")) {
          this.logWarning?.(`Redundant SET_INTERFACE request to select altSetting ${altSetting} failed`);
        } else {
          throw error;
        }
      }
    }
  }

  async close(): Promise<void> {
    try {
      await this.device.close();
    } catch (error) {
      console.warn('Device close error:', error);
    }
  }

  private async requestOut(bRequest: number, data?: BufferSource, wValue: number = 0): Promise<number> {
    const result = await this.device.controlTransferOut({
      requestType: 'class',
      recipient: 'interface',
      request: bRequest,
      value: wValue,
      index: this.interfaceNumber
    }, data);

    if (result.status === 'ok') {
      return result.bytesWritten || 0;
    } else {
      throw new Error(result.status);
    }
  }

  private async requestIn(bRequest: number, wLength: number, wValue: number = 0): Promise<DataView> {
    const result = await this.device.controlTransferIn({
      requestType: 'class',
      recipient: 'interface',
      request: bRequest,
      value: wValue,
      index: this.interfaceNumber
    }, wLength);

    if (result.status === 'ok' && result.data) {
      return result.data;
    } else {
      throw new Error(result.status || 'No data');
    }
  }

  async getStatus(): Promise<{ status: number; state: number; pollTimeout: number }> {
    const data = await this.requestIn(DFU.GETSTATUS, 6);
    return {
      status: data.getUint8(0),
      pollTimeout: data.getUint32(1, true) & 0xFFFFFF,
      state: data.getUint8(4)
    };
  }

  async clearStatus(): Promise<void> {
    await this.requestOut(DFU.CLRSTATUS);
  }

  async getState(): Promise<number> {
    const data = await this.requestIn(DFU.GETSTATE, 1);
    return data.getUint8(0);
  }

  async abort(): Promise<void> {
    await this.requestOut(DFU.ABORT);
  }

  async abortToIdle(): Promise<void> {
    await this.abort();
    let state = await this.getState();
    if (state === DFU_STATE.dfuERROR) {
      await this.clearStatus();
      state = await this.getState();
    }
    if (state !== DFU_STATE.dfuIDLE) {
      throw new Error(`Failed to return to idle state after abort: state ${state}`);
    }
  }

  private async download(data: ArrayBuffer, blockNum: number): Promise<number> {
    return await this.requestOut(DFU.DNLOAD, data, blockNum);
  }

  private async poll_until(statePredicate: (state: number) => boolean): Promise<{ status: number; state: number; pollTimeout: number }> {
    let dfu_status = await this.getStatus();

    while (!statePredicate(dfu_status.state) && dfu_status.state !== DFU_STATE.dfuERROR) {
      await new Promise(resolve => setTimeout(resolve, 5)); // Use fixed 5ms for faster polling
      dfu_status = await this.getStatus();
    }

    return dfu_status;
  }

  private async poll_until_idle(idleState: number): Promise<{ status: number; state: number; pollTimeout: number }> {
    return this.poll_until(state => state === idleState);
  }

  private async dfuseCommand(command: number, param: number, len: number = 4): Promise<void> {
    const commandNames: { [key: number]: string } = {
      0x00: "GET_COMMANDS",
      0x21: "SET_ADDRESS",
      0x41: "ERASE_SECTOR"
    };

    const payload = new ArrayBuffer(len + 1);
    const view = new DataView(payload);
    view.setUint8(0, command);

    if (len === 1) {
      view.setUint8(1, param);
    } else if (len === 4) {
      view.setUint32(1, param, true); // Little endian
    } else {
      throw new Error(`Don't know how to handle data of len ${len}`);
    }

    try {
      await this.download(payload, 0);
    } catch (error) {
      throw new Error(`Error during special DfuSe command ${commandNames[command]}: ${error}`);
    }

    const status = await this.poll_until(state => state !== DFU_STATE.dfuDNBUSY);
    if (status.status !== DFU_STATUS.OK) {
      throw new Error(`Special DfuSe command ${commandNames[command]} failed`);
    }
  }

  private getSegment(addr: number): MemorySegment | null {
    if (!this.memoryInfo || !this.memoryInfo.segments) {
      throw new Error("No memory map information available");
    }

    for (const segment of this.memoryInfo.segments) {
      if (segment.start <= addr && addr < segment.end) {
        return segment;
      }
    }

    return null;
  }

  private getSectorStart(addr: number, segment?: MemorySegment): number {
    if (!segment) {
      segment = this.getSegment(addr) || undefined;
    }

    if (!segment) {
      throw new Error(`Address ${addr.toString(16)} outside of memory map`);
    }

    const sectorIndex = Math.floor((addr - segment.start) / segment.sectorSize);
    return segment.start + sectorIndex * segment.sectorSize;
  }

  private getSectorEnd(addr: number, segment?: MemorySegment): number {
    if (!segment) {
      segment = this.getSegment(addr) || undefined;
    }

    if (!segment) {
      throw new Error(`Address ${addr.toString(16)} outside of memory map`);
    }

    const sectorIndex = Math.floor((addr - segment.start) / segment.sectorSize);
    return segment.start + (sectorIndex + 1) * segment.sectorSize;
  }

  private async erase(startAddr: number, length: number): Promise<void> {
    let segment = this.getSegment(startAddr);
    let addr = this.getSectorStart(startAddr, segment || undefined);
    const endAddr = this.getSectorEnd(startAddr + length - 1);

    let bytesErased = 0;
    const bytesToErase = endAddr - addr;
    if (bytesToErase > 0) {
      this.logProgress?.(bytesErased, bytesToErase);
    }

    while (addr < endAddr) {
      if (segment && segment.end <= addr) {
        segment = this.getSegment(addr);
      }

      if (!segment || !segment.erasable) {
        // Skip over the non-erasable section
        bytesErased = Math.min(bytesErased + (segment?.end || 0) - addr, bytesToErase);
        addr = segment?.end || addr;
        this.logProgress?.(bytesErased, bytesToErase);
        continue;
      }

      const sectorIndex = Math.floor((addr - segment.start) / segment.sectorSize);
      const sectorAddr = segment.start + sectorIndex * segment.sectorSize;
      this.logDebug?.(`Erasing ${segment.sectorSize}B at 0x${sectorAddr.toString(16)}`);
      await this.dfuseCommand(DFUSE_ERASE_SECTOR, sectorAddr, 4);
      addr = sectorAddr + segment.sectorSize;
      bytesErased += segment.sectorSize;
      this.logProgress?.(bytesErased, bytesToErase);
    }
  }

  async do_download(xfer_size: number, data: ArrayBuffer, _manifestationTolerant: boolean = true, eraseFirst: boolean = false): Promise<void> {
    this.logInfo?.("Starting firmware download");

    const expected_size = data.byteLength;
    const startAddress = this.startAddress;

    if (!this.memoryInfo || !this.memoryInfo.segments) {
      throw new Error("No memory map available");
    }

    try {
      // Clear any error status first
      const initialStatus = await this.getStatus();
      if (initialStatus.state === DFU_STATE.dfuERROR) {
        await this.clearStatus();
      }

      if (eraseFirst) {
        this.logInfo?.("Erasing DFU device memory");
        await this.erase(startAddress, expected_size);
        this.logInfo?.("Erase complete");
      }

      this.logInfo?.("Copying data from browser to DFU device");

      let bytes_sent = 0;
      let address = startAddress;
      while (bytes_sent < expected_size) {
        const bytes_left = expected_size - bytes_sent;
        const chunk_size = Math.min(bytes_left, xfer_size);

        try {
          await this.dfuseCommand(DFUSE_SET_ADDRESS, address, 4);
          this.logDebug?.(`Set address to 0x${address.toString(16)}`);

          const chunk = data.slice(bytes_sent, bytes_sent + chunk_size);
          await this.download(chunk, 2); // DfuSe uses block 2 for download

          const dfu_status = await this.poll_until_idle(DFU_STATE.dfuDNLOAD_IDLE);

          if (dfu_status.status !== DFU_STATUS.OK) {
            throw new Error(`DFU DOWNLOAD failed state=${dfu_status.state}, status=${dfu_status.status}`);
          }
        } catch (error) {
          throw new Error(`Error during DfuSe download: ${error}`);
        }

        address += chunk_size;
        bytes_sent += chunk_size;
        this.logProgress?.(bytes_sent, expected_size);
      }
      this.logInfo?.(`Downloaded ${bytes_sent} bytes`);

      this.logInfo?.("Manifesting new firmware");
      try {
        await this.dfuseCommand(DFUSE_SET_ADDRESS, startAddress, 4);
        await this.download(new ArrayBuffer(0), 0);
      } catch (error) {
        throw new Error(`Error during DfuSe manifestation: ${error}`);
      }

      try {
        await this.poll_until(state => (state === DFU_STATE.dfuMANIFEST));
        this.logInfo?.("Firmware download complete! Device will reset.");
      } catch (error) {
        this.logError?.("Manifestation polling failed.");
      }

    } catch (error) {
      this.logError?.(`Download failed: ${error}`);
      throw error;
    }
  }
}

export function findDfuInterfaces(device: USBDevice): DFUInterface[] {
  const interfaces: DFUInterface[] = [];

  for (const config of device.configurations) {
    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        if (alt.interfaceClass === 0xFE &&
          alt.interfaceSubclass === 0x01 &&
          (alt.interfaceProtocol === 0x01 || alt.interfaceProtocol === 0x02)) {
          interfaces.push({
            configuration: config,
            interface: iface,
            alternate: alt,
            name: alt.interfaceName || null
          });
        }
      }
    }
  }

  return interfaces;
}