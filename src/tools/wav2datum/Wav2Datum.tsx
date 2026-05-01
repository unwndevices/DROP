import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FaDownload, FaFolderOpen } from 'react-icons/fa';
import { SimpleSpectrumChart } from '../../components/Visualizer/SimpleSpectrumChart';
import { DatumFileService } from '../../services/DatumPersistence/DatumFileService';
import type { Datum, SpectralFrame } from '../../services/DataModel/types';
import FilterBankModuleFactory, { type FilterBank } from 'filterbank-wasm';

import {
    ToolLayout,
    Button,
    Card,
    CardHeader,
    CardBody,
    StatusIndicator,
    Input,
    Select,
    Timeline
} from '../../design-system';

interface ConversionSettings {
    presetName: string;
    inputGain: number;
    prerollMode: 'reverse' | 'loop' | 'none';
    /** Analysis block size in samples. Frame rate = 48000 / blockSize. Lower = finer detail, shorter max source. */
    analysisBlockSize: number;
}

const INPUT_SAMPLE_RATE = 48000;

interface DetailOption {
    label: string;
    value: number; // block size
    fps: number;
    maxSeconds: number;
}

// Block sizes are multiples of BLOCK_SIZE_FLOOR (3 in HD WASM build).
// max source = SLOT_FRAME_CAPACITY × blockSize / INPUT_SAMPLE_RATE.
const DETAIL_OPTIONS: DetailOption[] = [
    { label: '0.5× — 1 kHz, max 54 s',     value: 48, fps: 1000,  maxSeconds: 54 },
    { label: '1× — 2 kHz, max 27 s (std)', value: 24, fps: 2000,  maxSeconds: 27 },
    { label: '2× — 4 kHz, max 13.5 s',     value: 12, fps: 4000,  maxSeconds: 13.5 },
    { label: '4× — 8 kHz, max 6.75 s',     value: 6,  fps: 8000,  maxSeconds: 6.75 },
    { label: '8× — 16 kHz, max 3.4 s (HD)', value: 3, fps: 16000, maxSeconds: 3.375 },
];

interface ConversionStatus {
    isProcessing: boolean;
    progress: number;
    message: string;
    error?: string;
}

type WaveformData = Float32Array;

