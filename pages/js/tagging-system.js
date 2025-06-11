// /pages/js/tagging-system.js
// Modular tagging system that can be used across the project

class TaggingSystem {
    constructor(options = {}) {
        this.options = {
            inputSelector: '#tag-input',
            suggestionsSelector: '#tag-suggestions',
            selectedTagsSelector: '#selected-tags',
            addButtonSelector: '#add-tag-btn',
            searchEndpoint: '/api/tags/search.php',
            searchDelay: 300,
            maxSuggestions: 10,
            allowNewTags: true,
            showCosts: true,
            onTagsChanged: null,
            ...options
        };
        
        this.selectedTags = new Set();
        this.existingTags = new Map(); // name -> {id, usage_count}
        this.searchTimeout = null;
        this.currentFocus = -1;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.render();
    }
    
    setupEventListeners() {
        const input = document.querySelector(this.options.inputSelector);
        const addBtn = document.querySelector(this.options.addButtonSelector);
        const suggestions = document.querySelector(this.options.suggestionsSelector);
        
        if (!input) {
            console.error('Tagging system: input element not found');
            return;
        }
        
        // Input events
        input.addEventListener('input', (e) => this.handleInput(e));
        input.addEventListener('keydown', (e) => this.handleKeydown(e));
        input.addEventListener('focus', () => this.handleFocus());
        input.addEventListener('blur', () => this.handleBlur());
        
        // Add button
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addCurrentTag());
        }
        
        // Click outside to hide suggestions
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && 
                suggestions && !suggestions.contains(e.target)) {
                this.hideSuggestions();
            }
        });
    }
    
    async handleInput(e) {
        const value = e.target.value.trim();
        this.currentFocus = -1;
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        if (value.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        this.searchTimeout = setTimeout(() => {
            this.searchTags(value);
        }, this.options.searchDelay);
    }
    
    handleKeydown(e) {
        const suggestions = document.querySelector(this.options.suggestionsSelector);
        
        if (!suggestions || suggestions.classList.contains('hidden')) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addCurrentTag();
            }
            return;
        }
        
        const items = suggestions.querySelectorAll('.tag-suggestion-item');
        
        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                if (this.currentFocus >= 0 && items[this.currentFocus]) {
                    const item = items[this.currentFocus];
                    this.selectTag(item.dataset.tagName, item.dataset.isExisting === 'true');
                } else {
                    this.addCurrentTag();
                }
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                this.currentFocus = Math.min(this.currentFocus + 1, items.length - 1);
                this.updateFocus(items);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.currentFocus = Math.max(this.currentFocus - 1, -1);
                this.updateFocus(items);
                break;
                
            case 'Escape':
                this.hideSuggestions();
                break;
        }
    }
    
    handleFocus() {
        const input = document.querySelector(this.options.inputSelector);
        const value = input.value.trim();
        
        if (value.length > 0) {
            this.searchTags(value);
        }
    }
    
    handleBlur() {
        // Delay hiding to allow clicking on suggestions
        setTimeout(() => this.hideSuggestions(), 150);
    }
    
    updateFocus(items) {
        items.forEach((item, index) => {
            if (index === this.currentFocus) {
                item.classList.add('bg-muted');
            } else {
                item.classList.remove('bg-muted');
            }
        });
    }
    
    async searchTags(query) {
        try {
            const url = `${this.options.searchEndpoint}?q=${encodeURIComponent(query)}&limit=${this.options.maxSuggestions}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                this.renderSuggestions(data.tags, query);
            }
        } catch (error) {
            console.error('Error searching tags:', error);
        }
    }
    
    renderSuggestions(tags, query) {
        const container = document.querySelector(this.options.suggestionsSelector);
        if (!container) return;
        
        container.innerHTML = '';
        this.currentFocus = -1;
        
        // Filter out already selected tags
        const availableTags = tags.filter(tag => !this.selectedTags.has(tag.name));
        
        // Add option to create new tag if it doesn't exist and new tags are allowed
        const exactMatch = availableTags.find(tag => 
            tag.name.toLowerCase() === query.toLowerCase()
        );
        
        if (!exactMatch && query.length > 0 && this.options.allowNewTags) {
            this.renderSuggestionItem(container, query, false, true);
        }
        
        // Add existing tags
        availableTags.forEach(tag => {
            this.renderSuggestionItem(container, tag.name, true, false, tag.usage_count || 0);
        });
        
        if (container.children.length > 0) {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    }
    
    renderSuggestionItem(container, tagName, isExisting, isNewExact, usageCount = 0) {
        const item = document.createElement('div');
        item.className = 'tag-suggestion-item px-3 py-2 cursor-pointer hover:bg-muted flex justify-between items-center';
        item.dataset.tagName = tagName;
        item.dataset.isExisting = isExisting;
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'flex items-center gap-2';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = tagName;
        nameDiv.appendChild(nameSpan);
        
        if (this.options.showCosts) {
            const costSpan = document.createElement('span');
            costSpan.className = 'text-xs px-1.5 py-0.5 rounded';
            
            if (isExisting) {
                costSpan.textContent = 'Free';
                costSpan.className += ' bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
            } else {
                costSpan.textContent = '1 credit';
                costSpan.className += ' bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
            }
            
            nameDiv.appendChild(costSpan);
        }
        
        const infoSpan = document.createElement('span');
        infoSpan.className = 'text-xs text-muted-foreground';
        
        if (isExisting && usageCount > 0) {
            infoSpan.textContent = `Used ${usageCount}x`;
        }
        
        item.appendChild(nameDiv);
        if (infoSpan.textContent) {
            item.appendChild(infoSpan);
        }
        
        item.addEventListener('click', () => {
            this.selectTag(tagName, isExisting);
        });
        
        container.appendChild(item);
    }
    
    selectTag(tagName, isExisting = false) {
        if (this.selectedTags.has(tagName)) return;
        
        this.selectedTags.add(tagName);
        
        if (isExisting) {
            this.existingTags.set(tagName, { existing: true });
        }
        
        this.clearInput();
        this.render();
        this.hideSuggestions();
        
        if (this.options.onTagsChanged) {
            this.options.onTagsChanged(this.getSelectedTags());
        }
    }
    
    removeTag(tagName) {
        this.selectedTags.delete(tagName);
        this.existingTags.delete(tagName);
        this.render();
        
        if (this.options.onTagsChanged) {
            this.options.onTagsChanged(this.getSelectedTags());
        }
    }
    
    addCurrentTag() {
        const input = document.querySelector(this.options.inputSelector);
        const tagName = input.value.trim();
        
        if (tagName && !this.selectedTags.has(tagName)) {
            this.selectTag(tagName, false);
        }
    }
    
    clearInput() {
        const input = document.querySelector(this.options.inputSelector);
        if (input) {
            input.value = '';
        }
    }
    
    hideSuggestions() {
        const suggestions = document.querySelector(this.options.suggestionsSelector);
        if (suggestions) {
            suggestions.classList.add('hidden');
        }
        this.currentFocus = -1;
    }
    
    render() {
        this.renderSelectedTags();
    }
    
    renderSelectedTags() {
        const container = document.querySelector(this.options.selectedTagsSelector);
        if (!container) return;
        
        container.innerHTML = '';
        
        Array.from(this.selectedTags).forEach(tagName => {
            const tag = document.createElement('span');
            tag.className = 'inline-flex items-center gap-1 px-2 py-1 text-sm bg-primary/10 text-primary rounded-full border border-primary/20';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = tagName;
            tag.appendChild(nameSpan);
            
            if (this.options.showCosts) {
                const isExisting = this.existingTags.has(tagName);
                const costSpan = document.createElement('span');
                costSpan.className = 'text-xs opacity-75';
                costSpan.textContent = isExisting ? '(free)' : '(1c)';
                tag.appendChild(costSpan);
            }
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'text-primary hover:text-primary/70 ml-1 w-4 h-4 flex items-center justify-center';
            removeBtn.innerHTML = '×';
            removeBtn.addEventListener('click', () => this.removeTag(tagName));
            tag.appendChild(removeBtn);
            
            container.appendChild(tag);
        });
    }
    
    // Public methods
    getSelectedTags() {
        return {
            all: Array.from(this.selectedTags),
            existing: Array.from(this.selectedTags).filter(tag => this.existingTags.has(tag)),
            new: Array.from(this.selectedTags).filter(tag => !this.existingTags.has(tag))
        };
    }
    
    setTags(tags) {
        this.selectedTags.clear();
        this.existingTags.clear();
        
        tags.forEach(tag => {
            if (typeof tag === 'string') {
                this.selectedTags.add(tag);
            } else if (tag.name) {
                this.selectedTags.add(tag.name);
                if (tag.existing) {
                    this.existingTags.set(tag.name, { existing: true });
                }
            }
        });
        
        this.render();
        
        if (this.options.onTagsChanged) {
            this.options.onTagsChanged(this.getSelectedTags());
        }
    }
    
    clearTags() {
        this.selectedTags.clear();
        this.existingTags.clear();
        this.render();
        
        if (this.options.onTagsChanged) {
            this.options.onTagsChanged(this.getSelectedTags());
        }
    }
    
    getCostEstimate() {
        const newTagsCount = Array.from(this.selectedTags).filter(tag => 
            !this.existingTags.has(tag)
        ).length;
        
        return {
            newTags: newTagsCount,
            totalCost: newTagsCount // 1 credit per new tag
        };
    }
    
    destroy() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Remove event listeners would be more complex,
        // for now just clear the timeout
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaggingSystem;
}

// Make available globally
window.TaggingSystem = TaggingSystem;
