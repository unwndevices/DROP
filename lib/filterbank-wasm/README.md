# FilterBank WASM Module for DROP

This module compiles the Eisei FilterBank DSP code to WebAssembly using Emscripten.

## Building

Prerequisites:
- Emscripten SDK installed and activated (`source emsdk_env.sh`)

Build:
```bash
make
```

This generates:
- `filterbank.js` - JavaScript loader
- `filterbank.wasm` - WebAssembly binary

## Usage

Import in TypeScript:
```typescript
import FilterBankModule from './filterbank';

const module = await FilterBankModule();
const filterbank = new module.FilterBank();
filterbank.Init(48000);

// Process audio samples
const result = filterbank.AnalyzeAudio(audioFloatArray);
```

## Files

- `bindings.cpp` - Emscripten bindings
- `FilterBank.cpp/hpp` - Core DSP (copied from Libs/unwndsp)
- `FilterBankCoefficients.cpp/hpp` - Filter coefficients
- `resources.cpp/h` - Lookup tables
- `stmlib/` - Mutable Instruments DSP library
