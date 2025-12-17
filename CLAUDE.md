# CLAUDE.md - Claude Project Chat Interface

**Claude Project Chat Interface** is a generalized local web application that provides an intuitive chat interface for interacting with ANY Claude Project via the Anthropic API.

---

## Project Overview

### Tech Stack

- **Backend:** Python 3.11+, Flask 3.0
- **Frontend:** HTML5, Tailwind CSS 3.4, Vanilla JavaScript
- **AI Integration:** Anthropic Claude API (Python SDK 0.18+)
- **File Processing:** PyPDF2, python-docx, beautifulsoup4
- **Environment:** python-dotenv for configuration
- **Storage:** Local filesystem (no database required)

### Project Structure

```
claude_project_chat/
├── app.py                 # Flask server with API routes
├── config.py              # Project configuration (EDIT THIS FOR YOUR PROJECT)
├── project_config.yaml    # Project-specific settings (prompts, file types, etc)
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables (API keys)
├── .gitignore            # Git ignore patterns
├── README.md             # Setup and usage instructions
├── static/
│   ├── css/
│   │   └── styles.css    # Custom styles (optional)
│   ├── js/
│   │   └── app.js        # Frontend logic and API client
│   └── uploads/          # Temporary file storage (auto-created)
├── templates/
│   └── index.html        # Main chat interface
└── utils/
    ├── __init__.py       # Package initialization
    ├── claude_client.py  # Anthropic API wrapper (generic)
    ├── file_processor.py # File upload and content extraction
    ├── url_fetcher.py    # URL content retrieval
    └── config_loader.py  # Project configuration loader
```

### Current Status

**Implemented:**
- Generic Flask server that works with any Claude Project
- Configuration-driven project setup (YAML-based)
- File upload handling (PDF, DOCX, TXT, MD, configurable)
- Claude Project integration via Anthropic SDK
- Customizable prompt dropdown system
- Chat history with conversation threading
- URL content fetching (optional)

**Configurable Per Project:**
- Project name and description
- Custom prompt templates
- File type requirements
- UI branding (title, colors, logo)
- Feature flags (URL fetching, file upload, etc)

**Pending:**
- Session persistence (SQLite database)
- Export functionality (PDF/CSV reports)
- Batch analysis processing
- Multiple project profiles (switch between projects)
- Analysis history dashboard

---

## Project Configuration

This interface is **project-agnostic**. Configure it for any Claude Project by editing `project_config.yaml`.

### Configuration File Structure

**`project_config.yaml`**

```yaml
# Project Identity
project:
  name: "My Claude Project"
  description: "Custom Claude Project chat interface"
  claude_project_id: "${CLAUDE_PROJECT_ID}"  # From .env
  
# UI Customization
ui:
  title: "My Project Chat"
  subtitle: "Powered by Claude"
  primary_color: "#3b82f6"  # Tailwind blue-500
  show_logo: false
  logo_path: ""

# Feature Flags
features:
  file_upload: true
  url_fetching: true
  multi_file: true
  conversation_history: true
  export_chat: false

# File Processing
files:
  allowed_extensions:
    - pdf
    - docx
    - txt
    - md
  max_size_mb: 10
  max_files: 5

# Preconfigured Prompts
prompts:
  - id: "general_chat"
    label: "General Chat"
    template: "{user_input}"
    requires_files: false
    requires_input: true
    placeholder: "Ask me anything..."
    
  - id: "document_analysis"
    label: "Analyze Document"
    template: "Please analyze this document: {user_input}"
    requires_files: true
    min_files: 1
    placeholder: "Optional: What to focus on..."
    
  - id: "compare_documents"
    label: "Compare Documents"
    template: "Compare these documents and highlight key differences"
    requires_files: true
    min_files: 2
    
  - id: "url_analysis"
    label: "Analyze Website"
    template: "Analyze this website: {url}"
    requires_url: true
    placeholder: "Enter URL..."

# Custom Instructions (prepended to every request)
system_context: |
  You are a helpful assistant working within a Claude Project.
  Follow the project's custom instructions and knowledge base.
```

### Quick Setup for Different Projects

**Example 1: Concept Clarity Analysis**
```yaml
project:
  name: "Concept Clarity System"
  
prompts:
  - id: "full_analysis"
    label: "Full Positioning Clarity Analysis"
    template: "Analyze positioning clarity across these materials"
    requires_files: true
    min_files: 2
```

**Example 2: Code Review Assistant**
```yaml
project:
  name: "Code Review Bot"
  
files:
  allowed_extensions:
    - py
    - js
    - ts
    - java
    - cpp
    
prompts:
  - id: "review"
    label: "Review Code"
    template: "Review this code for quality, security, and best practices"
    requires_files: true
```

**Example 3: Research Assistant**
```yaml
project:
  name: "Research Helper"
  
features:
  url_fetching: true
  
prompts:
  - id: "summarize"
    label: "Summarize Research"
    template: "Summarize key findings from these sources"
    requires_files: true
    requires_url: true
```

---

## Development Setup

### Prerequisites

- **Python 3.11+** (3.11 recommended for best compatibility)
- **pip** (Python package installer)
- **Anthropic API Key** with Claude Project access
- **Claude Project UUID** for your Concept Clarity project

### Initial Setup

```bash
# 1. Create project directory
mkdir claude_project_chat
cd claude_project_chat

# 2. Create virtual environment
python3.11 -m venv venv

# 3. Activate virtual environment
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate     # Windows

# 4. Install dependencies
pip install -r requirements.txt

# 5. Create .env file
touch .env
```

### Environment Configuration

Add to `.env`:

```env
# Required - Anthropic API Access
ANTHROPIC_API_KEY=sk-ant-api03-xxx

# Required - Your Claude Project UUID
# Get this from your project URL: https://claude.ai/project/{UUID}
CLAUDE_PROJECT_ID=your-project-uuid-here

# Optional - Server Configuration
FLASK_ENV=development
FLASK_DEBUG=True
HOST=127.0.0.1
PORT=5000

# Optional - Upload Limits (can also set in project_config.yaml)
MAX_FILE_SIZE=10485760  # 10MB in bytes
```

**Getting Your Claude Project UUID:**
1. Open ANY Claude Project in Claude.ai
2. Look at the URL: `https://claude.ai/project/{PROJECT_UUID}`
3. Copy the UUID and add to `.env`

**The interface will work with ANY Claude Project** - just change the `CLAUDE_PROJECT_ID` and update `project_config.yaml` for project-specific prompts.

---

## Development Commands

### Running the Application

```bash
# Start development server
python app.py

# Or use Flask CLI
flask run

# Access at http://127.0.0.1:5000
```

### Package Management

```bash
# Install new package
pip install package_name

# Update requirements.txt
pip freeze > requirements.txt

# Install from requirements
pip install -r requirements.txt
```

### Code Quality

```bash
# Format code with black
pip install black
black .

# Lint with flake8
pip install flake8
flake8 app.py utils/

# Type checking with mypy
pip install mypy
mypy app.py utils/
```

---

## API Endpoints

### POST `/api/analyze`

Analyze positioning clarity using Claude Project.

**Request:**
```json
{
  "prompt_id": "full_analysis",
  "input": "Optional URL or concept",
  "files": ["/path/to/file1.pdf", "/path/to/file2.docx"],
  "session_id": "session_abc123"
}
```

**Response:**
```json
{
  "response": "## Concept Clarity Score: 62/100\n...",
  "session_id": "session_abc123",
  "analysis_time": 2.34
}
```

### POST `/api/upload`

Upload file for analysis.

**Request:** multipart/form-data with `file` field

**Response:**
```json
{
  "filepath": "static/uploads/pitch_deck.pdf",
  "filename": "pitch_deck.pdf",
  "size": 245678
}
```

### GET `/api/prompts`

Get available preconfigured prompts.

**Response:**
```json
{
  "prompts": [
    {
      "id": "full_analysis",
      "label": "Full Positioning Clarity Analysis",
      "requires_files": true,
      "min_files": 2
    }
  ]
}
```

### GET `/api/session/{session_id}`

Retrieve conversation history for a session.

**Response:**
```json
{
  "session_id": "session_abc123",
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```

---

## Preconfigured Prompts (Customizable)

The prompt system is **completely configurable** via `project_config.yaml`. Below are example templates you can customize for your specific Claude Project.

### Default Prompt Templates

These are included as examples - edit `project_config.yaml` to customize:

```yaml
prompts:
  - id: "general_chat"
    label: "General Chat"
    template: "{user_input}"
    requires_files: false
    requires_input: true
    
  - id: "document_analysis"  
    label: "Analyze Document"
    template: "Please analyze this document: {user_input}"
    requires_files: true
    min_files: 1
    
  - id: "compare_documents"
    label: "Compare Documents"  
    template: "Compare these documents and highlight key differences"
    requires_files: true
    min_files: 2
    
  - id: "url_analysis"
    label: "Analyze Website"
    template: "Analyze this website: {url}"
    requires_url: true
```

### Template Variables

Use these in your prompt templates:

- `{user_input}` - Text from input field
- `{url}` - URL from input field
- `{concept}` - Specific concept to analyze
- `{files}` - Automatically includes uploaded files

### Prompt Configuration Options

```yaml
prompt:
  id: "unique_id"                # Unique identifier
  label: "Display Name"          # Shown in dropdown
  template: "Prompt text..."     # Sent to Claude
  requires_files: true/false     # Requires file upload
  min_files: 2                   # Minimum files needed
  requires_url: true/false       # Requires URL input
  requires_input: true/false     # Requires text input
  placeholder: "Hint text..."    # Input field placeholder
  description: "What this does"  # Tooltip text (optional)
```

---

## Component Patterns

### Backend (Python/Flask)

#### Route Handler Pattern

```python
@app.route('/api/endpoint', methods=['POST'])
def endpoint_name():
    """
    Endpoint description.
    
    Returns:
        JSON response with success/error
    """
    # 1. Validate request
    data = request.json
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    # 2. Process data
    result = process_data(data)
    
    # 3. Return response
    return jsonify({
        'success': True,
        'data': result
    })
```

#### Error Handling Pattern

```python
from functools import wraps

def handle_errors(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            app.logger.error(f'Error in {f.__name__}: {str(e)}')
            return jsonify({'error': 'Internal server error'}), 500
    return decorated_function

@app.route('/api/analyze', methods=['POST'])
@handle_errors
def analyze():
    # Your code here
    pass
```

### Frontend (JavaScript)

#### API Client Pattern

```javascript
class APIClient {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
    }
    
    async post(endpoint, data) {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
    }
}
```

#### Component Pattern

```javascript
class ChatComponent {
    constructor(elementId) {
        this.element = document.getElementById(elementId);
        this.state = {
            messages: [],
            isLoading: false
        };
        this.init();
    }
    
    init() {
        // Bind event listeners
        this.bindEvents();
        
        // Initialize UI
        this.render();
    }
    
    bindEvents() {
        // Event listener setup
    }
    
    render() {
        // Update DOM
    }
}
```

---

## File Processing

### Supported File Types

| Extension | Library | Notes |
|-----------|---------|-------|
| `.pdf` | PyPDF2 | Text extraction from PDF documents |
| `.docx` | python-docx | Word document processing |
| `.txt` | Native Python | Plain text files |
| `.md` | Native Python | Markdown files |

### Adding New File Types

Edit `utils/file_processor.py`:

```python
class FileProcessor:
    SUPPORTED_EXTENSIONS = {
        'pdf': 'read_pdf',
        'docx': 'read_docx',
        'txt': 'read_text',
        'md': 'read_text',
        'pptx': 'read_pptx'  # Add new type
    }
    
    def read_pptx(self, filepath):
        """Extract text from PowerPoint"""
        from pptx import Presentation
        prs = Presentation(filepath)
        text = []
        for slide in prs.slides:
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    text.append(shape.text)
        return '\n'.join(text)
```

---

## Code Standards

### Python (PEP 8)

```python
# Imports: stdlib, third-party, local
import os
from typing import Dict, List

from flask import Flask
from anthropic import Anthropic

from utils.prompts import get_prompts

# Constants at module level
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Class names: PascalCase
class ClaudeClient:
    """Handles communication with Claude API"""
    
    def __init__(self, api_key: str):
        self.client = Anthropic(api_key=api_key)
    
    # Method names: snake_case
    def send_message(self, message: str, files: List[str] = None) -> str:
        """
        Send message to Claude.
        
        Args:
            message: User message text
            files: Optional list of file paths
            
        Returns:
            Claude's response text
        """
        # Implementation
        pass
```

### JavaScript (ES6+)

```javascript
// Use const/let, never var
const API_BASE_URL = '/api';

// Arrow functions for callbacks
const handleClick = () => {
    console.log('clicked');
};

// Async/await for promises
async function fetchData() {
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

// Template literals for strings
const message = `Hello, ${name}!`;

// Destructuring
const { data, error } = await apiCall();
```

### HTML/CSS

```html
<!-- Semantic HTML5 -->
<main class="container mx-auto">
    <section class="analysis-section">
        <header>
            <h2>Analysis Results</h2>
        </header>
        <article class="result-card">
            <!-- Content -->
        </article>
    </section>
</main>
```

```css
/* Use Tailwind utilities first */
.custom-component {
    @apply bg-white rounded-lg shadow-lg p-6;
}

/* Custom CSS only when necessary */
.gradient-text {
    background: linear-gradient(to right, #3b82f6, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
```

---

## Testing

### Unit Tests (pytest)

```bash
# Install pytest
pip install pytest pytest-flask

# Run tests
pytest

# Run with coverage
pytest --cov=utils --cov=app
```

Example test:

```python
# tests/test_file_processor.py
import pytest
from utils.file_processor import FileProcessor

def test_read_text_file():
    processor = FileProcessor()
    content = processor.read_text('test_files/sample.txt')
    assert len(content) > 0
    assert isinstance(content, str)
```

### Integration Tests

```python
# tests/test_api.py
def test_analyze_endpoint(client):
    response = client.post('/api/analyze', json={
        'prompt_id': 'quick_scan',
        'files': ['test_files/doc1.pdf', 'test_files/doc2.pdf']
    })
    
    assert response.status_code == 200
    data = response.json
    assert 'response' in data
    assert 'session_id' in data
```

---

## Deployment Considerations

### Local Development (Current)

```bash
# Run on localhost only
python app.py
# Access: http://127.0.0.1:5000
```

### Production (Future)

For sharing with team:

```python
# app.py production config
if __name__ == '__main__':
    # Use production WSGI server
    from waitress import serve
    serve(app, host='0.0.0.0', port=5000)
```

```bash
# Install production server
pip install waitress

# Run production
python app.py
```

**Security checklist for production:**
- [ ] Use HTTPS (nginx reverse proxy)
- [ ] Add authentication (Flask-Login)
- [ ] Rate limiting (Flask-Limiter)
- [ ] Secure file upload validation
- [ ] Environment variable protection
- [ ] CORS configuration
- [ ] Session management (Flask-Session)

---

## Troubleshooting

### Common Issues

**Issue: `ModuleNotFoundError: No module named 'anthropic'`**
```bash
# Solution: Activate virtual environment
source venv/bin/activate
pip install -r requirements.txt
```

**Issue: `anthropic.APIError: invalid_api_key`**
```bash
# Solution: Check .env file
cat .env  # Verify ANTHROPIC_API_KEY is correct
```

**Issue: File upload fails with large PDFs**
```python
# Solution: Increase max file size in config.py
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
```

**Issue: URL fetching returns empty content**
```python
# Solution: Add user agent to requests
headers = {'User-Agent': 'Mozilla/5.0'}
response = requests.get(url, headers=headers)
```

---

## Key Files Reference

| File | Purpose | Customization |
|------|---------|---------------|
| `project_config.yaml` | **EDIT THIS** - Project-specific settings | Prompts, file types, UI, features |
| `.env` | **EDIT THIS** - API keys and project UUID | Your credentials |
| `app.py` | Flask server, route definitions | Usually no changes needed |
| `config.py` | Environment loading | Usually no changes needed |
| `utils/claude_client.py` | Generic Claude API wrapper | Works with any project |
| `utils/file_processor.py` | File content extraction | Add custom file types here |
| `utils/url_fetcher.py` | Web content retrieval | Add custom URL handling |
| `utils/config_loader.py` | YAML configuration parser | Usually no changes needed |
| `static/js/app.js` | Frontend chat logic | Customize UI behavior |
| `templates/index.html` | Main UI template | Customize branding/layout |

---

## Priority Development Tasks

Recommended features to add to this **generalized interface**:

1. **Multiple Project Profiles** - Switch between Claude Projects
   - Save multiple `project_config.yaml` files
   - Project switcher in UI
   - Remember last used project

2. **Session Persistence** - SQLite database for conversation history
   - Schema: sessions, messages, analyses tables  
   - History browsing per project
   - Search across conversations

3. **Project Template Library** - Pre-built configs for common use cases
   - Code review template
   - Document analysis template
   - Research assistant template
   - Content creation template
   - One-click project setup

4. **Export Functionality** - Download conversations and results
   - PDF generation for reports
   - Markdown export for documentation
   - JSON export for data analysis
   - Share conversation links

5. **Advanced File Handling**
   - Drag-and-drop file upload
   - File preview before sending
   - Support for more file types (PPTX, XLSX, images)
   - Batch file processing

6. **UI Enhancements**
   - Dark mode toggle
   - Custom CSS themes per project
   - Conversation branching
   - Response streaming (real-time)
   - Message editing/regeneration

7. **Integration Features**
   - Google Drive file picker
   - Dropbox integration
   - Slack notifications
   - Webhook support for automation

---

## Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [Anthropic Python SDK](https://github.com/anthropics/anthropic-sdk-python)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [PyPDF2 Documentation](https://pypdf2.readthedocs.io/)
- [python-docx Documentation](https://python-docx.readthedocs.io/)
- [Concept Clarity System](../README.md) - Parent project documentation

---

## Quick Reference

```bash
# Daily workflow
source venv/bin/activate    # Activate environment
python app.py              # Start server
# Open: http://127.0.0.1:5000

# Add dependency
pip install package_name
pip freeze > requirements.txt

# Format code
black .
flake8 .

# Run tests
pytest

# Deactivate when done
deactivate
```

---

## API Cost Tracking

**Estimated costs vary by project and usage:**
- Simple chat (no files): ~$0.01-0.05
- Document analysis (1-2 docs): ~$0.10-0.20
- Multi-document analysis (3+ docs): ~$0.20-0.40
- Complex analysis with context: ~$0.30-0.60

**Factors affecting cost:**
- Document length and complexity
- Number of files processed
- Conversation history length
- Project knowledge base size

**Monthly estimates depend on usage:**
- Light usage (10-20 interactions): $2-5
- Moderate usage (50-100 interactions): $10-20
- Heavy usage (200+ interactions): $30-60

Monitor usage in Anthropic Console: https://console.anthropic.com/

**Cost optimization tips:**
- Clear conversation history when starting new topics
- Use smaller context windows when possible
- Process documents in batches
- Limit file sizes

---

**Project Status:** Development  
**Primary Use:** Local MacBook - works with ANY Claude Project  
**Tech Stack:** Python Flask + Anthropic Claude  
**Goal:** Universal chat interface for Claude Projects with configuration-driven customization
