/**
 * Prompt Builder - Dynamic Template System
 *
 * Provides a complete UI for selecting, filling, and submitting
 * prompt templates with variable inputs.
 */

// =============================================================================
// Template Storage Service (localStorage)
// =============================================================================

class TemplateStorage {
    constructor() {
        this.STORAGE_KEY = 'claude_chat_templates';
        this.FAVORITES_KEY = 'claude_chat_favorites';
        this.USE_COUNTS_KEY = 'claude_chat_use_counts';
        this.ENABLED_KEY = 'claude_chat_enabled_templates';
    }

    /**
     * Get all custom templates from storage
     */
    getCustomTemplates() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Error loading custom templates:', e);
            return [];
        }
    }

    /**
     * Save a custom template
     */
    saveTemplate(template) {
        const templates = this.getCustomTemplates();
        const existingIndex = templates.findIndex(t => t.id === template.id);

        if (existingIndex >= 0) {
            templates[existingIndex] = { ...template, updatedAt: new Date().toISOString() };
        } else {
            templates.push({
                ...template,
                isCustom: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
        return template;
    }

    /**
     * Delete a custom template
     */
    deleteTemplate(templateId) {
        const templates = this.getCustomTemplates();
        const filtered = templates.filter(t => t.id !== templateId);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    }

    /**
     * Get favorite template IDs
     */
    getFavorites() {
        try {
            const stored = localStorage.getItem(this.FAVORITES_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Toggle favorite status
     */
    toggleFavorite(templateId) {
        const favorites = this.getFavorites();
        const index = favorites.indexOf(templateId);

        if (index >= 0) {
            favorites.splice(index, 1);
        } else {
            favorites.push(templateId);
        }

        localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(favorites));
        return index < 0; // Return new favorite status
    }

    /**
     * Increment use count for a template
     */
    incrementUseCount(templateId) {
        try {
            const stored = localStorage.getItem(this.USE_COUNTS_KEY);
            const counts = stored ? JSON.parse(stored) : {};
            counts[templateId] = (counts[templateId] || 0) + 1;
            localStorage.setItem(this.USE_COUNTS_KEY, JSON.stringify(counts));
            return counts[templateId];
        } catch (e) {
            return 0;
        }
    }

    /**
     * Get use count for a template
     */
    getUseCount(templateId) {
        try {
            const stored = localStorage.getItem(this.USE_COUNTS_KEY);
            const counts = stored ? JSON.parse(stored) : {};
            return counts[templateId] || 0;
        } catch (e) {
            return 0;
        }
    }

    /**
     * Get enabled templates map (returns null if never configured, meaning all enabled)
     */
    getEnabledTemplates() {
        try {
            const stored = localStorage.getItem(this.ENABLED_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Check if a template is enabled
     */
    isTemplateEnabled(templateId) {
        const enabled = this.getEnabledTemplates();
        // If never configured, all templates are enabled
        if (enabled === null) return true;
        return enabled[templateId] !== false;
    }

    /**
     * Set template enabled state
     */
    setTemplateEnabled(templateId, isEnabled) {
        let enabled = this.getEnabledTemplates() || {};
        enabled[templateId] = isEnabled;
        localStorage.setItem(this.ENABLED_KEY, JSON.stringify(enabled));
    }

    /**
     * Set multiple templates enabled state
     */
    setMultipleEnabled(templateStates) {
        localStorage.setItem(this.ENABLED_KEY, JSON.stringify(templateStates));
    }

    /**
     * Enable all templates
     */
    enableAllTemplates() {
        localStorage.removeItem(this.ENABLED_KEY);
    }

    /**
     * Disable all templates
     */
    disableAllTemplates(templateIds) {
        const disabled = {};
        templateIds.forEach(id => disabled[id] = false);
        localStorage.setItem(this.ENABLED_KEY, JSON.stringify(disabled));
    }

    /**
     * Reset to default (all enabled)
     */
    resetEnabledTemplates() {
        localStorage.removeItem(this.ENABLED_KEY);
    }
}


// =============================================================================
// Variable Input Generator
// =============================================================================

class VariableInputGenerator {
    /**
     * Generate HTML input for a variable
     */
    static generateInput(variable, value = '') {
        const id = `var_${variable.name}`;
        const requiredMark = variable.required ? '<span class="text-red-500">*</span>' : '';

        let inputHtml = '';

        switch (variable.type) {
            case 'textarea':
                inputHtml = this.generateTextarea(variable, id, value);
                break;
            case 'select':
                inputHtml = this.generateSelect(variable, id, value);
                break;
            case 'multiselect':
                inputHtml = this.generateMultiselect(variable, id, value);
                break;
            case 'url':
                inputHtml = this.generateUrlInput(variable, id, value);
                break;
            case 'number':
                inputHtml = this.generateNumberInput(variable, id, value);
                break;
            case 'date':
                inputHtml = this.generateDateInput(variable, id, value);
                break;
            default:
                inputHtml = this.generateTextInput(variable, id, value);
        }

        return `
            <div class="variable-input-group mb-4" data-variable="${variable.name}">
                <label for="${id}" class="block text-sm font-medium text-gray-700 mb-1">
                    ${variable.label} ${requiredMark}
                </label>
                ${variable.helpText ? `<p class="text-xs text-gray-500 mb-1">${variable.helpText}</p>` : ''}
                ${inputHtml}
                <div class="validation-error text-red-500 text-sm mt-1 hidden"></div>
            </div>
        `;
    }

    static generateTextInput(variable, id, value) {
        return `
            <input type="text"
                   id="${id}"
                   name="${variable.name}"
                   value="${this.escapeHtml(value || variable.defaultValue || '')}"
                   placeholder="${this.escapeHtml(variable.placeholder || '')}"
                   class="variable-input w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   ${variable.required ? 'required' : ''}
                   ${variable.validation?.maxLength ? `maxlength="${variable.validation.maxLength}"` : ''}>
        `;
    }

    static generateTextarea(variable, id, value) {
        return `
            <textarea id="${id}"
                      name="${variable.name}"
                      placeholder="${this.escapeHtml(variable.placeholder || '')}"
                      class="variable-input w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                      rows="3"
                      ${variable.required ? 'required' : ''}
                      ${variable.validation?.maxLength ? `maxlength="${variable.validation.maxLength}"` : ''}>${this.escapeHtml(value || variable.defaultValue || '')}</textarea>
        `;
    }

    static generateSelect(variable, id, value) {
        const options = (variable.options || []).map(opt => {
            const selected = (value || variable.defaultValue) === opt ? 'selected' : '';
            return `<option value="${this.escapeHtml(opt)}" ${selected}>${this.escapeHtml(opt)}</option>`;
        }).join('');

        return `
            <select id="${id}"
                    name="${variable.name}"
                    class="variable-input w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    ${variable.required ? 'required' : ''}>
                <option value="">Select an option...</option>
                ${options}
            </select>
        `;
    }

    static generateMultiselect(variable, id, value) {
        const selectedValues = Array.isArray(value) ? value : (value ? value.split(',') : []);
        const options = (variable.options || []).map(opt => {
            const checked = selectedValues.includes(opt) ? 'checked' : '';
            const optId = `${id}_${opt.replace(/\s+/g, '_')}`;
            return `
                <label class="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input type="checkbox"
                           name="${variable.name}"
                           value="${this.escapeHtml(opt)}"
                           id="${optId}"
                           class="multiselect-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                           ${checked}>
                    <span class="text-sm">${this.escapeHtml(opt)}</span>
                </label>
            `;
        }).join('');

        return `
            <div id="${id}" class="variable-input multiselect-container border border-gray-300 rounded-lg p-2 max-h-40 overflow-y-auto">
                ${options}
            </div>
        `;
    }

    static generateUrlInput(variable, id, value) {
        return `
            <input type="text"
                   id="${id}"
                   name="${variable.name}"
                   data-type="url"
                   value="${this.escapeHtml(value || variable.defaultValue || '')}"
                   placeholder="${this.escapeHtml(variable.placeholder || 'example.com or https://example.com')}"
                   class="variable-input w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   ${variable.required ? 'required' : ''}>
        `;
    }

    static generateNumberInput(variable, id, value) {
        const min = variable.validation?.min !== undefined ? `min="${variable.validation.min}"` : '';
        const max = variable.validation?.max !== undefined ? `max="${variable.validation.max}"` : '';

        return `
            <input type="number"
                   id="${id}"
                   name="${variable.name}"
                   value="${this.escapeHtml(value || variable.defaultValue || '')}"
                   placeholder="${this.escapeHtml(variable.placeholder || '')}"
                   class="variable-input w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   ${variable.required ? 'required' : ''}
                   ${min} ${max}>
        `;
    }

    static generateDateInput(variable, id, value) {
        return `
            <input type="date"
                   id="${id}"
                   name="${variable.name}"
                   value="${this.escapeHtml(value || variable.defaultValue || '')}"
                   class="variable-input w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   ${variable.required ? 'required' : ''}>
        `;
    }

    static escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}


// =============================================================================
// Prompt Compiler (Client-side)
// =============================================================================

class PromptCompiler {
    /**
     * Extract variable names from template
     */
    static extractVariables(template) {
        const pattern = /\[(\w+)\]/g;
        const matches = [...template.matchAll(pattern)];
        const unique = [...new Set(matches.map(m => m[1]))];
        return unique;
    }

    /**
     * Sanitize a value - strip markdown formatting and extra whitespace
     * @param {string} value - The value to sanitize
     * @param {string} type - The variable type (text, url, etc.)
     */
    static sanitizeValue(value, type = 'text') {
        if (!value) return value;

        let sanitized = value.trim();

        // For URLs, strip any markdown formatting that might have been added
        if (type === 'url') {
            // First, check for markdown link syntax: [text](url) - extract just the URL
            const linkMatch = sanitized.match(/\[([^\]]*)\]\(([^)]+)\)/);
            if (linkMatch) {
                // Use the URL part (group 2), or the text part if URL is missing
                sanitized = linkMatch[2] || linkMatch[1];
            }

            // Remove surrounding underscores (markdown bold/italic)
            sanitized = sanitized.replace(/^_+|_+$/g, '');
            // Remove surrounding asterisks (markdown bold/italic)
            sanitized = sanitized.replace(/^\*+|\*+$/g, '');
            // Remove surrounding backticks (code)
            sanitized = sanitized.replace(/^`+|`+$/g, '');
            // Remove angle brackets sometimes used for URLs
            sanitized = sanitized.replace(/^<|>$/g, '');
            // Remove any existing quotes
            sanitized = sanitized.replace(/^['"]|['"]$/g, '');
            // Keep as-is - no auto-prefix, allow bare domains like statsig.com
        }

        return sanitized;
    }

    /**
     * Compile template with values
     * @param {string} template - The template string with [variable] placeholders
     * @param {Object} values - Map of variable names to values
     * @param {Array} variables - Optional array of variable definitions (to identify optional fields)
     */
    static compile(template, values, variables = []) {
        let result = template;

        // First, replace all filled values
        for (const [name, value] of Object.entries(values)) {
            if (value && value.trim()) {
                // Find variable definition to get type for sanitization
                const varDef = variables.find(v => v.name === name);
                const varType = varDef?.type || 'text';
                const sanitizedValue = this.sanitizeValue(value, varType);

                // Debug log for URL values
                if (varType === 'url') {
                    console.log(`[PromptCompiler] URL variable "${name}":`, {
                        original: value,
                        sanitized: sanitizedValue,
                        type: varType
                    });
                }

                const pattern = new RegExp(`\\[${name}\\]`, 'g');
                result = result.replace(pattern, sanitizedValue);
            }
        }

        // Then, handle unfilled optional variables - remove them and clean up
        const allVars = this.extractVariables(result); // Get remaining unfilled variables

        for (const varName of allVars) {
            const varDef = variables.find(v => v.name === varName);
            const isRequired = varDef?.required !== false; // Default to required if not specified

            if (!isRequired) {
                // Remove the entire line (including newline) if it only contains the optional variable
                // Pattern matches: start of line, any text, [variable], any text, end of line + optional newline
                const linePattern = new RegExp(`^[^\\n]*\\[${varName}\\][^\\n]*\\n?`, 'gm');
                result = result.replace(linePattern, (match) => {
                    // Check if the line has meaningful content besides the variable
                    const withoutVar = match.replace(`[${varName}]`, '').replace(/\n$/, '').trim();
                    // If only punctuation, labels ending in colon, or empty - remove entire line
                    if (!withoutVar || /^[\s\-\*\•:]+$/.test(withoutVar) || /^.{0,40}:$/.test(withoutVar)) {
                        return ''; // Remove the entire line including newline
                    }
                    // Otherwise just remove the placeholder but keep the rest
                    return match.replace(`[${varName}]`, '').replace(/\s+\n$/, '\n');
                });
            }
        }

        // Clean up multiple consecutive blank lines
        result = result.replace(/\n{3,}/g, '\n\n');
        // Clean up leading/trailing whitespace
        result = result.trim();

        return result;
    }

    /**
     * Get unfilled variables
     * @param {string} template - The template string
     * @param {Object} values - Map of variable names to values
     * @param {Array} variables - Optional array of variable definitions
     * @param {boolean} requiredOnly - If true, only return unfilled required variables
     */
    static getUnfilled(template, values, variables = [], requiredOnly = false) {
        const allVars = this.extractVariables(template);
        return allVars.filter(varName => {
            const isEmpty = !values[varName] || !values[varName].trim();
            if (!isEmpty) return false;

            if (requiredOnly && variables.length > 0) {
                const varDef = variables.find(v => v.name === varName);
                // Default to required if not specified
                return varDef?.required !== false;
            }
            return true;
        });
    }

    /**
     * Validate variable value
     */
    static validateVariable(variable, value) {
        const { name, required, type, validation } = variable;

        // Required check
        if (required && (!value || !value.trim())) {
            return `${variable.label} is required`;
        }

        // Skip further validation if empty and not required
        if (!value || !value.trim()) return null;

        // Type-specific validation
        if (type === 'url') {
            // Accept bare domains (statsig.com) or full URLs (https://statsig.com)
            const urlPattern = /^(https?:\/\/)?[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+(\/[^\s]*)?$/i;
            if (!urlPattern.test(value)) {
                return validation?.errorMessage || 'Please enter a valid domain or URL';
            }
        }

        if (type === 'number') {
            const num = parseFloat(value);
            if (isNaN(num)) {
                return validation?.errorMessage || 'Please enter a valid number';
            }
            if (validation?.min !== undefined && num < validation.min) {
                return validation?.errorMessage || `Value must be at least ${validation.min}`;
            }
            if (validation?.max !== undefined && num > validation.max) {
                return validation?.errorMessage || `Value must be at most ${validation.max}`;
            }
        }

        // String validation
        if (validation) {
            if (validation.pattern) {
                try {
                    const regex = new RegExp(validation.pattern);
                    if (!regex.test(value)) {
                        return validation.errorMessage || `Invalid format for ${name}`;
                    }
                } catch (e) {}
            }

            if (validation.minLength && value.length < validation.minLength) {
                return validation.errorMessage || `Must be at least ${validation.minLength} characters`;
            }

            if (validation.maxLength && value.length > validation.maxLength) {
                return validation.errorMessage || `Must be at most ${validation.maxLength} characters`;
            }
        }

        return null;
    }

    /**
     * Estimate token count
     */
    static estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }
}


// =============================================================================
// Main Prompt Builder Class
// =============================================================================

class PromptBuilder {
    constructor(options = {}) {
        this.containerId = options.containerId || 'promptBuilder';
        this.onSubmit = options.onSubmit || (() => {});

        this.storage = new TemplateStorage();
        this.templates = [];
        this.categories = [];
        this.selectedTemplate = null;
        this.variableValues = {};
        this.validationErrors = {};
        this.isValid = false;

        this.init();
    }

    async init() {
        await this.loadTemplates();
        this.render();
        this.bindEvents();
    }

    /**
     * Load templates from API and storage
     */
    async loadTemplates() {
        try {
            const response = await fetch('/api/templates');
            const data = await response.json();

            // Combine default and custom templates
            const customTemplates = this.storage.getCustomTemplates();
            const favorites = this.storage.getFavorites();

            // Mark favorites, add use counts, and enabled state
            const allTemplates = [...data.templates, ...customTemplates].map(t => ({
                ...t,
                isFavorite: favorites.includes(t.id),
                useCount: this.storage.getUseCount(t.id),
                isEnabled: this.storage.isTemplateEnabled(t.id)
            }));

            this.templates = allTemplates;
            this.categories = data.categories;
        } catch (e) {
            console.error('Failed to load templates:', e);
            this.templates = [];
            this.categories = [];
        }
    }

    /**
     * Get only enabled templates
     */
    getActiveTemplates() {
        return this.templates.filter(t => t.isEnabled);
    }

    /**
     * Render the prompt builder UI
     */
    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="prompt-builder">
                <!-- Template Selection -->
                <div class="template-selection mb-4">
                    <div class="flex items-center justify-between mb-2">
                        <label class="block text-sm font-medium text-gray-700">
                            Select Template
                        </label>
                        <div class="flex gap-2">
                            <button type="button" id="openLibraryBtn"
                                    class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                                </svg>
                                Library
                            </button>
                            <button type="button" id="createTemplateBtn"
                                    class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                </svg>
                                Create
                            </button>
                        </div>
                    </div>

                    <div class="template-dropdown-container relative">
                        <button type="button" id="templateDropdownBtn"
                                class="w-full flex items-center justify-between border border-gray-300 rounded-lg p-3 bg-white hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left">
                            <span id="selectedTemplateName" class="text-gray-500">Select a template...</span>
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </button>

                        <div id="templateDropdown" class="hidden absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
                            <div class="p-2 border-b border-gray-200">
                                <div class="relative">
                                    <input type="text" id="templateSearch"
                                           placeholder="Search templates..."
                                           class="w-full border border-gray-300 rounded p-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <button type="button" id="clearTemplateSearch"
                                            class="hidden absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="flex border-b border-gray-200">
                                <div id="categoryTabs" class="flex flex-wrap gap-1 p-2 overflow-x-auto">
                                    <button type="button" class="category-tab active px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-700" data-category="all">
                                        All
                                    </button>
                                </div>
                            </div>
                            <div id="templateList" class="max-h-64 overflow-y-auto p-2">
                                <!-- Templates will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Template Info -->
                <div id="templateInfo" class="hidden mb-4 p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-start justify-between">
                        <div>
                            <h4 id="templateTitle" class="font-medium text-gray-800"></h4>
                            <p id="templateDescription" class="text-sm text-gray-600 mt-1"></p>
                        </div>
                        <button type="button" id="toggleFavoriteBtn" class="text-gray-400 hover:text-yellow-500">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                            </svg>
                        </button>
                    </div>
                    <div id="templateTags" class="flex flex-wrap gap-1 mt-2"></div>
                </div>

                <!-- Variable Form -->
                <div id="variableForm" class="hidden mb-4">
                    <div class="border border-gray-200 rounded-lg p-4">
                        <h4 class="font-medium text-gray-700 mb-3">Fill in the details</h4>
                        <div id="variableInputs">
                            <!-- Variable inputs will be generated here -->
                        </div>
                    </div>
                </div>

                <!-- Preview Panel -->
                <div id="previewPanel" class="hidden mb-4">
                    <div class="border border-gray-200 rounded-lg overflow-hidden">
                        <div class="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                            <h4 class="font-medium text-gray-700">Preview</h4>
                            <div class="flex items-center gap-3 text-xs text-gray-500">
                                <span id="previewCharCount">0 characters</span>
                                <span id="previewTokenCount">~0 tokens</span>
                            </div>
                        </div>
                        <div id="previewContent" class="p-4 bg-white max-h-48 overflow-y-auto">
                            <pre class="whitespace-pre-wrap text-sm text-gray-700 font-mono"></pre>
                        </div>
                        <div id="previewWarning" class="hidden px-4 py-2 bg-yellow-50 border-t border-yellow-100 text-sm text-yellow-700">
                            <span class="font-medium">Note:</span> Some variables are not filled in yet.
                        </div>
                    </div>
                </div>

                <!-- Submit Controls -->
                <div id="submitControls" class="hidden">
                    <div id="validationSummary" class="hidden mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div class="flex items-center gap-2 text-red-700">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                            </svg>
                            <span id="validationMessage"></span>
                        </div>
                    </div>

                    <div class="flex gap-3">
                        <button type="button" id="clearFormBtn"
                                class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                            Clear
                        </button>
                        <button type="button" id="useTemplateBtn"
                                class="flex-1 bg-blue-600 text-white rounded-lg py-2 px-4 hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                            Use This Prompt
                        </button>
                    </div>
                </div>
            </div>

            <!-- Template Editor Modal -->
            <div id="templateEditorModal" class="hidden fixed inset-0 z-50 overflow-y-auto">
                <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                    <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" id="editorModalOverlay"></div>
                    <div class="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-xl shadow-xl">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <div class="flex items-center justify-between">
                                <h3 id="editorModalTitle" class="text-lg font-medium text-gray-900">Create Custom Template</h3>
                                <button type="button" id="closeEditorBtn" class="text-gray-400 hover:text-gray-600">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="px-6 py-4 max-h-[70vh] overflow-y-auto">
                            <form id="templateEditorForm">
                                <!-- Basic Info -->
                                <div class="mb-4">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Template Name <span class="text-red-500">*</span></label>
                                    <input type="text" id="editorTemplateName" required
                                           class="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                           placeholder="e.g., Strategic Analysis">
                                </div>

                                <div class="mb-4">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Description <span class="text-red-500">*</span></label>
                                    <textarea id="editorTemplateDesc" required rows="2"
                                              class="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                              placeholder="What does this template do?"></textarea>
                                </div>

                                <div class="mb-4">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select id="editorTemplateCategory"
                                            class="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                                        <!-- Categories populated dynamically -->
                                    </select>
                                </div>

                                <div class="mb-4">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                                    <input type="text" id="editorTemplateTags"
                                           class="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                           placeholder="e.g., analysis, business, strategy">
                                </div>

                                <!-- Template Text -->
                                <div class="mb-4">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">
                                        Template Text <span class="text-red-500">*</span>
                                    </label>
                                    <p class="text-xs text-gray-500 mb-2">
                                        Use [variable_name] syntax for placeholders. Example: "Analyze [company_name]"
                                    </p>
                                    <textarea id="editorTemplateText" required rows="6"
                                              class="w-full border border-gray-300 rounded-lg p-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                              placeholder="Enter your prompt template here..."></textarea>
                                    <div id="detectedVariables" class="mt-2 text-sm text-gray-600"></div>
                                </div>

                                <!-- Variable Definitions -->
                                <div class="mb-4">
                                    <div class="flex items-center justify-between mb-2">
                                        <label class="block text-sm font-medium text-gray-700">Variable Definitions</label>
                                        <button type="button" id="addVariableBtn" class="text-sm text-blue-600 hover:text-blue-800">
                                            + Add Variable
                                        </button>
                                    </div>
                                    <div id="variableDefinitions" class="space-y-3">
                                        <!-- Variable definition forms will be added here -->
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                            <button type="button" id="cancelEditorBtn"
                                    class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                                Cancel
                            </button>
                            <button type="button" id="saveTemplateBtn"
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                Save Template
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Template Library Modal -->
            <div id="templateLibraryModal" class="hidden fixed inset-0 z-50 overflow-y-auto">
                <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                    <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" id="libraryModalOverlay"></div>
                    <div class="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-xl shadow-xl">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <div class="flex items-center justify-between">
                                <h3 class="text-lg font-medium text-gray-900">Template Library</h3>
                                <button type="button" id="closeLibraryBtn" class="text-gray-400 hover:text-gray-600">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                            <div class="mt-3 flex items-center gap-4">
                                <input type="text" id="librarySearch"
                                       placeholder="Search templates..."
                                       class="flex-1 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <select id="librarySort" class="border border-gray-300 rounded-lg p-2 bg-white">
                                    <option value="name">Sort by Name</option>
                                    <option value="recent">Recently Used</option>
                                    <option value="popular">Most Popular</option>
                                </select>
                            </div>
                        </div>
                        <div class="flex" style="height: 60vh;">
                            <div class="w-48 border-r border-gray-200 p-4 overflow-y-auto">
                                <h4 class="text-sm font-medium text-gray-700 mb-2">Categories</h4>
                                <div id="libraryCategoryFilters" class="space-y-1">
                                    <!-- Category filters -->
                                </div>
                                <h4 class="text-sm font-medium text-gray-700 mb-2 mt-4">Collections</h4>
                                <div class="space-y-1">
                                    <button type="button" class="library-filter w-full text-left px-2 py-1 rounded text-sm hover:bg-gray-100" data-filter="favorites">
                                        ⭐ Favorites
                                    </button>
                                    <button type="button" class="library-filter w-full text-left px-2 py-1 rounded text-sm hover:bg-gray-100" data-filter="custom">
                                        👤 My Templates
                                    </button>
                                </div>
                            </div>
                            <div class="flex-1 p-4 overflow-y-auto">
                                <div id="libraryTemplateGrid" class="grid grid-cols-2 gap-3">
                                    <!-- Template cards -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderCategoryTabs();
        this.renderTemplateList();
    }

    /**
     * Render category tabs in dropdown (only shows categories with enabled templates)
     */
    renderCategoryTabs() {
        const tabsContainer = document.getElementById('categoryTabs');
        if (!tabsContainer) return;

        // Get enabled templates
        const activeTemplates = this.getActiveTemplates();

        // Only show categories that have at least one enabled template
        const activeCategories = this.categories.filter(cat =>
            activeTemplates.some(t => t.category === cat.id)
        );

        const tabs = activeCategories.map(cat => `
            <button type="button"
                    class="category-tab px-3 py-1 text-sm rounded-full hover:bg-gray-100 text-gray-600"
                    data-category="${cat.id}">
                ${cat.name}
            </button>
        `).join('');

        tabsContainer.innerHTML = `
            <button type="button" class="category-tab active px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-700" data-category="all">
                All
            </button>
            ${tabs}
        `;
    }

    /**
     * Render template list in dropdown
     */
    renderTemplateList(searchTerm = '', category = 'all') {
        const listContainer = document.getElementById('templateList');
        if (!listContainer) return;

        // Start with only enabled templates
        let filtered = this.getActiveTemplates();

        // Filter by search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(t =>
                t.name.toLowerCase().includes(term) ||
                t.description.toLowerCase().includes(term) ||
                (t.tags || []).some(tag => tag.toLowerCase().includes(term))
            );
        }

        // Filter by category
        if (category !== 'all') {
            filtered = filtered.filter(t => t.category === category);
        }

        if (filtered.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>No templates found</p>
                </div>
            `;
            return;
        }

        // Group by category
        const grouped = {};
        filtered.forEach(t => {
            const cat = this.categories.find(c => c.id === t.category) || { name: 'Other' };
            if (!grouped[cat.name]) grouped[cat.name] = [];
            grouped[cat.name].push(t);
        });

        let html = '';
        for (const [catName, templates] of Object.entries(grouped)) {
            html += `<div class="mb-3">
                <h5 class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">${catName}</h5>
                <div class="space-y-1">`;

            templates.forEach(t => {
                html += `
                    <button type="button"
                            class="template-option w-full text-left p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            data-template-id="${t.id}">
                        <div class="flex items-center justify-between">
                            <span class="font-medium text-gray-800">${t.name}</span>
                            <div class="flex items-center gap-1">
                                ${t.isCustom ? '<span class="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Custom</span>' : ''}
                                ${t.isFavorite ? '<span class="text-yellow-500">★</span>' : ''}
                            </div>
                        </div>
                        <p class="text-sm text-gray-500 truncate">${t.description}</p>
                    </button>
                `;
            });

            html += '</div></div>';
        }

        listContainer.innerHTML = html;
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Dropdown toggle
        const dropdownBtn = document.getElementById('templateDropdownBtn');
        const dropdown = document.getElementById('templateDropdown');

        dropdownBtn?.addEventListener('click', () => {
            dropdown?.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.template-dropdown-container')) {
                dropdown?.classList.add('hidden');
            }
        });

        // Template search
        const searchInput = document.getElementById('templateSearch');
        const clearSearchBtn = document.getElementById('clearTemplateSearch');

        searchInput?.addEventListener('input', (e) => {
            const activeCategory = document.querySelector('.category-tab.active')?.dataset.category || 'all';
            this.renderTemplateList(e.target.value, activeCategory);

            // Show/hide clear button
            if (clearSearchBtn) {
                if (e.target.value.trim()) {
                    clearSearchBtn.classList.remove('hidden');
                } else {
                    clearSearchBtn.classList.add('hidden');
                }
            }
        });

        // Clear search button
        clearSearchBtn?.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
                clearSearchBtn.classList.add('hidden');
                const activeCategory = document.querySelector('.category-tab.active')?.dataset.category || 'all';
                this.renderTemplateList('', activeCategory);
            }
        });

        // Category tabs
        document.getElementById('categoryTabs')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-tab')) {
                document.querySelectorAll('.category-tab').forEach(t => {
                    t.classList.remove('active', 'bg-blue-100', 'text-blue-700');
                    t.classList.add('text-gray-600');
                });
                e.target.classList.add('active', 'bg-blue-100', 'text-blue-700');
                e.target.classList.remove('text-gray-600');

                const searchTerm = searchInput?.value || '';
                this.renderTemplateList(searchTerm, e.target.dataset.category);
            }
        });

        // Template selection
        document.getElementById('templateList')?.addEventListener('click', (e) => {
            const option = e.target.closest('.template-option');
            if (option) {
                const templateId = option.dataset.templateId;
                this.selectTemplate(templateId);
                dropdown?.classList.add('hidden');
            }
        });

        // Variable input changes
        document.getElementById('variableInputs')?.addEventListener('input', (e) => {
            if (e.target.classList.contains('variable-input')) {
                this.handleVariableChange(e.target);
            }
        });

        // Multiselect changes
        document.getElementById('variableInputs')?.addEventListener('change', (e) => {
            if (e.target.classList.contains('multiselect-checkbox')) {
                this.handleMultiselectChange(e.target);
            }
        });

        // Toggle favorite
        document.getElementById('toggleFavoriteBtn')?.addEventListener('click', () => {
            if (this.selectedTemplate) {
                const isFavorite = this.storage.toggleFavorite(this.selectedTemplate.id);
                this.selectedTemplate.isFavorite = isFavorite;
                this.updateFavoriteButton();
                this.loadTemplates().then(() => this.renderTemplateList());
            }
        });

        // Clear form
        document.getElementById('clearFormBtn')?.addEventListener('click', () => {
            this.clearForm();
        });

        // Use template
        document.getElementById('useTemplateBtn')?.addEventListener('click', () => {
            this.submitPrompt();
        });

        // Create template button
        document.getElementById('createTemplateBtn')?.addEventListener('click', () => {
            this.openTemplateEditor();
        });

        // Library button
        document.getElementById('openLibraryBtn')?.addEventListener('click', () => {
            this.openLibrary();
        });

        // Modal close buttons
        document.getElementById('closeEditorBtn')?.addEventListener('click', () => this.closeTemplateEditor());
        document.getElementById('cancelEditorBtn')?.addEventListener('click', () => this.closeTemplateEditor());
        document.getElementById('editorModalOverlay')?.addEventListener('click', () => this.closeTemplateEditor());

        document.getElementById('closeLibraryBtn')?.addEventListener('click', () => this.closeLibrary());
        document.getElementById('libraryModalOverlay')?.addEventListener('click', () => this.closeLibrary());

        // Template editor events
        document.getElementById('editorTemplateText')?.addEventListener('input', (e) => {
            this.updateDetectedVariables(e.target.value);
        });

        document.getElementById('addVariableBtn')?.addEventListener('click', () => {
            this.addVariableDefinition();
        });

        document.getElementById('saveTemplateBtn')?.addEventListener('click', () => {
            this.saveCustomTemplate();
        });

        // Library events
        document.getElementById('librarySearch')?.addEventListener('input', () => this.renderLibraryTemplates());
        document.getElementById('librarySort')?.addEventListener('change', () => this.renderLibraryTemplates());

        document.getElementById('libraryCategoryFilters')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('library-filter')) {
                document.querySelectorAll('.library-filter').forEach(f => f.classList.remove('bg-blue-100'));
                e.target.classList.add('bg-blue-100');
                this.renderLibraryTemplates();
            }
        });
    }

    /**
     * Select a template
     */
    selectTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        this.selectedTemplate = template;
        this.variableValues = {};
        this.validationErrors = {};

        // Initialize with default values
        template.variables?.forEach(v => {
            if (v.defaultValue) {
                this.variableValues[v.name] = v.defaultValue;
            }
        });

        // Update UI
        document.getElementById('selectedTemplateName').textContent = template.name;
        document.getElementById('selectedTemplateName').classList.remove('text-gray-500');
        document.getElementById('selectedTemplateName').classList.add('text-gray-800');

        // Show template info
        const templateInfo = document.getElementById('templateInfo');
        templateInfo?.classList.remove('hidden');
        document.getElementById('templateTitle').textContent = template.name;
        document.getElementById('templateDescription').textContent = template.description;

        // Render tags
        const tagsContainer = document.getElementById('templateTags');
        if (tagsContainer && template.tags?.length) {
            tagsContainer.innerHTML = template.tags.map(tag =>
                `<span class="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">${tag}</span>`
            ).join('');
        } else if (tagsContainer) {
            tagsContainer.innerHTML = '';
        }

        this.updateFavoriteButton();

        // Render variable form
        this.renderVariableForm();

        // Show panels
        document.getElementById('variableForm')?.classList.remove('hidden');
        document.getElementById('previewPanel')?.classList.remove('hidden');
        document.getElementById('submitControls')?.classList.remove('hidden');
        document.getElementById('templateFileUploadSection')?.classList.remove('hidden');

        // Update preview
        this.updatePreview();
        this.validate();

        // Track usage
        this.storage.incrementUseCount(templateId);
    }

    /**
     * Render the variable input form
     */
    renderVariableForm() {
        const container = document.getElementById('variableInputs');
        if (!container || !this.selectedTemplate) return;

        const variables = this.selectedTemplate.variables || [];

        if (variables.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">This template has no variables to fill in.</p>';
            return;
        }

        container.innerHTML = variables.map(v =>
            VariableInputGenerator.generateInput(v, this.variableValues[v.name] || '')
        ).join('');
    }

    /**
     * Handle variable input change
     */
    handleVariableChange(input) {
        const name = input.name;
        let value = input.value;

        // Sanitize URL inputs to remove accidental markdown formatting
        const isUrl = input.type === 'url' || input.dataset.type === 'url';
        if (isUrl) {
            value = PromptCompiler.sanitizeValue(value, 'url');
            // Update the input field if value was sanitized
            if (value !== input.value) {
                input.value = value;
            }
        }

        this.variableValues[name] = value;
        this.updatePreview();
        this.validateField(name);
    }

    /**
     * Handle multiselect checkbox change
     */
    handleMultiselectChange(checkbox) {
        const container = checkbox.closest('.multiselect-container');
        const name = checkbox.name;

        const checkedValues = Array.from(container.querySelectorAll('input:checked'))
            .map(cb => cb.value);

        this.variableValues[name] = checkedValues.join(', ');
        this.updatePreview();
        this.validateField(name);
    }

    /**
     * Update the preview panel
     */
    updatePreview() {
        if (!this.selectedTemplate) return;

        const variables = this.selectedTemplate.variables || [];
        const compiled = PromptCompiler.compile(
            this.selectedTemplate.template,
            this.variableValues,
            variables
        );
        // Only warn about unfilled required variables
        const unfilled = PromptCompiler.getUnfilled(
            this.selectedTemplate.template,
            this.variableValues,
            variables,
            true // requiredOnly
        );

        const previewContent = document.querySelector('#previewContent pre');
        if (previewContent) {
            previewContent.textContent = compiled;
        }

        // Update stats
        document.getElementById('previewCharCount').textContent = `${compiled.length} characters`;
        document.getElementById('previewTokenCount').textContent = `~${PromptCompiler.estimateTokens(compiled)} tokens`;

        // Show/hide warning
        const warning = document.getElementById('previewWarning');
        if (unfilled.length > 0) {
            warning?.classList.remove('hidden');
        } else {
            warning?.classList.add('hidden');
        }
    }

    /**
     * Validate a single field
     */
    validateField(name) {
        const variable = this.selectedTemplate?.variables?.find(v => v.name === name);
        if (!variable) return;

        const value = this.variableValues[name] || '';
        const error = PromptCompiler.validateVariable(variable, value);

        // Update error display
        const inputGroup = document.querySelector(`[data-variable="${name}"]`);
        const errorDiv = inputGroup?.querySelector('.validation-error');
        const input = inputGroup?.querySelector('.variable-input');

        if (error) {
            this.validationErrors[name] = error;
            errorDiv?.classList.remove('hidden');
            if (errorDiv) errorDiv.textContent = error;
            input?.classList.add('border-red-500');
        } else {
            delete this.validationErrors[name];
            errorDiv?.classList.add('hidden');
            input?.classList.remove('border-red-500');
        }

        this.updateValidationSummary();
    }

    /**
     * Validate all fields
     */
    validate() {
        this.validationErrors = {};

        this.selectedTemplate?.variables?.forEach(v => {
            const value = this.variableValues[v.name] || '';
            const error = PromptCompiler.validateVariable(v, value);
            if (error) {
                this.validationErrors[v.name] = error;
            }
        });

        this.updateValidationSummary();
        return Object.keys(this.validationErrors).length === 0;
    }

    /**
     * Update validation summary UI
     */
    updateValidationSummary() {
        const errorCount = Object.keys(this.validationErrors).length;
        const summary = document.getElementById('validationSummary');
        const message = document.getElementById('validationMessage');
        const submitBtn = document.getElementById('useTemplateBtn');

        this.isValid = errorCount === 0;

        if (errorCount > 0) {
            summary?.classList.remove('hidden');
            if (message) {
                message.textContent = `${errorCount} required ${errorCount === 1 ? 'field' : 'fields'} missing`;
            }
            submitBtn?.setAttribute('disabled', 'true');
        } else {
            summary?.classList.add('hidden');
            submitBtn?.removeAttribute('disabled');
        }
    }

    /**
     * Update favorite button state
     */
    updateFavoriteButton() {
        const btn = document.getElementById('toggleFavoriteBtn');
        const svg = btn?.querySelector('svg');

        if (this.selectedTemplate?.isFavorite) {
            svg?.setAttribute('fill', 'currentColor');
            btn?.classList.add('text-yellow-500');
            btn?.classList.remove('text-gray-400');
        } else {
            svg?.setAttribute('fill', 'none');
            btn?.classList.remove('text-yellow-500');
            btn?.classList.add('text-gray-400');
        }
    }

    /**
     * Clear the form
     */
    clearForm() {
        this.variableValues = {};
        this.validationErrors = {};
        this.renderVariableForm();
        this.updatePreview();
        this.validate();
    }

    /**
     * Submit the compiled prompt
     */
    submitPrompt() {
        if (!this.validate() || !this.selectedTemplate) return;

        const compiled = PromptCompiler.compile(
            this.selectedTemplate.template,
            this.variableValues,
            this.selectedTemplate.variables || []
        );

        // Call the onSubmit callback
        this.onSubmit(compiled, {
            templateId: this.selectedTemplate.id,
            templateName: this.selectedTemplate.name,
            values: { ...this.variableValues }
        });

        // Collapse the prompt builder sections after submission
        this.collapseBuilder();
    }

    /**
     * Collapse the prompt builder to show only the template selector
     */
    collapseBuilder() {
        document.getElementById('templateInfo')?.classList.add('hidden');
        document.getElementById('variableForm')?.classList.add('hidden');
        document.getElementById('previewPanel')?.classList.add('hidden');
        document.getElementById('submitControls')?.classList.add('hidden');
        document.getElementById('templateFileUploadSection')?.classList.add('hidden');

        // Reset the dropdown button text
        document.getElementById('selectedTemplateName').textContent = 'Select a template...';
        document.getElementById('selectedTemplateName').classList.add('text-gray-500');
        document.getElementById('selectedTemplateName').classList.remove('text-gray-800');

        // Clear selected template
        this.selectedTemplate = null;
        this.variableValues = {};
        this.validationErrors = {};
    }

    /**
     * Get compiled prompt (for external use)
     */
    getCompiledPrompt() {
        if (!this.selectedTemplate) return '';
        return PromptCompiler.compile(
            this.selectedTemplate.template,
            this.variableValues,
            this.selectedTemplate.variables || []
        );
    }

    // =========================================================================
    // Template Editor Methods
    // =========================================================================

    openTemplateEditor(template = null) {
        this.editingTemplate = template;

        const modal = document.getElementById('templateEditorModal');
        modal?.classList.remove('hidden');

        // Update modal title
        document.getElementById('editorModalTitle').textContent =
            template ? 'Edit Template' : 'Create Custom Template';

        // Populate category select
        const categorySelect = document.getElementById('editorTemplateCategory');
        if (categorySelect) {
            categorySelect.innerHTML = this.categories.map(c =>
                `<option value="${c.id}">${c.name}</option>`
            ).join('');
        }

        // Populate form if editing
        if (template) {
            document.getElementById('editorTemplateName').value = template.name;
            document.getElementById('editorTemplateDesc').value = template.description;
            document.getElementById('editorTemplateCategory').value = template.category;
            document.getElementById('editorTemplateTags').value = (template.tags || []).join(', ');
            document.getElementById('editorTemplateText').value = template.template;

            // Populate variable definitions
            this.renderVariableDefinitions(template.variables || []);
        } else {
            // Clear form
            document.getElementById('templateEditorForm').reset();
            document.getElementById('variableDefinitions').innerHTML = '';
        }

        this.updateDetectedVariables(document.getElementById('editorTemplateText')?.value || '');
    }

    closeTemplateEditor() {
        document.getElementById('templateEditorModal')?.classList.add('hidden');
        this.editingTemplate = null;
    }

    updateDetectedVariables(templateText) {
        const variables = PromptCompiler.extractVariables(templateText);
        const container = document.getElementById('detectedVariables');

        if (!container) return;

        if (variables.length === 0) {
            container.innerHTML = '<span class="text-gray-400">No variables detected</span>';
        } else {
            container.innerHTML = `
                <span class="text-gray-600">Detected variables: </span>
                ${variables.map(v => `<code class="px-1 bg-blue-100 text-blue-700 rounded">[${v}]</code>`).join(' ')}
            `;
        }
    }

    renderVariableDefinitions(variables = []) {
        const container = document.getElementById('variableDefinitions');
        if (!container) return;

        container.innerHTML = variables.map((v, i) => this.createVariableDefinitionHTML(v, i)).join('');
    }

    addVariableDefinition(varName = '') {
        const container = document.getElementById('variableDefinitions');
        if (!container) return;

        const index = container.children.length;
        const variable = {
            name: varName || `variable_${index + 1}`,
            label: varName ? varName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'New Variable',
            type: 'text',
            required: true,
            placeholder: '',
            helpText: ''
        };

        const html = this.createVariableDefinitionHTML(variable, index);
        container.insertAdjacentHTML('beforeend', html);
    }

    createVariableDefinitionHTML(variable, index) {
        return `
            <div class="variable-definition p-3 bg-gray-50 rounded-lg" data-index="${index}">
                <div class="flex items-center justify-between mb-2">
                    <input type="text"
                           class="var-name font-mono text-sm border border-gray-300 rounded px-2 py-1"
                           value="${variable.name}"
                           placeholder="variable_name">
                    <button type="button" class="remove-variable-btn text-red-500 hover:text-red-700">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="grid grid-cols-2 gap-2 mb-2">
                    <input type="text"
                           class="var-label border border-gray-300 rounded px-2 py-1 text-sm"
                           value="${variable.label}"
                           placeholder="Display label">
                    <select class="var-type border border-gray-300 rounded px-2 py-1 text-sm bg-white">
                        <option value="text" ${variable.type === 'text' ? 'selected' : ''}>Text</option>
                        <option value="textarea" ${variable.type === 'textarea' ? 'selected' : ''}>Long Text</option>
                        <option value="url" ${variable.type === 'url' ? 'selected' : ''}>URL</option>
                        <option value="select" ${variable.type === 'select' ? 'selected' : ''}>Dropdown</option>
                        <option value="multiselect" ${variable.type === 'multiselect' ? 'selected' : ''}>Multiple Choice</option>
                        <option value="number" ${variable.type === 'number' ? 'selected' : ''}>Number</option>
                        <option value="date" ${variable.type === 'date' ? 'selected' : ''}>Date</option>
                    </select>
                </div>
                <div class="flex items-center gap-4 text-sm">
                    <label class="flex items-center gap-1">
                        <input type="checkbox" class="var-required rounded" ${variable.required ? 'checked' : ''}>
                        Required
                    </label>
                    <input type="text"
                           class="var-placeholder flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                           value="${variable.placeholder || ''}"
                           placeholder="Placeholder text">
                </div>
            </div>
        `;
    }

    saveCustomTemplate() {
        const name = document.getElementById('editorTemplateName')?.value?.trim();
        const description = document.getElementById('editorTemplateDesc')?.value?.trim();
        const category = document.getElementById('editorTemplateCategory')?.value;
        const tags = document.getElementById('editorTemplateTags')?.value?.split(',').map(t => t.trim()).filter(Boolean);
        const templateText = document.getElementById('editorTemplateText')?.value?.trim();

        if (!name || !description || !templateText) {
            alert('Please fill in all required fields');
            return;
        }

        // Collect variable definitions
        const variableDefinitions = [];
        document.querySelectorAll('.variable-definition').forEach(def => {
            variableDefinitions.push({
                name: def.querySelector('.var-name')?.value || '',
                label: def.querySelector('.var-label')?.value || '',
                type: def.querySelector('.var-type')?.value || 'text',
                required: def.querySelector('.var-required')?.checked || false,
                placeholder: def.querySelector('.var-placeholder')?.value || ''
            });
        });

        const template = {
            id: this.editingTemplate?.id || `custom_${Date.now()}`,
            name,
            description,
            category,
            tags,
            template: templateText,
            variables: variableDefinitions,
            isCustom: true,
            isFavorite: this.editingTemplate?.isFavorite || false
        };

        this.storage.saveTemplate(template);
        this.closeTemplateEditor();
        this.loadTemplates().then(() => {
            this.renderTemplateList();
            this.selectTemplate(template.id);
        });
    }

    // =========================================================================
    // Library Methods
    // =========================================================================

    openLibrary() {
        document.getElementById('templateLibraryModal')?.classList.remove('hidden');
        this.renderLibraryCategoryFilters();
        this.renderLibraryTemplates();
    }

    closeLibrary() {
        document.getElementById('templateLibraryModal')?.classList.add('hidden');
    }

    renderLibraryCategoryFilters() {
        const container = document.getElementById('libraryCategoryFilters');
        if (!container) return;

        container.innerHTML = `
            <button type="button" class="library-filter w-full text-left px-2 py-1 rounded text-sm bg-blue-100" data-filter="all">
                All (${this.templates.length})
            </button>
            ${this.categories.map(c => {
                const count = this.templates.filter(t => t.category === c.id).length;
                return `
                    <button type="button" class="library-filter w-full text-left px-2 py-1 rounded text-sm hover:bg-gray-100" data-filter="${c.id}">
                        ${c.name} (${count})
                    </button>
                `;
            }).join('')}
        `;
    }

    renderLibraryTemplates() {
        const container = document.getElementById('libraryTemplateGrid');
        if (!container) return;

        const searchTerm = document.getElementById('librarySearch')?.value?.toLowerCase() || '';
        const sortBy = document.getElementById('librarySort')?.value || 'name';
        const activeFilter = document.querySelector('.library-filter.bg-blue-100')?.dataset?.filter || 'all';

        let filtered = [...this.templates];

        // Apply search
        if (searchTerm) {
            filtered = filtered.filter(t =>
                t.name.toLowerCase().includes(searchTerm) ||
                t.description.toLowerCase().includes(searchTerm)
            );
        }

        // Apply category/collection filter
        if (activeFilter === 'favorites') {
            filtered = filtered.filter(t => t.isFavorite);
        } else if (activeFilter === 'custom') {
            filtered = filtered.filter(t => t.isCustom);
        } else if (activeFilter !== 'all') {
            filtered = filtered.filter(t => t.category === activeFilter);
        }

        // Apply sort
        if (sortBy === 'name') {
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'popular') {
            filtered.sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
        } else if (sortBy === 'recent') {
            filtered.sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="col-span-2 text-center py-12 text-gray-500">
                    No templates found
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(t => `
            <div class="library-template-card p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                 data-template-id="${t.id}">
                <div class="flex items-start justify-between">
                    <h4 class="font-medium text-gray-800">${t.name}</h4>
                    <div class="flex items-center gap-1">
                        ${t.isFavorite ? '<span class="text-yellow-500">★</span>' : ''}
                        ${t.isCustom ? '<span class="text-xs px-1 bg-purple-100 text-purple-700 rounded">Custom</span>' : ''}
                    </div>
                </div>
                <p class="text-sm text-gray-500 mt-1 line-clamp-2">${t.description}</p>
                <div class="flex items-center justify-between mt-2 text-xs text-gray-400">
                    <span>${t.variables?.length || 0} variables</span>
                    ${t.useCount ? `<span>Used ${t.useCount}x</span>` : ''}
                </div>
                ${t.isCustom ? `
                    <div class="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                        <button type="button" class="edit-template-btn text-xs text-blue-600 hover:text-blue-800">Edit</button>
                        <button type="button" class="delete-template-btn text-xs text-red-600 hover:text-red-800">Delete</button>
                    </div>
                ` : ''}
            </div>
        `).join('');

        // Bind card events
        container.querySelectorAll('.library-template-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('edit-template-btn')) {
                    const template = this.templates.find(t => t.id === card.dataset.templateId);
                    this.closeLibrary();
                    this.openTemplateEditor(template);
                } else if (e.target.classList.contains('delete-template-btn')) {
                    if (confirm('Are you sure you want to delete this template?')) {
                        this.storage.deleteTemplate(card.dataset.templateId);
                        this.loadTemplates().then(() => this.renderLibraryTemplates());
                    }
                } else {
                    this.selectTemplate(card.dataset.templateId);
                    this.closeLibrary();
                }
            });
        });
    }
}

// =============================================================================
// Settings Modal Handler (separate from PromptBuilder for global access)
// =============================================================================

class TemplateSettings {
    constructor(promptBuilder) {
        this.promptBuilder = promptBuilder;
        this.storage = promptBuilder.storage;
        this.pendingChanges = {};
        this.projectManager = new ProjectManager();
        this.pendingProjectChanges = {};
        this.bindEvents();
        this.bindCookieEvents();
        this.bindProjectEvents();
    }

    bindProjectEvents() {
        // Refresh projects button
        document.getElementById('refreshProjectsBtn')?.addEventListener('click', () => {
            this.loadAndRenderProjects();
        });
    }

    async loadAndRenderProjects() {
        const container = document.getElementById('projectsList');
        if (!container) return;

        container.innerHTML = '<div class="text-sm text-gray-500">Loading projects...</div>';

        await this.projectManager.loadProjects();

        // Initialize pending changes from current state
        this.pendingProjectChanges = { ...this.projectManager.enabledProjects };

        this.renderProjectsList();
    }

    renderProjectsList() {
        const container = document.getElementById('projectsList');
        if (!container) return;

        const projects = this.projectManager.projects;

        if (projects.length === 0) {
            container.innerHTML = `
                <div class="text-sm text-gray-500">
                    No projects found. Make sure you're connected with a valid cookie.
                </div>
            `;
            return;
        }

        container.innerHTML = projects.map(p => `
            <label class="flex items-center justify-between p-2 rounded-lg hover:bg-purple-100 cursor-pointer">
                <div class="flex-1">
                    <span class="font-medium text-gray-700">${p.name}</span>
                    <p class="text-xs text-gray-500 truncate">Last: ${p.conversation_name}</p>
                </div>
                <input type="checkbox"
                       class="project-toggle w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                       data-project-uuid="${p.uuid}"
                       data-conversation-uuid="${p.conversation_uuid}"
                       ${this.pendingProjectChanges[p.uuid] ? 'checked' : ''}>
            </label>
        `).join('');

        // Bind toggle events
        container.querySelectorAll('.project-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const uuid = e.target.dataset.projectUuid;
                this.pendingProjectChanges[uuid] = e.target.checked;
            });
        });
    }

    saveProjectSettings() {
        this.projectManager.setEnabledProjects(this.pendingProjectChanges);
        this.projectManager.updateUI();

        // If a project was just enabled and none were active before, activate it
        const activeProjects = this.projectManager.getActiveProjects();
        if (activeProjects.length > 0 && !this.projectManager.activeProject) {
            const lastProject = this.projectManager.getLastProject();
            const target = activeProjects.find(p => p.uuid === lastProject) || activeProjects[0];
            if (target) {
                this.projectManager.setActiveProject(target.uuid, target.conversation_uuid);
            }
        }
    }

    bindCookieEvents() {
        // Update cookie button
        document.getElementById('updateCookieBtn')?.addEventListener('click', () => {
            this.updateCookie();
        });

        // Refresh connection status
        document.getElementById('refreshConnectionBtn')?.addEventListener('click', () => {
            this.checkConnectionStatus();
        });
    }

    async checkConnectionStatus() {
        const statusEl = document.getElementById('connectionMode');
        if (!statusEl) return;

        statusEl.textContent = 'Checking...';
        statusEl.className = 'ml-2 text-sm text-gray-500';

        try {
            const response = await fetch('/api/client-status');
            const data = await response.json();

            // Store connection mode globally
            window.connectionMode = data.mode;
            window.canSwitchMode = data.can_switch;

            if (data.mode === 'web' && data.connected) {
                statusEl.textContent = 'Connected (Web Client)';
                statusEl.className = 'ml-2 text-sm text-green-600 font-medium';
                this.updateUIForMode('web');
            } else if (data.mode === 'api' && data.connected) {
                statusEl.textContent = 'Connected (API)';
                statusEl.className = 'ml-2 text-sm text-blue-600 font-medium';
                this.updateUIForMode('api');
            } else if (data.error) {
                statusEl.textContent = `Error: ${data.error}`;
                statusEl.className = 'ml-2 text-sm text-red-600';
            } else {
                statusEl.textContent = 'Not connected';
                statusEl.className = 'ml-2 text-sm text-red-600';
            }

            // Show mode selector if both modes are available
            this.updateModeSelector(data);
        } catch (e) {
            statusEl.textContent = 'Failed to check status';
            statusEl.className = 'ml-2 text-sm text-red-600';
        }
    }

    /**
     * Update the mode selector UI
     */
    updateModeSelector(data) {
        const modeSelectorSection = document.getElementById('modeSelectorSection');
        const modeWebBtn = document.getElementById('modeWebBtn');
        const modeApiBtn = document.getElementById('modeApiBtn');

        if (!modeSelectorSection) return;

        if (data.can_switch) {
            modeSelectorSection.classList.remove('hidden');

            // Update button styles based on current mode
            const activeClass = 'border-indigo-600 bg-indigo-100 text-indigo-800';
            const inactiveClass = 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50';

            if (data.mode === 'web') {
                modeWebBtn.className = `flex-1 px-3 py-2 text-sm rounded-lg border-2 transition-colors ${activeClass}`;
                modeApiBtn.className = `flex-1 px-3 py-2 text-sm rounded-lg border-2 transition-colors ${inactiveClass}`;
            } else {
                modeApiBtn.className = `flex-1 px-3 py-2 text-sm rounded-lg border-2 transition-colors ${activeClass}`;
                modeWebBtn.className = `flex-1 px-3 py-2 text-sm rounded-lg border-2 transition-colors ${inactiveClass}`;
            }

            // Bind click handlers
            modeWebBtn.onclick = () => this.switchMode('web');
            modeApiBtn.onclick = () => this.switchMode('api');
        } else {
            modeSelectorSection.classList.add('hidden');
        }
    }

    /**
     * Switch between API and Web modes
     */
    async switchMode(mode) {
        const statusEl = document.getElementById('modeSwitchStatus');

        if (statusEl) {
            statusEl.textContent = 'Switching...';
            statusEl.className = 'mt-2 text-xs text-center text-indigo-600';
            statusEl.classList.remove('hidden');
        }

        try {
            const response = await fetch('/api/switch-mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode })
            });

            const data = await response.json();

            if (data.success) {
                if (statusEl) {
                    statusEl.textContent = `Switched to ${mode === 'web' ? 'Projects' : 'API'} mode`;
                    statusEl.className = 'mt-2 text-xs text-center text-green-600';
                }

                // Refresh connection status and UI
                await this.checkConnectionStatus();

                // Hide status after a moment
                setTimeout(() => {
                    if (statusEl) statusEl.classList.add('hidden');
                }, 2000);
            } else {
                if (statusEl) {
                    statusEl.textContent = data.error || 'Failed to switch mode';
                    statusEl.className = 'mt-2 text-xs text-center text-red-600';
                }
            }
        } catch (e) {
            if (statusEl) {
                statusEl.textContent = 'Failed to switch mode';
                statusEl.className = 'mt-2 text-xs text-center text-red-600';
            }
        }
    }

    /**
     * Update UI elements based on connection mode
     */
    updateUIForMode(mode) {
        const headerTitle = document.querySelector('header h1');
        const projectSelectorContainer = document.getElementById('projectSelectorContainer');
        const projectSection = document.querySelector('.mb-6.p-4.bg-purple-50'); // Project section in settings

        if (mode === 'api') {
            // API mode: Update title and hide project features
            if (headerTitle) {
                headerTitle.textContent = 'Prompt Engineering Workbench | Claude AI';
            }
            document.title = 'Prompt Engineering Workbench | Claude AI';

            // Hide project selector
            if (projectSelectorContainer) {
                projectSelectorContainer.classList.add('hidden');
            }

            // Hide project section in settings
            if (projectSection) {
                projectSection.classList.add('hidden');
            }
        } else {
            // Web mode: Show full project features
            if (headerTitle) {
                headerTitle.textContent = 'Prompt Engineering Workbench | Claude Projects';
            }
            document.title = 'Prompt Engineering Workbench | Claude Projects';

            // Show project selector (it may still be hidden if no projects enabled)
            // The project manager will handle showing it when projects are enabled
        }
    }

    async updateCookie() {
        const cookieInput = document.getElementById('newCookieInput');
        const saveToEnv = document.getElementById('saveCookieToEnv')?.checked || false;
        const statusEl = document.getElementById('cookieUpdateStatus');
        const btn = document.getElementById('updateCookieBtn');

        if (!cookieInput || !statusEl) return;

        const newCookie = cookieInput.value.trim();
        if (!newCookie) {
            this.showCookieStatus('Please paste a cookie string', 'error');
            return;
        }

        if (!newCookie.includes('sessionKey=')) {
            this.showCookieStatus('Invalid cookie - must contain sessionKey', 'error');
            return;
        }

        // Disable button during update
        if (btn) btn.disabled = true;
        this.showCookieStatus('Updating cookie...', 'info');

        try {
            const response = await fetch('/api/update-cookie', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cookie: newCookie,
                    save_to_env: saveToEnv
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showCookieStatus(
                    `Cookie updated! Found ${data.conversations_count} conversations.`,
                    'success'
                );
                cookieInput.value = '';
                this.checkConnectionStatus();
            } else {
                this.showCookieStatus(data.error || 'Failed to update cookie', 'error');
            }
        } catch (e) {
            this.showCookieStatus(`Error: ${e.message}`, 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    showCookieStatus(message, type) {
        const statusEl = document.getElementById('cookieUpdateStatus');
        if (!statusEl) return;

        statusEl.textContent = message;
        statusEl.classList.remove('hidden', 'text-green-600', 'text-red-600', 'text-blue-600');

        switch (type) {
            case 'success':
                statusEl.classList.add('text-green-600');
                break;
            case 'error':
                statusEl.classList.add('text-red-600');
                break;
            case 'info':
                statusEl.classList.add('text-blue-600');
                break;
        }
    }

    bindEvents() {
        // Open settings
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.openSettings();
        });

        // Close settings
        document.getElementById('closeSettingsBtn')?.addEventListener('click', () => {
            this.closeSettings();
        });

        // Click outside to close
        document.getElementById('settingsModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal' || e.target.classList.contains('bg-black')) {
                this.closeSettings();
            }
        });

        // Enable all
        document.getElementById('enableAllTemplates')?.addEventListener('click', () => {
            this.setAllTemplates(true);
        });

        // Disable all
        document.getElementById('disableAllTemplates')?.addEventListener('click', () => {
            this.setAllTemplates(false);
        });

        // Reset to defaults
        document.getElementById('resetSettingsBtn')?.addEventListener('click', () => {
            this.resetToDefaults();
        });

        // Save changes
        document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
            this.saveSettings();
        });
    }

    openSettings() {
        // Initialize pending changes from current state
        this.pendingChanges = {};
        this.promptBuilder.templates.forEach(t => {
            this.pendingChanges[t.id] = t.isEnabled;
        });

        this.renderSettingsList();
        this.checkConnectionStatus();
        this.loadAndRenderProjects();
        document.getElementById('settingsModal')?.classList.remove('hidden');
    }

    closeSettings() {
        document.getElementById('settingsModal')?.classList.add('hidden');
    }

    renderSettingsList() {
        const container = document.getElementById('settingsTemplateList');
        if (!container) return;

        const templates = this.promptBuilder.templates;
        const categories = this.promptBuilder.categories;

        // Group templates by category
        const grouped = {};
        templates.forEach(t => {
            const cat = categories.find(c => c.id === t.category) || { id: 'other', name: 'Other' };
            if (!grouped[cat.id]) {
                grouped[cat.id] = { name: cat.name, templates: [] };
            }
            grouped[cat.id].templates.push(t);
        });

        let html = '';
        for (const [catId, catData] of Object.entries(grouped)) {
            const enabledCount = catData.templates.filter(t => this.pendingChanges[t.id]).length;
            const totalCount = catData.templates.length;

            html += `
                <div class="category-group border border-gray-200 rounded-lg overflow-hidden">
                    <div class="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div class="flex items-center gap-3">
                            <h4 class="font-medium text-gray-800">${catData.name}</h4>
                            <span class="text-sm text-gray-500">${enabledCount}/${totalCount} enabled</span>
                        </div>
                        <div class="flex gap-2">
                            <button type="button"
                                    class="category-enable-all text-xs text-green-600 hover:text-green-800"
                                    data-category="${catId}">
                                Enable All
                            </button>
                            <button type="button"
                                    class="category-disable-all text-xs text-red-600 hover:text-red-800"
                                    data-category="${catId}">
                                Disable All
                            </button>
                        </div>
                    </div>
                    <div class="divide-y divide-gray-100">
                        ${catData.templates.map(t => `
                            <label class="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2">
                                        <span class="font-medium text-gray-700">${t.name}</span>
                                        ${t.isCustom ? '<span class="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Custom</span>' : ''}
                                        ${t.isFavorite ? '<span class="text-yellow-500">★</span>' : ''}
                                    </div>
                                    <p class="text-sm text-gray-500 truncate">${t.description}</p>
                                </div>
                                <div class="ml-4">
                                    <input type="checkbox"
                                           class="template-toggle w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                           data-template-id="${t.id}"
                                           ${this.pendingChanges[t.id] ? 'checked' : ''}>
                                </div>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;

        // Bind toggle events
        container.querySelectorAll('.template-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                this.pendingChanges[e.target.dataset.templateId] = e.target.checked;
                this.renderSettingsList(); // Re-render to update counts
            });
        });

        // Bind category enable/disable all
        container.querySelectorAll('.category-enable-all').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const catId = e.target.dataset.category;
                grouped[catId].templates.forEach(t => {
                    this.pendingChanges[t.id] = true;
                });
                this.renderSettingsList();
            });
        });

        container.querySelectorAll('.category-disable-all').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const catId = e.target.dataset.category;
                grouped[catId].templates.forEach(t => {
                    this.pendingChanges[t.id] = false;
                });
                this.renderSettingsList();
            });
        });
    }

    setAllTemplates(enabled) {
        this.promptBuilder.templates.forEach(t => {
            this.pendingChanges[t.id] = enabled;
        });
        this.renderSettingsList();
    }

    resetToDefaults() {
        this.promptBuilder.templates.forEach(t => {
            this.pendingChanges[t.id] = true;
        });
        this.renderSettingsList();
    }

    saveSettings() {
        // Save template settings to storage
        this.storage.setMultipleEnabled(this.pendingChanges);

        // Update templates in memory
        this.promptBuilder.templates.forEach(t => {
            t.isEnabled = this.pendingChanges[t.id];
        });

        // Re-render category tabs and template list
        this.promptBuilder.renderCategoryTabs();
        this.promptBuilder.renderTemplateList();

        // Save project settings
        this.saveProjectSettings();

        // Close modal
        this.closeSettings();
    }
}

// =============================================================================
// Project Manager (handles Claude Project selection)
// =============================================================================

class ProjectManager {
    constructor() {
        this.STORAGE_KEY = 'claude_chat_projects';
        this.LAST_PROJECT_KEY = 'claude_chat_last_project';
        this.projects = [];
        this.enabledProjects = this.getEnabledProjects();
        this.activeProject = null;
    }

    getEnabledProjects() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            return {};
        }
    }

    setEnabledProjects(projects) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));
        this.enabledProjects = projects;
    }

    isProjectEnabled(projectUuid) {
        // If nothing is configured, nothing is enabled
        if (Object.keys(this.enabledProjects).length === 0) return false;
        return this.enabledProjects[projectUuid] === true;
    }

    getLastProject() {
        return localStorage.getItem(this.LAST_PROJECT_KEY);
    }

    setLastProject(projectUuid) {
        localStorage.setItem(this.LAST_PROJECT_KEY, projectUuid);
    }

    async loadProjects() {
        try {
            const response = await fetch('/api/projects');
            const data = await response.json();
            this.projects = data.projects || [];
            return this.projects;
        } catch (e) {
            console.error('Failed to load projects:', e);
            return [];
        }
    }

    getActiveProjects() {
        return this.projects.filter(p => this.isProjectEnabled(p.uuid));
    }

    async setActiveProject(projectUuid, conversationUuid = null) {
        // Handle "No Project" selection
        if (!projectUuid || projectUuid === 'none') {
            this.activeProject = null;
            this.setLastProject('none');
            return true;
        }

        try {
            const response = await fetch('/api/projects/set-active', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_uuid: projectUuid,
                    conversation_uuid: conversationUuid
                })
            });

            const data = await response.json();
            if (data.success) {
                this.activeProject = projectUuid;
                this.setLastProject(projectUuid);
                return true;
            }
            return false;
        } catch (e) {
            console.error('Failed to set active project:', e);
            return false;
        }
    }

    async initialize() {
        await this.loadProjects();

        const activeProjects = this.getActiveProjects();
        if (activeProjects.length === 0) return;

        // Get last used project
        const lastProject = this.getLastProject();

        // If last selection was "No Project", keep it that way
        if (lastProject === 'none') {
            this.activeProject = null;
            this.updateUI();
            return;
        }

        // Otherwise, find the target project or default to "No Project"
        const targetProject = activeProjects.find(p => p.uuid === lastProject);

        if (targetProject) {
            await this.setActiveProject(targetProject.uuid, targetProject.conversation_uuid);
        } else {
            // No specific project selected, default to "No Project"
            this.activeProject = null;
        }

        this.updateUI();
    }

    updateUI() {
        const container = document.getElementById('projectSelectorContainer');
        const selector = document.getElementById('projectSelector');
        const nameSpan = document.getElementById('activeProjectName');

        if (!container || !selector) return;

        const activeProjects = this.getActiveProjects();

        if (activeProjects.length === 0) {
            container.classList.add('hidden');
            return;
        }

        // Always show selector (for "No Project" option)
        container.classList.remove('hidden');
        selector.classList.remove('hidden');
        if (nameSpan) nameSpan.classList.add('hidden');

        // Populate selector with "No Project" option first
        const noProjectSelected = !this.activeProject || this.activeProject === 'none';
        selector.innerHTML = `
            <option value="none" ${noProjectSelected ? 'selected' : ''}>
                No Project
            </option>
            ${activeProjects.map(p => `
                <option value="${p.uuid}" ${p.uuid === this.activeProject ? 'selected' : ''}>
                    ${p.name}
                </option>
            `).join('')}
        `;

        // Bind change event
        selector.onchange = async (e) => {
            const value = e.target.value;
            if (value === 'none') {
                await this.setActiveProject(null);
            } else {
                const project = activeProjects.find(p => p.uuid === value);
                if (project) {
                    await this.setActiveProject(project.uuid, project.conversation_uuid);
                }
            }
        };
    }
}

// Export for use
window.PromptBuilder = PromptBuilder;
window.TemplateStorage = TemplateStorage;
window.PromptCompiler = PromptCompiler;
window.TemplateSettings = TemplateSettings;
window.ProjectManager = ProjectManager;
