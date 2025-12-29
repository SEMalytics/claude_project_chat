/**
 * Snippet Manager - CRUD operations for prompt snippets
 * Stores snippets in localStorage
 */

class SnippetManager {
    constructor() {
        this.STORAGE_KEY = 'claude_chat_snippets';
        this.DEFAULT_SNIPPETS = [
            'Be concise.',
            'Don\'t change any code, just discuss options.',
            'Thanks.'
        ];
        this.snippets = this.loadSnippets();
    }

    /**
     * Load snippets from localStorage
     */
    loadSnippets() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return Array.isArray(parsed) ? parsed : this.DEFAULT_SNIPPETS;
            }
        } catch (e) {
            console.error('Error loading snippets:', e);
        }
        return [...this.DEFAULT_SNIPPETS];
    }

    /**
     * Save snippets to localStorage
     */
    saveSnippets() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.snippets));
            return true;
        } catch (e) {
            console.error('Error saving snippets:', e);
            return false;
        }
    }

    /**
     * Get all snippets
     */
    getAll() {
        return [...this.snippets];
    }

    /**
     * Add a new snippet
     */
    add(snippetText) {
        const trimmed = snippetText.trim();
        if (!trimmed) {
            throw new Error('Snippet cannot be empty');
        }
        if (this.snippets.includes(trimmed)) {
            throw new Error('Snippet already exists');
        }
        this.snippets.push(trimmed);
        this.saveSnippets();
        return trimmed;
    }

    /**
     * Update a snippet
     */
    update(oldText, newText) {
        const trimmed = newText.trim();
        if (!trimmed) {
            throw new Error('Snippet cannot be empty');
        }
        const index = this.snippets.indexOf(oldText);
        if (index === -1) {
            throw new Error('Snippet not found');
        }
        if (trimmed !== oldText && this.snippets.includes(trimmed)) {
            throw new Error('Snippet already exists');
        }
        this.snippets[index] = trimmed;
        this.saveSnippets();
        return trimmed;
    }

    /**
     * Delete a snippet
     */
    delete(snippetText) {
        const index = this.snippets.indexOf(snippetText);
        if (index === -1) {
            throw new Error('Snippet not found');
        }
        this.snippets.splice(index, 1);
        this.saveSnippets();
        return true;
    }

    /**
     * Reset to default snippets
     */
    reset() {
        this.snippets = [...this.DEFAULT_SNIPPETS];
        this.saveSnippets();
        return this.snippets;
    }

    /**
     * Move snippet up in order
     */
    moveUp(snippetText) {
        const index = this.snippets.indexOf(snippetText);
        if (index <= 0) return false;
        [this.snippets[index - 1], this.snippets[index]] = [this.snippets[index], this.snippets[index - 1]];
        this.saveSnippets();
        return true;
    }

    /**
     * Move snippet down in order
     */
    moveDown(snippetText) {
        const index = this.snippets.indexOf(snippetText);
        if (index === -1 || index >= this.snippets.length - 1) return false;
        [this.snippets[index], this.snippets[index + 1]] = [this.snippets[index + 1], this.snippets[index]];
        this.saveSnippets();
        return true;
    }
}
