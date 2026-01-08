# Stealth AI Assistant

A "Cluely-like" desktop assistant built with Electron, React, and Vite.
It features a **Stealth Mode** that makes the window invisible to screen capture tools (Zoom, OBS, Discord) while remaining visible to you.

## Features

- **Always on Top Overlay**: Floats above other windows.
- **Stealth Mode**: Uses `SetWindowDisplayAffinity` from `user32.dll` to hide from screen sharing.
- **Mock AI Interface**: A dark-themed chat UI.

## Setup
1. create a .env file in root folder with VITE_GEMINI variable containing gemini api key.
2.  Enable "Stealth Mode" in the app (Top-right toggle).
3.  Start a screen share to verify the window is invisible to others.

## Commands

### Development
Runs the Vite dev server and Electron app.
```bash
npm run dev
```

### Build
Builds the production application (executable).
```bash
npm run build
```

## Technical Details

This app uses `koffi` to call the Windows Native API:
```javascript
SetWindowDisplayAffinity(hwnd, 0x00000011); // WDA_EXCLUDEFROMCAPTURE
```
This flag ensures the window content is excluded from bit-block transfers, making it invisible to screen capture software.
