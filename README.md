# 🥷 ZNinja - Service Host Runtime (v2.2.0)

The ultimate stealth assistant. Designed to be invisible to monitoring software and seamless to use without ever leaving your browser.

---

## 🚀 Key Features

### 1. 🌑 Stealth Mode (Ninja Mode)
**Visual:** `[ 🥷 Stealth ON ]` (Emerald Button)
- **What it does:** Makes the app completely invisible to screen recordings, Zoom, OBS, and proctoring software.
- **Why use it:** You can see the AI, but they can't.

### 2. 👻 Ghost Mode (Focus Lock)
**Visual:** `[ 🤍 Ghost ON ]` (Indigo Button)
- **Shortcut:** `Ctrl + L`
- **What it does:** Makes the window "click-through." You can click on the buttons in ZNinja, but the computer thinks you never left your browser.
- **Why use it:** Prevents "Tab Changed" or "App Switched" alerts on exam websites.

### 3. ⌨️ Ghost Typing (Background Input)
**Visual:** `[ ⌨️ Type ON ]` (Amber Button)
- **How it works:** When Ghost Mode is ON, this button appears.
- **Action:** Click anywhere else (like your browser's search bar) and start typing using standard keys (A-Z, 0-9). Your text will appear in ZNinja automatically.
- **Why use it:** Input questions into the AI without the AI window ever getting "Focus."

### 4. 📸 Instant AI (Multi-Image Support)
- **Shortcut:** `Ctrl + I`
- **What it does:** Takes a silent screenshot and attaches it.
- **New:** You can now capture **multiple screenshots** and send them all at once.
- **Easy Flow:** Type a question -> `Ctrl + I` -> `Ctrl + I` (another one) -> Send.

### 5. 📋 Clipboard Sync
- **What it does:** Anything you copy (`Ctrl + C`) anywhere on your computer is automatically pasted into ZNinja's input box.

### 6. 📝 Code Copy
- **New:** Code blocks now have a copy button for one-click extraction.

---

## 🛠️ Advanced Stealth (Windows Only)

- **Task Manager Hiding:** The app never appears in the "Apps" list. It stays hidden in **"Background processes"** as `Service Host Runtime`.
- **Taskbar Stealth:** No icon appears on the taskbar. 
- **Silent Resizer:** Resize the window by dragging the bottom-right corner. The cursor **will not change** to the resize symbol (total stealth).

---

## 📦 How to Use

1. **Setup:** Add your Gemini API Key in the `.env` file (`VITE_GEMINI=your_key`) or use the Setup Screen UI.
2. **Launch:** Run `npm run dev`.
3. **Show/Hide:** Use `Ctrl + ]` to instantly show or hide the entire window.
4. **Resizing:** Look for the tiny lines at the bottom-right corner to drag and resize.

---

## 💻 Tech Stack Refactoring (v2.2)

We have significantly modularized the codebase for easier maintenance:

### Frontend (`src/`)
- **`SetupScreen`**: Configuration UI.
- **`TitleBar`**: Window controls and mode toggles.
- **`ChatHistorySidebar`**: Session management.
- **`ChatInterface`**: Message list, attachments, and input area.

### Backend (`electron/`)
- **`main.cjs`**: App lifecycle and orchestration.
- **`native.js`**: Low-level Windows API bindings (Koffi).
- **`config.js`**: Key and Session persistence.
- **`gemini.js`**: AI Model routing and API logic.

---

*Powered by Cinfinite | Developed by gajju44*
