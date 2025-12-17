"""
Flask server for Claude Project Chat Interface.

Main application entry point.
"""

import uuid
from functools import wraps

from flask import Flask, render_template, request, jsonify

from config import Config, ProjectConfig
from utils.claude_client import ClaudeClient
from utils.file_processor import FileProcessor
from utils.url_fetcher import URLFetcher

# Initialize Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = Config.MAX_FILE_SIZE

# Initialize components
project_config = ProjectConfig()
file_processor = FileProcessor()
url_fetcher = URLFetcher()

# Initialize Claude client (lazy - will fail gracefully if no API key)
claude_client = None

# In-memory conversation storage
conversations = {}


def get_claude_client():
    """Get or create Claude client."""
    global claude_client
    if claude_client is None:
        Config.validate()
        claude_client = ClaudeClient(
            api_key=Config.ANTHROPIC_API_KEY,
            project_id=Config.CLAUDE_PROJECT_ID
        )
    return claude_client


def handle_errors(f):
    """Decorator to handle errors in route handlers."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            app.logger.error(f'Error in {f.__name__}: {str(e)}')
            return jsonify({'error': str(e)}), 500
    return decorated_function


# =============================================================================
# Page Routes
# =============================================================================

@app.route('/')
def index():
    """Render main chat interface."""
    return render_template(
        'index.html',
        config=project_config.get('ui', {}),
        project=project_config.get('project', {}),
        prompts=project_config.get_prompts(),
        features=project_config.get('features', {}),
        files_config=project_config.get('files', {})
    )


# =============================================================================
# API Routes
# =============================================================================

@app.route('/api/chat', methods=['POST'])
@handle_errors
def chat():
    """
    Send message to Claude and get response.

    Request JSON:
        message: str - User message
        files: list - Optional list of uploaded file paths
        session_id: str - Session identifier
        prompt_id: str - Optional prompt template ID

    Response JSON:
        response: str - Claude's response
        session_id: str - Session identifier
    """
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    message = data.get('message', '').strip()
    files = data.get('files', [])
    session_id = data.get('session_id') or str(uuid.uuid4())
    prompt_id = data.get('prompt_id')

    # Build full message from template if prompt_id provided
    if prompt_id:
        prompt = project_config.get_prompt_by_id(prompt_id)
        if prompt:
            template = prompt.get('template', '{user_input}')
            message = template.replace('{user_input}', message)

    if not message and not files:
        return jsonify({'error': 'Message or files required'}), 400

    # Get conversation history
    history = conversations.get(session_id, [])

    # Get system context
    system_context = project_config.get('system_context', '')

    # Send to Claude
    client = get_claude_client()
    response_text = client.send_message(
        message=message,
        files=files if files else None,
        conversation_history=history,
        system_context=system_context if system_context else None
    )

    # Update conversation history
    history.append({"role": "user", "content": message})
    history.append({"role": "assistant", "content": response_text})
    conversations[session_id] = history

    return jsonify({
        'response': response_text,
        'session_id': session_id
    })


@app.route('/api/upload', methods=['POST'])
@handle_errors
def upload():
    """
    Upload file for analysis.

    Request: multipart/form-data with 'file' field

    Response JSON:
        filepath: str - Saved file path
        filename: str - Original filename
        size: int - File size in bytes
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Check file extension
    allowed = project_config.get_allowed_extensions()
    if not file_processor.is_allowed_extension(file.filename, allowed):
        return jsonify({
            'error': f'File type not allowed. Allowed: {", ".join(allowed)}'
        }), 400

    # Save file
    filepath, size = file_processor.save_file(file, file.filename)

    return jsonify({
        'filepath': filepath,
        'filename': file.filename,
        'size': size
    })


@app.route('/api/fetch-url', methods=['POST'])
@handle_errors
def fetch_url():
    """
    Fetch content from URL.

    Request JSON:
        url: str - URL to fetch

    Response JSON:
        content: str - Extracted content
        url: str - Original URL
    """
    if not project_config.is_feature_enabled('url_fetching'):
        return jsonify({'error': 'URL fetching is disabled'}), 403

    data = request.json
    if not data or 'url' not in data:
        return jsonify({'error': 'URL required'}), 400

    url = data['url']
    content, error = url_fetcher.fetch(url)

    if error:
        return jsonify({'error': error}), 400

    return jsonify({
        'content': content,
        'url': url
    })


@app.route('/api/prompts', methods=['GET'])
def get_prompts():
    """
    Get available prompt templates.

    Response JSON:
        prompts: list - List of prompt configurations
    """
    return jsonify({
        'prompts': project_config.get_prompts()
    })


@app.route('/api/session/<session_id>', methods=['GET'])
def get_session(session_id):
    """
    Get conversation history for session.

    Response JSON:
        session_id: str - Session identifier
        messages: list - Conversation messages
    """
    history = conversations.get(session_id, [])
    return jsonify({
        'session_id': session_id,
        'messages': history
    })


@app.route('/api/session/<session_id>', methods=['DELETE'])
def clear_session(session_id):
    """
    Clear conversation history for session.

    Response JSON:
        success: bool - Whether session was cleared
    """
    if session_id in conversations:
        del conversations[session_id]
    return jsonify({'success': True})


@app.route('/api/config', methods=['GET'])
def get_config():
    """
    Get current project configuration.

    Response JSON:
        project: dict - Project settings
        ui: dict - UI settings
        features: dict - Feature flags
        files: dict - File settings
    """
    return jsonify({
        'project': project_config.get('project', {}),
        'ui': project_config.get('ui', {}),
        'features': project_config.get('features', {}),
        'files': project_config.get('files', {})
    })


# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == '__main__':
    print(f"\n{'='*50}")
    print(f"  {project_config.get('ui.title', 'Claude Chat')}")
    print(f"  {project_config.get('ui.subtitle', '')}")
    print(f"{'='*50}")
    print(f"\n  Server starting at http://{Config.HOST}:{Config.PORT}")
    print(f"  Press Ctrl+C to stop\n")

    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )
