# Claude Project Chat Interface

A universal web-based chat interface for ANY Claude Project via the Anthropic API. Configuration-driven design allows customization without code changes.

## Features

- **Configuration-driven** - Works with any Claude Project by editing YAML config
- **File upload support** - PDF, DOCX, TXT, MD (configurable)
- **Customizable prompts** - Define your own prompt templates
- **Conversation history** - Maintains context within sessions
- **URL content fetching** - Optionally fetch and analyze web content
- **Responsive design** - Works on desktop and mobile
- **Drag & drop** - Easy file uploads

## Quick Start

### 1. Clone and Navigate

```bash
git clone https://github.com/SEMalytics/claude_project_chat.git
cd claude_project_chat
```

### 2. Create Virtual Environment

```bash
# Remove any existing venv (if reinstalling)
rm -rf venv

# Create fresh virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # macOS/Linux
# OR: venv\Scripts\activate  # Windows
```

### 3. Install Dependencies

```bash
# Upgrade pip first
pip install --upgrade pip

# Install all dependencies
pip install -r requirements.txt
```

### 4. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your credentials (use any text editor)
nano .env  # or: code .env, vim .env, etc.
```

Add your credentials to `.env`:
```
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
CLAUDE_PROJECT_ID=your-project-uuid-here
```

**Getting Your Claude Project UUID:**
1. Open your Claude Project at [claude.ai](https://claude.ai)
2. Look at the URL: `https://claude.ai/project/{PROJECT_UUID}`
3. Copy the UUID (e.g., `019b2d71-59d5-707d-9fbe-e419324275e7`)

### 5. Run the Server

```bash
python app.py
```

You should see:
```
==================================================
  Claude Chat
  Powered by Anthropic
==================================================

  Server starting at http://127.0.0.1:5000
  Press Ctrl+C to stop
```

### 6. Open in Browser

Navigate to: **http://127.0.0.1:5000**

### Next Time (Quick Start)

```bash
cd claude_project_chat
./venv/bin/python app.py
```

Or with activation:
```bash
cd claude_project_chat
source venv/bin/activate
python app.py
```

## Configuration

### Project Settings (`project_config.yaml`)

Edit this file to customize the interface for your specific Claude Project:

```yaml
# Project Identity
project:
  name: "My Project"
  description: "Description here"

# UI Customization
ui:
  title: "Chat Title"
  subtitle: "Subtitle text"
  primary_color: "#3b82f6"

# Features
features:
  file_upload: true
  url_fetching: true
  multi_file: true

# File Settings
files:
  allowed_extensions: [pdf, docx, txt, md]
  max_size_mb: 10
  max_files: 5

# Custom Prompts
prompts:
  - id: "general_chat"
    label: "General Chat"
    template: "{user_input}"
    requires_files: false
    placeholder: "Ask anything..."
```

### Switching Projects

1. Edit `.env` - Change `CLAUDE_PROJECT_ID`
2. Edit `project_config.yaml` - Update prompts and settings
3. Restart the server

No code changes needed.

## Project Structure

```
claude_project_chat/
├── app.py                   # Flask server with API routes
├── config.py                # Configuration loader
├── project_config.yaml      # Project-specific settings (EDIT THIS)
├── requirements.txt         # Python dependencies
├── .env                     # API keys (EDIT THIS, not in git)
├── .env.example             # Example environment file
├── .gitignore               # Git ignore patterns
├── static/
│   ├── css/styles.css       # Custom styles
│   ├── js/
│   │   ├── app.js           # Main frontend JavaScript
│   │   └── prompt-builder.js # Template UI component
│   └── uploads/             # Temporary file storage
├── templates/
│   └── index.html           # Chat interface template
└── utils/
    ├── __init__.py
    ├── claude_client.py     # Anthropic API wrapper
    ├── file_processor.py    # File handling
    ├── url_fetcher.py       # URL content fetching
    ├── prompt_templates.py  # 20+ built-in templates
    └── prompt_compiler.py   # Template compilation
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main chat interface |
| `/api/chat` | POST | Send message to Claude |
| `/api/upload` | POST | Upload file |
| `/api/fetch-url` | POST | Fetch URL content |
| `/api/prompts` | GET | Get available prompts |
| `/api/session/{id}` | GET | Get session history |
| `/api/session/{id}` | DELETE | Clear session |
| `/api/config` | GET | Get project config |

## Example Configurations

### Document Analysis

```yaml
prompts:
  - id: summarize
    label: "Summarize Document"
    template: "Provide a concise summary"
    requires_files: true
    min_files: 1

  - id: compare
    label: "Compare Documents"
    template: "Compare and contrast these documents"
    requires_files: true
    min_files: 2
```

### Code Review

```yaml
files:
  allowed_extensions: [py, js, ts, java, cpp, go]

prompts:
  - id: review
    label: "Code Review"
    template: "Review this code for quality and best practices"
    requires_files: true

  - id: explain
    label: "Explain Code"
    template: "Explain what this code does"
    requires_files: true
```

### Research Assistant

```yaml
features:
  url_fetching: true

prompts:
  - id: research
    label: "Research Topic"
    template: "Research and summarize: {user_input}"
    requires_input: true

  - id: analyze_url
    label: "Analyze Website"
    template: "Analyze this URL: {url}"
    requires_url: true
```

## Troubleshooting

### "ANTHROPIC_API_KEY is required"
- Check that `.env` file exists and contains your API key
- Ensure the key starts with `sk-ant-`

### File upload fails
- Check file extension is in `allowed_extensions`
- Verify file size is under `max_size_mb`
- Ensure `static/uploads/` directory exists and is writable

### "Module not found" errors
- Activate virtual environment: `source venv/bin/activate`
- Install dependencies: `pip install -r requirements.txt`

### Pip installs to wrong Python / "site-packages is not writeable"
If you see "Defaulting to user installation because normal site-packages is not writeable", your shell has conflicting Python aliases. Use the venv binaries directly:

```bash
# Install using venv pip directly
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

# Run using venv python directly
./venv/bin/python app.py
```

Or recreate the venv completely:
```bash
rm -rf venv
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
```

## Development

### Format Code
```bash
pip install black flake8
black .
flake8 .
```

### Run Tests
```bash
pip install pytest
pytest
```

## Security Notes

- API keys are stored in `.env` (not committed to git)
- Runs locally on 127.0.0.1 by default
- Uploaded files are stored temporarily in `static/uploads/`
- Consider adding authentication for production use

## License

MIT License - Use freely for your projects.
