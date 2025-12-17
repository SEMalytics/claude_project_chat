# Chat Interface Implementation Plan
## Universal Claude Project Web Interface

---

## Overview

Build a **generalized local web-based chat interface** on MacBook that connects to ANY Claude Project via Anthropic API. The interface is **configuration-driven**, allowing you to customize prompts, file handling, and UI by simply editing a YAML config file.

**Key principle:** Write the code once, configure for any Claude Project.

---

## Architecture

### Stack Recommendation

**Frontend:**
- **HTML/CSS/JavaScript** (vanilla) - Simple, runs in browser
- **Tailwind CSS** - Quick styling
- **File upload handling** - Native browser APIs

**Backend:**
- **Python 3.11+ + Flask 3.0** (lightweight local server)
- **Anthropic Python SDK 0.18+** - Official Claude API client
- **PyYAML** - Configuration file parsing
- **Local file system** - Store uploads temporarily

**Why this stack:**
- ✅ Runs entirely on your MacBook (no deployment needed)
- ✅ Simple to set up and modify
- ✅ Anthropic SDK handles API authentication
- ✅ Can process files locally before sending to Claude
- ✅ **Configuration-driven** - works with ANY Claude Project
- ✅ **No code changes needed** - just edit YAML config

---

## Core Features

### 1. Configuration-Driven Design

**The key differentiator:** This interface works with **ANY Claude Project** by simply editing a configuration file.

**`project_config.yaml`** contains:
- Project identity (name, Claude Project UUID)
- Custom prompt templates  
- File type requirements
- UI customization (title, colors, branding)
- Feature flags (enable/disable URL fetching, file upload, etc)

**Switch projects by:**
1. Edit `.env` → Change `CLAUDE_PROJECT_ID`
2. Edit `project_config.yaml` → Update prompts and settings
3. Restart server → Ready to use new project

**No code changes required.**

### 2. Preconfigured Prompt Dropdown

Fully customizable via YAML. Define any prompts you need for your specific Claude Project.

**Default template (works with any project):**

```yaml
prompts:
  - id: general_chat
    label: "General Chat"
    template: "{user_input}"
    requires_files: false
    requires_input: true
    placeholder: "Ask me anything..."
    
  - id: document_analysis
    label: "Analyze Document"
    template: "Please analyze this document: {user_input}"
    requires_files: true
    min_files: 1
    placeholder: "Optional: What to focus on..."
    
  - id: compare_docs
    label: "Compare Documents"
    template: "Compare these documents and highlight key differences"
    requires_files: true
    min_files: 2
```

**Example configurations for different project types:**

**Code Review Project:**
```yaml
prompts:
  - id: code_review
    label: "Review Code"
    template: "Review this code for quality, security, and best practices"
    requires_files: true
    
  - id: bug_fix
    label: "Suggest Bug Fixes"
    template: "Identify bugs and suggest fixes in this code"
    requires_files: true
```

**Research Assistant Project:**
```yaml
prompts:
  - id: summarize
    label: "Summarize Research"
    template: "Summarize key findings from these sources"
    requires_files: true
    requires_url: true
    
  - id: compare_studies
    label: "Compare Studies"
    template: "Compare methodologies and findings"
    requires_files: true
    min_files: 2
```

**Content Creation Project:**
```yaml
prompts:
  - id: draft_post
    label: "Draft Social Post"
    template: "Create a social media post about: {user_input}"
    requires_input: true
    
  - id: rewrite
    label: "Rewrite Content"
    template: "Rewrite this content: {user_input}"
    requires_files: true
```

### 3. Flexible Input Field

**Smart input that handles:**
- **URL input** - Fetch website content (if URL fetching enabled)
- **File upload** - Configurable file types (PDF, DOCX, TXT, MD, etc)
- **Text input** - For questions, context, specific instructions

**Configured per project:**
```yaml
files:
  allowed_extensions:
    - pdf
    - docx
    - txt
    - md
  max_size_mb: 10
  max_files: 5
```

### 4. Chat Interface Layout

```
┌─────────────────────────────────────────┐
│  [Your Project Name]                    │
├─────────────────────────────────────────┤
│  [Prompt Dropdown ▼]                    │
│  [URL/File/Text Input Field]            │
│  [Upload Files Button] [Submit]         │
├─────────────────────────────────────────┤
│  Chat History:                          │
│  ┌───────────────────────────────────┐  │
│  │ You: [Your message]               │  │
│  │                                   │  │
│  │ Claude: [Response]                │  │
│  │ ...                               │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Type follow-up question...]          │
└─────────────────────────────────────────┘
```

---

## Implementation: Python Flask

### Project Structure

```
claude_project_chat/
├── app.py                 # Flask server
├── config.py              # Environment config loader
├── project_config.yaml    # **EDIT THIS** - Project-specific settings
├── requirements.txt       # Python dependencies
├── .env                   # **EDIT THIS** - API keys
├── .gitignore            # Git ignore patterns
├── README.md             # Setup instructions
├── static/
│   ├── css/
│   │   └── styles.css    # Custom styles (optional)
│   ├── js/
│   │   └── app.js        # Frontend logic
│   └── uploads/          # Temporary file storage
├── templates/
│   └── index.html        # Main chat interface
└── utils/
    ├── __init__.py       # Package initialization
    ├── claude_client.py  # Anthropic API wrapper (generic)
    ├── file_processor.py # File upload handler
    └── url_fetcher.py    # URL content fetcher
```

