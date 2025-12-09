import React, { useState, useCallback } from 'react';
import { FaDownload, FaCode } from 'react-icons/fa';
import type { Datum } from '../../services/DataModel/types';
import { DatumFileService } from '../../services/DatumPersistence/DatumFileService';
import { Modal, Button, Card, CardBody, StatusIndicator } from '../../design-system';

interface SpectralExportModalProps {
  spectralData: Datum | null;
  scriptContent: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SpectralExportModal: React.FC<SpectralExportModalProps> = ({
  spectralData,
  scriptContent,
  isOpen,
  onClose
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');

  // Download file helper
  const downloadFile = useCallback((content: string | Uint8Array | Blob, filename: string, mimeType: string) => {
    const blob = content instanceof Blob ? content : new Blob([content as BlobPart], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }, []);

  // Handle script download
  const handleDownloadScript = useCallback(() => {
    if (!scriptContent.trim()) {
      setExportStatus('No script content to download');
      setTimeout(() => setExportStatus(''), 3000);
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `spectral-script-${timestamp}.lua`;

    downloadFile(scriptContent, filename, 'text/plain');
    setExportStatus('Script downloaded successfully!');
    setTimeout(() => setExportStatus(''), 3000);
  }, [scriptContent, downloadFile]);

  // Handle binary download
  const handleDownloadBinary = useCallback(async () => {
    if (!spectralData) {
      setExportStatus('No spectral data to export');
      setTimeout(() => setExportStatus(''), 3000);
      return;
    }

    setIsExporting(true);
    setExportStatus('Preparing binary export...');

    try {
      const result = await DatumFileService.exportDatum(spectralData);
      if (result.success) {
        setExportStatus('Binary export completed successfully!');
        setTimeout(() => setExportStatus(''), 3000);
      } else {
        setExportStatus(`Export failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      setExportStatus(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Binary export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, [spectralData]);

  const hasScript = scriptContent.trim().length > 0;
  const hasData = spectralData && spectralData.frames.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Spectral Data"
      size="lg"
      footer={
        <Button onClick={onClose} variant="secondary">
          Close
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-lg)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ds-spacing-md)' }}>
          <Card>
            <CardBody>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-spacing-sm)', marginBottom: 'var(--ds-spacing-sm)' }}>
                <FaCode style={{ color: 'var(--ds-color-amber)', fontSize: '1.2rem' }} />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>Lua Script</h4>
              </div>
              <p style={{ margin: '0 0 var(--ds-spacing-md) 0', fontSize: 'var(--ds-font-size-sm)', color: 'var(--ds-color-text-secondary)' }}>
                Download the current Lua script source code.
              </p>
              <Button
                onClick={handleDownloadScript}
                disabled={!hasScript}
                variant="primary"
                style={{ width: '100%' }}
              >
                <FaDownload style={{ marginRight: '8px' }} /> Download Script
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-spacing-sm)', marginBottom: 'var(--ds-spacing-sm)' }}>
                <FaDownload style={{ color: 'var(--ds-color-amber)', fontSize: '1.2rem' }} />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>Binary Data</h4>
              </div>
              <p style={{ margin: '0 0 var(--ds-spacing-md) 0', fontSize: 'var(--ds-font-size-sm)', color: 'var(--ds-color-text-secondary)' }}>
                Export generated spectral data as binary datum file.
              </p>
              <Button
                onClick={handleDownloadBinary}
                disabled={!hasData || isExporting}
                variant="primary"
                style={{ width: '100%' }}
              >
                {isExporting ? 'Exporting...' : <><FaDownload style={{ marginRight: '8px' }} /> Download Binary</>}
              </Button>
            </CardBody>
          </Card>
        </div>

        <div style={{
          backgroundColor: 'var(--ds-color-background-tertiary)',
          padding: 'var(--ds-spacing-md)',
          borderRadius: 'var(--ds-border-radius-md)',
          border: '1px solid var(--ds-color-border-muted)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-xs)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--ds-font-size-sm)' }}>
              <span style={{ color: 'var(--ds-color-text-secondary)' }}>Script Size:</span>
              <span style={{ fontWeight: 500 }}>{hasScript ? `${scriptContent.length} characters` : 'No script'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--ds-font-size-sm)' }}>
              <span style={{ color: 'var(--ds-color-text-secondary)' }}>Frame Count:</span>
              <span style={{ fontWeight: 500 }}>{hasData ? spectralData?.frames.length : 'No data'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--ds-font-size-sm)' }}>
              <span style={{ color: 'var(--ds-color-text-secondary)' }}>Frequency Bands:</span>
              <span style={{ fontWeight: 500 }}>20 bands</span>
            </div>
            {hasData && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--ds-font-size-sm)' }}>
                <span style={{ color: 'var(--ds-color-text-secondary)' }}>Data Size:</span>
                <span style={{ fontWeight: 500 }}>{spectralData!.frames.length * 20} values</span>
              </div>
            )}
          </div>
        </div>

        {exportStatus && (
          <StatusIndicator variant={
            exportStatus.includes('failed') ? 'error' :
              exportStatus.includes('successfully') ? 'success' : 'info'
          }>
            {exportStatus}
          </StatusIndicator>
        )}
      </div>
    </Modal>
  );
};