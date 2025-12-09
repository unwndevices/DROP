import React, { useEffect, useState } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
    id: string;
    type?: ToastType;
    title?: string;
    message: string;
    duration?: number;
    onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
    id,
    type = 'info',
    title,
    message,
    duration = 5000,
    onDismiss
}) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                handleDismiss();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration]);

    const handleDismiss = () => {
        setIsExiting(true);
        // Wait for animation to finish before actually removing
        setTimeout(() => {
            onDismiss(id);
        }, 300);
    };

    return (
        <div className={`ds-toast ds-toast-${type} ${isExiting ? 'ds-toast-exiting' : ''}`} role="alert">
            <div className="ds-toast-content">
                {title && <div className="ds-toast-title">{title}</div>}
                <div className="ds-toast-message">{message}</div>
            </div>
            <button
                className="ds-toast-close"
                onClick={handleDismiss}
                aria-label="Close notification"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    );
};