export const Wav2Datum: React.FC = () => {
    // Audio state
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
    const [audioDuration, setAudioDuration] = useState<number>(0);

    // Spectral data state
    const [spectralData, setSpectralData] = useState<Datum | null>(null);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // FilterBank state
    const [filterBank, setFilterBank] = useState<FilterBank | null>(null);
    const [isWasmReady, setIsWasmReady] = useState(false);

    // UI state
    const [dragActive, setDragActive] = useState(false);
    const [conversionStatus, setConversionStatus] = useState<ConversionStatus>({
        isProcessing: false,
        progress: 0,
        message: 'Initializing...'
    });

    // Settings
    const [settings, setSettings] = useState<ConversionSettings>({
        presetName: '',
        inputGain: 1.0,
        prerollMode: 'reverse',
        analysisBlockSize: 24
    });

    // Audio context ref
    const audioContextRef = useRef<AudioContext | null>(null);

    // Initialize WASM module
    useEffect(() => {
        const initWasm = async () => {
            try {
                const module = await FilterBankModuleFactory();
                const fb = new module.FilterBank();
                fb.Init(48000);
                setFilterBank(fb);
                setIsWasmReady(true);
                setConversionStatus(prev => ({ ...prev, message: 'Ready' }));
            } catch (err) {
                console.error('Failed to load WASM module:', err);
                setConversionStatus(prev => ({
                    ...prev,
                    error: 'Failed to load FilterBank WASM module. Please refresh.'
                }));
            }
        };
        initWasm();
    }, []);

    // Auto-play effect
    useEffect(() => {
        if (!isPlaying || !spectralData?.frames || spectralData.frames.length === 0) return;

        const interval = setInterval(() => {
            setCurrentFrame((prev) => {
                const nextFrame = (prev + 1) % spectralData.frames.length;
                if (nextFrame === 0 && prev === spectralData.frames.length - 1) {
                    setIsPlaying(false);
                }
                return nextFrame;
            });
        }, 100); // 10 FPS

        return () => clearInterval(interval);
    }, [isPlaying, spectralData?.frames]);

    /**
     * Decode audio file to Float32Array at 48kHz mono
     */
    const decodeAudioFile = useCallback(async (file: File): Promise<Float32Array> => {
        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext({ sampleRate: 48000 });
        }
        const audioContext = audioContextRef.current;

        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Get mono channel (mix if stereo)
        let monoData: Float32Array;
        if (audioBuffer.numberOfChannels === 1) {
            monoData = audioBuffer.getChannelData(0);
        } else {
            // Mix to mono
            const left = audioBuffer.getChannelData(0);
            const right = audioBuffer.getChannelData(1);
            monoData = new Float32Array(left.length);
            for (let i = 0; i < left.length; i++) {
                monoData[i] = (left[i] + right[i]) / 2;
            }
        }

        // Check if existing sample rate matches
        if (audioBuffer.sampleRate !== 48000) {
            // AudioContext.decodeAudioData usually resamples to the context's sampleRate
            // but let's just log it to be sure
            console.log(`Original sample rate: ${audioBuffer.sampleRate}, Target: 48000`);
        }

        setAudioDuration(audioBuffer.duration);
        return monoData;
    }, []);

    /**
     * Process audio through FilterBank WASM
     */
    const processAudio = useCallback(async (samples: Float32Array, gain: number): Promise<Datum> => {
        if (!filterBank || !isWasmReady) {
            throw new Error('FilterBank WASM module not initialized');
        }

        setConversionStatus({
            isProcessing: true,
            progress: 10,
            message: 'Preprocessing...'
        });

        // Apply gain
        const gainedSamples = new Float32Array(samples.length);
        for (let i = 0; i < samples.length; i++) {
            gainedSamples[i] = samples[i] * gain;
        }

        setConversionStatus({
            isProcessing: true,
            progress: 20,
            message: 'Running pre-roll...'
        });

        // Run pre-roll if enabled
        if (settings.prerollMode !== 'none') {
            filterBank.PreRoll(gainedSamples, settings.prerollMode);
        } else {
            // Even if none, we might want to reset
            filterBank.Reset(48000);
        }

        setConversionStatus({
            isProcessing: true,
            progress: 40,
            message: 'Analyzing audio (WASM)...'
        });

        // Use a small timeout to let UI update before blocking main thread
        await new Promise(resolve => setTimeout(resolve, 50));

        const result = filterBank.AnalyzeAudio(gainedSamples, settings.analysisBlockSize);

        if (!result) {
            throw new Error('Analysis failed (returned null)');
        }

        setConversionStatus({
            isProcessing: true,
            progress: 80,
            message: 'Formatting results...'
        });

        const { frames: flatFrames, frameCount, bandCount } = result;
        const frames: SpectralFrame[] = [];

        for (let i = 0; i < frameCount; i++) {
            const bands: number[] = [];
            const offset = i * bandCount;
            for (let b = 0; b < bandCount; b++) {
                bands.push(flatFrames[offset + b]);
            }
            frames.push({ bands, timestamp: i });
        }

        setConversionStatus({
            isProcessing: true,
            progress: 95,
            message: 'Finalizing...'
        });

        // Build Datum structure
        const datum: Datum = {
            name: settings.presetName || audioFile?.name.replace(/\.[^/.]+$/, '') || 'Converted',
            description: 'Generated from WAV file via FilterBank WASM',
            frameCount: frames.length,
            bandCount: bandCount,
            frames,
            sampleRate: INPUT_SAMPLE_RATE,
            frameRateHz: INPUT_SAMPLE_RATE / settings.analysisBlockSize,
            createdAt: new Date(),
            modifiedAt: new Date()
        };

        setConversionStatus({
            isProcessing: false,
            progress: 100,
            message: 'Conversion complete!'
        });

        return datum;
    }, [filterBank, isWasmReady, settings.presetName, settings.prerollMode, settings.analysisBlockSize, audioFile]);

    /**
     * Handle file selection/drop
     */
    const handleFileSelect = useCallback(async (file: File) => {
        if (!file.name.toLowerCase().match(/\.(wav|mp3|ogg|flac|m4a)$/)) {
            setConversionStatus({
                isProcessing: false,
                progress: 0,
                message: 'Ready',
                error: 'Unsupported file format. Please use WAV, MP3, OGG, FLAC, or M4A.'
            });
            return;
        }

        setAudioFile(file);
        setSpectralData(null);
        setCurrentFrame(0);

        // Extract preset name from filename
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setSettings(prev => ({ ...prev, presetName: nameWithoutExt }));

        setConversionStatus({
            isProcessing: true,
            progress: 5,
            message: 'Decoding audio...'
        });

        try {
            const samples = await decodeAudioFile(file);
            setWaveformData(samples);

            // Auto-process
            const datum = await processAudio(samples, settings.inputGain);
            setSpectralData(datum);
        } catch (error) {
            setConversionStatus({
                isProcessing: false,
                progress: 0,
                message: 'Ready',
                error: error instanceof Error ? error.message : 'Failed to process audio'
            });
        }
    }, [decodeAudioFile, processAudio, settings.inputGain]);

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

        const files = Array.from(e.dataTransfer.files);
        const audioFile = files.find(f =>
            f.name.toLowerCase().match(/\.(wav|mp3|ogg|flac|m4a)$/)
        );

        if (audioFile) {
            await handleFileSelect(audioFile);
        } else {
            setConversionStatus({
                isProcessing: false,
                progress: 0,
                message: 'Ready',
                error: 'Please drop an audio file (WAV, MP3, OGG, FLAC, or M4A)'
            });
        }
    }, [handleFileSelect]);

    const handleImportClick = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.wav,.mp3,.ogg,.flac,.m4a,audio/*';

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                await handleFileSelect(file);
            }
        };

        input.click();
    }, [handleFileSelect]);

    const handleExport = useCallback(async () => {
        if (!spectralData) return;

        const result = await DatumFileService.exportDatum(spectralData);
        if (!result.success) {
            setConversionStatus(prev => ({
                ...prev,
                error: result.error || 'Export failed'
            }));
        }
    }, [spectralData]);

    const handleReprocess = useCallback(async () => {
        if (!waveformData) return;

        const datum = await processAudio(waveformData, settings.inputGain);
        setSpectralData(datum);
        setCurrentFrame(0);
    }, [waveformData, processAudio, settings.inputGain]);

    const handleClear = useCallback(() => {
        setAudioFile(null);
        setWaveformData(null);
        setSpectralData(null);
        setCurrentFrame(0);
        setConversionStatus({
            isProcessing: false,
            progress: 0,
            message: 'Ready'
        });
    }, []);

    // Create left panel (Settings & File Info)
    const leftPanel = (
        <div className="p-3" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-md)' }}>
            {!audioFile ? (
                <Card>
                    <CardBody>
                        <div
                            className={`drop-zone ${dragActive ? 'active' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            style={{
                                border: `2px dashed ${dragActive ? 'var(--ds-color-primary)' : 'var(--ds-color-border-muted)'}`,
                                borderRadius: 'var(--ds-radius-lg)',
                                padding: 'var(--ds-spacing-xl)',
                                textAlign: 'center',
                                transition: 'all 0.2s ease',
                                backgroundColor: dragActive ? 'var(--ds-color-background-tertiary)' : 'transparent'
                            }}
                        >
                            <div className="drop-zone-icon" style={{ fontSize: '3rem', marginBottom: 'var(--ds-spacing-md)' }}>🎵</div>
                            <h3 style={{ margin: 0, marginBottom: 'var(--ds-spacing-sm)' }}>Drop audio file here</h3>
                            <p style={{ margin: 0, color: 'var(--ds-color-text-secondary)' }}>or click Import to browse</p>
                            <small style={{ color: 'var(--ds-color-text-muted)', display: 'block', marginTop: 'var(--ds-spacing-sm)' }}>
                                Supports: WAV, MP3, OGG, FLAC, M4A
                            </small>
                        </div>
                    </CardBody>
                </Card>
            ) : (
                <>
                    <Card>
                        <CardHeader>Audio File</CardHeader>
                        <CardBody>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-sm)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>File:</span>
                                    <span style={{ fontWeight: 500 }}>{audioFile.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Duration:</span>
                                    <span>{audioDuration.toFixed(2)}s</span>
                                </div>
                                {spectralData && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Frames:</span>
                                        <span>{spectralData.frameCount.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>Conversion Settings</CardHeader>
                        <CardBody>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-md)' }}>
                                <Input
                                    label="Preset Name"
                                    value={settings.presetName}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setSettings(prev => ({ ...prev, presetName: e.target.value }))
                                    }
                                    placeholder="Enter preset name..."
                                    size="sm"
                                />

                                <div style={{ display: 'flex', gap: 'var(--ds-spacing-md)' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: 'var(--ds-spacing-xs)', fontSize: '0.875rem' }}>
                                            Input Gain: {settings.inputGain.toFixed(1)}x
                                        </label>
                                        <input
                                            type="range"
                                            value={settings.inputGain}
                                            onChange={(e) => setSettings(prev => ({ ...prev, inputGain: parseFloat(e.target.value) }))}
                                            min={0.1}
                                            max={4.0}
                                            step={0.1}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>

                                <Select
                                    label="Pre-roll Mode"
                                    value={settings.prerollMode}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                        setSettings(prev => ({ ...prev, prerollMode: e.target.value as any }))
                                    }
                                    options={[
                                        { label: 'Reverse (Default)', value: 'reverse' },
                                        { label: 'Loop End', value: 'loop' },
                                        { label: 'None', value: 'none' }
                                    ]}
                                    size="sm"
                                    helper="Strategy to initialize filter states before audio start"
                                />

                                <Select
                                    label="Detail (frame rate)"
                                    value={String(settings.analysisBlockSize)}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                        setSettings(prev => ({ ...prev, analysisBlockSize: parseInt(e.target.value, 10) }))
                                    }
                                    options={DETAIL_OPTIONS.map(opt => ({ label: opt.label, value: String(opt.value) }))}
                                    size="sm"
                                    helper={(() => {
                                        const opt = DETAIL_OPTIONS.find(o => o.value === settings.analysisBlockSize);
                                        return opt ? `${opt.fps} fps · ${(opt.fps * 20 * 4 * Math.min(audioDuration || opt.maxSeconds, opt.maxSeconds) / 1024 / 1024).toFixed(2)} MB at current duration` : '';
                                    })()}
                                />

                                {audioDuration > 0 && (() => {
                                    const opt = DETAIL_OPTIONS.find(o => o.value === settings.analysisBlockSize);
                                    if (!opt) return null;
                                    const trackEnd = Math.max(audioDuration, opt.maxSeconds);
                                    const usedPct = (Math.min(audioDuration, opt.maxSeconds) / trackEnd) * 100;
                                    const truncatedPct = Math.max(0, (audioDuration - opt.maxSeconds) / trackEnd) * 100;
                                    const capPct = (opt.maxSeconds / trackEnd) * 100;
                                    const overflow = audioDuration > opt.maxSeconds;
                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-xs)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--ds-color-text-secondary)' }}>
                                                <span>Sample {audioDuration.toFixed(2)}s · slot {opt.maxSeconds}s</span>
                                                {overflow && (
                                                    <span style={{ color: 'var(--ds-color-warning)' }}>
                                                        ⚠ {(audioDuration - opt.maxSeconds).toFixed(2)}s will be cut
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{
                                                position: 'relative',
                                                height: '8px',
                                                backgroundColor: 'var(--ds-color-background-tertiary)',
                                                borderRadius: '4px',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    top: 0,
                                                    height: '100%',
                                                    width: `${usedPct}%`,
                                                    backgroundColor: 'var(--ds-color-primary)',
                                                    transition: 'width 0.2s ease'
                                                }} />
                                                {overflow && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        left: `${capPct}%`,
                                                        top: 0,
                                                        height: '100%',
                                                        width: `${truncatedPct}%`,
                                                        backgroundColor: 'var(--ds-color-warning)',
                                                        opacity: 0.4,
                                                        transition: 'left 0.2s ease, width 0.2s ease'
                                                    }} />
                                                )}
                                                <div style={{
                                                    position: 'absolute',
                                                    left: `${capPct}%`,
                                                    top: '-2px',
                                                    bottom: '-2px',
                                                    width: '2px',
                                                    backgroundColor: overflow ? 'var(--ds-color-warning)' : 'var(--ds-color-text-muted)',
                                                    transition: 'left 0.2s ease'
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })()}

                                <Button
                                    variant="secondary"
                                    onClick={handleReprocess}
                                    disabled={conversionStatus.isProcessing || !waveformData}
                                    style={{ width: '100%' }}
                                >
                                    Re-process with New Settings
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                </>
            )}

            {conversionStatus.error && (
                <StatusIndicator variant="error">
                    {conversionStatus.error}
                </StatusIndicator>
            )}

            {conversionStatus.isProcessing && (
                <Card>
                    <CardBody>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-spacing-sm)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{conversionStatus.message}</span>
                                <span>{Math.round(conversionStatus.progress)}%</span>
                            </div>
                            <div style={{
                                height: '4px',
                                backgroundColor: 'var(--ds-color-background-tertiary)',
                                borderRadius: '2px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${conversionStatus.progress}%`,
                                    backgroundColor: 'var(--ds-color-primary)',
                                    transition: 'width 0.2s ease'
                                }} />
                            </div>
                        </div>
                    </CardBody>
                </Card>
            )}

            <StatusIndicator variant={isWasmReady ? 'success' : 'warning'} style={{ marginTop: 'auto' }}>
                {isWasmReady
                    ? 'FilterBank WASM module loaded and ready.'
                    : 'Loading FilterBank WASM module...'}
            </StatusIndicator>
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
                            className={`${spectralData ? '' : 'empty'} ${conversionStatus.isProcessing ? 'loading' : ''}`}
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
                disabled={!spectralData || conversionStatus.isProcessing}
            />
        </div>
    );

    // Create status bar content
    const statusBar = (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', gap: 'var(--ds-spacing-lg)', alignItems: 'center' }}>
                <span>wav2datum</span>
                {spectralData && (
                    <span style={{ color: 'var(--ds-color-success)' }}>
                        Converted: {spectralData.name} ({spectralData.frameCount}f × {spectralData.bandCount}b)
                    </span>
                )}
                {conversionStatus.isProcessing && (
                    <span style={{ color: 'var(--ds-color-warning)' }}>{conversionStatus.message}</span>
                )}
            </div>
            <div>
                {spectralData ? (
                    <span>Frame {currentFrame + 1} of {spectralData.frameCount}</span>
                ) : (
                    <span>{conversionStatus.isProcessing ? 'Processing...' : 'Ready'}</span>
                )}
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
                        onClick={handleImportClick}
                        disabled={conversionStatus.isProcessing}
                    >
                        <FaFolderOpen style={{ marginRight: '0.5em' }} />
                        Import Audio
                    </Button>,
                    ...(spectralData ? [
                        <Button
                            key="export"
                            variant="primary"
                            onClick={handleExport}
                        >
                            <FaDownload style={{ marginRight: '0.5em' }} />
                            Export Datum
                        </Button>,
                        <Button
                            key="clear"
                            variant="secondary"
                            onClick={handleClear}
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
