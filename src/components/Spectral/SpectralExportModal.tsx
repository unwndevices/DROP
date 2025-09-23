import React, { useState, useCallback } from 'react';
import { FaDownload, FaCode } from 'react-icons/fa';
import type { Datum } from '../../services/DataModel/types';
import { DatumFileService } from '../../services/DatumPersistence/DatumFileService';

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
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
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

  if (!isOpen) return null;

  const hasScript = scriptContent.trim().length > 0;
  const hasData = spectralData && spectralData.frames.length > 0;

  return (
    <div className="modal-backdrop">
      <div className="export-modal">
        <div className="modal-header">
          <h3>Export Spectral Data</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm">✕</button>
        </div>

        <div className="modal-content">
          <div className="export-options">
            <div className="export-option">
              <div className="option-header">
                <FaCode className="option-icon" />
                <h4>Lua Script</h4>
              </div>
              <p>Download the current Lua script source code.</p>
              <button
                onClick={handleDownloadScript}
                disabled={!hasScript}
                className="btn btn-primary"
              >
                <FaDownload /> Download Script
              </button>
            </div>

            <div className="export-option">
              <div className="option-header">
                <FaDownload className="option-icon" />
                <h4>Binary Data</h4>
              </div>
              <p>Export generated spectral data as binary datum file.</p>
              <button
                onClick={handleDownloadBinary}
                disabled={!hasData || isExporting}
                className="btn btn-primary"
              >
                {isExporting ? 'Exporting...' : <><FaDownload /> Download Binary</>}
              </button>
            </div>
          </div>

          <div className="export-details">
            <div className="detail-item">
              <span className="detail-label">Script Size:</span>
              <span className="detail-value">
                {hasScript ? `${scriptContent.length} characters` : 'No script'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Frame Count:</span>
              <span className="detail-value">
                {hasData ? spectralData.frames.length : 'No data'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Frequency Bands:</span>
              <span className="detail-value">20 bands</span>
            </div>
            {hasData && (
              <div className="detail-item">
                <span className="detail-label">Data Size:</span>
                <span className="detail-value">
                  {spectralData.frames.length * 20} values
                </span>
              </div>
            )}
          </div>

          {exportStatus && (
            <div className={`export-status ${exportStatus.includes('failed') ? 'error' : exportStatus.includes('successfully') ? 'success' : 'info'}`}>
              {exportStatus}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};