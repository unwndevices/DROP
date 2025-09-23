import React, { useState, useCallback, useEffect } from 'react';
import { SimpleSpectrumChart } from '../../components/Visualizer/SimpleSpectrumChart';
import { DatumFileService } from '../../services/DatumPersistence/DatumFileService';
import type { Datum } from '../../services/DataModel/types';

// Import design system components
import { 
  ToolLayout, 
  Button, 
  Card, 
  CardHeader, 
  CardBody, 
  StatusIndicator,
  Timeline
} from '../../design-system';

export const DatumViewer: React.FC = () => {
  const [spectralData, setSpectralData] = useState<Datum | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying || !spectralData?.frames || spectralData.frames.length === 0) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        const nextFrame = (prev + 1) % spectralData.frames.length;
        // Stop playing when we reach the end and loop back to start
        if (nextFrame === 0 && prev === spectralData.frames.length - 1) {
          setIsPlaying(false);
        }
        return nextFrame;
      });
    }, 100); // 10 FPS

    return () => clearInterval(interval);
  }, [isPlaying, spectralData?.frames]);

  const handleImportDatum = useCallback(async () => {
    if (isImporting) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const result = await DatumFileService.importDatum();

      if (result.success && result.datum) {
        setSpectralData(result.datum);
        setCurrentFrame(0);
        console.log('DROP: Datum imported successfully:', result.datum.name);
      } else if (result.error) {
        setImportError(result.error);
        console.error('DROP: Import failed:', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown import error';
      setImportError(errorMessage);
      console.error('DROP: Import error:', error);
    } finally {
      setIsImporting(false);
    }
  }, [isImporting]);

  const handleImportFromJson = useCallback(async () => {
    if (isImporting) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const result = await DatumFileService.importDatumFromJson();

      if (result.success && result.datum) {
        setSpectralData(result.datum);
        setCurrentFrame(0);
        console.log('DROP: JSON datum imported successfully:', result.datum.name);
      } else if (result.error) {
        setImportError(result.error);
        console.error('DROP: JSON import failed:', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown import error';
      setImportError(errorMessage);
      console.error('DROP: JSON import error:', error);
    } finally {
      setIsImporting(false);
    }
  }, [isImporting]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (isImporting) return;

    const files = Array.from(e.dataTransfer.files);
    const datumFile = files.find(file =>
      file.name.toLowerCase().endsWith('.datum') ||
      file.name.toLowerCase().endsWith('.dat') ||
      file.name.toLowerCase().endsWith('.json')
    );

    if (!datumFile) {
      setImportError('Please drop a .datum, .dat, or .json file');
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      let result;
      if (datumFile.name.toLowerCase().endsWith('.json')) {
        const text = await datumFile.text();
        const datum = JSON.parse(text) as Datum;
        result = { success: true, datum };
      } else {
        result = await DatumFileService.importDatumFromFile(datumFile);
      }

      if (result.success && result.datum) {
        setSpectralData(result.datum);
        setCurrentFrame(0);
        console.log('DROP: Datum dropped and imported successfully:', result.datum.name);
      } else if (result.error) {
        setImportError(result.error);
        console.error('DROP: Drop import failed:', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown import error';
      setImportError(errorMessage);
      console.error('DROP: Drop import error:', error);
    } finally {
      setIsImporting(false);
    }
  }, [isImporting]);

  const handleClearData = useCallback(() => {
    setSpectralData(null);
    setCurrentFrame(0);
    setImportError(null);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Create left panel (File Information)
  const leftPanel = (
    <div className="p-3">
      {!spectralData ? (
        <Card>
          <CardBody>
            <div
              className={`drop-zone ${dragActive ? 'active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="drop-zone-content">
                <div className="drop-zone-icon">📁</div>
                <h3>Drop datum files here</h3>
                <p>or use the Import buttons in the header</p>
                <div className="supported-formats">
                  <small>Supported: .datum, .dat, .json</small>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>Datum Properties</CardHeader>
          <CardBody>
            <div className="info-grid">
              <div className="info-item">
                <label>Name:</label>
                <span>{spectralData.name || 'Unnamed'}</span>
              </div>
              <div className="info-item">
                <label>Frames:</label>
                <span>{spectralData.frameCount.toLocaleString()}</span>
              </div>
              <div className="info-item">
                <label>Bands:</label>
                <span>{spectralData.bandCount}</span>
              </div>
            </div>

            {spectralData.description && (
              <div className="mt-3">
                <h4>Description</h4>
                <p>{spectralData.description}</p>
              </div>
            )}

            <div className="mt-3">
              <h4>Timestamps</h4>
              <div className="info-grid">
                {spectralData.createdAt && (
                  <div className="info-item">
                    <label>Created:</label>
                    <span>{new Date(spectralData.createdAt).toLocaleString()}</span>
                  </div>
                )}
                {spectralData.modifiedAt && (
                  <div className="info-item">
                    <label>Modified:</label>
                    <span>{new Date(spectralData.modifiedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3">
              <h4>Statistics</h4>
              <div className="info-grid">
                <div className="info-item">
                  <label>Data Points:</label>
                  <span>{(spectralData.frameCount * spectralData.bandCount).toLocaleString()}</span>
                </div>
                <div className="info-item">
                  <label>Memory Size:</label>
                  <span>{formatFileSize(spectralData.frameCount * spectralData.bandCount * 4)}</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {importError && (
        <StatusIndicator variant="error" className="mt-3">
          <strong>Import Error:</strong> {importError}
        </StatusIndicator>
      )}
    </div>
  );

  // Create right panel (Spectral Preview)
  const rightPanel = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, padding: 'var(--ds-spacing-md)', overflow: 'hidden' }}>
        <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardHeader>Spectral Preview</CardHeader>
          <CardBody style={{ flex: 1, overflow: 'hidden' }}>
            <SimpleSpectrumChart
              frames={spectralData?.frames || []}
              currentFrame={currentFrame}
              onFrameChange={setCurrentFrame}
              showControls={false}
              className={`${spectralData ? '' : 'empty'} ${isImporting ? 'loading' : ''}`}
            />
          </CardBody>
        </Card>
      </div>
      
      {/* Timeline Controls */}
      <Timeline
        currentFrame={currentFrame}
        totalFrames={spectralData?.frameCount || 0}
        isPlaying={isPlaying}
        onFrameChange={setCurrentFrame}
        onPlayToggle={() => setIsPlaying(!isPlaying)}
        disabled={!spectralData || isImporting}
      />
    </div>
  );

  // Create status bar content
  const statusBar = (
    <div className="flex justify-between items-center w-full">
      <div className="flex gap-4 items-center">
        <span>Datum Viewer</span>
        {spectralData && (
          <span className="text-success">
            Loaded: {spectralData.name || 'Unnamed'} ({spectralData.frameCount}f × {spectralData.bandCount}b)
          </span>
        )}
        {importError && (
          <span className="text-error">Error: {importError}</span>
        )}
        {isImporting && (
          <span className="text-warning">Importing datum...</span>
        )}
      </div>
      <div>
        <span>{isImporting ? 'Loading' : spectralData ? 'Loaded' : 'Ready'}</span>
      </div>
    </div>
  );

  return (
    <ToolLayout
      header={{
        actions: [
          <Button
            key="import"
            variant="primary"
            onClick={handleImportDatum}
            disabled={isImporting}
          >
            {isImporting ? 'Importing...' : 'Import Datum'}
          </Button>,
          <Button
            key="json"
            variant="secondary"
            onClick={handleImportFromJson}
            disabled={isImporting}
          >
            Import JSON
          </Button>,
          ...(spectralData ? [
            <Button
              key="clear"
              variant="secondary"
              onClick={handleClearData}
            >
              Clear
            </Button>
          ] : [])
        ]
      }}
      panels={{
        left: leftPanel,
        right: rightPanel
      }}
      statusBar={statusBar}
    />
  );
};