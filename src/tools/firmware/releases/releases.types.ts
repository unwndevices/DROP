export interface ReleasePlatforms {
  daisy: string;
  daisy_debug?: string;
  esp32: string;
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