### Step-by-Step Build Plan

#### Phase 1: Configuration System (2 hours)

**1.1 Create project_config.yaml**
```yaml
# Project Identity
project:
  name: "My Claude Project"
  description: "Chat interface for my Claude Project"
  claude_project_id: "${CLAUDE_PROJECT_ID}"

# UI Customization
ui:
  title: "Claude Chat"
  subtitle: "Powered by Anthropic"
  primary_color: "#3b82f6"

# Feature Flags
features:
  file_upload: true
  url_fetching: false
  multi_file: true

# File Processing
files:
  allowed_extensions: [pdf, docx, txt, md]
  max_size_mb: 10
  max_files: 5

# Prompts (customize for your project)
prompts:
  - id: general_chat
    label: "General Chat"
    template: "{user_input}"
    requires_files: false
```

**1.2 Create .env file**
```bash
ANTHROPIC_API_KEY=your_api_key_here
CLAUDE_PROJECT_ID=your_project_uuid_here
```

**1.3 Create config.py (loads YAML and .env)**
```python
import os
import yaml
from dotenv import load_dotenv

load_dotenv()

class Config:
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
    CLAUDE_PROJECT_ID = os.getenv('CLAUDE_PROJECT_ID')
    
class ProjectConfig:
    def __init__(self, config_path='project_config.yaml'):
        with open(config_path, 'r') as f:
            self._config = yaml.safe_load(f)
    
    def get(self, key, default=None):
        # Navigate nested config via dot notation
        keys = key.split('.')
        value = self._config
        for k in keys:
            value = value.get(k) if isinstance(value, dict) else default
        return value if value is not None else default
```

#### Phase 2: Backend API (2 hours)

**2.1 Create utils/claude_client.py (generic)**
```python
from anthropic import Anthropic

class ClaudeClient:
    def __init__(self, api_key, project_id=None):
        self.client = Anthropic(api_key=api_key)
        self.project_id = project_id
        
    def send_message(self, message, files=None, conversation_history=None):
        # Build message with files
        content = []
        
        if files:
            for file_path in files:
                content.append({
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": self._get_mime_type(file_path),
                        "data": self._read_file_base64(file_path)
                    }
                })
        
        content.append({"type": "text", "text": message})
        
        # Add to conversation history
        messages = conversation_history or []
        messages.append({"role": "user", "content": content})
        
        # Call Claude API
        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=messages
        )
        
        return response.content[0].text
```

**2.2 Create app.py (Flask server)**
```python
from flask import Flask, render_template, request, jsonify
from config import Config, ProjectConfig
from utils.claude_client import ClaudeClient

app = Flask(__name__)
project_config = ProjectConfig()

claude = ClaudeClient(
    api_key=Config.ANTHROPIC_API_KEY,
    project_id=Config.CLAUDE_PROJECT_ID
)

conversations = {}

@app.route('/')
def index():
    return render_template('index.html',
        config=project_config.get('ui'),
        prompts=project_config.get('prompts'),
        features=project_config.get('features')
    )

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message')
    files = data.get('files', [])
    session_id = data.get('session_id')
    
    # Get conversation history
    history = conversations.get(session_id, [])
    
    # Send to Claude
    response = claude.send_message(message, files, history)
    
    # Update history
    history.append({"role": "user", "content": message})
    history.append({"role": "assistant", "content": response})
    conversations[session_id] = history
    
    return jsonify({'response': response})

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)
```

#### Phase 3: Frontend Interface (3 hours)

**3.1 Create templates/index.html**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ config.title }}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <div class="container mx-auto max-w-4xl p-6">
        <div class="bg-white rounded-lg shadow-lg p-6">
            <h1 class="text-2xl font-bold mb-6">{{ config.title }}</h1>
            
            <!-- Prompt Selection (dynamically populated) -->
            <select id="promptSelect" class="w-full border rounded p-2 mb-4">
                {% for prompt in prompts %}
                <option value="{{ prompt.id }}">{{ prompt.label }}</option>
                {% endfor %}
            </select>
            
            <!-- Input Field -->
            <input type="text" id="inputField" 
                   placeholder="Enter your message..."
                   class="w-full border rounded p-2 mb-4" />
            
            <!-- File Upload (if enabled) -->
            {% if features.file_upload %}
            <input type="file" id="fileUpload" multiple 
                   class="w-full border rounded p-2 mb-4" />
            {% endif %}
            
            <!-- Submit -->
            <button id="submitBtn" 
                    class="w-full bg-blue-600 text-white rounded p-3">
                Send
            </button>
            
            <!-- Chat History -->
            <div id="chatHistory" class="mt-6 space-y-4"></div>
        </div>
    </div>
    
    <script src="/static/js/app.js"></script>
</body>
</html>
```

**3.2 Create static/js/app.js**
```javascript
class ChatInterface {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.uploadedFiles = [];
        this.init();
    }
    
    init() {
        document.getElementById('submitBtn').addEventListener('click', () => this.send());
        document.getElementById('fileUpload')?.addEventListener('change', (e) => this.handleFiles(e));
    }
    
    async send() {
        const message = document.getElementById('inputField').value;
        const promptId = document.getElementById('promptSelect').value;
        
        // Build message from prompt template
        const fullMessage = this.buildMessage(promptId, message);
        
        // Send to server
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: fullMessage,
                files: this.uploadedFiles,
                session_id: this.sessionId
            })
        });
        
        const data = await response.json();
        this.displayMessage('assistant', data.response);
    }
    
    displayMessage(role, content) {
        const history = document.getElementById('chatHistory');
        const div = document.createElement('div');
        div.className = `message ${role}`;
        div.textContent = content;
        history.appendChild(div);
    }
    
    generateSessionId() {
        return 'session_' + Date.now();
    }
}

new ChatInterface();
```

#### Phase 4: Setup & Testing (1 hour)

**4.1 Create requirements.txt**
```
flask==3.0.0
anthropic==0.18.0
python-dotenv==1.0.0
pyyaml==6.0.1
requests==2.31.0
beautifulsoup4==4.12.0
```

**4.2 Create .gitignore**
```
.env
venv/
__pycache__/
static/uploads/
*.pyc
.DS_Store
```

**4.3 Create README.md**
```markdown
# Claude Project Chat Interface

Universal web interface for ANY Claude Project.

## Quick Start

1. Copy .env.example to .env and add your keys
2. Edit project_config.yaml for your project
3. Run: python app.py
4. Open: http://127.0.0.1:5000

## Configuration

Edit `project_config.yaml` to customize:
- Prompts and templates
- File upload settings
- UI branding
- Feature flags
```

---

## Usage Instructions

### First Time Setup

```bash
# 1. Create project directory
mkdir claude_project_chat
cd claude_project_chat

# 2. Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure for your project
cp .env.example .env
# Edit .env - add your ANTHROPIC_API_KEY and CLAUDE_PROJECT_ID

# Edit project_config.yaml - customize prompts for your project

# 5. Run
python app.py
```

### Switching to Different Claude Project

```bash
# 1. Edit .env - change CLAUDE_PROJECT_ID
# 2. Edit project_config.yaml - update prompts and settings
# 3. Restart server
python app.py
```

---

## Configuration Examples

### Example 1: Document Analysis Project

```yaml
project:
  name: "Document Analyzer"
  
prompts:
  - id: summarize
    label: "Summarize Document"
    template: "Please provide a concise summary"
    requires_files: true
    
  - id: extract
    label: "Extract Key Points"
    template: "Extract key points from this document"
    requires_files: true
```

### Example 2: Code Assistant Project

```yaml
project:
  name: "Code Helper"
  
files:
  allowed_extensions: [py, js, ts, java, cpp]
  
prompts:
  - id: review
    label: "Code Review"
    template: "Review this code"
    requires_files: true
    
  - id: debug
    label: "Debug Issue"
    template: "Help debug this: {user_input}"
    requires_files: true
```

### Example 3: Writing Assistant Project

```yaml
project:
  name: "Writing Coach"
  
prompts:
  - id: improve
    label: "Improve Writing"
    template: "Improve this text: {user_input}"
    
  - id: style
    label: "Style Check"
    template: "Check writing style and suggest improvements"
    requires_files: true
```

---

## Advanced Features (Optional)

### Session Persistence
Add SQLite database to save conversation history across sessions.

### Multiple Project Profiles
Save multiple `project_config.yaml` files and switch between them via UI dropdown.

### Export Functionality
Add buttons to export conversations as PDF, Markdown, or JSON.

### Custom Themes
Expand UI config to support full color themes and custom CSS.

---

## Cost Estimates

**Development Time:**
- Phase 1 (Configuration): 2 hours
- Phase 2 (Backend): 2 hours
- Phase 3 (Frontend): 3 hours
- Phase 4 (Setup): 1 hour
- **Total: 8 hours**

**API Costs (vary by project):**
- Simple chat: ~$0.01-0.05 per message
- With files: ~$0.10-0.40 per interaction
- Monthly (moderate use): $10-30

---

## Security Considerations

**For local use:**
- ✅ API key in .env (not committed to git)
- ✅ Runs only on localhost
- ✅ Files stored locally temporarily
- ✅ No external hosting needed

**For production (if sharing):**
- Add authentication
- Rate limiting
- HTTPS/TLS
- Secure file storage

---

## Key Principle

**Write once, configure for any project.**

All customization happens in `project_config.yaml`. The code never changes, regardless of which Claude Project you're using.

---

## Next Steps

1. **Set up environment** - Follow "First Time Setup" above
2. **Configure for your project** - Edit project_config.yaml with your prompts
3. **Test** - Run with a simple "general chat" prompt first
4. **Customize** - Add project-specific prompts and features
5. **Deploy** - Use locally or share with team

Ready to work with ANY Claude Project!
