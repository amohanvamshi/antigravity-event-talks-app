// Application State
let notesState = {
    allEntries: [],      // Complete dataset from API
    filteredEntries: [], // Dataset after applying search and filters
    activeFilter: 'all', // Current type filter
    searchQuery: '',     // Current search term
    selectedUpdate: null // Currently selected update for tweeting
};

// DOM Elements
const elements = {
    btnRefresh: document.getElementById('btn-refresh'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    refreshIcon: document.getElementById('refresh-icon'),
    cacheIndicator: document.getElementById('cache-indicator'),
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    filterButtons: document.querySelectorAll('.btn-filter'),
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    btnRetry: document.getElementById('btn-retry'),
    emptyState: document.getElementById('empty-state'),
    notesFeed: document.getElementById('notes-feed'),
    
    // Modal Elements
    tweetModal: document.getElementById('tweet-modal'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCount: document.getElementById('char-count'),
    btnSubmitTweet: document.getElementById('btn-submit-tweet'),
    btnCancelTweet: document.getElementById('btn-cancel-tweet'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    
    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh button
    elements.btnRefresh.addEventListener('click', () => fetchReleaseNotes(true));
    elements.btnRetry.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Export CSV button
    if (elements.btnExportCsv) {
        elements.btnExportCsv.addEventListener('click', exportToCSV);
    }
    
    // Search input
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.searchClear.addEventListener('click', clearSearch);
    
    // Filters
    elements.filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            elements.filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            notesState.activeFilter = button.getAttribute('data-type');
            applyFilters();
        });
    });
    
    // Tweet modal text changes
    elements.tweetTextarea.addEventListener('input', handleTweetTextareaInput);
    
    // Modal actions
    elements.btnCancelTweet.addEventListener('click', closeModal);
    elements.btnCloseModal.addEventListener('click', closeModal);
    elements.btnSubmitTweet.addEventListener('click', publishTweet);
    
    // Close modal when clicking outside card
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) {
            closeModal();
        }
    });

    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !elements.tweetModal.classList.contains('hidden')) {
            closeModal();
        }
    });
}

