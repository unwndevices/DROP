// DROP Datum Binary Format Implementation
// Based on DATUM_BINARY_SPECS.md

import type { Datum, SpectralFrame } from '../DataModel/types';

// Constants from spec
const DATUM_MAGIC = [0x44, 0x41, 0x54, 0x4D]; // "DATM"
const DATUM_VERSION = 1;
// Header size: 4+4+4+20+4+4+4+8+32+32+8+8+4+1+1+65 = 203 bytes
// (matches firmware DatumFileHeader with __attribute__((packed)))
const DATUM_HEADER_SIZE = 203;

// Binary format structures
export interface DatumHeader {
  magic: number[];
  version: number;
  headerSize: number;
  name: string;
  frames: number;
  startFrame: number;
  endFrame: number;
  baseHz: number;
  phaseMultipliers: number[];
  offsets: number[];
  startPoint: number;
  endPoint: number;
  warpAmount: number;
  warpType: number;
  selectedLUT: number;
  reserved: Uint8Array;
}

export interface DatumBinaryFile {
  header: DatumHeader;
  spectralData: SpectralFrame[];
}

export class DatumBinaryFormat {
  
  /**
   * Converts a Datum object to binary format (.datum file)
   */
  static datumToBinary(datum: Datum): Uint8Array {
    const header = this.createHeader(datum);
    const spectralData = this.encodeSpectralData(datum.frames);
    
    const totalSize = DATUM_HEADER_SIZE + spectralData.byteLength;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    
    // Write header
    this.writeHeader(view, header);
    
    // Write spectral data
    const uint8View = new Uint8Array(buffer);
    uint8View.set(new Uint8Array(spectralData), DATUM_HEADER_SIZE);
    
    return new Uint8Array(buffer);
  }
  
  /**
   * Converts binary data to Datum object
   */
  static binaryToDatum(data: Uint8Array): Datum {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    
    // Read and validate header
    const header = this.readHeader(view);
    this.validateHeader(header, data.byteLength);
    
    // Read spectral data
    const spectralDataBuffer = data.slice(DATUM_HEADER_SIZE);
    const frames = this.decodeSpectralData(spectralDataBuffer, header.frames);
    
    return {
      frames,
      sampleRate: 44100, // Default sample rate for compatibility
      frameCount: header.frames,
      bandCount: 20, // Fixed to 20 bands per spec
      name: header.name,
      description: `Imported datum with ${header.frames} frames`,
      createdAt: new Date(),
      modifiedAt: new Date()
    };
  }
  
  /**
   * Creates header from Datum object
   */
  private static createHeader(datum: Datum): DatumHeader {
    return {
      magic: DATUM_MAGIC,
      version: DATUM_VERSION,
      headerSize: DATUM_HEADER_SIZE,
      name: datum.name || 'DROP Export',
      frames: datum.frameCount,
      startFrame: 0,
      endFrame: datum.frameCount - 1,
      baseHz: 440.0, // Default base frequency for orbit calculations
      phaseMultipliers: [1.0, 1.0, 1.0, 1.0],
      offsets: [0.0, 0.0, 0.0, 0.0],
      startPoint: 0.0,
      endPoint: 1.0,
      warpAmount: 0.0,
      warpType: 0,
      selectedLUT: 0,
      reserved: new Uint8Array(65)
    };
  }
  
  /**
   * Writes header to DataView
   */
  private static writeHeader(view: DataView, header: DatumHeader): void {
    let offset = 0;
    
    // Magic number (4 bytes)
    for (let i = 0; i < 4; i++) {
      view.setUint8(offset++, header.magic[i]);
    }
    
    // Version (4 bytes)
    view.setUint32(offset, header.version, true);
    offset += 4;
    
    // Header size (4 bytes)
    view.setUint32(offset, header.headerSize, true);
    offset += 4;
    
    // Name (20 bytes, null-terminated)
    const nameBytes = new TextEncoder().encode(header.name.substring(0, 19));
    for (let i = 0; i < 20; i++) {
      view.setUint8(offset + i, i < nameBytes.length ? nameBytes[i] : 0);
    }
    offset += 20;
    
    // Frames (4 bytes)
    view.setUint32(offset, header.frames, true);
    offset += 4;
    
    // Start frame (4 bytes)
    view.setUint32(offset, header.startFrame, true);
    offset += 4;
    
    // End frame (4 bytes)
    view.setUint32(offset, header.endFrame, true);
    offset += 4;
    
    // Base Hz (8 bytes)
    view.setFloat64(offset, header.baseHz, true);
    offset += 8;
    
    // Phase multipliers (32 bytes, 4 doubles)
    for (let i = 0; i < 4; i++) {
      view.setFloat64(offset, header.phaseMultipliers[i], true);
      offset += 8;
    }
    
    // Offsets (32 bytes, 4 doubles)
    for (let i = 0; i < 4; i++) {
      view.setFloat64(offset, header.offsets[i], true);
      offset += 8;
    }
    
    // Start point (8 bytes)
    view.setFloat64(offset, header.startPoint, true);
    offset += 8;
    
    // End point (8 bytes)
    view.setFloat64(offset, header.endPoint, true);
    offset += 8;
    
    // Warp amount (4 bytes)
    view.setFloat32(offset, header.warpAmount, true);
    offset += 4;
    
    // Warp type (1 byte)
    view.setUint8(offset, header.warpType);
    offset += 1;
    
    // Selected LUT (1 byte)
    view.setUint8(offset, header.selectedLUT);
    offset += 1;
    
    // Reserved (65 bytes)
    for (let i = 0; i < 65; i++) {
      view.setUint8(offset + i, header.reserved[i]);
    }
  }
  
