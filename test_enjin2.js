// Node.js test for enjin2 WebAssembly module
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Testing enjin2 WebAssembly module structure...');

try {
    // Check if enjin2.js exists and has correct structure
    const enjin2Path = join(__dirname, 'public', 'enjin2.js');
    const enjin2Code = readFileSync(enjin2Path, 'utf8');
    
    // Check for key exports and structure
    const hasEnjin2Module = enjin2Code.includes('export default Enjin2Module');
    const hasWindowExport = enjin2Code.includes('window.Enjin2Module=Enjin2Module');
    const hasAsyncFunction = enjin2Code.includes('async function Enjin2Module');
    
    console.log('✅ enjin2.js file exists');
    console.log(`✅ Export structure: ${hasEnjin2Module ? 'correct' : 'missing'}`);
    console.log(`✅ Window export: ${hasWindowExport ? 'present' : 'missing'}`);
    console.log(`✅ Async function: ${hasAsyncFunction ? 'present' : 'missing'}`);
    
    // Check WASM file
    const wasmPath = join(__dirname, 'public', 'enjin2.wasm');
    const wasmStats = readFileSync(wasmPath);
    console.log(`✅ enjin2.wasm file size: ${wasmStats.length} bytes`);
    
    if (!hasEnjin2Module || !hasWindowExport) {
        throw new Error('Module structure is incomplete');
    }
    
    console.log('\n🎉 enjin2 WebAssembly module structure is valid!');
    console.log('\n📝 To test the actual functionality:');
    console.log('   1. Refresh your browser at http://localhost:5174/');
    console.log('   2. Open the Pixel Art Generator tool');
    console.log('   3. Click "Generate" to test the integration');
    console.log('\n🔧 Alternative: Open http://localhost:5174/test_enjin2.html for detailed testing');
    
} catch (error) {
    console.error('❌ Error testing enjin2 module:', error.message);
    process.exit(1);
}