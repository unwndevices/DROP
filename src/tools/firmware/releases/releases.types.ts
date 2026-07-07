export interface ReleasePlatforms {
  daisy: string;
  daisy_debug?: string;
  /** Merged bootloader+partitions+app image — serial/USB flashing at 0x0 only. */
  esp32: string;
  /** App-only image for the microSD `.esp` update path. Absent on releases
   *  before v1.0.8b3 — the merged image must never be offered as a fallback,
   *  it boot-loops the module when written to an OTA app slot. */
  esp32_app?: string;
  littlefs?: string;
}

export interface Release {
  version: string;
  releaseDate: string;
  changelog: string[];
  platforms: ReleasePlatforms;
}

export interface ReleaseIndex {
  latest: string;
  releases: Release[];
}
