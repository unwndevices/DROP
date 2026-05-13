import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export interface DeviceConnectionState {
  daisy: boolean;
  esp: boolean;
}

interface DeviceStatusContextValue {
  state: DeviceConnectionState;
  setState: (next: DeviceConnectionState) => void;
}

const DEFAULT_STATE: DeviceConnectionState = { daisy: false, esp: false };

const DeviceStatusContext = createContext<DeviceStatusContextValue | undefined>(
  undefined,
);

export const DeviceStatusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setStateRaw] = useState<DeviceConnectionState>(DEFAULT_STATE);
  const setState = useCallback((next: DeviceConnectionState) => {
    setStateRaw((prev) =>
      prev.daisy === next.daisy && prev.esp === next.esp ? prev : next,
    );
  }, []);
  const value = useMemo(() => ({ state, setState }), [state, setState]);
  return (
    <DeviceStatusContext.Provider value={value}>
      {children}
    </DeviceStatusContext.Provider>
  );
};

export function useDeviceStatus(): DeviceStatusContextValue {
  const ctx = useContext(DeviceStatusContext);
  if (!ctx) {
    throw new Error('useDeviceStatus must be used inside DeviceStatusProvider');
  }
  return ctx;
}
