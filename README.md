# Prompt Engineering Workbench | Claude Projects

A universal web-based chat interface for ANY Claude Project. Supports both the official Anthropic API and direct Claude.ai web access with cookie authentication.

## Features

### Core Features
- **Dual Connection Modes** - Use official API or direct Claude.ai web access
- **Mode Selector** - Switch between API and Projects mode in Settings (when both configured)
- **Claude Projects Support** - Access your Claude Projects with their knowledge bases
- **Project Selector** - Switch between multiple Claude Projects on the fly
- **Configuration-driven** - Works with any Claude Project by editing YAML config
- **20+ Built-in Templates** - Analysis, research, content creation, and more

### Tool Execution
- **Web Fetch** - Claude can fetch and analyze web pages automatically
- **Web Search** - DuckDuckGo (default) or Google Custom Search integration
- **Progress Tracking** - Visual progress bar with tool execution stats
- **Real-time Feedback** - See fetches and searches as they happen

### File & Content
- **File upload support** - PDF, DOCX, TXT, MD (configurable)
- **Drag & drop uploads** - Easy file handling
- **URL content fetching** - Optionally fetch and analyze web content

### UI/UX
- **Template System** - Dynamic prompt builder with variable inputs
- **Conversation history** - Maintains context within sessions
- **New Chat button** - Start fresh conversations within projects
- **Settings modal** - Manage projects, templates, and connection settings
- **Progress indicators** - Animated progress bar during processing
- **Responsive design** - Works on desktop and mobile

## Connection Modes

### Option 1: Claude.ai Web Client (Recommended for Projects)

Connect directly to Claude.ai using your browser session cookie. This gives you access to:
- Your Claude Projects with their custom instructions and knowledge bases
- Project-specific conversations
- Project selector to switch between projects
- All features available in the Claude.ai web interface

**Header displays:** `Prompt Engineering Workbench | Claude Projects`

### Option 2: Official Anthropic API

Use the standard Anthropic API for direct Claude access. This mode:
- Works as a template-based prompt engine
- Does NOT have access to Claude Projects or knowledge bases
- Hides the project selector (not applicable)
- Uses your API key directly with Anthropic

**Header displays:** `Prompt Engineering Workbench | Claude AI`

### Switching Modes

If you have both an API key and a Claude.ai cookie configured, you can switch between modes:

1. Click the **Settings** (gear icon) in the header
2. In the **Connection** section, you'll see mode toggle buttons
3. Click **Projects** or **API** to switch modes
4. The UI will update automatically (header title, project selector visibility)

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

# Edit .env with your credentials
nano .env  # or: code .env, vim .env, etc.
```

#### For Claude.ai Web Client (Recommended):

```env
# Get this from your browser's DevTools (see instructions below)
CLAUDE_COOKIE=sessionKey=sk-ant-sid01-xxx...

# Optional: Start in a specific conversation
CLAUDE_CONVERSATION_ID=your-conversation-uuid
```

**Getting Your Claude Cookie:**
1. Open [claude.ai](https://claude.ai) and log in
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to Network tab
4. Click any request to claude.ai
5. Find the `Cookie` header in Request Headers
6. Copy the entire cookie string (starts with `sessionKey=`)

#### For Official Anthropic API:

```env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
CLAUDE_PROJECT_ID=your-project-uuid-here
```

#### Optional: Google Custom Search (for web search tool)

By default, web search uses DuckDuckGo (no API key needed). For Google Custom Search:

```env
# Get API key from: https://console.cloud.google.com/apis/credentials
GOOGLE_SEARCH_API_KEY=your-google-api-key

# Create search engine at: https://programmablesearchengine.google.com/
GOOGLE_SEARCH_CX=your-search-engine-id
```

### 5. Run the Server

```bash
python app.py
```

You should see:
```
==================================================
  Prompt Engineering Workbench | Claude Projects

==================================================

  Server starting at http://127.0.0.1:5001
  Press Ctrl+C to stop
```

### 6. Open in Browser

Navigate to: **http://127.0.0.1:5001**

### 7. Enable Projects (First Time)

1. Click the **Settings** (gear icon) in the header
2. In "Active Projects", check the projects you want to use
3. Click **Save Changes**
4. Use the project dropdown in the header to switch projects

## Configuration

### Project Settings (`project_config.yaml`)

Edit this file to customize the interface:

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

# Custom Prompts (for Simple Input mode)
prompts:
  - id: "general_chat"
    label: "General Chat"
    template: "{user_input}"
    requires_files: false
    placeholder: "Ask anything..."
```

### Custom Templates (`custom_prompts.yaml`)

Create your own templates that persist across updates:

