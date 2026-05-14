import React, { useCallback, useEffect, useState } from 'react';
import { SimpleSpectrumChart } from '../../components/Visualizer/SimpleSpectrumChart';
import { DatumFileService } from '../../services/DatumPersistence/DatumFileService';
import type { Datum } from '../../services/DataModel/types';
import {
  DropZone,
  Panel,
  SectionLabel,
  StatusBadge,
  TransportBar,
} from '../../design-system';
import './DatumViewer.css';

const DATUM_EXT = /\.(datum|dat|json)$/i;

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 b';
  const k = 1024;
  const units = ['b', 'kb', 'mb', 'gb'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
};

export const DatumViewer: React.FC = () => {
  const [datum, setDatum] = useState<Datum | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying || !datum?.frames || datum.frames.length === 0) return;
    const id = setInterval(() => {
      setCurrentFrame((prev) => {
        const next = (prev + 1) % datum.frames.length;
        if (next === 0 && prev === datum.frames.length - 1) setIsPlaying(false);
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [isPlaying, datum?.frames]);

  const loadFile = useCallback(async (file: File) => {
    if (!DATUM_EXT.test(file.name)) {
      setImportError('unsupported file — use .datum / .dat / .json');
      return;
    }
    setIsImporting(true);
    setImportError(null);
    try {
      let result: { success: boolean; datum?: Datum; error?: string };
      if (file.name.toLowerCase().endsWith('.json')) {
        const text = await file.text();
        result = { success: true, datum: JSON.parse(text) as Datum };
      } else {
        result = await DatumFileService.importDatumFromFile(file);
      }
      if (result.success && result.datum) {
        setDatum(result.datum);
        setCurrentFrame(0);
      } else if (result.error) {
        setImportError(result.error);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'import failed');
    } finally {
      setIsImporting(false);
    }
  }, []);

  const handleClear = useCallback(() => {
    setDatum(null);
    setCurrentFrame(0);
    setImportError(null);
  }, []);

  return (
    <div className="datum-viewer">
      <header className="datum-viewer__header">
        <h1 className="datum-viewer__title">datum viewer</h1>
        {datum && (
          <button
            type="button"
            className="datum-viewer__clear"
            onClick={handleClear}
          >
            clear
          </button>
        )}
      </header>

      <div className="datum-viewer__grid">
        <section className="datum-viewer__section">
          <SectionLabel index={1}>source</SectionLabel>

          <DropZone
            accept=".datum,.dat,.json,application/json"
            label="drop .datum here"
            hint="or click to browse — .datum / .dat / .json"
            disabled={isImporting}
            onFiles={(files) => {
              const f = files[0];
              if (f) void loadFile(f);
            }}
          />

          {isImporting && <StatusBadge kind="info">importing…</StatusBadge>}
          {importError && <StatusBadge kind="err">{importError}</StatusBadge>}
          {!isImporting && !importError && !datum && (
            <StatusBadge kind="info">drop a datum to begin</StatusBadge>
          )}

          {datum && (
            <Panel title="properties">
              <dl className="datum-viewer__props">
                <Prop label="name" value={datum.name || 'unnamed'} />
                <Prop label="frames" value={datum.frameCount.toLocaleString()} />
                <Prop label="bands" value={String(datum.bandCount)} />
                <Prop
                  label="memory"
                  value={formatBytes(datum.frameCount * datum.bandCount * 4)}
                />
                {datum.frameRateHz && (
                  <Prop
                    label="frame rate"
                    value={`${datum.frameRateHz.toFixed(0)} hz`}
                  />
                )}
                {datum.createdAt && (
                  <Prop
                    label="created"
                    value={new Date(datum.createdAt).toLocaleString()}
                  />
                )}
                {datum.description && (
                  <Prop label="description" value={datum.description} />
                )}
              </dl>
            </Panel>
          )}
        </section>

        <section className="datum-viewer__section">
          <SectionLabel index={2}>preview</SectionLabel>

          <Panel title="spectral preview" padded={false}>
            <div className="datum-viewer__chart">
              <SimpleSpectrumChart
                frames={datum?.frames || []}
                currentFrame={currentFrame}
                onFrameChange={setCurrentFrame}
                showControls={false}
                className={`${datum ? '' : 'empty'} ${isImporting ? 'loading' : ''}`}
              />
            </div>
          </Panel>

          <TransportBar
            currentFrame={currentFrame}
            totalFrames={datum?.frameCount ?? 0}
            isPlaying={isPlaying}
            onFrameChange={setCurrentFrame}
            onPlayToggle={() => setIsPlaying(!isPlaying)}
            disabled={!datum || isImporting}
          />
        </section>
      </div>
    </div>
  );
};

const Prop: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="datum-viewer__prop">
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);
