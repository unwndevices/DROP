import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SimpleSpectrumChart } from '../../components/Visualizer/SimpleSpectrumChart';
import { DatumFileService } from '../../services/DatumPersistence/DatumFileService';
import type { Datum, SpectralFrame } from '../../services/DataModel/types';
import FilterBankModuleFactory, { type FilterBank } from 'filterbank-wasm';
import {
  DropZone,
  Panel,
  ParamSlider,
  SectionLabel,
  Segmented,
  StatusBadge,
  TransportBar,
} from '../../design-system';
import './Wav2Datum.css';

interface ConversionSettings {
  presetName: string;
  inputGain: number;
  prerollMode: 'reverse' | 'loop' | 'none';
  /** Analysis block size in samples. Frame rate = 48000 / blockSize. */
  analysisBlockSize: number;
}

const INPUT_SAMPLE_RATE = 48000;
const SLOT_FRAME_CAPACITY = 256;

interface DetailOption {
  label: string;
  value: number;
  fps: number;
  maxSeconds: number;
}

const DETAIL_OPTIONS: DetailOption[] = [
  { label: '0.5× — 1 kHz, max 54 s',      value: 48, fps: 1000,  maxSeconds: 54 },
  { label: '1× — 2 kHz, max 27 s (std)',  value: 24, fps: 2000,  maxSeconds: 27 },
  { label: '2× — 4 kHz, max 13.5 s',      value: 12, fps: 4000,  maxSeconds: 13.5 },
  { label: '4× — 8 kHz, max 6.75 s',      value: 6,  fps: 8000,  maxSeconds: 6.75 },
  { label: '8× — 16 kHz, max 3.4 s (HD)', value: 3,  fps: 16000, maxSeconds: 3.375 },
];

interface ConversionStatus {
  isProcessing: boolean;
  progress: number;
  message: string;
  error?: string;
}

type WaveformData = Float32Array;

const AUDIO_EXT = /\.(wav|mp3|ogg|flac|m4a)$/i;

