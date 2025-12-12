import React from 'react';
import { useSettings } from '../../../contexts/SettingsContext';
import './RetroOverlay.css';

export const RetroOverlay: React.FC = () => {
    const { settings } = useSettings();
    const { intensity } = settings.retro;

    if (intensity === 0) return null;

    return (
        <div className={`retro-overlay intensity-${intensity}`}>
            <div className="scanlines" />
            <div className="vignette" />
            <div className="crt-deformation" />
        </div>
    );
};
