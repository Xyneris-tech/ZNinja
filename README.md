# ZNinja - Service Host Runtime (v2.6.0)

A high-performance, minimalist AI companion built for stealth and efficiency. ZNinja operates as a background system process, providing seamless AI assistance across your entire Windows environment without leaving a trace in taskbars or screen recordings. Now featuring a specialized **Developer Mode** for real-time engine auditing and live-tuning.

---

## Core Features

### 1. Advanced Stealth Architecture
- **Process Masking:** Operates globally as `Service Host Runtime`.
- **Screen Privacy:** Automatically excludes itself from screen captures, Zoom meetings, OBS recordings, and proctoring software.
- **Taskbar-Free:** Runs as a background utility, leaving your taskbar clean.
- **Frameless UI:** Minimalist, transparent interface with no OS-level window decorations.

### 2. Multi-Key Rotation Engine
- **Resilient AI:** Configure multiple Google Gemini API keys to bypass rate limits.
- **Auto-Fallback:** Automatically rotates between keys and model tiers (Flash ↔ Pro ↔ Thinking) when encountering Quota Limits (429) or Service Errors (404/503).
- **Encrypted Storage:** API keys are secured using **Windows DPAPI** (via Electron SafeStorage) to ensure keys are only accessible by the service on your local machine.

### 3. Working Modes & Personas
Switch between specialized personas to optimize output quality:
- **General:** Concise, direct answers for daily tasks.
- **Programming:** Production-ready code with logic summaries and O(N) complexity analysis.
- **Competitive Programming:** Algorithmically optimal solutions tailored for LeetCode/Codeforces.
- **Expert Tutor:** Fast, accurate explanations for quiz and academic questions.

### 4. Ghost Mode (Focus Lock)
- **Shortcut:** `Ctrl + L`
- **Utility:** Makes the window "click-through," allowing you to view AI responses while interacting with underlying applications (like browsers or IDEs) without losing focus.
- **Ghost Typing:** Relays keyboard input directly through the assistant when focused.

### 5. Intelligence Hub (Vision & Audio)
- **Instant AI (`Ctrl + I`):** Captures the current screen silently and passes it to the AI for analysis. Supports multi-turn visual conversations.
- **Meeting Recorder (MoM):** Record audio locally and generate professional Minutes of Meeting (Action items, decisions, and transcripts).

---

## Essential Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`Ctrl + ]`** | **Show / Hide** the entire application instantly |
| **`Ctrl + L`** | Toggle **Ghost Mode** (Click-through / Focus Lock) |
| **`Ctrl + I`** | Capture **Instant Screenshot** for analysis |

---

## Getting Started

### Installation
- **Winget (Recommended):**
  ```powershell
  winget install gajju44.ZNinja
  ```
- **Direct Download:** Download the latest release from the [Releases](https://github.com/gajju44/ZNinja/releases) page and run the installer (`zninja.exe`).

### Setup
1. Upon first launch, navigate to **Setup** (Reset icon in TitleBar if already configured).
2. Enter one or more [Gemini API Keys](https://aistudio.google.com/app/apikey).
3. Toggle **Stealth Mode** (Ninja icon) to ensure invisibility during recordings.


### Development Setup
If you wish to contribute or build from source:

1. **Clone & Install:**
   ```bash
   git clone https://github.com/gajju44/ZNinja.git
   cd Zninja
   npm install
   ```
## 💻 The devMode System
ZNinja includes a specialized **devMode** for real-time engine auditing and live-tuning of the stealth engine.

### Developer CLI
- `zninja --setup`: Re-run the system configuration assistant.
- `zninja --version`: Display engine specifications.
- `zninja --help`: Display help menu.

### Execution Scripts
- `npm run dev`: Standard development launch.
- `npm run dev:devMode`: Primary command for **devMode** + Stealth Audit.

---

## 🛠️ Internal devMode Logic
- **HMR Bridging:** Uses **devMode** signals to bridge the gap between the pre-compiled Electron process and the Vite HMR environment.
- **Stealth Audit Console:** Provides real-time metrics during **devMode** sessions to verify native Win32 window-affinity hooks.
- **HMR Support:** Instant UI feedback without process restarts.

## Technical Blueprint
- **Framework:** Electron + Vite + React
- **Styling:** Vanilla CSS + Tailwind CSS (Glassmorphism & Ultra-Low Latency UI)
- **Native Hooks & Security:** `koffi` (Win32 API bindings) + **Windows DPAPI** (Key Encryption)
- **AI Backend:** Google Generative AI

---

*Built by the Unseen | Developed by <a href='https://gajendra-naphade.vercel.app/'> gajendra naphade</a>*

