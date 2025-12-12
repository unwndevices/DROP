import React from 'react';
import { Image, BarChart3, FolderOpen, Cpu, Flower, Joystick, Palette } from 'lucide-react';

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  component: React.ComponentType;
}

interface VerticalNavbarProps {
  tools: Tool[];
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
}

export const VerticalNavbar: React.FC<VerticalNavbarProps> = ({
  tools,
  activeTool,
  onToolChange
}) => {
  return (
    <nav className="vertical-navbar">
      <div className="navbar-header">
        <div className="navbar-logo">
          <span className="logo-text">DROP</span>
          <span className="logo-subtitle">
            <span className="accent-letter">D</span>atum{' '}
            <span className="accent-letter">R</span>esearch{' '}
            <span className="accent-letter">O</span>pen{' '}
            <span className="accent-letter">P</span>latform
          </span>
        </div>
      </div>

      <div className="navbar-tools">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`navbar-tool ${activeTool.id === tool.id ? 'active' : ''}`}
            onClick={() => onToolChange(tool)}
            title={tool.name}
          >
            <div className="tool-icon">
              {tool.icon}
            </div>
          </button>
        ))}
      </div>
    </nav>
  );
};

// Default tool definitions
export const DEFAULT_TOOLS: Tool[] = [
  {
    id: 'daisy-flasher',
    name: 'Daisy Flasher',
    description: 'Flash Daisy Seed firmware via DFU and monitor serial',
    icon: <Flower className="w-6 h-6" />,
    component: () => null // Will be set by parent
  },
  {
    id: 'esp32-flasher',
    name: 'ESP32 Flasher',
    description: 'Flash ESP32-S3 firmware and monitor serial',
    icon: <Cpu className="w-6 h-6" />,
    component: () => null // Will be set by parent
  },
  {
    id: 'device-bridge',
    name: 'Device Bridge',
    description: 'Connect to Eisei devices via Bluetooth or USB for real-time control',
    icon: <Joystick className="w-6 h-6" />,
    component: () => null // Will be set by parent
  },
  {
    id: 'ui-graphics',
    name: 'Graphic to UI',
    description: 'Convert image sequences to UI graphics format',
    icon: <Image className="w-6 h-6" />,
    component: () => null // Will be set by parent
  },
  {
    id: 'spectral-analysis',
    name: 'Datum Editor',
    description: 'Lua-based spectral data generation and visualization',
    icon: <BarChart3 className="w-6 h-6" />,
    component: () => null // Will be set by parent
  },
  {
    id: 'datum-viewer',
    name: 'Datum Viewer',
    description: 'Import and preview spectral datum files',
    icon: <FolderOpen className="w-6 h-6" />,
    component: () => null // Will be set by parent
  },
  {
    id: 'pixel-art-generator',
    name: 'Pixel Art Generator',
    description: 'Lua-powered pixel art generator for Eisei\'s 127x127 OLED display',
    icon: <Palette className="w-6 h-6" />,
    component: () => null // Will be set by parent
  }
];