# 🥷 ZNinja - Service Host Runtime (v3.0.0)

The ultimate stealth assistant. Designed to be invisible to monitoring software and seamless to use without ever leaving your browser. Now with multi-key rotation and specialized AI personas.

---

## 🚀 Key Features

### 1. 🌑 Stealth Mode (Ninja Mode)
- **Visual:** `[ 🥷 Stealth ON ]` (Emerald Button)
- **What it does:** Makes the app completely invisible to screen recordings, Zoom, OBS, and proctoring software.
- **Why use it:** You can see the AI, but they can't.

### 2. 🧠 Dynamic Working Modes
- **New:** Switch between specialized AI personas on the fly:
  - **General**: Clear, concise, and direct answers.
  - **Writing Code**: Production-ready, optimal logic (Java/Python focus).
  - **Competitive Programming**: Optimal O(N) solutions with LeetCode-style structure. No fluff, no theory.
  - **Quiz Answer**: Maximum speed and accuracy for multiple-choice or short questions.

### 3. 🔑 Multi-Key Rotation Engine
- **What it does:** Add multiple Gemini API keys in the Setup Screen. 
- **Auto-Fallback:** If one key hits a **Quota Limit (429)** or **Permission Error (404)**, ZNinja automatically rotates to the next available key.
- **Why use it:** Bypasses rate limits and ensures 100% uptime during critical tasks.

### 4. 👻 Ghost Mode (Focus Lock)
- **Shortcut:** `Ctrl + L`
- **What it does:** Makes the window "click-through." You can interact with ZNinja, but your computer (and monitoring software) thinks you never left your browser.
- **Why use it:** Prevents "Tab Changed" or "App Switched" alerts on exam websites.

### 5. 📸 Instant AI (Vision Service)
- **Shortcut:** `Ctrl + I`
- **What it does:** Takes a silent screenshot and attaches it for analysis.
- **New:** Supports **Multi-Turn Image Analysis**. Capture consecutive screenshots to solve multi-part problems.

### 6. 🎙️ Meeting Recorder (MoM Mode)
- **Feature:** Record audio and generate professional "Minutes of Meeting" (Attendees, Agenda, Decisions, Action Items).
- **Stealth:** No tooltips or popups appear during recording to ensure clean screen capture.

---

## 🛠️ Advanced Stealth (Windows Only)

- **Task Manager Hiding:** The app stays hidden in **"Background processes"** as `Service Host Runtime`.
- **Taskbar Stealth:** No icon appears on the taskbar. 
- **Title-Free UI:** Tooltips and `title` attributes have been removed to prevent them from being captured in video recordings.
- **Silent Resizer:** Resize the window by dragging the bottom-right corner without the cursor changing shape.

---

## 📦 How to Use

### 🎮 For Users (Setup & Basics)
1. **Launch**: Open the application (or run `npm run dev` in the folder).
2. **Setup**: On the first screen, paste one or more **Google Gemini API Keys**.
   - Get them for free here: [Google AI Studio](https://aistudio.google.com/app/apikey)
3. **Controls**:
   - `Ctrl + ]`: Instantly **Show/Hide** the entire window.
   - `Ctrl + I`: Take an **Instant Screenshot** for the AI to analyze.
   - `Ctrl + L`: Toggle **Ghost Mode** (Click-through stealth).
4. **Resizing**: Drag the tiny lines at the bottom-right corner to resize (Cursor stays stealthy).

---

### 🛠️ For Developers (Edit & Contribute)
1. **Clone & Install**:
   ```bash
   git clone https://github.com/gajju44/ZNinja.git
   cd Zninja
   npm install
   ```
2. **Dev Environment**:
   - Run `npm run dev` to start the Vite dev server and Electron.
   - The app uses **Hot Module Replacement (HMR)** for the frontend.
3. **Core Logic**:
   - **AI Personas**: Edit `electron/gemini.cjs` to refine system instructions.
   - **Stealth APIs**: Modify `electron/native.cjs` for Windows low-level hooks.
   - **UI/UX**: Custom CSS and React components are in `src/`.
4. **Build**: Run `npm run build` to generate the production-ready distribution.

---

## 💻 Tech Stack (v3.0)

- **Frontend**: Vite + React + Vanilla CSS & Tailwind CSS (Aesthetic Focus)
- **Backend**: Electron (Main/Preload architecture)
- **AI Engine**: Google Gemini (1.5 Pro, 1.5 Flash, Thinking 2.0 Fallbacks)
- **Low-Level Native**: Koffi (C++ Bindings for Windows Stealth APIs)

---

*Powered by Cinfinite | Developed by gajju44*
