import React from 'react';
import { useDeviceStatus } from '../../contexts/DeviceStatusContext';
import './DeviceStatusIndicator.css';

export const DeviceStatusIndicator: React.FC = () => {
  const { state } = useDeviceStatus();
  const any = state.daisy || state.esp;
  const both = state.daisy && state.esp;

  const label = both
    ? 'daisy + esp32'
    : state.daisy
      ? 'daisy'
      : state.esp
        ? 'esp32'
        : 'disconnected';

  return (
    <span
      className={`device-status${any ? ' is-connected' : ''}`}
      aria-label={`device status: ${label}`}
    >
      <span className="device-status__dot" aria-hidden="true" />
      <span className="device-status__label">{label}</span>
    </span>
  );
};
