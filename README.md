# BigQuery Release Notes Tracker

An elegant, interactive single-page dashboard designed to track, filter, and share updates from the official Google Cloud BigQuery release notes RSS/Atom feed.

Built on a lightweight **Python Flask** backend and a custom, responsive **Vanilla HTML/CSS/JS** frontend using modern glassmorphic dark design principles.

---

## 🚀 Key Features

*   **Automated Atom Feed Harvester**: Automatically fetches, parses, and restructures Google's BigQuery release feed.
*   **Itemized Update Categorization**: Automatically splits combined daily announcement chunks into individual update cards labeled by type (e.g., *Feature*, *Issue*, *Changed*, *Deprecation*, *Notice*).
*   **Dual Caching Layer**: Caches feed responses locally in `cache.json` for 1 hour to prevent rate-limiting and ensure instant page loads. Users can force-refresh updates via the UI.
*   **Real-time Filters & Search**: Search descriptions or dates instantly and filter updates by category with color-coded dot buttons.
*   **Share to X / Twitter**: An integrated sharing modal pre-formats the release note text, automatically truncates the preview to fit X's 280-character limit, and provides a direct X Web Intent link.
*   **Clipboard Copy**: Fast one-click copy tool that extracts cleaned plain-text versions of release note descriptions.
*   **Sleek Glassmorphic Dark UI**: Premium, dark-mode design using Google Fonts (Outfit), subtle gradients, blurred backdrops, and micro-animations.

---

## 📂 Project Structure

```text
├── app.py                     # Flask backend (Feeds fetching, parsing, caching, and API routing)
├── cache.json                 # Local JSON file caching parsed RSS feed entries (Auto-generated)
├── implementation_plan.md     # Approved project design and implementation plan
├── templates/
│   └── index.html             # Dashboard UI structure and templates
└── static/
    ├── css/
    │   └── style.css          # Premium glassmorphic design system and variables
    └── js/
        └── app.js             # State management, search, filtering, clipboard, and sharing logic
```

---

## ⚙️ Getting Started

### Prerequisites
*   Python 3.8 or higher
*   pip

### Installation & Execution

1.  **Activate Virtual Environment**:
    On Linux/macOS:
    ```bash
    source venv/bin/activate
    ```
    On Windows (Command Prompt):
    ```cmd
    venv\Scripts\activate
    ```

2.  **Start the Server**:
    Run the backend application:
    ```bash
    python app.py
    ```

3.  **Access the Dashboard**:
    Open your browser and navigate to:
    ```text
    http://localhost:5000
    ```

---

## 📡 API Reference

### Get Release Notes
Returns a list of parsed and formatted release notes.

*   **URL**: `/api/notes`
*   **Method**: `GET`
*   **Query Parameters**:
    *   `refresh` *(optional, default: `false`)*: Set to `true` to bypass the local cache and query Google's feed directly.
*   **Success Response (200 OK)**:
    ```json
    {
      "status": "success",
      "source": "cache",
      "data": [
        {
          "date": "June 15, 2026",
          "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_15_2026",
          "updated": "2026-06-15T00:00:00-07:00",
          "updates": [
            {
              "id": "June_15_2026_0",
              "type": "Feature",
              "content": "<p>Use Gemini Cloud Assist to analyze SQL...</p>",
              "text": "Use Gemini Cloud Assist to analyze SQL..."
            }
          ]
        }
      ]
    }
    ```

---

## 🎨 Theme & Styling System

The application uses vanilla CSS custom properties to maintain a clean styling token framework. Key tokens located inside `static/css/style.css` include:

*   `--bg-primary`: `#0f172a` (slate-900)
*   `--bg-glass`: `rgba(30, 41, 59, 0.7)` with `backdrop-filter: blur(12px)`
*   `--color-feature`: `#10b981` (emerald green)
*   `--color-issue`: `#f43f5e` (rose red)
*   `--color-changed`: `#f59e0b` (amber yellow)
*   `--color-deprecation`: `#a855f7` (purple)
*   `--color-notice`: `#64748b` (slate gray)