// Fetch notes from Flask API
async function fetchReleaseNotes(forceRefresh = false) {
    showLoading(true);
    showError(false);
    showEmpty(false);
    elements.notesFeed.innerHTML = '';
    
    const url = `/api/notes${forceRefresh ? '?refresh=true' : ''}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        
        if (result.status === 'success') {
            notesState.allEntries = result.data;
            
            // Cache indicator status
            if (result.source === 'cache') {
                elements.cacheIndicator.textContent = 'Cached';
                elements.cacheIndicator.classList.remove('hidden');
            } else {
                elements.cacheIndicator.textContent = 'Fresh';
                elements.cacheIndicator.classList.remove('hidden');
                setTimeout(() => {
                    elements.cacheIndicator.classList.add('hidden');
                }, 3000);
            }
            
            applyFilters();
        } else {
            throw new Error(result.message || 'Unknown backend error');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        elements.errorMessage.textContent = `Error: ${error.message}. Please try again.`;
        showError(true);
    } finally {
        showLoading(false);
    }
}

// Handle search input
function handleSearchInput(e) {
    notesState.searchQuery = e.target.value.trim().toLowerCase();
    
    // Show/hide clear button
    if (notesState.searchQuery.length > 0) {
        elements.searchClear.classList.remove('hidden');
    } else {
        elements.searchClear.classList.add('hidden');
    }
    
    applyFilters();
}

// Clear search input
function clearSearch() {
    elements.searchInput.value = '';
    notesState.searchQuery = '';
    elements.searchClear.classList.add('hidden');
    applyFilters();
}

// Apply current filters & search queries to dataset
function applyFilters() {
    const query = notesState.searchQuery;
    const filter = notesState.activeFilter;
    
    notesState.filteredEntries = notesState.allEntries.map(entry => {
        // Deep copy of entry structure
        const filteredUpdates = entry.updates.filter(update => {
            // Check type filter
            const matchesType = (filter === 'all') || (update.type.toLowerCase() === filter.toLowerCase());
            
            // Check keyword search
            const matchesSearch = !query || 
                update.type.toLowerCase().includes(query) || 
                update.text.toLowerCase().includes(query) ||
                entry.date.toLowerCase().includes(query);
                
            return matchesType && matchesSearch;
        });
        
        return {
            ...entry,
            updates: filteredUpdates
        };
    }).filter(entry => entry.updates.length > 0); // Keep dates that have at least one matching update
    
    renderFeed();
}

// Render filtered notes to DOM
function renderFeed() {
    const feed = elements.notesFeed;
    feed.innerHTML = '';
    
    if (notesState.filteredEntries.length === 0) {
        showEmpty(true);
        return;
    }
    
    showEmpty(false);
    
    notesState.filteredEntries.forEach(entry => {
        // Create Timeline Block
        const timelineBlock = document.createElement('div');
        timelineBlock.className = 'timeline-block';
        
        // Header
        const header = document.createElement('div');
        header.className = 'timeline-date-header';
        header.innerHTML = `
            <h2>${entry.date}</h2>
            <div class="timeline-line"></div>
        `;
        timelineBlock.appendChild(header);
        
        // Cards for each update
        entry.updates.forEach(update => {
            const card = document.createElement('div');
            card.className = 'update-card';
            
            // Badge class helper
            let badgeClass = 'badge-notice';
            const typeLower = update.type.toLowerCase();
            if (typeLower.includes('feature')) badgeClass = 'badge-feature';
            else if (typeLower.includes('issue') || typeLower.includes('bug')) badgeClass = 'badge-issue';
            else if (typeLower.includes('change')) badgeClass = 'badge-changed';
            else if (typeLower.includes('deprecation')) badgeClass = 'badge-deprecation';
            
            card.innerHTML = `
                <div class="card-badge-container">
                    <span class="badge ${badgeClass}">${update.type}</span>
                </div>
                <div class="update-desc">
                    ${update.content}
                </div>
                <div class="card-actions">
                    <button class="btn-action-icon btn-card-copy" title="Copy to Clipboard">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                    <button class="btn-action-icon btn-card-tweet" title="Share on X / Twitter">
                        <i class="fa-brands fa-x-twitter"></i>
                    </button>
                </div>
            `;
            
            // Add action listeners
            card.querySelector('.btn-card-copy').addEventListener('click', () => {
                copyToClipboard(update.text);
            });
            
            card.querySelector('.btn-card-tweet').addEventListener('click', () => {
                openTweetModal(entry.date, update.type, update.text, entry.link);
            });
            
            timelineBlock.appendChild(card);
        });
        
        feed.appendChild(timelineBlock);
    });
}

// Loading state helper
function showLoading(isLoading) {
    if (isLoading) {
        elements.loadingState.classList.remove('hidden');
        elements.refreshIcon.classList.add('spinning');
        elements.btnRefresh.disabled = true;
    } else {
        elements.loadingState.classList.add('hidden');
        elements.refreshIcon.classList.remove('spinning');
        elements.btnRefresh.disabled = false;
    }
}

// Error state helper
function showError(isError) {
    if (isError) {
        elements.errorState.classList.remove('hidden');
    } else {
        elements.errorState.classList.add('hidden');
    }
}

// Empty state helper
function showEmpty(isEmpty) {
    if (isEmpty) {
        elements.emptyState.classList.remove('hidden');
    } else {
        elements.emptyState.classList.add('hidden');
    }
}

// Copy plain text to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast("Release note copied to clipboard!");
    } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed'; // Avoid scrolling to bottom
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            document.execCommand('copy');
            showToast("Release note copied to clipboard!");
        } catch (copyErr) {
            console.error('Failed to copy text', copyErr);
            showToast("Failed to copy text");
        }
        document.body.removeChild(textarea);
    }
}

// Open tweet modal and format template
function openTweetModal(date, type, text, link) {
    notesState.selectedUpdate = { date, type, text, link };
    
    // Generate initial tweet text
    const prefix = `[BigQuery Release - ${date}] ${type}:\n`;
    const suffix = `\nDetails: ${link} #BigQuery #GCP`;
    
    // Calculate space left for the main text
    // A standard URL counts as 23 characters on Twitter, but in intents they just count character lengths initially
    // We'll calculate safe truncation length
    const maxTextLength = 280 - prefix.length - suffix.length;
    
    let trimmedText = text;
    if (trimmedText.length > maxTextLength) {
        trimmedText = trimmedText.substring(0, maxTextLength - 4) + '...';
    }
    
    const initialTweet = `${prefix}${trimmedText}${suffix}`;
    elements.tweetTextarea.value = initialTweet;
    
    // Update character limit count UI
    updateCharCount(initialTweet.length);
    
    // Show Modal
    elements.tweetModal.classList.remove('hidden');
    // Lock background scroll
    document.body.style.overflow = 'hidden';
    
    // Autofocus textarea
    setTimeout(() => {
        elements.tweetTextarea.focus();
    }, 100);
}

// Close tweet modal
function closeModal() {
    elements.tweetModal.classList.add('hidden');
    document.body.style.overflow = '';
    notesState.selectedUpdate = null;
}

// Handle tweet textarea changes
function handleTweetTextareaInput(e) {
    const text = e.target.value;
    updateCharCount(text.length);
}

// Update char count UI indicator
function updateCharCount(len) {
    elements.charCount.textContent = len;
    
    const countContainer = elements.charCount.parentElement;
    countContainer.className = 'char-counter-container';
    
    if (len > 280) {
        countContainer.classList.add('danger');
        elements.btnSubmitTweet.disabled = true;
    } else if (len > 260) {
        countContainer.classList.add('warning');
        elements.btnSubmitTweet.disabled = false;
    } else {
        elements.btnSubmitTweet.disabled = false;
    }
}

// Open Twitter/X Web Intent
function publishTweet() {
    const tweetText = elements.tweetTextarea.value;
    if (tweetText.length > 280) return;
    
    const encodedText = encodeURIComponent(tweetText);
    const xUrl = `https://x.com/intent/tweet?text=${encodedText}`;
    
    window.open(xUrl, '_blank', 'noopener,noreferrer');
    closeModal();
    showToast("Opening X/Twitter to publish!");
}

// Show temporary toast notification
function showToast(message) {
    elements.toastMessage.textContent = message;
    elements.toast.classList.remove('hidden');
    
    // Trigger slide-in animation
    elements.toast.style.transform = 'translateY(0)';
    elements.toast.style.opacity = '1';
    
    // Hide after 3 seconds
    setTimeout(() => {
        elements.toast.style.transform = 'translateY(100px)';
        elements.toast.style.opacity = '0';
        setTimeout(() => {
            elements.toast.classList.add('hidden');
        }, 300);
    }, 3000);
}

// Export filtered release notes to a CSV file
function exportToCSV() {
    if (notesState.filteredEntries.length === 0) {
        showToast("No release notes to export!");
        return;
    }
    
    const headers = ["Date", "Type", "Update Text", "Link"];
    const rows = [headers];
    
    notesState.filteredEntries.forEach(entry => {
        entry.updates.forEach(update => {
            // Escape double quotes inside values by doubling them
            const escapeField = (val) => `"${(val || '').replace(/"/g, '""')}"`;
            rows.push([
                escapeField(entry.date),
                escapeField(update.type),
                escapeField(update.text),
                escapeField(entry.link)
            ]);
        });
    });
    
    // Join rows with CRLF
    const csvString = rows.map(r => r.join(",")).join("\r\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_release_notes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast("Exported filtered updates to CSV!");
}
