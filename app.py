"""
Flask server for Claude Project Chat Interface.

Main application entry point.
"""

import os
import uuid
from datetime import datetime
from functools import wraps

# Load environment variables FIRST (before any imports that use them)
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, render_template, request, jsonify

from config import Config, ProjectConfig
from utils.claude_client import ClaudeClient
from utils.claude_web_client import ClaudeWebClient, get_claude_web_client
from utils.file_processor import FileProcessor
from utils.url_fetcher import URLFetcher
from utils.prompt_templates import (
    get_default_templates,
    get_default_categories,
    get_all_templates,
    get_all_categories
)
from utils.prompt_compiler import (
    compile_prompt,
    validate_template_values,
    preview_compiled_prompt,
    extract_variables
)
from utils.port_manager import check_and_handle_port

# Initialize Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = Config.MAX_FILE_SIZE

# Initialize components
project_config = ProjectConfig()
file_processor = FileProcessor()
url_fetcher = URLFetcher()

# Initialize Claude client (lazy - will fail gracefully if no API key/cookie)
claude_client = None
use_web_client = False
preferred_mode = None  # None = auto, 'web' = force web, 'api' = force API

# In-memory conversation storage
conversations = {}


def get_claude_client(force_reinit=False):
    """Get or create Claude client based on preferred mode."""
    global claude_client, use_web_client, preferred_mode

    if claude_client is None or force_reinit:
        claude_client = None  # Reset for reinit

        if preferred_mode == 'api':
            # Force API mode
            Config.validate()
            claude_client = ClaudeClient(
                api_key=Config.ANTHROPIC_API_KEY,
                project_id=Config.CLAUDE_PROJECT_ID
            )
            use_web_client = False
            app.logger.info("Using official Anthropic API (user selected)")
        elif preferred_mode == 'web':
            # Force web mode
            web_client = get_claude_web_client()
            if web_client:
                claude_client = web_client
                use_web_client = True
                app.logger.info("Using Claude Web Client (user selected)")
            else:
                raise ValueError("Web client not available - check your cookie")
        else:
            # Auto mode: Try web client first (for Claude Projects access)
            web_client = get_claude_web_client()
            if web_client:
                claude_client = web_client
                use_web_client = True
                app.logger.info("Using Claude Web Client (claude.ai direct access)")
            else:
                # Fall back to official API
                Config.validate()
                claude_client = ClaudeClient(
                    api_key=Config.ANTHROPIC_API_KEY,
                    project_id=Config.CLAUDE_PROJECT_ID
                )
                use_web_client = False
                app.logger.info("Using official Anthropic API")

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

    # Debug: Log the message to see if underscores are present
    app.logger.info(f"Chat message received (first 500 chars): {message[:500]}")
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

    # Get tool stats if available (web client only)
    tool_stats = None
    if hasattr(client, 'get_tool_stats'):
        tool_stats = client.get_tool_stats()

    # Update conversation history
    history.append({"role": "user", "content": message})
    history.append({"role": "assistant", "content": response_text})
    conversations[session_id] = history

    return jsonify({
        'response': response_text,
        'session_id': session_id,
        'tool_stats': tool_stats
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


@app.route('/api/client-status', methods=['GET'])
def get_client_status():
    """
    Get the current Claude client status.

    Response JSON:
        mode: str - 'web' or 'api'
        connected: bool - Whether client is initialized
        has_api_key: bool - Whether API key is configured
        has_cookie: bool - Whether cookie is configured
        can_switch: bool - Whether user can switch between modes
    """
    # Check what credentials are available
    has_api_key = bool(Config.ANTHROPIC_API_KEY)
    cookie = os.environ.get('CLAUDE_COOKIE', '')
    has_cookie = bool(cookie and 'sessionKey=' in cookie)

    # Initialize client if not already done
    try:
        get_claude_client()
    except Exception as e:
        return jsonify({
            'mode': 'error',
            'connected': False,
            'error': str(e),
            'has_api_key': has_api_key,
            'has_cookie': has_cookie,
            'can_switch': has_api_key and has_cookie
        })

    return jsonify({
        'mode': 'web' if use_web_client else 'api',
        'connected': claude_client is not None,
        'has_api_key': has_api_key,
        'has_cookie': has_cookie,
        'can_switch': has_api_key and has_cookie
    })


@app.route('/api/switch-mode', methods=['POST'])
@handle_errors
def switch_mode():
    """
    Switch between API and Web client modes.

    Request JSON:
        mode: str - 'web' or 'api'

    Response JSON:
        success: bool
        mode: str - New active mode
    """
    global preferred_mode, claude_client

    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    new_mode = data.get('mode')
    if new_mode not in ('web', 'api'):
        return jsonify({'error': 'Mode must be "web" or "api"'}), 400

    # Check if the requested mode is available
    if new_mode == 'api' and not Config.ANTHROPIC_API_KEY:
        return jsonify({'error': 'API key not configured'}), 400

    cookie = os.environ.get('CLAUDE_COOKIE', '')
    if new_mode == 'web' and not (cookie and 'sessionKey=' in cookie):
        return jsonify({'error': 'Cookie not configured'}), 400

    # Set preferred mode and reinitialize client
    preferred_mode = new_mode
    try:
        get_claude_client(force_reinit=True)
    except Exception as e:
        return jsonify({'error': f'Failed to switch mode: {str(e)}'}), 500

    return jsonify({
        'success': True,
        'mode': 'web' if use_web_client else 'api'
    })


@app.route('/api/update-cookie', methods=['POST'])
@handle_errors
def update_cookie():
    """
    Update the Claude.ai cookie for web client authentication.

    Request JSON:
        cookie: str - The new cookie string from claude.ai

    Response JSON:
        success: bool - Whether the update was successful
        mode: str - Current client mode after update
    """
    global claude_client, use_web_client

    data = request.json
    if not data or 'cookie' not in data:
        return jsonify({'error': 'Cookie required'}), 400

    new_cookie = data['cookie'].strip()
    if not new_cookie:
        return jsonify({'error': 'Cookie cannot be empty'}), 400

    # Validate cookie has sessionKey
    if 'sessionKey=' not in new_cookie:
        return jsonify({'error': 'Invalid cookie - missing sessionKey'}), 400

    try:
        # Create new web client with updated cookie
        from utils.claude_web_client import ClaudeWebClient
        import os

        conversation_id = os.getenv('CLAUDE_CONVERSATION_ID')
        new_client = ClaudeWebClient(new_cookie, conversation_id)

        # Test the connection by listing conversations
        conversations = new_client.list_conversations()
        if conversations is None:
            return jsonify({'error': 'Failed to connect with new cookie'}), 400

        # Update the global client
        claude_client = new_client
        use_web_client = True

        # Optionally update .env file
        if data.get('save_to_env', False):
            _update_env_cookie(new_cookie)

        return jsonify({
            'success': True,
            'mode': 'web',
            'conversations_count': len(conversations) if isinstance(conversations, list) else 0
        })

    except Exception as e:
        return jsonify({'error': f'Failed to update cookie: {str(e)}'}), 500


def _update_env_cookie(new_cookie: str):
    """Update the CLAUDE_COOKIE in .env file."""
    import re
    env_path = '.env'

    try:
        with open(env_path, 'r') as f:
            content = f.read()

        # Replace the CLAUDE_COOKIE line
        pattern = r'^CLAUDE_COOKIE=.*$'
        replacement = f'CLAUDE_COOKIE={new_cookie}'
        new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

        with open(env_path, 'w') as f:
            f.write(new_content)

    except Exception as e:
        app.logger.error(f'Failed to update .env: {e}')


@app.route('/api/conversations/new', methods=['POST'])
@handle_errors
def create_new_conversation():
    """
    Create a new conversation (starts fresh chat).

    Request JSON (optional):
        project_uuid: str - Project to create conversation in

    Response JSON:
        success: bool
        conversation_id: str - The new conversation UUID
    """
    global claude_client

    if not use_web_client:
        return jsonify({'error': 'This endpoint requires the web client'}), 400

    client = get_claude_client()

    # Get optional project UUID from request
    data = request.json or {}
    project_uuid = data.get('project_uuid')

    try:
        # Create new conversation on claude.ai (optionally within a project)
        conv_id = client.create_new_conversation(project_uuid)

        # Also clear local session history
        # Generate new session ID for frontend
        new_session_id = str(uuid.uuid4())

        return jsonify({
            'success': True,
            'conversation_id': conv_id,
            'session_id': new_session_id,
            'project_uuid': project_uuid
        })
    except Exception as e:
        return jsonify({'error': f'Failed to create conversation: {str(e)}'}), 500


@app.route('/api/conversations', methods=['GET'])
@handle_errors
def list_conversations():
    """
    List all conversations (web client only).

    Use this to find your project's conversation ID.

    Response JSON:
        conversations: list - List of conversation objects with uuid, name, etc.
        error: str - Error message if not using web client
    """
    if not use_web_client:
        return jsonify({
            'error': 'This endpoint requires the web client. Set CLAUDE_COOKIE in .env',
            'conversations': []
        })

    client = get_claude_client()
    conversations_list = client.list_conversations()

    return jsonify({
        'conversations': conversations_list
    })


@app.route('/api/projects', methods=['GET'])
@handle_errors
def list_projects():
    """
    List all unique Claude Projects from conversations.

    Response JSON:
        projects: list - List of unique project objects with uuid, name
        error: str - Error message if not using web client
    """
    if not use_web_client:
        return jsonify({
            'error': 'This endpoint requires the web client. Set CLAUDE_COOKIE in .env',
            'projects': []
        })

    client = get_claude_client()
    conversations_list = client.list_conversations()

    # Extract unique projects
    projects = {}
    for conv in conversations_list or []:
        project = conv.get('project')
        project_uuid = conv.get('project_uuid')

        if project_uuid and project:
            if project_uuid not in projects:
                # Find the most recent conversation for this project
                projects[project_uuid] = {
                    'uuid': project_uuid,
                    'name': project.get('name', 'Unnamed Project'),
                    'conversation_uuid': conv.get('uuid'),
                    'conversation_name': conv.get('name', 'Untitled'),
                    'updated_at': conv.get('updated_at')
                }

    # Sort by name
    project_list = sorted(projects.values(), key=lambda p: p['name'].lower())

    return jsonify({
        'projects': project_list
    })


@app.route('/api/projects/set-active', methods=['POST'])
@handle_errors
def set_active_project():
    """
    Set the active project and conversation for chatting.

    Request JSON:
        project_uuid: str - The project UUID to activate (None for no project)
        conversation_uuid: str - Optional specific conversation UUID

    Response JSON:
        success: bool
        project: dict - The activated project info
    """
    global claude_client

    if not use_web_client:
        return jsonify({'error': 'This endpoint requires the web client'}), 400

    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    project_uuid = data.get('project_uuid')
    conversation_uuid = data.get('conversation_uuid')

    # Handle "No Project" selection - clear the conversation so a new one is created
    if not project_uuid:
        if claude_client:
            claude_client.set_conversation(None)
        return jsonify({
            'success': True,
            'project_uuid': None,
            'conversation_uuid': None
        })

    # If no conversation specified, find or create one for this project
    if not conversation_uuid:
        client = get_claude_client()
        conversations_list = client.list_conversations()

        # Find most recent conversation in this project
        for conv in conversations_list or []:
            if conv.get('project_uuid') == project_uuid:
                conversation_uuid = conv.get('uuid')
                break

    if not conversation_uuid:
        return jsonify({'error': 'No conversation found for this project'}), 400

    # Update the client's conversation
    claude_client.set_conversation(conversation_uuid)

    return jsonify({
        'success': True,
        'project_uuid': project_uuid,
        'conversation_uuid': conversation_uuid
    })


# =============================================================================
# Template API Routes
# =============================================================================

@app.route('/api/templates', methods=['GET'])
def get_templates():
    """
    Get all available prompt templates (default + custom).

    Custom templates are loaded from custom_prompts.yaml (gitignored).

    Response JSON:
        templates: list - List of template objects
        categories: list - List of category objects
    """
    return jsonify({
        'templates': get_all_templates(),
        'categories': get_all_categories()
    })


@app.route('/api/templates/categories', methods=['GET'])
def get_categories():
    """
    Get all template categories (default + custom).

    Response JSON:
        categories: list - List of category objects
    """
    return jsonify({
        'categories': get_all_categories()
    })


@app.route('/api/templates/compile', methods=['POST'])
@handle_errors
def compile_template():
    """
    Compile a template with variable values.

    Request JSON:
        template: str - Template string with [variable] placeholders
        values: dict - Variable name to value mapping

    Response JSON:
        compiled: str - Compiled prompt text
        unfilled: list - List of unfilled variable names
        hasUnfilled: bool - Whether any variables are unfilled
        characterCount: int - Length of compiled prompt
        estimatedTokens: int - Estimated token count
    """
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    template = data.get('template', '')
    values = data.get('values', {})

    result = preview_compiled_prompt(template, values)
    return jsonify(result)


@app.route('/api/templates/validate', methods=['POST'])
@handle_errors
def validate_template():
    """
    Validate variable values against template requirements.

    Request JSON:
        template: dict - Template definition object
        values: dict - Variable name to value mapping

    Response JSON:
        isValid: bool - Whether all values are valid
        errors: dict - Field name to error message mapping
    """
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    template_def = data.get('template', {})
    values = data.get('values', {})

    result = validate_template_values(template_def, values)
    return jsonify(result.to_dict())


@app.route('/api/templates/extract-variables', methods=['POST'])
@handle_errors
def extract_template_variables():
    """
    Extract variable names from a template string.

    Request JSON:
        template: str - Template string

    Response JSON:
        variables: list - List of variable names found
    """
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    template = data.get('template', '')
    variables = extract_variables(template)

    return jsonify({
        'variables': variables
    })


@app.route('/api/templates/backup', methods=['POST'])
@handle_errors
def backup_templates():
    """
    Backup all templates to server filesystem.

    Request JSON:
        version: str - Backup format version
        backupAt: str - ISO timestamp
        allTemplates: list - All templates (built-in + custom)
        customTemplates: list - Custom templates only
        settings: dict - User settings (favorites, enabled states)

    Response JSON:
        success: bool
        filename: str - Backup filename
    """
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Create backups directory if it doesn't exist
    backups_dir = os.path.join(os.path.dirname(__file__), 'backups')
    os.makedirs(backups_dir, exist_ok=True)

    # Generate timestamped filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'templates_backup_{timestamp}.json'
    filepath = os.path.join(backups_dir, filename)

    # Write backup file
    with open(filepath, 'w') as f:
        import json
        json.dump(data, f, indent=2)

    return jsonify({
        'success': True,
        'filename': filename,
        'path': filepath
    })


# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == '__main__':
    print(f"\n{'='*50}")
    print(f"  {project_config.get('ui.title', 'Prompt Engineering Workbench')}")
    print(f"  {project_config.get('ui.subtitle', '')}")
    print(f"{'='*50}")
    
    # Only check port in main process, not in Flask reloader's child process
    if not os.environ.get('WERKZEUG_RUN_MAIN'):
        if not check_and_handle_port(Config.HOST, Config.PORT):
            print("\nServer startup cancelled.")
            exit(1)
    
    print(f"\n  Server starting at http://{Config.HOST}:{Config.PORT}")
    print(f"  Press Ctrl+C to stop\n")

    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )
