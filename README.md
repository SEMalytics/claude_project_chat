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

### 1. Clone/Setup

```bash
cd claude_project_chat

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate  # macOS/Linux
# OR: venv\Scripts\activate  # Windows
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your credentials
```

Add to `.env`:
```
ANTHROPIC_API_KEY=sk-ant-api03-xxx
CLAUDE_PROJECT_ID=your-project-uuid-here
```

**Getting Your Claude Project UUID:**
1. Open your Claude Project at [claude.ai](https://claude.ai)
2. Look at the URL: `https://claude.ai/project/{PROJECT_UUID}`
3. Copy the UUID

### 4. Run

```bash
python app.py
```

Open http://127.0.0.1:5000 in your browser.

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
├── app.py                 # Flask server
├── config.py              # Configuration loader
├── project_config.yaml    # Project-specific settings (EDIT THIS)
├── requirements.txt       # Python dependencies
├── .env                   # API keys (EDIT THIS)
├── .env.example           # Example environment file
├── .gitignore             # Git ignore patterns
├── static/
│   ├── css/styles.css     # Custom styles
│   ├── js/app.js          # Frontend JavaScript
│   └── uploads/           # Temporary file storage
├── templates/
│   └── index.html         # Chat interface template
└── utils/
    ├── __init__.py
    ├── claude_client.py   # Anthropic API wrapper
    ├── file_processor.py  # File handling
    └── url_fetcher.py     # URL content fetching
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