export const Wav2Datum: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioSampleRate, setAudioSampleRate] = useState(INPUT_SAMPLE_RATE);

  const [spectralData, setSpectralData] = useState<Datum | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [filterBank, setFilterBank] = useState<FilterBank | null>(null);
  const [isWasmReady, setIsWasmReady] = useState(false);

  const [conversionStatus, setConversionStatus] = useState<ConversionStatus>({
    isProcessing: false,
    progress: 0,
    message: 'initialising…',
  });

  const [settings, setSettings] = useState<ConversionSettings>({
    presetName: '',
    inputGain: 1.0,
    prerollMode: 'reverse',
    analysisBlockSize: 24,
  });

  const audioContextRef = useRef<AudioContext | null>(null);

  // ───────── WASM filter bank — eager init (matches legacy behaviour) ─────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const module = await FilterBankModuleFactory();
        const fb = new module.FilterBank();
        fb.Init(INPUT_SAMPLE_RATE);
        if (cancelled) return;
        setFilterBank(fb);
        setIsWasmReady(true);
        setConversionStatus((p) => ({ ...p, message: 'ready' }));
      } catch (err) {
        console.error('FilterBank WASM load failed', err);
        setConversionStatus((p) => ({
          ...p,
          error: 'failed to load filterbank wasm — refresh to retry',
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ───────── Auto-play frame ticker ─────────
  useEffect(() => {
    if (!isPlaying || !spectralData?.frames || spectralData.frames.length === 0) return;
    const id = setInterval(() => {
      setCurrentFrame((prev) => {
        const next = (prev + 1) % spectralData.frames.length;
        if (next === 0 && prev === spectralData.frames.length - 1) {
          setIsPlaying(false);
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [isPlaying, spectralData?.frames]);

  // ───────── Decode → mono Float32 ─────────
  const decodeAudioFile = useCallback(async (file: File): Promise<Float32Array> => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
    }
    const ac = audioContextRef.current;
    const buf = await file.arrayBuffer();
    const audioBuffer = await ac.decodeAudioData(buf);

    let mono: Float32Array;
    if (audioBuffer.numberOfChannels === 1) {
      mono = audioBuffer.getChannelData(0);
    } else {
      const l = audioBuffer.getChannelData(0);
      const r = audioBuffer.getChannelData(1);
      mono = new Float32Array(l.length);
      for (let i = 0; i < l.length; i++) mono[i] = (l[i] + r[i]) / 2;
    }
    setAudioDuration(audioBuffer.duration);
    setAudioSampleRate(audioBuffer.sampleRate);
    return mono;
  }, []);

  // ───────── WASM analyse ─────────
  const processAudio = useCallback(
    async (samples: Float32Array, gain: number): Promise<Datum> => {
      if (!filterBank || !isWasmReady) throw new Error('filterbank not ready');

      setConversionStatus({ isProcessing: true, progress: 10, message: 'preprocessing…' });
      const gained = new Float32Array(samples.length);
      for (let i = 0; i < samples.length; i++) gained[i] = samples[i] * gain;

      setConversionStatus({ isProcessing: true, progress: 20, message: 'pre-roll…' });
      if (settings.prerollMode !== 'none') {
        filterBank.PreRoll(gained, settings.prerollMode);
      } else {
        filterBank.Reset(INPUT_SAMPLE_RATE);
      }

      setConversionStatus({ isProcessing: true, progress: 40, message: 'analysing (wasm)…' });
      await new Promise((r) => setTimeout(r, 50));

      const result = filterBank.AnalyzeAudio(gained, settings.analysisBlockSize);
      if (!result) throw new Error('analysis returned null');

      setConversionStatus({ isProcessing: true, progress: 80, message: 'formatting…' });
      const { frames: flat, frameCount, bandCount } = result;
      const frames: SpectralFrame[] = [];
      for (let i = 0; i < frameCount; i++) {
        const bands: number[] = [];
        const offset = i * bandCount;
        for (let b = 0; b < bandCount; b++) bands.push(flat[offset + b]);
        frames.push({ bands, timestamp: i });
      }

      const datum: Datum = {
        name: settings.presetName || audioFile?.name.replace(/\.[^/.]+$/, '') || 'converted',
        description: 'generated from wav via filterbank wasm',
        frameCount: frames.length,
        bandCount,
        frames,
        sampleRate: INPUT_SAMPLE_RATE,
        frameRateHz: INPUT_SAMPLE_RATE / settings.analysisBlockSize,
        createdAt: new Date(),
        modifiedAt: new Date(),
      };

      setConversionStatus({ isProcessing: false, progress: 100, message: 'conversion complete' });
      return datum;
    },
    [filterBank, isWasmReady, settings.presetName, settings.prerollMode, settings.analysisBlockSize, audioFile],
  );

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!AUDIO_EXT.test(file.name)) {
        setConversionStatus({
          isProcessing: false,
          progress: 0,
          message: 'ready',
          error: 'unsupported file — use wav / mp3 / ogg / flac / m4a',
        });
        return;
      }

      setAudioFile(file);
      setSpectralData(null);
      setCurrentFrame(0);
      setSettings((p) => ({ ...p, presetName: file.name.replace(/\.[^/.]+$/, '') }));

      setConversionStatus({ isProcessing: true, progress: 5, message: 'decoding audio…' });
      try {
        const samples = await decodeAudioFile(file);
        setWaveformData(samples);
        const datum = await processAudio(samples, settings.inputGain);
        setSpectralData(datum);
      } catch (e) {
        setConversionStatus({
          isProcessing: false,
          progress: 0,
          message: 'ready',
          error: e instanceof Error ? e.message : 'failed to process audio',
        });
      }
    },
    [decodeAudioFile, processAudio, settings.inputGain],
  );

  // Reprocess on settings change (gain / detail / preroll).
  const handleReprocess = useCallback(async () => {
    if (!waveformData) return;
    try {
      const datum = await processAudio(waveformData, settings.inputGain);
      setSpectralData(datum);
      setCurrentFrame(0);
    } catch (e) {
      setConversionStatus({
        isProcessing: false,
        progress: 0,
        message: 'ready',
        error: e instanceof Error ? e.message : 'reprocess failed',
      });
    }
  }, [waveformData, processAudio, settings.inputGain]);

  const handleExport = useCallback(async () => {
    if (!spectralData) return;
    const datumToExport: Datum = {
      ...spectralData,
      name: settings.presetName || spectralData.name,
    };
    const result = await DatumFileService.exportDatum(datumToExport);
    if (!result.success) {
      setConversionStatus((p) => ({ ...p, error: result.error || 'export failed' }));
    }
  }, [spectralData, settings.presetName]);

  const detail = DETAIL_OPTIONS.find((o) => o.value === settings.analysisBlockSize) ?? DETAIL_OPTIONS[1];
  const slotFrames = waveformData
    ? Math.min(SLOT_FRAME_CAPACITY, Math.floor((audioDuration * INPUT_SAMPLE_RATE) / settings.analysisBlockSize))
    : 0;
  const overflow = audioDuration > detail.maxSeconds;

  return (
    <div className="wav2datum">
      <header className="wav2datum__header">
        <h1 className="wav2datum__title">
          <span className="wav2datum__bracket">[</span>
          <span>wav2datum</span>
          <span className="wav2datum__bracket">]</span>
        </h1>
      </header>

      {/* ── 01 SOURCE ─────────────────────────────────────── */}
      <section className="wav2datum__section">
        <SectionLabel index={1}>source</SectionLabel>

        <div className="wav2datum__source">
          <DropZone
            accept=".wav,.mp3,.ogg,.flac,.m4a,audio/*"
            label="[ drop wav here ]"
            hint="or click to browse — wav / mp3 / ogg / flac / m4a"
            disabled={conversionStatus.isProcessing}
            onFiles={(files) => {
              const f = files[0];
              if (f) void handleFileSelect(f);
            }}
          />
          {audioFile && (
            <div className="wav2datum__filemeta">
              › loaded: {audioFile.name} · {audioSampleRate} hz · {audioDuration.toFixed(2)} s
            </div>
          )}
        </div>
      </section>

      {/* ── 02 ANALYSIS ───────────────────────────────────── */}
      <section className="wav2datum__section">
        <SectionLabel index={2}>analysis</SectionLabel>

        <div className="wav2datum__controls">
          <div className="wav2datum__row">
            <span className="wav2datum__rowlabel">detail rate</span>
            <span className="wav2datum__rowprompt" aria-hidden="true">›</span>
            <select
              className="wav2datum__select"
              value={settings.analysisBlockSize}
              onChange={(e) =>
                setSettings((p) => ({ ...p, analysisBlockSize: parseInt(e.target.value, 10) }))
              }
              disabled={conversionStatus.isProcessing}
              aria-label="detail rate"
            >
              {DETAIL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <ParamSlider
            label="input gain"
            value={settings.inputGain}
            min={0}
            max={2}
            step={0.01}
            disabled={conversionStatus.isProcessing}
            onChange={(v) => setSettings((p) => ({ ...p, inputGain: v }))}
          />

          <div className="wav2datum__row">
            <span className="wav2datum__rowlabel">preroll</span>
            <Segmented<ConversionSettings['prerollMode']>
              options={[
                { value: 'reverse', label: 'reverse' },
                { value: 'loop', label: 'loop' },
                { value: 'none', label: 'none' },
              ]}
              value={settings.prerollMode}
              onChange={(v) => setSettings((p) => ({ ...p, prerollMode: v }))}
              ariaLabel="preroll mode"
              size="sm"
            />
          </div>
        </div>

        <button
          type="button"
          className="wav2datum__rerun"
          onClick={() => void handleReprocess()}
          disabled={conversionStatus.isProcessing || !waveformData}
        >
          [ re-run analysis ]
        </button>
      </section>

      {/* ── 03 PREVIEW ────────────────────────────────────── */}
      <section className="wav2datum__section">
        <SectionLabel index={3}>preview</SectionLabel>

        <Panel title="spectral preview" padded={false}>
          <div className="wav2datum__chart">
            <SimpleSpectrumChart
              frames={spectralData?.frames || []}
              currentFrame={currentFrame}
              onFrameChange={setCurrentFrame}
              showControls={false}
              className={`${spectralData ? '' : 'empty'} ${conversionStatus.isProcessing ? 'loading' : ''}`}
            />
          </div>
        </Panel>

        <TransportBar
          currentFrame={currentFrame}
          totalFrames={spectralData?.frameCount ?? 0}
          isPlaying={isPlaying}
          onFrameChange={setCurrentFrame}
          onPlayToggle={() => setIsPlaying(!isPlaying)}
          disabled={!spectralData || conversionStatus.isProcessing}
        />

        <div className="wav2datum__slotmeta">
          <span>
            slot fits {slotFrames} / {SLOT_FRAME_CAPACITY} frames
          </span>
          {overflow && (
            <StatusBadge kind="warn">
              {(audioDuration - detail.maxSeconds).toFixed(2)}s will be cut at this detail rate
            </StatusBadge>
          )}
          {!overflow && spectralData && <StatusBadge kind="ok">ready</StatusBadge>}
        </div>
        <div className="wav2datum__hairline" aria-hidden="true">
          <span
            className="wav2datum__hairline-fill"
            style={{ width: `${(slotFrames / SLOT_FRAME_CAPACITY) * 100}%` }}
          />
        </div>
      </section>

      {/* ── 04 OUTPUT ─────────────────────────────────────── */}
      <section className="wav2datum__section">
        <SectionLabel index={4}>output</SectionLabel>

        <div className="wav2datum__output">
          <div className="wav2datum__preset">
            <span className="wav2datum__prompt" aria-hidden="true">›</span>
            <input
              type="text"
              placeholder="preset name"
              value={settings.presetName}
              onChange={(e) => setSettings((p) => ({ ...p, presetName: e.target.value }))}
            />
          </div>

          <button
            type="button"
            className="wav2datum__download"
            onClick={() => void handleExport()}
            disabled={!spectralData || conversionStatus.isProcessing}
          >
            [ DOWNLOAD .DATUM ]
          </button>
        </div>
      </section>

      {/* ── status footer ─────────────────────────────────── */}
      <footer className="wav2datum__footer">
        {!isWasmReady && <StatusBadge kind="info">loading filterbank wasm…</StatusBadge>}
        {isWasmReady && !audioFile && <StatusBadge kind="info">drop a wav to begin</StatusBadge>}
        {conversionStatus.error && (
          <StatusBadge kind="err">{conversionStatus.error}</StatusBadge>
        )}
        {conversionStatus.isProcessing && (
          <StatusBadge kind="info">
            {conversionStatus.message} ({Math.round(conversionStatus.progress)}%)
          </StatusBadge>
        )}
      </footer>
    </div>
  );
};