```yaml
templates:
  - id: my_custom_template
    name: "My Custom Analysis"
    description: "Describe what this does"
    category: analysis
    template: |
      Analyze the following for [focus_area]:

      [content]
    variables:
      - name: focus_area
        label: "Focus Area"
        type: text
        required: true
      - name: content
        label: "Content to Analyze"
        type: textarea
        required: true
```

## Project Structure

```
claude_project_chat/
├── app.py                   # Flask server with API routes
├── config.py                # Configuration loader
├── project_config.yaml      # Project-specific settings
├── custom_prompts.yaml      # Your custom templates (gitignored)
├── requirements.txt         # Python dependencies
├── .env                     # API keys/cookies (gitignored)
├── .env.example             # Example environment file
├── static/
│   ├── css/styles.css       # Custom styles
│   ├── js/
│   │   ├── app.js           # Main frontend JavaScript
│   │   └── prompt-builder.js # Template UI + Project Manager
│   └── uploads/             # Temporary file storage
├── templates/
│   └── index.html           # Chat interface template
└── utils/
    ├── __init__.py
    ├── claude_client.py     # Official Anthropic API wrapper
    ├── claude_web_client.py # Claude.ai web client (cookie auth)
    ├── tool_handler.py      # Tool execution handler
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
| `/api/templates` | GET | Get all templates |
| `/api/prompts` | GET | Get legacy prompts |
| `/api/session/{id}` | GET | Get session history |
| `/api/session/{id}` | DELETE | Clear session |
| `/api/config` | GET | Get project config |
| `/api/client-status` | GET | Check connection mode and available options |
| `/api/switch-mode` | POST | Switch between API and Web modes |
| `/api/update-cookie` | POST | Update Claude.ai cookie |
| `/api/projects` | GET | List available projects |
| `/api/projects/set-active` | POST | Switch active project |
| `/api/conversations` | GET | List conversations |
| `/api/conversations/new` | POST | Start new conversation |

## Built-in Template Categories

- **Analysis** - SWOT, competitive, gap analysis
- **Research** - Literature review, market research, trend analysis
- **Content** - Blog posts, social media, email campaigns
- **Technical** - Code review, documentation, architecture
- **Business** - Business plans, proposals, reports
- **Creative** - Brainstorming, storytelling, naming

## Troubleshooting

### Cookie Authentication Issues

**"Access denied (403)"**
- Your cookie has expired. Get a fresh one from claude.ai DevTools
- Update via Settings modal or edit `.env` directly

**Projects not showing**
1. Click Settings (gear icon)
2. Click "Refresh Projects"
3. Enable the projects you want
4. Save Changes

### API Issues

**"ANTHROPIC_API_KEY is required"**
- Check that `.env` file exists and contains your API key
- Ensure the key starts with `sk-ant-`

### File Upload Issues

- Check file extension is in `allowed_extensions`
- Verify file size is under `max_size_mb`
- Ensure `static/uploads/` directory exists

### Module Not Found

```bash
# Activate virtual environment
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Pip Installation Issues

If pip installs to wrong location:
```bash
# Use venv binaries directly
./venv/bin/pip install -r requirements.txt
./venv/bin/python app.py
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

- API keys and cookies are stored in `.env` (not committed to git)
- Runs locally on 127.0.0.1 by default
- Uploaded files are stored temporarily in `static/uploads/`
- Cookie-based auth uses your Claude.ai session - keep it secure
- Consider adding authentication for production use

## Credits & Acknowledgments

This project uses and was inspired by several open-source projects:

### Libraries Used

- **[Flask](https://flask.palletsprojects.com/)** - Web framework
- **[Anthropic Python SDK](https://github.com/anthropics/anthropic-sdk-python)** - Official Claude API
- **[curl_cffi](https://github.com/yifeikong/curl_cffi)** - HTTP client with browser impersonation
- **[duckduckgo-search](https://github.com/deedy5/duckduckgo_search)** - Web search without API key
- **[BeautifulSoup4](https://www.crummy.com/software/BeautifulSoup/)** - HTML parsing
- **[PyPDF2](https://github.com/py-pdf/pypdf)** - PDF text extraction
- **[python-docx](https://github.com/python-openxml/python-docx)** - Word document processing
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework

### Inspiration

- **[Claude-API by KoushikNavuluri](https://github.com/KoushikNavuluri/Claude-API)** - Inspired the approach for direct Claude.ai web access using cookie authentication

### Built With

- [Claude Code](https://claude.ai/claude-code) - AI-assisted development

## License

MIT License - Use freely for your projects.

---

**Note:** This is an unofficial tool and is not affiliated with Anthropic. Use responsibly and in accordance with Anthropic's terms of service.
