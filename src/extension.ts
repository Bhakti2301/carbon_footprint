import * as vscode from 'vscode';
import * as si from 'systeminformation';
import { exec } from 'child_process';
import * as path from 'path';

class CarbonTrackerViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'carbonTrackerView';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'startTracking':
                    await this.startTracking();
                    break;
            }
        });
    }

    private async startTracking() {
        if (!this._view) {
            return;
        }

        try {
            // Get system information
            const cpuInfo = await si.cpu();
            const memInfo = await si.mem();
            const powerInfo = await si.currentLoad(); // Get current load for power info
            
            // Get active editor
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                this._view.webview.postMessage({ 
                    type: 'error', 
                    message: 'No active file found' 
                });
                return;
            }

            const filePath = editor.document.fileName;
            const language = editor.document.languageId;

            // Determine command to run
            let command: string | undefined;
            if (language === 'python') {
                command = `python "${filePath}"`;
            } else if (language === 'javascript') {
                command = `node "${filePath}"`;
            } else if (language === 'typescript') {
                command = `npx ts-node "${filePath}"`;
            } else {
                this._view.webview.postMessage({
                    type: 'error',
                    message: `Unsupported language: ${language}`
                });
                return;
            }

            const startTime = Date.now();
            exec(command, { cwd: path.dirname(filePath) }, (error, stdout, stderr) => {
                const endTime = Date.now();
                const durationMs = endTime - startTime;
                const durationSec = durationMs / 1000;

                // Simplified estimation for testing: Fixed power * time * carbon intensity
                // This approach makes energy directly proportional to execution time for demonstration.
                const fixedPowerWatts = 100; // Assume 100 Watts power draw during execution for simplicity

                const carbonIntensity = 0.475; // kgCO2/kWh (475 gCO2/kWh)
                
                // Calculate energy in kWh
                const energyKWh = (fixedPowerWatts * durationSec) / 3600 / 1000; // kWh
                
                // Calculate emissions in kg and g
                const emissionsKg = energyKWh * carbonIntensity;
                const emissionsG = emissionsKg * 1000;

                // Calculate energy in mWh for better visibility
                const energyMWh = energyKWh * 1000 * 1000; // Convert kWh to mWh

                // For testing purposes, ensure a minimum energy value to avoid zero display
                const minEnergyMWh = 0.001; // Minimum energy in mWh
                const displayEnergyMWh = Math.max(energyMWh, minEnergyMWh);
                

                this._view?.webview.postMessage({
                    type: 'trackingResults',
                    data: {
                        fileName: filePath,
                        language,
                        systemInfo: {
                            cpu: cpuInfo,
                            memory: memInfo
                        },
                        execution: {
                            durationMs,
                            stdout: stdout.trim(),
                            stderr: stderr.trim(),
                            error: error ? error.message : null
                        },
                        emissions: {
                            energyKWh, // Still send kWh for potential future use/precision
                            energyMWh: displayEnergyMWh, // Use the adjusted value for display
                            emissionsG
                        }
                    }
                });
            });
        } catch (error) {
            this._view.webview.postMessage({ 
                type: 'error', 
                message: `Error: ${error}` 
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Carbon Tracker</title>
                <style>
                    body {
                        padding: 20px;
                        color: var(--vscode-foreground);
                        font-family: var(--vscode-font-family);
                    }
                    button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 16px;
                        border-radius: 2px;
                        cursor: pointer;
                    }
                    button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .container {
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                    }
                    .results {
                        display: none;
                        padding: 16px;
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 4px;
                    }
                    .stdout, .stderr {
                        font-family: monospace;
                        white-space: pre-wrap;
                        margin-top: 8px;
                    }
                    .stderr { color: #e57373; }
                </style>
            </head>
            <body>
                <div class="container">
                    <button id="startTracking">Start Tracking</button>
                    <div id="results" class="results">
                        <h3>Tracking Results</h3>
                        <div id="fileInfo"></div>
                        <div id="systemInfo"></div>
                        <div id="execution"></div>
                        <div id="emissions"></div>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    document.getElementById('startTracking').addEventListener('click', () => {
                        vscode.postMessage({ type: 'startTracking' });
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'trackingResults':
                                document.getElementById('results').style.display = 'block';
                                document.getElementById('fileInfo').innerHTML = \`
                                    <p><strong>File:</strong> \${message.data.fileName}</p>
                                    <p><strong>Language:</strong> \${message.data.language}</p>
                                \`;
                                document.getElementById('systemInfo').innerHTML = \`
                                    <p><strong>CPU:</strong> \${message.data.systemInfo.cpu.manufacturer} \${message.data.systemInfo.cpu.brand}</p>
                                    <p><strong>Memory:</strong> \${Math.round(message.data.systemInfo.memory.total / (1024 * 1024 * 1024))} GB</p>
                                \`;
                                document.getElementById('execution').innerHTML = \`
                                    <p><strong>Execution Time:</strong> \${message.data.execution.durationMs} ms</p>
                                    <div class="stdout"><strong>Output:</strong> <br>\${message.data.execution.stdout || '(none)'}</div>
                                    <div class="stderr"><strong>Error:</strong> <br>\${message.data.execution.stderr || message.data.execution.error || '(none)'}</div>
                                \`;
                                document.getElementById('emissions').innerHTML = \`
                                    <p><strong>Estimated Energy:</strong> \${message.data.emissions.energyMWh.toFixed(3)} mWh</p>
                                    <p><strong>Estimated CO₂ Emissions:</strong> \${message.data.emissions.emissionsG.toFixed(2)} g</p>
                                \`;
                                break;
                            case 'error':
                                alert(message.message);
                                break;
                        }
                    });
                </script>
            </body>
            </html>`;
    }
}

export function activate(context: vscode.ExtensionContext) {
    const provider = new CarbonTrackerViewProvider(context.extensionUri);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            CarbonTrackerViewProvider.viewType,
            provider
        )
    );

    // Show debug message when extension is activated
    vscode.window.showInformationMessage('Carbon Tracker is now active!');
}

export function deactivate() {} 