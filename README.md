# Carbon Tracker VS Code Extension

A VS Code extension that estimates the carbon footprint of code execution and provides optimization suggestions.

## Features

- Track code execution carbon footprint
- Support for multiple programming languages (Python, JavaScript, TypeScript)
- Real-time system resource monitoring
- Optimization suggestions
- Execution history logging

## Requirements

- VS Code 1.85.0 or higher
- Node.js 16.x or higher

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to compile the extension
4. Press F5 in VS Code to start debugging

## Development

1. Make sure you have all the required dependencies:
   ```bash
   npm install
   ```

2. Compile the extension:
   ```bash
   npm run compile
   ```

3. To start debugging:
   - Press F5 in VS Code
   - A new VS Code window will open with the extension loaded
   - Click the Carbon Tracker icon in the Activity Bar
   - Use the "Start Tracking" button to begin monitoring

## Testing

1. Open a code file in the debug instance of VS Code
2. Click the Carbon Tracker icon in the Activity Bar
3. Click "Start Tracking" to begin monitoring
4. Verify that:
   - The panel opens correctly
   - System information is displayed
   - File information is shown
   - No errors appear in the Debug Console

## Troubleshooting

If you see the error "There is no data provider registered that can provide view data":
1. Check that the `viewType` in extension.ts matches the `id` in package.json
2. Verify that the activation event is correctly set in package.json
3. Restart VS Code and try again

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT 