import React, { useState, useEffect } from 'react';
import { pwaService, type PWAStatus as PWAStatusType } from '../../../services/PWAService';
import { Button, Card, CardBody } from '../../../design-system';

export const PWAStatus: React.FC = () => {
  const [status, setStatus] = useState<PWAStatusType>(pwaService.getStatus());
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Subscribe to PWA status changes
    const unsubscribe = pwaService.onStatusChange(setStatus);

    // Keyboard shortcut to toggle debug panel (Ctrl+Shift+P)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setShowDebugPanel(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    // Show install prompt if available
    if (status.canInstall && !status.isInstalled) {
      setShowInstallPrompt(true);
    }
  }, [status.canInstall, status.isInstalled]);

  useEffect(() => {
    // Show update prompt if available and not currently updating
    if (status.updateAvailable && !isUpdating) {
      setShowUpdatePrompt(true);
    } else if (!status.updateAvailable) {
      setShowUpdatePrompt(false);
      setIsUpdating(false);
    }
  }, [status.updateAvailable, isUpdating]);

  const handleInstall = async () => {
    const result = await pwaService.showInstallPrompt();
    if (result) {
      setShowInstallPrompt(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setIsUpdating(true);
      setShowUpdatePrompt(false);
      console.log('DROP PWA: Starting update process');

      await pwaService.updateServiceWorker();

      // The service worker will handle the reload via controllerchange event
      // If it doesn't happen within 3 seconds, force reload
      setTimeout(() => {
        console.log('DROP PWA: Forcing reload as fallback');
        window.location.reload();
      }, 3000);

    } catch (error) {
      console.error('DROP PWA: Failed to update service worker:', error);
      setIsUpdating(false);
      setShowUpdatePrompt(false);
    }
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
  };

  const dismissUpdatePrompt = () => {
    setShowUpdatePrompt(false);
    // Don't show again for this session
    setIsUpdating(true);
    setTimeout(() => setIsUpdating(false), 30000); // Re-enable after 30 seconds
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, pointerEvents: 'none' }}>
      {/* Offline Indicator */}
      {!status.isOnline && (
        <div style={{
          position: 'fixed',
          top: 'var(--ds-spacing-md)',
          right: 'var(--ds-spacing-md)',
          pointerEvents: 'auto',
          zIndex: 1001
        }}>
          <Card variant="glass" style={{ padding: 'var(--ds-spacing-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-spacing-xs)' }}>
              <span style={{ fontSize: '14px', opacity: 0.8 }}>📡</span>
              <span style={{
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 500,
                fontSize: 'var(--ds-font-size-sm)',
                color: 'var(--ds-color-text-primary)'
              }}>Offline Mode</span>
            </div>
          </Card>
        </div>
      )}

      {/* Install Prompt */}
      {showInstallPrompt && status.canInstall && (
        <div style={{
          position: 'fixed',
          bottom: 'var(--ds-spacing-md)',
          left: 'var(--ds-spacing-md)',
          right: 'var(--ds-spacing-md)',
          pointerEvents: 'auto',
          zIndex: 1001,
          maxWidth: '400px'
        }}>
          <Card variant="glass">
            <CardBody>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-spacing-sm)', marginBottom: 'var(--ds-spacing-sm)' }}>
                <span style={{ fontSize: '20px' }}>📱</span>
                <span style={{
                  fontFamily: 'var(--ds-font-mono)',
                  fontSize: 'var(--ds-font-size-md)',
                  fontWeight: 600,
                  color: 'var(--ds-color-amber)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Install DROP</span>
              </div>
              <div style={{
                fontFamily: 'var(--ds-font-mono)',
                fontSize: 'var(--ds-font-size-sm)',
                color: 'var(--ds-color-text-muted)',
                lineHeight: 1.4,
                marginBottom: 'var(--ds-spacing-md)'
              }}>
                Install DROP as an app for faster access and offline use
              </div>
              <div style={{ display: 'flex', gap: 'var(--ds-spacing-sm)', justifyContent: 'flex-end' }}>
                <Button onClick={handleInstall} variant="primary">
                  Install
                </Button>
                <Button onClick={dismissInstallPrompt} variant="secondary">
                  Not Now
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Update Prompt */}
      {showUpdatePrompt && status.updateAvailable && (
        <div style={{
          position: 'fixed',
          top: 'var(--ds-spacing-md)',
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'auto',
          zIndex: 1001,
          minWidth: '320px'
        }}>
          <Card variant="glass">
            <CardBody>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-spacing-sm)', marginBottom: 'var(--ds-spacing-sm)' }}>
                <span style={{ fontSize: '20px' }}>🔄</span>
                <span style={{
                  fontFamily: 'var(--ds-font-mono)',
                  fontSize: 'var(--ds-font-size-md)',
                  fontWeight: 600,
                  color: 'var(--ds-color-amber)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Update Available</span>
              </div>
              <div style={{
                fontFamily: 'var(--ds-font-mono)',
                fontSize: 'var(--ds-font-size-sm)',
                color: 'var(--ds-color-text-muted)',
                lineHeight: 1.4,
                marginBottom: 'var(--ds-spacing-md)'
              }}>
                A new version of DROP is available. Update now for the latest features.
              </div>
              <div style={{ display: 'flex', gap: 'var(--ds-spacing-sm)', justifyContent: 'flex-end' }}>
                <Button onClick={handleUpdate} variant="primary">
                  Update Now
                </Button>
                <Button onClick={dismissUpdatePrompt} variant="secondary">
                  Later
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* PWA Status Indicator (for debugging) */}
      {import.meta.env.DEV && showDebugPanel && (
        <div style={{
          position: 'fixed',
          top: 'var(--ds-spacing-md)',
          left: 'var(--ds-spacing-md)',
          pointerEvents: 'auto',
          zIndex: 999,
          opacity: 0.9
        }}>
          <Card variant="glass" style={{ padding: 'var(--ds-spacing-sm)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '10px', fontFamily: 'var(--ds-font-mono)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--ds-spacing-sm)' }}>
                <span style={{ color: 'var(--ds-color-text-muted)', textTransform: 'uppercase' }}>Installed:</span>
                <span style={{ fontWeight: 500, color: status.isInstalled ? 'var(--ds-color-amber)' : 'var(--ds-color-text-muted)' }}>
                  {status.isInstalled ? 'Yes' : 'No'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--ds-spacing-sm)' }}>
                <span style={{ color: 'var(--ds-color-text-muted)', textTransform: 'uppercase' }}>Can Install:</span>
                <span style={{ fontWeight: 500, color: status.canInstall ? 'var(--ds-color-amber)' : 'var(--ds-color-text-muted)' }}>
                  {status.canInstall ? 'Yes' : 'No'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--ds-spacing-sm)' }}>
                <span style={{ color: 'var(--ds-color-text-muted)', textTransform: 'uppercase' }}>Online:</span>
                <span style={{ fontWeight: 500, color: status.isOnline ? 'var(--ds-color-amber)' : 'var(--ds-color-text-muted)' }}>
                  {status.isOnline ? 'Yes' : 'No'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--ds-spacing-sm)' }}>
                <span style={{ color: 'var(--ds-color-text-muted)', textTransform: 'uppercase' }}>Update:</span>
                <span style={{ fontWeight: 500, color: status.updateAvailable ? 'var(--ds-color-amber)' : 'var(--ds-color-text-muted)' }}>
                  {status.updateAvailable ? 'Available' : 'None'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}; 