// Node.js test script to test enjin2 WASM debugging
// This will help us see what's happening with the function bindings

const fs = require('fs');
const path = require('path');

// Load the enjin2.js file to check what it contains
const enjin2JsPath = path.join(__dirname, 'public', 'enjin2.js');

if (fs.existsSync(enjin2JsPath)) {
    console.log('✅ enjin2.js exists');
    const content = fs.readFileSync(enjin2JsPath, 'utf8');
    
    // Check if testFunction is exported (simple test)
    if (content.includes('testFunction')) {
        console.log('✅ testFunction found in enjin2.js');
    } else {
        console.log('❌ testFunction NOT found in enjin2.js');
    }
    
    // Check if debugLuaBindings function is exported
    if (content.includes('debugLuaBindings')) {
        console.log('✅ debugLuaBindings function found in enjin2.js');
    } else {
        console.log('❌ debugLuaBindings function NOT found in enjin2.js');
    }
    
    // Check if setupGlobalLuaFunctions is also there
    if (content.includes('setupGlobalLuaFunctions')) {
        console.log('✅ setupGlobalLuaFunctions function found in enjin2.js');
    } else {
        console.log('❌ setupGlobalLuaFunctions function NOT found in enjin2.js');
    }
    
    // Check if LuaScriptSystem is exported
    if (content.includes('LuaScriptSystem')) {
        console.log('✅ LuaScriptSystem class found in enjin2.js');
    } else {
        console.log('❌ LuaScriptSystem class NOT found in enjin2.js');
    }
    
    // Look for function exports section
    const exportMatches = content.match(/"(\w+)":\s*\w+/g);
    if (exportMatches) {
        console.log('\n📋 Exported functions/classes found:');
        exportMatches.slice(0, 20).forEach(match => console.log('  ', match));
        if (exportMatches.length > 20) {
            console.log(`  ... and ${exportMatches.length - 20} more`);
        }
    }
    
} else {
    console.log('❌ enjin2.js not found at', enjin2JsPath);
}

// Check WASM file
const enjin2WasmPath = path.join(__dirname, 'public', 'enjin2.wasm');
if (fs.existsSync(enjin2WasmPath)) {
    const stats = fs.statSync(enjin2WasmPath);
    console.log(`✅ enjin2.wasm exists (${Math.round(stats.size / 1024)}KB)`);
} else {
    console.log('❌ enjin2.wasm not found');
}