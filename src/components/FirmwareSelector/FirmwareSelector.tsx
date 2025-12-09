import React, { useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { Button, Select, StatusIndicator, Card, CardBody } from '../../design-system';

interface SimpleRelease {
  version: string;
  releaseDate: string;
  changelog: string[];
  platforms: {
    daisy: string;
    esp32: string;
  };
}

interface ReleaseIndex {
  latest: string;
  releases: SimpleRelease[];
}

interface FirmwareSelectorProps {
  platform: 'daisy' | 'esp32';
  onFirmwareLoad: (binary: Blob, version: string) => void;
  disabled?: boolean;
}

export const FirmwareSelector: React.FC<FirmwareSelectorProps> = ({
  platform,
  onFirmwareLoad,
  disabled = false
}) => {
  const [versions, setVersions] = useState<SimpleRelease[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [fetchError, setFetchError] = useState<string>('');

  const fetchVersions = useCallback(async () => {
    try {
      setFetchError('');
      // Fetch from unwn_fw repository
      const response = await fetch('https://raw.githubusercontent.com/unwndevices/unwn_fw/main/releases.json');

      if (!response.ok) {
        throw new Error(`Failed to fetch releases: ${response.status}`);
      }

      const data: ReleaseIndex = await response.json();

      setVersions(data.releases);
      setSelectedVersion(data.latest);
    } catch (error) {
      console.error('Failed to fetch versions:', error);
      setFetchError(error instanceof Error ? error.message : 'Failed to fetch firmware versions');
    }
  }, []);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const downloadFirmware = useCallback(async (version: string) => {
    const release = versions.find(v => v.version === version);
    if (!release) {
      console.error('Release not found:', version);
      return;
    }

    setLoading(true);
    try {
      const url = release.platforms[platform];
      console.log(`Downloading firmware from: ${url}`);

      // Try direct fetch first
      const response = await fetch(url, {
        mode: 'cors',
        cache: 'no-cache'
      }).catch(async (e) => {
        console.warn('Direct fetch failed, trying with cache:', e);
        // Try with default cache if CORS fails
        return fetch(url);
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const binary = await response.blob();
      console.log(`Downloaded firmware: ${binary.size} bytes`);

      onFirmwareLoad(binary, version);
    } catch (error) {
      console.error('Failed to download firmware:', error);
      setFetchError(error instanceof Error ? error.message : 'Failed to download firmware');
    } finally {
      setLoading(false);
    }
  }, [versions, platform, onFirmwareLoad]);

  const selectedRelease = versions.find(v => v.version === selectedVersion);

  if (fetchError && versions.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-md)' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Firmware Version</h3>
        <StatusIndicator variant="error">
          Unable to fetch firmware versions: {fetchError}
        </StatusIndicator>
        <Button onClick={fetchVersions} variant="secondary">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Firmware Version</h3>
      </div>

      <div style={{ display: 'flex', gap: 'var(--ds-spacing-md)', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <Select
            label="Select Version"
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
            disabled={disabled || loading || versions.length === 0}
            options={[
              { value: '', label: 'Select version...' },
              ...versions.map(version => ({
                value: version.version,
                label: `${version.version} - ${version.releaseDate}`
              }))
            ]}
          />
        </div>

        {selectedRelease && (
          <Button
            onClick={() => setShowChangelog(!showChangelog)}
            variant="secondary"
            disabled={disabled}
          >
            {showChangelog ? 'Hide' : 'Show'} Changes
          </Button>
        )}
      </div>

      {selectedRelease && showChangelog && (
        <Card variant="glass">
          <CardBody>
            <div
              style={{
                maxHeight: '200px',
                overflowY: 'auto',
                fontSize: 'var(--ds-font-size-sm)',
                color: 'var(--ds-color-text-secondary)'
              }}
              dangerouslySetInnerHTML={{
                __html: marked.parse(selectedRelease.changelog.join('\n\n')) as string
              }}
            />
          </CardBody>
        </Card>
      )}

      <Button
        onClick={() => downloadFirmware(selectedVersion)}
        variant="primary"
        disabled={!selectedVersion || loading || disabled}
        loading={loading}
      >
        {loading ? 'Downloading...' : 'Load Firmware'}
      </Button>

      {fetchError && (
        <StatusIndicator variant="warning">
          Warning: {fetchError}
        </StatusIndicator>
      )}
    </div>
  );
};