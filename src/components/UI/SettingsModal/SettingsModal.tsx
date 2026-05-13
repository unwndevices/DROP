import React, { useEffect } from 'react';
import { useSettings } from '../../../contexts/SettingsContext';
import { Panel, Button } from '../../../design-system';
import { LayoutSettings } from './LayoutSettings';
import { ThemeSettings } from './ThemeSettings';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { resetSettings } = useSettings();

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) onClose();
  };

  const handleReset = () => {
    resetSettings();
    console.log('DROP: Settings reset to defaults');
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div
        className="modal settings-modal"
        role="dialog"
        aria-labelledby="settings-title"
        aria-modal="true"
      >
        <Panel
          title="settings"
          actions={
            <button
              className="settings-modal-close"
              onClick={onClose}
              aria-label="close settings"
              title="close settings (Esc)"
              type="button"
            >
              ×
            </button>
          }
        >
          <div className="settings-modal__body">
            <section className="settings-section">
              <h3 className="settings-section-title">layout</h3>
              <LayoutSettings />
            </section>

            <section className="settings-section">
              <h3 className="settings-section-title">theme</h3>
              <ThemeSettings />
            </section>
          </div>

          <div className="settings-modal__footer">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              title="reset all settings to defaults"
            >
              reset defaults
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onClose}
              title="close settings dialog"
            >
              close
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
};
