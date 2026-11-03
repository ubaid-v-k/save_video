# MediaBox 🎬🎵

> **"Everything you need for your media."**
> A complete, responsive, private personal media downloader, editor, audio extractor, format converter, and library manager built with **Next.js**, **FastAPI**, and **FFmpeg**.

---

## 🌟 Key Features

### 1. 📊 Interactive Dashboard
- Workspace storage metrics (used, free, and total capacity).
- Real-time task statistics (active, completed, queued, and failed jobs).
- Prominent media URL analyzer with instant paste & validation.
- Quick action cards linking to Downloader, Editor, Audio Extractor, and Converter.
- Recently added media grid with video thumbnails and instant HTML5 preview playback.

### 2. ⬇️ Video & Media Downloader
- **Authorized Sources**: Supports direct media links (MP4, WebM, MP3, AAC) and permitted public videos.
- **Adaptive Stream Inspection**: Extracts titles, thumbnails, durations, and supported resolutions (`Best Available`, `1080p`, `720p`, `480p`, `360p`, `Audio Only`).
- **Policy Safeguards**: Respects platform access restrictions, DRM, and private logins (e.g. private Instagram/Facebook posts), providing clear feedback and offering direct local file upload as an authorized alternative.
- **Background Jobs**: Tracks download progress in real-time with cancellation support and immediate browser download when complete.

### 3. ✂️ Video Editor & Trimmer
- **Frame-Accurate Trimming**: Select start and end timestamps in `HH:MM:SS` format or click *"Set to current position"* while watching video preview.
- **Timeline Player**: HTML5 video playback with interactive scrubber.
- **Audio Stripping**: Option to completely mute or preserve source audio.
- **Resolution Scaling**: Scale output to `1080p Full HD`, `720p HD`, or `480p SD`.
- **Rotation**: Rotate clips `90°`, `180°`, or `270°`.
- **Aspect Ratio Presets**: Adjust framing to `16:9` (widescreen), `9:16` (vertical Reels/Shorts), `1:1` (square), or `4:3`.
- **Framerate Selection**: Preset output to `24 FPS` (cinematic), `30 FPS`, or `60 FPS` (smooth).

### 4. 🎧 Audio Extractor
- Extract audio tracks from video files or transcode between audio formats.
- **Supported Formats**: `MP3`, `WAV` (uncompressed PCM), `AAC`, `FLAC` (lossless), `OGG` (Vorbis).
- **Bitrate Presets**: `320 kbps`, `256 kbps`, `192 kbps`, `128 kbps`.
- **Stream Copying**: Direct codec copying without re-encoding when format matches.

### 5. 🔄 Format Converter
- Convert video and audio between compatible containers (`MP4`, `WebM`, `MKV`, `MOV`, `MP3`, `WAV`, `AAC`, `FLAC`, `OGG`).
- Codec selections: `H.264`, `VP9`, `Copy`.
- Adjustable compression quality via CRF slider (`16` to `32`).
- Custom output filename configuration.

### 6. 📁 My Media Library
- Local persistent storage with zero external cloud dependencies.
- Grid and list views with responsive layouts.
- Real-time search by filename, filter by format (`All`, `Videos`, `Audio`), and sorting (`Newest`, `Oldest`, `Name A-Z`, `Size`, `Duration`).
- **Streaming Media Player Modal**: Supports HTTP 206 Partial Content range requests for instant seeking in large files.
- Safe file renaming with collision avoidance and path traversal prevention.
- File deletion with confirmation dialog.
- Filesystem synchronization to detect external changes.

### 7. ⏱️ Download & Processing History
- Complete audit log of all background tasks with task IDs, sources, types, and timestamps.
- Status badges: `Queued`, `Analyzing`, `Downloading`, `Processing`, `Completed`, `Failed`, `Cancelled`.
- Filter by status and task type.
- Active task cancellation and history record removal.

### 8. ⚙️ Settings & System Diagnostics
- Real-time binary path detection and version reporting for FFmpeg and FFprobe.
- Storage directory management and disk space monitoring.
- One-click temporary file cleanup tool.
- Dark and light theme toggle.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide React, Zod |
| **Backend** | Python 3.12+, FastAPI, Pydantic v2, Uvicorn |
| **Media Processing** | FFmpeg 9.0+, FFprobe, imageio-ffmpeg (fallback), yt-dlp |
| **Database** | SQLite3 (WAL mode, foreign keys, startup crash recovery) |
| **Security** | SSRF prevention (IP blacklist, DNS validation, redirect checking), path traversal sanitization |

---

## 🔒 Security & Privacy Safeguards

- **100% Local & Private**: No cloud tracking, third-party analytics, or remote database sync.
- **SSRF Protection**: Remote URL fetcher rejects loopback (`127.0.0.0/8`, `::1`), private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`), and cloud metadata (`169.254.169.254`).
- **Safe Subprocess Execution**: All FFmpeg and system commands use safe argument arrays (never `shell=True`) to prevent shell injection.
- **Path Traversal Protection**: Filesystem operations are strictly sandboxed to the configured media directory.

---

## 🚀 Installation & Setup

### Prerequisites

1. **Python 3.12 or newer**:
   Check with: `python --version`
2. **Node.js 18+ and npm**:
   Check with: `node -v` and `npm -v`
3. **FFmpeg**:
   - **Windows**: `winget install Gyan.FFmpeg` or download from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/)
   - **macOS**: `brew install ffmpeg`
   - *Note: MediaBox also includes `imageio-ffmpeg` as an automated standalone binary fallback.*

---

### Step-by-Step Installation

#### 1. Setup Python Virtual Environment & Backend
```bash
# From the project root:
python -m venv venv

# Windows:
.\venv\Scripts\pip install -r backend\requirements.txt

# macOS / Linux:
./venv/bin/pip install -r backend/requirements.txt
```

#### 2. Setup Frontend
```bash
cd frontend
npm install
cd ..
```

---

## 💻 Starting the Application

### Option A: Launch Both Services Simultaneously (Windows)

Double click or run:
```powershell
.\start-all.ps1
```
or
```cmd
start-all.bat
```

### Option B: Start Services Individually

**Terminal 1 (Backend API):**
```bash
cd backend
..\venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend will be live at `http://127.0.0.1:8000` (OpenAPI Swagger docs at `http://127.0.0.1:8000/docs`).*

**Terminal 2 (Frontend UI):**
```bash
cd frontend
npm run dev
```
*Frontend will be live at `http://localhost:3000`.*

---

## 🧪 Running Automated Tests

### Backend & Media Processing Tests (pytest)
Runs 13 comprehensive tests verifying health checks, SSRF blocking, path validation, filename sanitization, timestamp parsing, and end-to-end FFmpeg audio extraction, video trimming, format conversion, and thumbnail generation using synthetic media fixtures:
```bash
cd backend
..\venv\Scripts\pytest -v
```

### Frontend Build & Type Check
Validates all Next.js routes, App Router structure, and TypeScript strict mode:
```bash
cd frontend
npm run build
```

---

## 📁 Project Directory Structure

```
video_download/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── health.py        # System health and FFmpeg diagnostics
│   │   │       ├── downloads.py     # Remote URL inspection & download jobs
│   │   │       ├── media.py         # File uploads, range streaming, delete, sync
│   │   │       ├── jobs.py          # Background tasks and progress endpoints
│   │   │       └── settings.py      # User preferences and storage maintenance
│   │   ├── db/
│   │   │   ├── database.py          # SQLite connection and schema migrations
│   │   │   └── repositories.py      # Typed query helpers for jobs and media
│   │   ├── security/
│   │   │   ├── url_validation.py    # SSRF protection and IP subnet validator
│   │   │   └── file_validation.py   # Path traversal and extension filters
│   │   ├── services/
│   │   │   ├── media_analyzer.py    # URL metadata probing
│   │   │   ├── downloader.py        # Streaming direct & yt-dlp download adapters
│   │   │   ├── audio_processor.py   # FFmpeg audio extraction & transcoding
│   │   │   ├── video_editor.py      # Video trimming, resizing & rotation
│   │   │   ├── converter.py         # Format container & codec transcoding
│   │   │   ├── thumbnail_generator.py # Automatic video poster generation
│   │   │   └── storage_manager.py   # Disk capacity & filesystem synchronization
│   │   ├── utils/
│   │   │   ├── ffmpeg.py            # FFmpeg/FFprobe binary resolver & progress parser
│   │   │   └── filenames.py         # Unicode sanitization & timestamp converters
│   │   ├── workers/
│   │   │   └── job_manager.py       # Thread pool worker with task cancellation
│   │   ├── schemas/
│   │   │   └── requests.py          # Pydantic validation schemas
│   │   ├── config.py                # App configuration
│   │   └── main.py                  # FastAPI application entrypoint
│   ├── tests/
│   │   ├── test_validation.py       # SSRF & path safety tests
│   │   ├── test_filenames_and_timestamps.py # Parsing & sanitization tests
│   │   └── test_media_processing.py # Real FFmpeg processing tests
│   ├── storage/                     # Local SQLite DB & media files
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx                 # Dashboard
│   │   ├── downloader/page.tsx      # Video Downloader
│   │   ├── audio/page.tsx           # Audio Extractor
│   │   ├── editor/page.tsx          # Video Editor & Trimmer
│   │   ├── converter/page.tsx       # Format Converter
│   │   ├── library/page.tsx         # My Media Library
│   │   ├── history/page.tsx         # Processing History
│   │   ├── settings/page.tsx        # Settings & Diagnostics
│   │   ├── globals.css              # Dark-first design system
│   │   └── layout.tsx               # App layout with AppShell
│   ├── components/
│   │   ├── layout/                  # Sidebar, Header, AppShell
│   │   └── ui/                      # UploadDropzone, UrlInputBar, Toast, Modal
│   ├── lib/
│   │   ├── api.ts                   # Type-safe backend client
│   │   └── formatters.ts            # Bytes, durations, timestamps
│   ├── types/
│   │   └── index.ts                 # Shared TypeScript interfaces
│   └── package.json
├── start-all.ps1                    # One-command PowerShell startup
├── start-all.bat                    # One-command CMD startup
├── .env.example
└── README.md
```

---

## ⚖️ Legal & Compliance Notice

MediaBox is designed strictly for personal, private media management of authorized files, personal recordings, and public domain content. It does not circumvent DRM, paywalls, access controls, or private login restrictions. Users are responsible for ensuring they have appropriate rights to any media processed through the application.