  /**
   * Reads header from DataView
   */
  private static readHeader(view: DataView): DatumHeader {
    let offset = 0;
    
    // Magic number
    const magic = [];
    for (let i = 0; i < 4; i++) {
      magic.push(view.getUint8(offset++));
    }
    
    // Version
    const version = view.getUint32(offset, true);
    offset += 4;
    
    // Header size
    const headerSize = view.getUint32(offset, true);
    offset += 4;
    
    // Name
    const nameBytes = new Uint8Array(20);
    for (let i = 0; i < 20; i++) {
      nameBytes[i] = view.getUint8(offset + i);
    }
    const name = new TextDecoder().decode(nameBytes).replace(/\0+$/, '');
    offset += 20;
    
    // Frames
    const frames = view.getUint32(offset, true);
    offset += 4;
    
    // Start frame
    const startFrame = view.getUint32(offset, true);
    offset += 4;
    
    // End frame
    const endFrame = view.getUint32(offset, true);
    offset += 4;
    
    // Base Hz
    const baseHz = view.getFloat64(offset, true);
    offset += 8;
    
    // Phase multipliers
    const phaseMultipliers = [];
    for (let i = 0; i < 4; i++) {
      phaseMultipliers.push(view.getFloat64(offset, true));
      offset += 8;
    }
    
    // Offsets
    const offsets = [];
    for (let i = 0; i < 4; i++) {
      offsets.push(view.getFloat64(offset, true));
      offset += 8;
    }
    
    // Start point
    const startPoint = view.getFloat64(offset, true);
    offset += 8;
    
    // End point
    const endPoint = view.getFloat64(offset, true);
    offset += 8;
    
    // Warp amount
    const warpAmount = view.getFloat32(offset, true);
    offset += 4;
    
    // Warp type
    const warpType = view.getUint8(offset);
    offset += 1;
    
    // Selected LUT
    const selectedLUT = view.getUint8(offset);
    offset += 1;
    
    // Reserved
    const reserved = new Uint8Array(65);
    for (let i = 0; i < 65; i++) {
      reserved[i] = view.getUint8(offset + i);
    }
    
    return {
      magic,
      version,
      headerSize,
      name,
      frames,
      startFrame,
      endFrame,
      baseHz,
      phaseMultipliers,
      offsets,
      startPoint,
      endPoint,
      warpAmount,
      warpType,
      selectedLUT,
      reserved
    };
  }
  
  /**
   * Validates header integrity
   */
  private static validateHeader(header: DatumHeader, fileSize: number): void {
    // Check magic number
    if (!header.magic.every((byte, i) => byte === DATUM_MAGIC[i])) {
      throw new Error('Invalid datum file: magic number mismatch');
    }
    
    // Check version
    if (header.version !== DATUM_VERSION) {
      throw new Error(`Unsupported datum file version: ${header.version}`);
    }
    
    // Check header size
    if (header.headerSize !== DATUM_HEADER_SIZE) {
      throw new Error(`Invalid header size: ${header.headerSize}`);
    }
    
    // Check frame count
    if (header.frames <= 0) {
      throw new Error('Invalid frame count: must be > 0');
    }
    
    // Check frame range
    if (header.endFrame < header.startFrame) {
      throw new Error('Invalid frame range: endFrame < startFrame');
    }
    
    // Check file size
    const expectedSize = DATUM_HEADER_SIZE + (header.frames * 20 * 4); // 20 bands * 4 bytes per float
    if (fileSize !== expectedSize) {
      throw new Error(`Invalid file size: expected ${expectedSize}, got ${fileSize}`);
    }
  }
  
  /**
   * Encodes spectral frames to binary format
   */
  private static encodeSpectralData(frames: SpectralFrame[]): ArrayBuffer {
    const buffer = new ArrayBuffer(frames.length * 20 * 4); // 20 bands * 4 bytes per float
    const view = new DataView(buffer);
    
    let offset = 0;
    for (const frame of frames) {
      // Ensure we have exactly 20 bands
      const bands = frame.bands.slice(0, 20);
      while (bands.length < 20) {
        bands.push(0.0);
      }
      
      // Write each band as float32
      for (let i = 0; i < 20; i++) {
        view.setFloat32(offset, bands[i], true);
        offset += 4;
      }
    }
    
    return buffer;
  }
  
  /**
   * Decodes spectral data from binary format
   */
  private static decodeSpectralData(data: Uint8Array, frameCount: number): SpectralFrame[] {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const frames: SpectralFrame[] = [];
    
    let offset = 0;
    for (let f = 0; f < frameCount; f++) {
      const bands: number[] = [];
      
      // Read 20 bands
      for (let i = 0; i < 20; i++) {
        bands.push(view.getFloat32(offset, true));
        offset += 4;
      }
      
      frames.push({
        bands,
        timestamp: f,
        metadata: {}
      });
    }
    
    return frames;
  }
  
  /**
   * Validates datum file format
   */
  static validateFile(data: Uint8Array): boolean {
    try {
      if (data.length < DATUM_HEADER_SIZE) {
        return false;
      }
      
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const header = this.readHeader(view);
      this.validateHeader(header, data.length);
      
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Gets file info without full parsing
   */
  static getFileInfo(data: Uint8Array): { name: string; frames: number; size: number } | null {
    try {
      if (data.length < DATUM_HEADER_SIZE) {
        return null;
      }
      
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const header = this.readHeader(view);
      
      return {
        name: header.name,
        frames: header.frames,
        size: data.length
      };
    } catch {
      return null;
    }
  }
}