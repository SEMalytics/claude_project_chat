/**
 * Claude Project Chat Interface
 * Frontend JavaScript Application
 */

class ChatInterface {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.uploadedFiles = [];
        this.templateUploadedFiles = [];
        this.isLoading = false;
        this.config = window.APP_CONFIG || {};
        this.activeTab = 'templates';
        this.promptBuilder = null;
        this.snippetManager = new SnippetManager();

        this.init();
    }

    /**
     * Initialize the chat interface
     */
    init() {
        this.bindElements();
        this.bindEvents();
        this.initPromptBuilder();
        this.initTabs();
        this.updatePromptUI();
        this.renderSnippetButtons();
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        this.elements = {
            // Tab elements
            tabTemplates: document.getElementById('tabTemplates'),
            tabSimple: document.getElementById('tabSimple'),
            templateInputSection: document.getElementById('templateInputSection'),
            simpleInputSection: document.getElementById('simpleInputSection'),

            // Simple input elements
            promptSelect: document.getElementById('promptSelect'),
            messageInput: document.getElementById('messageInput'),
            fileInput: document.getElementById('fileInput'),
            dropZone: document.getElementById('dropZone'),
            uploadedFiles: document.getElementById('uploadedFiles'),
            sendBtn: document.getElementById('sendBtn'),
            clearBtn: document.getElementById('clearBtn'),
            fileUploadSection: document.getElementById('fileUploadSection'),

            // Template input elements
            templateFileInput: document.getElementById('templateFileInput'),
            templateDropZone: document.getElementById('templateDropZone'),
            templateUploadedFiles: document.getElementById('templateUploadedFiles'),

            // Shared elements
            chatHistory: document.getElementById('chatHistory'),
            emptyState: document.getElementById('emptyState'),
            loadingIndicator: document.getElementById('loadingIndicator'),

            // Quick input elements
            quickInputSection: document.getElementById('quickInputSection'),
            quickInputForm: document.getElementById('quickInputForm'),
            quickInput: document.getElementById('quickInput'),
            quickSendBtn: document.getElementById('quickSendBtn')
        };
    }

    /**
     * Initialize prompt builder
     */
    initPromptBuilder() {
        if (typeof PromptBuilder !== 'undefined') {
            this.promptBuilder = new PromptBuilder({
                containerId: 'promptBuilder',
                onSubmit: (compiledPrompt, metadata) => {
                    this.sendTemplateMessage(compiledPrompt, metadata);
                }
            });

            // Initialize template settings after promptBuilder is ready
            if (typeof TemplateSettings !== 'undefined') {
                // Wait for templates to load before initializing settings
                setTimeout(() => {
                    this.templateSettings = new TemplateSettings(this.promptBuilder);

                    // Initialize project manager UI after settings
                    if (this.templateSettings.projectManager) {
                        this.templateSettings.projectManager.initialize();
                        // Make project manager globally accessible for startNewChat
                        window.projectManager = this.templateSettings.projectManager;
                    }

                    // Check connection status to update UI (title, project selector visibility)
                    this.templateSettings.checkConnectionStatus();
                }, 500);
            }
        }
    }

    /**
     * Initialize tab functionality
     */
    initTabs() {
        const tabs = [this.elements.tabTemplates, this.elements.tabSimple];

        tabs.forEach(tab => {
            if (tab) {
                tab.addEventListener('click', () => {
                    const tabName = tab.id === 'tabTemplates' ? 'templates' : 'simple';
                    this.switchTab(tabName);
                });
            }
        });
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        this.activeTab = tabName;

        // Update tab styles
        const tabs = {
            templates: this.elements.tabTemplates,
            simple: this.elements.tabSimple
        };

        Object.entries(tabs).forEach(([name, tab]) => {
            if (tab) {
                if (name === tabName) {
                    tab.classList.add('border-blue-600', 'text-blue-600');
                    tab.classList.remove('border-transparent', 'text-gray-500');
                } else {
                    tab.classList.remove('border-blue-600', 'text-blue-600');
                    tab.classList.add('border-transparent', 'text-gray-500');
                }
            }
        });

        // Show/hide sections
        if (tabName === 'templates') {
            this.elements.templateInputSection?.classList.remove('hidden');
            this.elements.simpleInputSection?.classList.add('hidden');
        } else {
            this.elements.templateInputSection?.classList.add('hidden');
            this.elements.simpleInputSection?.classList.remove('hidden');
        }
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Send button (simple mode)
        if (this.elements.sendBtn) {
            this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Enter key to send (Ctrl+Enter or Cmd+Enter)
        if (this.elements.messageInput) {
            this.elements.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Clear button
        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener('click', () => this.clearChat());
        }

        // New Chat button
        const newChatBtn = document.getElementById('newChatBtn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => this.startNewChat());
        }

        // Prompt selection change
        if (this.elements.promptSelect) {
            this.elements.promptSelect.addEventListener('change', () => this.updatePromptUI());
        }

        // Simple mode file upload
        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelect(e, 'simple'));
        }

        // Simple mode drag and drop
        if (this.elements.dropZone) {
            this.elements.dropZone.addEventListener('click', () => this.elements.fileInput?.click());
            this.elements.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e, this.elements.dropZone));
            this.elements.dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e, this.elements.dropZone));
            this.elements.dropZone.addEventListener('drop', (e) => this.handleDrop(e, 'simple'));
        }

        // Template mode file upload
        if (this.elements.templateFileInput) {
            this.elements.templateFileInput.addEventListener('change', (e) => this.handleFileSelect(e, 'template'));
        }

        // Template mode drag and drop
        if (this.elements.templateDropZone) {
            this.elements.templateDropZone.addEventListener('click', () => this.elements.templateFileInput?.click());
            this.elements.templateDropZone.addEventListener('dragover', (e) => this.handleDragOver(e, this.elements.templateDropZone));
            this.elements.templateDropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e, this.elements.templateDropZone));
            this.elements.templateDropZone.addEventListener('drop', (e) => this.handleDrop(e, 'template'));
        }

        // Quick input form
        if (this.elements.quickInputForm) {
            this.elements.quickInputForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendQuickMessage();
            });
        }

        // Quick input Enter key
        if (this.elements.quickInput) {
            this.elements.quickInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendQuickMessage();
                }
            });
        }

        // Snippet buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('snippet-btn')) {
                this.appendSnippet(e.target.dataset.snippet);
            }
        });

        // Snippet management modal
        const manageSnippetsBtn = document.getElementById('manageSnippetsBtn');
        if (manageSnippetsBtn) {
            manageSnippetsBtn.addEventListener('click', () => this.openSnippetModal());
        }

        const closeSnippetModal = document.getElementById('closeSnippetModal');
        if (closeSnippetModal) {
            closeSnippetModal.addEventListener('click', () => this.closeSnippetModal());
        }

        const closeSnippetModalBtn = document.getElementById('closeSnippetModalBtn');
        if (closeSnippetModalBtn) {
            closeSnippetModalBtn.addEventListener('click', () => this.closeSnippetModal());
        }

        const addSnippetBtn = document.getElementById('addSnippetBtn');
        if (addSnippetBtn) {
            addSnippetBtn.addEventListener('click', () => this.addSnippet());
        }

        const newSnippetInput = document.getElementById('newSnippetInput');
        if (newSnippetInput) {
            newSnippetInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addSnippet();
                }
            });
        }

        const resetSnippetsBtn = document.getElementById('resetSnippetsBtn');
        if (resetSnippetsBtn) {
            resetSnippetsBtn.addEventListener('click', () => this.resetSnippets());
        }
    }

    /**
     * Append snippet to active snippets list
     */
    appendSnippet(snippetText) {
        if (!this.activeSnippets) {
            this.activeSnippets = [];
        }
        
        if (!this.activeSnippets.includes(snippetText)) {
            this.activeSnippets.push(snippetText);
            this.updateSnippetDisplay();
        }
    }

    /**
     * Update snippet display
     */
    updateSnippetDisplay() {
        const snippetBtns = document.querySelectorAll('.snippet-btn');
        snippetBtns.forEach(btn => {
            if (this.activeSnippets && this.activeSnippets.includes(btn.dataset.snippet)) {
                btn.classList.add('bg-blue-500', 'text-white');
                btn.classList.remove('bg-gray-200', 'text-gray-700');
            } else {
                btn.classList.remove('bg-blue-500', 'text-white');
                btn.classList.add('bg-gray-200', 'text-gray-700');
            }
        });
    }

    /**
     * Clear active snippets
     */
    clearSnippets() {
        this.activeSnippets = [];
        this.updateSnippetDisplay();
    }

    /**
     * Show the quick input section
     */
    showQuickInput() {
        if (this.elements.quickInputSection) {
            this.elements.quickInputSection.classList.remove('hidden');
        }
    }

    /**
     * Hide the quick input section
     */
    hideQuickInput() {
        if (this.elements.quickInputSection) {
            this.elements.quickInputSection.classList.add('hidden');
        }
    }

    /**
     * Send a quick follow-up message
     */
    async sendQuickMessage() {
        let message = this.elements.quickInput?.value?.trim();
        if (!message || this.isLoading) return;

        // Append active snippets
        if (this.activeSnippets && this.activeSnippets.length > 0) {
            message += '\n\n' + this.activeSnippets.join('\n');
        }

        // Add user message to chat
        this.addMessage('user', message);

        // Clear input and snippets
        this.elements.quickInput.value = '';
        this.clearSnippets();

        // Hide empty state
        this.elements.emptyState?.classList.add('hidden');

        this.setLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    session_id: this.sessionId,
                    files: []
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get response');
            }

            // Show tool stats if available
            if (data.tool_stats) {
                this.showToolStats(data.tool_stats);
            }

            // Add assistant response to chat
            this.addMessage('assistant', data.response, [], null, data.tool_stats);

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
     * Update UI based on selected prompt
     */
    updatePromptUI() {
        if (!this.elements.promptSelect) return;

        const selected = this.elements.promptSelect.selectedOptions[0];
        if (!selected) return;

        const placeholder = selected.dataset.placeholder || 'Enter your message...';

        // Update placeholder
        if (this.elements.messageInput) {
            this.elements.messageInput.placeholder = placeholder;
        }
    }

    /**
     * Handle file selection
     */
    handleFileSelect(event, mode = 'simple') {
        const files = Array.from(event.target.files);
        this.processFiles(files, mode);
    }

    /**
     * Handle drag over
     */
    handleDragOver(event, dropZone) {
        event.preventDefault();
        event.stopPropagation();
        dropZone?.classList.add('border-blue-500', 'bg-blue-50');
    }

    /**
     * Handle drag leave
     */
    handleDragLeave(event, dropZone) {
        event.preventDefault();
        event.stopPropagation();
        dropZone?.classList.remove('border-blue-500', 'bg-blue-50');
    }

    /**
     * Handle file drop
     */
    handleDrop(event, mode = 'simple') {
        event.preventDefault();
        event.stopPropagation();

        const dropZone = mode === 'template' ? this.elements.templateDropZone : this.elements.dropZone;
        dropZone?.classList.remove('border-blue-500', 'bg-blue-50');

        const files = Array.from(event.dataTransfer.files);
        this.processFiles(files, mode);
    }

    /**
     * Process and upload files
     */
    async processFiles(files, mode = 'simple') {
        const maxFiles = this.config.files?.max_files || 5;
        const targetFiles = mode === 'template' ? this.templateUploadedFiles : this.uploadedFiles;

        if (targetFiles.length + files.length > maxFiles) {
            this.showError(`Maximum ${maxFiles} files allowed`);
            return;
        }

        for (const file of files) {
            await this.uploadFile(file, mode);
        }
    }

    /**
     * Upload a single file
     */
    async uploadFile(file, mode = 'simple') {
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

            const fileInfo = {
                filepath: data.filepath,
                filename: data.filename,
                size: data.size
            };

            if (mode === 'template') {
                this.templateUploadedFiles.push(fileInfo);
                this.renderUploadedFiles('template');
            } else {
                this.uploadedFiles.push(fileInfo);
                this.renderUploadedFiles('simple');
            }

        } catch (error) {
            this.showError(`Failed to upload ${file.name}: ${error.message}`);
        }
    }

    /**
     * Render uploaded files list
     */
    renderUploadedFiles(mode = 'simple') {
        const files = mode === 'template' ? this.templateUploadedFiles : this.uploadedFiles;
        const container = mode === 'template' ? this.elements.templateUploadedFiles : this.elements.uploadedFiles;

        if (!container) return;

        if (files.length === 0) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        container.innerHTML = files.map((file, index) => `
            <div class="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                <div class="flex items-center gap-2">
                    <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span class="text-sm text-gray-700">${file.filename}</span>
                    <span class="text-xs text-gray-400">(${this.formatFileSize(file.size)})</span>
                </div>
                <button onclick="chatInterface.removeFile(${index}, '${mode}')"
                        class="text-red-500 hover:text-red-700">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        `).join('');
    }

    /**
     * Remove uploaded file
     */
    removeFile(index, mode = 'simple') {
        if (mode === 'template') {
            this.templateUploadedFiles.splice(index, 1);
            this.renderUploadedFiles('template');
        } else {
            this.uploadedFiles.splice(index, 1);
            this.renderUploadedFiles('simple');
        }
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
     * Send message from template mode
     */
    async sendTemplateMessage(compiledPrompt, metadata = {}) {
        if (this.isLoading) return;

        const files = this.templateUploadedFiles.map(f => f.filepath);

        // Append active snippets
        if (this.activeSnippets && this.activeSnippets.length > 0) {
            compiledPrompt += '\n\n' + this.activeSnippets.join('\n');
        }

        // Debug: Log exactly what's being sent
        console.log('[ChatInterface] Sending compiled prompt:', {
            prompt: compiledPrompt,
            promptLength: compiledPrompt.length,
            containsMarkdownLink: /\[([^\]]*)\]\(([^)]+)\)/.test(compiledPrompt),
            containsUnderscores: /__/.test(compiledPrompt)
        });

        // Show loading state
        this.setLoading(true);
        this.hideEmptyState();

        // Add user message to chat
        this.addMessage('user', compiledPrompt, files, metadata.templateName);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: compiledPrompt,
                    files,
                    session_id: this.sessionId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get response');
            }

            // Show tool stats if available
            if (data.tool_stats) {
                this.showToolStats(data.tool_stats);
            }

            // Add assistant response to chat
            this.addMessage('assistant', data.response, [], null, data.tool_stats);

            // Clear template files and snippets
            this.templateUploadedFiles = [];
            this.renderUploadedFiles('template');
            this.clearSnippets();

            // Clear the prompt builder form
            if (this.promptBuilder) {
                this.promptBuilder.clearForm();
            }

            // Show quick input for follow-ups
            this.showQuickInput();

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
     * Send message from simple mode
     */
    async sendMessage() {
        if (this.isLoading) return;

        const message = this.elements.messageInput?.value?.trim() || '';
        const promptId = this.elements.promptSelect?.value;
        const files = this.uploadedFiles.map(f => f.filepath);

        // Validate input
        const selected = this.elements.promptSelect?.selectedOptions[0];
        const requiresFiles = selected?.dataset.requiresFiles === 'true';
        const minFiles = parseInt(selected?.dataset.minFiles) || 0;

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

            // Show tool stats if available
            if (data.tool_stats) {
                this.showToolStats(data.tool_stats);
            }

            // Add assistant response to chat
            this.addMessage('assistant', data.response, [], null, data.tool_stats);

            // Clear input
            if (this.elements.messageInput) {
                this.elements.messageInput.value = '';
            }
            this.uploadedFiles = [];
            this.renderUploadedFiles('simple');

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
    addMessage(role, content, files = [], templateName = null, toolStats = null) {
        const isUser = role === 'user';

        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${isUser ? 'justify-end' : 'justify-start'} ${role}-message`;

        const contentDiv = document.createElement('div');
        contentDiv.className = `max-w-[80%] rounded-lg p-4 ${
            isUser
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800'
        }`;

        // Add header with role label and copy button for assistant
        const headerDiv = document.createElement('div');
        headerDiv.className = 'flex items-center justify-between mb-1';

        const roleLabel = document.createElement('span');
        roleLabel.className = `text-xs font-medium ${isUser ? 'text-blue-200' : 'text-gray-500'}`;
        roleLabel.textContent = isUser ? 'You' : 'Claude';
        headerDiv.appendChild(roleLabel);

        // Add copy button for assistant messages
        if (!isUser) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors';
            copyBtn.innerHTML = `
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                <span>Copy</span>
            `;
            copyBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(content);
                    copyBtn.innerHTML = `
                        <svg class="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span class="text-green-500">Copied!</span>
                    `;
                    setTimeout(() => {
                        copyBtn.innerHTML = `
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                            <span>Copy</span>
                        `;
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                }
            };
            headerDiv.appendChild(copyBtn);
        }

        contentDiv.appendChild(headerDiv);

        // Add template name for user messages if available
        if (isUser && templateName) {
            const templateDiv = document.createElement('div');
            templateDiv.className = 'text-xs mb-2 opacity-75';
            templateDiv.innerHTML = `<span class="bg-blue-500 px-1.5 py-0.5 rounded text-xs">${templateName}</span>`;
            contentDiv.appendChild(templateDiv);
        }

        // Add file indicators for user messages
        if (isUser && files.length > 0) {
            const filesDiv = document.createElement('div');
            filesDiv.className = 'text-xs mb-2 opacity-75';
            filesDiv.textContent = `📎 ${files.length} file(s) attached`;
            contentDiv.appendChild(filesDiv);
        }

        // Add tool stats for assistant messages
        if (!isUser && toolStats && (toolStats.web_fetch > 0 || toolStats.web_search > 0)) {
            const statsDiv = document.createElement('div');
            statsDiv.className = 'text-xs mb-2 text-gray-500 flex gap-3';
            const parts = [];
            if (toolStats.web_fetch > 0) {
                parts.push(`🌐 ${toolStats.web_fetch} page${toolStats.web_fetch > 1 ? 's' : ''} fetched`);
            }
            if (toolStats.web_search > 0) {
                parts.push(`🔍 ${toolStats.web_search} search${toolStats.web_search > 1 ? 'es' : ''}`);
            }
            statsDiv.textContent = parts.join(' • ');
            contentDiv.appendChild(statsDiv);
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
        this.templateUploadedFiles = [];
        this.renderUploadedFiles('simple');
        this.renderUploadedFiles('template');

        // Clear inputs
        if (this.elements.messageInput) {
            this.elements.messageInput.value = '';
        }

        // Clear prompt builder
        if (this.promptBuilder) {
            this.promptBuilder.clearForm();
        }
    }

    /**
     * Start a new chat (creates new conversation on claude.ai)
     */
    async startNewChat() {
        if (this.isLoading) return;

        try {
            // Get active project UUID if any
            const projectUuid = window.projectManager?.activeProject || null;

            // Create new conversation on server (within project if one is active)
            const response = await fetch('/api/conversations/new', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_uuid: projectUuid })
            });

            const data = await response.json();

            if (data.success) {
                // Clear local UI
                this.elements.chatHistory.innerHTML = '';
                this.showEmptyState();

                // Use new session ID from server
                this.sessionId = data.session_id || this.generateSessionId();

                // Clear files
                this.uploadedFiles = [];
                this.templateUploadedFiles = [];
                this.renderUploadedFiles('simple');
                this.renderUploadedFiles('template');

                // Clear inputs
                if (this.elements.messageInput) {
                    this.elements.messageInput.value = '';
                }

                // Clear prompt builder
                if (this.promptBuilder) {
                    this.promptBuilder.clearForm();
                }

                // Hide quick input (template not submitted yet)
                this.hideQuickInput();

                // Show success notification
                this.showNotification('New chat started', 'success');
            } else {
                this.showNotification(data.error || 'Failed to start new chat', 'error');
            }
        } catch (error) {
            console.error('Failed to start new chat:', error);
            this.showNotification('Failed to start new chat', 'error');
        }
    }

    /**
     * Show notification toast
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white z-50 transition-opacity duration-300 ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
        }`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
        this.isLoading = loading;

        if (this.elements.sendBtn) {
            this.elements.sendBtn.disabled = loading;
        }

        if (loading) {
            this.elements.loadingIndicator?.classList.remove('hidden');
            this.startProgressAnimation();
        } else {
            this.elements.loadingIndicator?.classList.add('hidden');
            this.stopProgressAnimation();
        }
    }

    /**
     * Start progress bar animation
     */
    startProgressAnimation() {
        const progressBar = document.getElementById('progressBar');
        const loadingText = document.getElementById('loadingText');
        const toolProgress = document.getElementById('toolProgress');

        if (progressBar) {
            progressBar.style.width = '0%';
        }

        // Reset tool counts
        this.updateToolCounts(0, 0);
        toolProgress?.classList.add('hidden');

        // Animate progress bar
        let progress = 0;
        const messages = [
            'Claude is thinking...',
            'Analyzing your request...',
            'Processing...',
            'Gathering information...',
            'Almost there...'
        ];
        let messageIndex = 0;

        this.progressInterval = setInterval(() => {
            // Slowly increment progress (never reaches 100%)
            if (progress < 90) {
                progress += Math.random() * 5;
                if (progressBar) {
                    progressBar.style.width = `${Math.min(progress, 90)}%`;
                }
            }

            // Cycle through messages
            messageIndex = (messageIndex + 1) % messages.length;
            if (loadingText) {
                loadingText.textContent = messages[messageIndex];
            }
        }, 2000);
    }

    /**
     * Stop progress bar animation
     */
    stopProgressAnimation() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }

        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = '100%';
            setTimeout(() => {
                progressBar.style.width = '0%';
            }, 500);
        }
    }

    /**
     * Update tool execution counts in the UI
     */
    updateToolCounts(fetches, searches) {
        const fetchCount = document.getElementById('fetchCount');
        const searchCount = document.getElementById('searchCount');
        const toolProgress = document.getElementById('toolProgress');

        if (fetchCount) fetchCount.textContent = `🌐 Fetches: ${fetches}`;
        if (searchCount) searchCount.textContent = `🔍 Searches: ${searches}`;

        // Show tool progress if any tools were used
        if ((fetches > 0 || searches > 0) && toolProgress) {
            toolProgress.classList.remove('hidden');
        }
    }

    /**
     * Display tool stats after response
     */
    showToolStats(stats) {
        if (!stats) return;

        const fetches = stats.web_fetch || 0;
        const searches = stats.web_search || 0;

        if (fetches > 0 || searches > 0) {
            this.updateToolCounts(fetches, searches);
        }
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        this.elements.emptyState?.classList.remove('hidden');
    }

    /**
     * Hide empty state
     */
    hideEmptyState() {
        this.elements.emptyState?.classList.add('hidden');
    }

    /**
     * Render snippet buttons
     */
    renderSnippetButtons() {
        const container = document.getElementById('snippetButtonsContainer');
        if (!container) return;

        const snippets = this.snippetManager.getAll();
        container.innerHTML = snippets.map(snippet => `
            <button type="button" class="snippet-btn px-3 py-1.5 text-sm bg-white hover:bg-blue-500 hover:text-white border border-blue-300 text-gray-700 rounded transition-colors" data-snippet="${this.escapeHtml(snippet)}">
                ${this.escapeHtml(snippet)}
            </button>
        `).join('');
    }

    /**
     * Open snippet management modal
     */
    openSnippetModal() {
        const modal = document.getElementById('snippetModal');
        if (modal) {
            modal.classList.remove('hidden');
            this.renderSnippetList();
        }
    }

    /**
     * Close snippet management modal
     */
    closeSnippetModal() {
        const modal = document.getElementById('snippetModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        const input = document.getElementById('newSnippetInput');
        if (input) {
            input.value = '';
        }
    }

    /**
     * Render snippet list in modal
     */
    renderSnippetList() {
        const container = document.getElementById('snippetList');
        if (!container) return;

        const snippets = this.snippetManager.getAll();
        
        if (snippets.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">No snippets yet. Add one above!</p>';
            return;
        }

        container.innerHTML = snippets.map((snippet, index) => `
            <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <div class="flex flex-col gap-1">
                    <button class="snippet-move-up text-gray-400 hover:text-blue-600 ${index === 0 ? 'invisible' : ''}" data-snippet="${this.escapeHtml(snippet)}">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                        </svg>
                    </button>
                    <button class="snippet-move-down text-gray-400 hover:text-blue-600 ${index === snippets.length - 1 ? 'invisible' : ''}" data-snippet="${this.escapeHtml(snippet)}">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>
                </div>
                <input type="text" class="snippet-edit-input flex-1 px-2 py-1 text-sm border border-gray-300 rounded" value="${this.escapeHtml(snippet)}" data-original="${this.escapeHtml(snippet)}">
                <button class="snippet-delete text-red-500 hover:text-red-700" data-snippet="${this.escapeHtml(snippet)}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        `).join('');

        // Add event listeners for edit, delete, and move
        container.querySelectorAll('.snippet-edit-input').forEach(input => {
            input.addEventListener('blur', (e) => this.updateSnippet(e.target));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        });

        container.querySelectorAll('.snippet-delete').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteSnippet(btn.dataset.snippet));
        });

        container.querySelectorAll('.snippet-move-up').forEach(btn => {
            btn.addEventListener('click', (e) => this.moveSnippetUp(btn.dataset.snippet));
        });

        container.querySelectorAll('.snippet-move-down').forEach(btn => {
            btn.addEventListener('click', (e) => this.moveSnippetDown(btn.dataset.snippet));
        });
    }

    /**
     * Add new snippet
     */
    addSnippet() {
        const input = document.getElementById('newSnippetInput');
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;

        try {
            this.snippetManager.add(text);
            input.value = '';
            this.renderSnippetList();
            this.renderSnippetButtons();
            this.showNotification('Snippet added', 'success');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    /**
     * Update snippet
     */
    updateSnippet(inputElement) {
        const oldText = inputElement.dataset.original;
        const newText = inputElement.value.trim();

        if (newText === oldText) return;

        try {
            this.snippetManager.update(oldText, newText);
            inputElement.dataset.original = newText;
            this.renderSnippetButtons();
            this.showNotification('Snippet updated', 'success');
        } catch (error) {
            this.showNotification(error.message, 'error');
            inputElement.value = oldText;
        }
    }

    /**
     * Delete snippet
     */
    deleteSnippet(snippetText) {
        if (!confirm(`Delete snippet: "${snippetText}"?`)) return;

        try {
            this.snippetManager.delete(snippetText);
            this.renderSnippetList();
            this.renderSnippetButtons();
            this.showNotification('Snippet deleted', 'success');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    /**
     * Move snippet up
     */
    moveSnippetUp(snippetText) {
        if (this.snippetManager.moveUp(snippetText)) {
            this.renderSnippetList();
            this.renderSnippetButtons();
        }
    }

    /**
     * Move snippet down
     */
    moveSnippetDown(snippetText) {
        if (this.snippetManager.moveDown(snippetText)) {
            this.renderSnippetList();
            this.renderSnippetButtons();
        }
    }

    /**
     * Reset snippets to defaults
     */
    resetSnippets() {
        if (!confirm('Reset all snippets to defaults? This will delete your custom snippets.')) return;

        this.snippetManager.reset();
        this.renderSnippetList();
        this.renderSnippetButtons();
        this.showNotification('Snippets reset to defaults', 'success');
    }

    /**
     * Escape HTML for safe rendering
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        if (this.elements.chatHistory) {
            this.elements.chatHistory.scrollTop = this.elements.chatHistory.scrollHeight;
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        // Create error toast
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('animate-fade-out');
            setTimeout(() => toast.remove(), 300);
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
