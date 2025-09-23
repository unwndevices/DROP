// Test if we can actually load the enjin2 module and see what's exported

// This would need to be done in browser context since it's a WebAssembly module
// Let's create a simple browser test instead

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Enjin2 Module Test</title>
</head>
<body>
    <h1>Enjin2 Module Test</h1>
    <div id="output"></div>
    
    <script type="module">
        const output = document.getElementById('output');
        
        function log(message) {
            output.innerHTML += message + '<br>';
            console.log(message);
        }
        
        try {
            log('Loading enjin2 module...');
            const script = document.createElement('script');
            script.src = '/enjin2.js';
            script.type = 'module';
            
            script.onload = async () => {
                log('Script loaded, checking for Enjin2Module...');
                
                // Wait a bit for the module to initialize
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                if (typeof window.Enjin2Module === 'function') {
                    log('✅ Enjin2Module function found');
                    
                    try {
                        const module = await window.Enjin2Module();
                        log('✅ Module instantiated');
                        log('Module keys: ' + Object.keys(module).slice(0, 20).join(', '));
                        
                        // Test for specific functions
                        if (module.testFunction) {
                            log('✅ testFunction found: ' + module.testFunction());
                        } else {
                            log('❌ testFunction not found');
                        }
                        
                        if (module.LuaScriptSystem) {
                            log('✅ LuaScriptSystem found');
                        } else {
                            log('❌ LuaScriptSystem not found');
                        }
                        
                    } catch (error) {
                        log('❌ Module instantiation failed: ' + error.message);
                    }
                } else {
                    log('❌ Enjin2Module not found on window');
                    log('Available on window: ' + Object.keys(window).filter(k => k.includes('jin')).join(', '));
                }
            };
            
            script.onerror = () => {
                log('❌ Failed to load enjin2.js');
            };
            
            document.head.appendChild(script);
            
        } catch (error) {
            log('❌ Test failed: ' + error.message);
        }
    </script>
</body>
</html>
`;

const fs = require('fs');
fs.writeFileSync('/home/unwn/dev/DROP/public/test_module.html', htmlContent);
console.log('Created test file at http://localhost:5174/test_module.html');
console.log('Open this in a browser to test the module loading');