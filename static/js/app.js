/**
 * Claude Project Chat Interface
 * Frontend JavaScript Application
 */

class ChatInterface {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.uploadedFiles = [];
        this.isLoading = false;
        this.config = window.APP_CONFIG || {};

        this.init();
    }

    /**
     * Initialize the chat interface
     */
    init() {
        this.bindElements();
        this.bindEvents();
        this.updatePromptUI();
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        this.elements = {
            promptSelect: document.getElementById('promptSelect'),
            messageInput: document.getElementById('messageInput'),
            fileInput: document.getElementById('fileInput'),
            dropZone: document.getElementById('dropZone'),
            uploadedFiles: document.getElementById('uploadedFiles'),
            sendBtn: document.getElementById('sendBtn'),
            clearBtn: document.getElementById('clearBtn'),
            chatHistory: document.getElementById('chatHistory'),
            emptyState: document.getElementById('emptyState'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            fileUploadSection: document.getElementById('fileUploadSection')
        };
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Send button
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());

        // Enter key to send (Ctrl+Enter or Cmd+Enter)
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Clear button
        this.elements.clearBtn.addEventListener('click', () => this.clearChat());

        // Prompt selection change
        this.elements.promptSelect.addEventListener('change', () => this.updatePromptUI());

        // File upload
        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Drag and drop
        if (this.elements.dropZone) {
            this.elements.dropZone.addEventListener('click', () => this.elements.fileInput.click());
            this.elements.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.elements.dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            this.elements.dropZone.addEventListener('drop', (e) => this.handleDrop(e));
        }
    }

    /**
     * Update UI based on selected prompt
     */
    updatePromptUI() {
        const selected = this.elements.promptSelect.selectedOptions[0];
        if (!selected) return;

        const requiresFiles = selected.dataset.requiresFiles === 'true';
        const requiresUrl = selected.dataset.requiresUrl === 'true';
        const placeholder = selected.dataset.placeholder || 'Enter your message...';

        // Update placeholder
        this.elements.messageInput.placeholder = placeholder;

        // Show/hide file upload section based on prompt requirements
        if (this.elements.fileUploadSection) {
            if (requiresFiles) {
                this.elements.fileUploadSection.classList.remove('hidden');
            }
        }
    }

    /**
     * Handle file selection
     */
    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        this.processFiles(files);
    }

    /**
     * Handle drag over
     */
    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        this.elements.dropZone.classList.add('border-blue-500', 'bg-blue-50');
    }

    /**
     * Handle drag leave
     */
    handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        this.elements.dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    }

    /**
     * Handle file drop
     */
    handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        this.elements.dropZone.classList.remove('border-blue-500', 'bg-blue-50');

        const files = Array.from(event.dataTransfer.files);
        this.processFiles(files);
    }

    /**
     * Process and upload files
     */
    async processFiles(files) {
        const maxFiles = this.config.files?.max_files || 5;

        if (this.uploadedFiles.length + files.length > maxFiles) {
            this.showError(`Maximum ${maxFiles} files allowed`);
            return;
        }

        for (const file of files) {
            await this.uploadFile(file);
        }
    }

    /**
     * Upload a single file
     */
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            this.uploadedFiles.push({
                filepath: data.filepath,
                filename: data.filename,
                size: data.size
            });

            this.renderUploadedFiles();

        } catch (error) {
            this.showError(`Failed to upload ${file.name}: ${error.message}`);
        }
    }

    /**
     * Render uploaded files list
     */
    renderUploadedFiles() {
        if (this.uploadedFiles.length === 0) {
            this.elements.uploadedFiles.classList.add('hidden');
            return;
        }

        this.elements.uploadedFiles.classList.remove('hidden');
        this.elements.uploadedFiles.innerHTML = this.uploadedFiles.map((file, index) => `
            <div class="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div class="flex items-center gap-2">
                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span class="text-sm text-gray-700">${file.filename}</span>
                    <span class="text-xs text-gray-400">(${this.formatFileSize(file.size)})</span>
                </div>
                <button onclick="chatInterface.removeFile(${index})"
                        class="text-red-500 hover:text-red-700">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        `).join('');
    }

    /**
     * Remove uploaded file
     */
    removeFile(index) {
        this.uploadedFiles.splice(index, 1);
        this.renderUploadedFiles();
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    /**
     * Send message to Claude
     */
    async sendMessage() {
        if (this.isLoading) return;

        const message = this.elements.messageInput.value.trim();
        const promptId = this.elements.promptSelect.value;
        const files = this.uploadedFiles.map(f => f.filepath);

        // Validate input
        const selected = this.elements.promptSelect.selectedOptions[0];
        const requiresFiles = selected.dataset.requiresFiles === 'true';
        const minFiles = parseInt(selected.dataset.minFiles) || 0;

        if (!message && files.length === 0) {
            this.showError('Please enter a message or upload files');
            return;
        }

        if (requiresFiles && files.length < minFiles) {
            this.showError(`This prompt requires at least ${minFiles} file(s)`);
            return;
        }

        // Show loading state
        this.setLoading(true);
        this.hideEmptyState();

        // Add user message to chat
        this.addMessage('user', message, files);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    files,
                    session_id: this.sessionId,
                    prompt_id: promptId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get response');
            }

            // Add assistant response to chat
            this.addMessage('assistant', data.response);

            // Clear input
            this.elements.messageInput.value = '';
            this.uploadedFiles = [];
            this.renderUploadedFiles();

        } catch (error) {
            this.showError(`Error: ${error.message}`);
            // Remove the user message if request failed
            const lastMessage = this.elements.chatHistory.lastElementChild;
            if (lastMessage && lastMessage.classList.contains('user-message')) {
                lastMessage.remove();
            }
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Add message to chat history
     */
    addMessage(role, content, files = []) {
        const isUser = role === 'user';

        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${isUser ? 'justify-end' : 'justify-start'} ${role}-message`;

        const contentDiv = document.createElement('div');
        contentDiv.className = `max-w-[80%] rounded-lg p-4 ${
            isUser
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800'
        }`;

        // Add role label
        const roleLabel = document.createElement('div');
        roleLabel.className = `text-xs font-medium mb-1 ${isUser ? 'text-blue-200' : 'text-gray-500'}`;
        roleLabel.textContent = isUser ? 'You' : 'Claude';
        contentDiv.appendChild(roleLabel);

        // Add file indicators for user messages
        if (isUser && files.length > 0) {
            const filesDiv = document.createElement('div');
            filesDiv.className = 'text-xs mb-2 opacity-75';
            filesDiv.textContent = `📎 ${files.length} file(s) attached`;
            contentDiv.appendChild(filesDiv);
        }

        // Add message content
        const textDiv = document.createElement('div');
        textDiv.className = 'whitespace-pre-wrap break-words';

        if (isUser) {
            textDiv.textContent = content;
        } else {
            // Parse markdown-like content for assistant messages
            textDiv.innerHTML = this.formatResponse(content);
        }

        contentDiv.appendChild(textDiv);
        messageDiv.appendChild(contentDiv);

        this.elements.chatHistory.appendChild(messageDiv);
        this.scrollToBottom();
    }

    /**
     * Format assistant response with basic markdown
     */
    formatResponse(text) {
        // Escape HTML
        let formatted = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Headers
        formatted = formatted.replace(/^### (.+)$/gm, '<h3 class="font-bold text-lg mt-3 mb-1">$1</h3>');
        formatted = formatted.replace(/^## (.+)$/gm, '<h2 class="font-bold text-xl mt-4 mb-2">$1</h2>');
        formatted = formatted.replace(/^# (.+)$/gm, '<h1 class="font-bold text-2xl mt-4 mb-2">$1</h1>');

        // Bold and italic
        formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Code blocks
        formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g,
            '<pre class="bg-gray-800 text-gray-100 p-3 rounded mt-2 mb-2 overflow-x-auto"><code>$2</code></pre>');

        // Inline code
        formatted = formatted.replace(/`([^`]+)`/g,
            '<code class="bg-gray-200 text-gray-800 px-1 rounded">$1</code>');

        // Lists
        formatted = formatted.replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>');
        formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4">$2</li>');

        return formatted;
    }

    /**
     * Clear chat history
     */
    async clearChat() {
        if (this.isLoading) return;

        try {
            await fetch(`/api/session/${this.sessionId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('Failed to clear session:', error);
        }

        // Clear UI
        this.elements.chatHistory.innerHTML = '';
        this.showEmptyState();

        // Generate new session
        this.sessionId = this.generateSessionId();

        // Clear files
        this.uploadedFiles = [];
        this.renderUploadedFiles();

        // Clear input
        this.elements.messageInput.value = '';
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
        this.isLoading = loading;
        this.elements.sendBtn.disabled = loading;

        if (loading) {
            this.elements.loadingIndicator.classList.remove('hidden');
        } else {
            this.elements.loadingIndicator.classList.add('hidden');
        }
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        if (this.elements.emptyState) {
            this.elements.emptyState.classList.remove('hidden');
        }
    }

    /**
     * Hide empty state
     */
    hideEmptyState() {
        if (this.elements.emptyState) {
            this.elements.emptyState.classList.add('hidden');
        }
    }

    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        this.elements.chatHistory.scrollTop = this.elements.chatHistory.scrollHeight;
    }

    /**
     * Show error message
     */
    showError(message) {
        // Create error toast
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Initialize chat interface
const chatInterface = new ChatInterface();
