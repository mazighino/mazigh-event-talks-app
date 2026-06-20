/**
 * BigQuery Release Pulse - Client App
 * Handles dynamic API fetching, rendering, search, filtering, statistics, and X sharing.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Cache UI elements
    const btnRefresh = document.getElementById('btn-refresh');
    const refreshIcon = document.getElementById('refresh-icon');
    const lastUpdatedTime = document.getElementById('last-updated-time');
    
    // Stats elements
    const statTotal = document.querySelector('#stat-total .stat-value');
    const statFeatures = document.querySelector('#stat-features .stat-value');
    const statAnnouncements = document.querySelector('#stat-announcements .stat-value');
    const statIssues = document.querySelector('#stat-issues .stat-value');
    
    // Search and Filters
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    const filterChips = document.querySelectorAll('.filter-chip');
    
    // State Containers
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const emptyState = document.getElementById('empty-state');
    const notesList = document.getElementById('notes-list');
    const btnRetry = document.getElementById('btn-retry');
    const btnResetFilters = document.getElementById('btn-reset-filters');
    
    // Modal elements
    const tweetModal = document.getElementById('tweet-modal');
    const modalClose = document.getElementById('modal-close');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCount = document.getElementById('char-count');
    const btnCopyTweet = document.getElementById('btn-copy-tweet');
    const btnPostTweet = document.getElementById('btn-post-tweet');
    const progressRing = document.getElementById('progress-ring-indicator');
    
    // Toast Notification
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toast-text');

    // Application State Variables
    let allUpdates = [];
    let activeFilter = 'all';
    let searchQuery = '';
    
    // Progress Ring settings
    const circleRadius = 14;
    const circleCircumference = 2 * Math.PI * circleRadius;
    if (progressRing) {
        progressRing.style.strokeDasharray = `${circleCircumference} ${circleCircumference}`;
        progressRing.style.strokeDashoffset = circleCircumference;
    }

    // Initialize Application
    loadReleaseNotes();

    // Event Listeners
    btnRefresh.addEventListener('click', () => loadReleaseNotes(true));
    btnRetry.addEventListener('click', () => loadReleaseNotes(true));
    btnResetFilters.addEventListener('click', resetFilters);
    
    // Search Interaction
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        searchClear.style.display = searchQuery.length > 0 ? 'block' : 'none';
        applyFiltersAndSearch();
    });
    
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClear.style.display = 'none';
        applyFiltersAndSearch();
        searchInput.focus();
    });

    // Filter Chips Interaction
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.getAttribute('data-filter');
            applyFiltersAndSearch();
        });
    });

    // Modal Interaction
    modalClose.addEventListener('click', closeComposerModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeComposerModal();
    });
    
    tweetTextarea.addEventListener('input', () => {
        updateComposerStats(tweetTextarea.value);
    });

    btnCopyTweet.addEventListener('click', () => {
        navigator.clipboard.writeText(tweetTextarea.value)
            .then(() => showToast('Tweet copied to clipboard!'))
            .catch(() => showToast('Failed to copy text', true));
    });

    // Reset Search & Filters
    function resetFilters() {
        searchInput.value = '';
        searchQuery = '';
        searchClear.style.display = 'none';
        
        filterChips.forEach(c => c.classList.remove('active'));
        document.getElementById('filter-all').classList.add('active');
        activeFilter = 'all';
        
        applyFiltersAndSearch();
    }

    // Fetch Release Notes from API
    async function loadReleaseNotes(forceRefresh = false) {
        showContainer(loadingState);
        hideContainer(notesList);
        hideContainer(errorState);
        hideContainer(emptyState);
        
        if (forceRefresh) {
            btnRefresh.disabled = true;
            refreshIcon.classList.add('spinning');
        }

        try {
            const url = forceRefresh ? '/api/release-notes?refresh=true' : '/api/release-notes';
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('API server returned an error');
            }
            
            const data = await response.json();
            allUpdates = data.updates || [];
            
            // Format check-in time
            const now = new Date();
            lastUpdatedTime.textContent = `Last checked: ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}`;
            
            calculateStats(allUpdates);
            applyFiltersAndSearch();
            
        } catch (err) {
            console.error('Error fetching release notes:', err);
            document.getElementById('error-message').textContent = err.message || 'Could not connect to Google Cloud documentation feeds.';
            showContainer(errorState);
            hideContainer(loadingState);
        } finally {
            if (forceRefresh) {
                btnRefresh.disabled = false;
                refreshIcon.classList.remove('spinning');
            }
        }
    }

    // Compute stats dashboard
    function calculateStats(updates) {
        const total = updates.length;
        let features = 0;
        let announcements = 0;
        let issues = 0;

        updates.forEach(up => {
            const type = up.type.toLowerCase();
            if (type.includes('feature')) features++;
            else if (type.includes('announcement')) announcements++;
            else if (type.includes('issue') || type.includes('fixed') || type.includes('deprecated')) issues++;
        });

        statTotal.textContent = total;
        statFeatures.textContent = features;
        statAnnouncements.textContent = announcements;
        statIssues.textContent = issues;
    }

    // Filter and search core logic
    function applyFiltersAndSearch() {
        hideContainer(loadingState);
        hideContainer(errorState);
        
        let filtered = allUpdates;

        // 1. Filter by category
        if (activeFilter !== 'all') {
            filtered = filtered.filter(up => {
                const type = up.type.toLowerCase();
                if (activeFilter === 'feature') return type.includes('feature');
                if (activeFilter === 'announcement') return type.includes('announcement');
                if (activeFilter === 'issue') return type.includes('issue') || type.includes('fixed') || type.includes('deprecated');
                return false;
            });
        }

        // 2. Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(up => {
                const matchType = up.type.toLowerCase().includes(searchQuery);
                const matchDate = up.date.toLowerCase().includes(searchQuery);
                const matchContent = up.text_content.toLowerCase().includes(searchQuery);
                return matchType || matchDate || matchContent;
            });
        }

        // Render result
        if (filtered.length === 0) {
            showContainer(emptyState);
            hideContainer(notesList);
        } else {
            hideContainer(emptyState);
            renderNotes(filtered);
            showContainer(notesList);
        }
    }

    // Render Cards in DOM
    function renderNotes(notes) {
        notesList.innerHTML = '';
        
        notes.forEach((note, index) => {
            const card = document.createElement('article');
            card.className = 'note-card';
            card.id = `card-${note.id.replace(/[^a-zA-Z0-9-]/g, '_')}`;
            
            // Set variables matching category colors
            const typeLower = note.type.toLowerCase();
            let cardColor = 'var(--primary)';
            let hoverColor = 'var(--card-hover-border)';
            let badgeClass = 'update';
            
            if (typeLower.includes('feature')) {
                cardColor = 'var(--color-feature)';
                hoverColor = 'rgba(16, 185, 129, 0.4)';
                badgeClass = 'feature';
            } else if (typeLower.includes('announcement')) {
                cardColor = 'var(--color-announcement)';
                hoverColor = 'rgba(167, 139, 250, 0.4)';
                badgeClass = 'announcement';
            } else if (typeLower.includes('issue') || typeLower.includes('fixed') || typeLower.includes('deprecated')) {
                cardColor = 'var(--color-issue)';
                hoverColor = 'rgba(248, 113, 113, 0.4)';
                badgeClass = 'issue';
            }
            
            card.style.setProperty('--card-indicator-color', cardColor);
            card.style.setProperty('--card-hover-color', hoverColor);
            
            // Re-bind click handlers inside template
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-badges">
                        <span class="badge-date"><i class="fa-regular fa-calendar-days"></i> ${note.date}</span>
                        <span class="badge-type ${badgeClass}">${note.type}</span>
                    </div>
                    <div class="card-actions-top">
                        <button class="btn-card-action btn-copy-card" title="Copy text to clipboard">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    ${note.content}
                </div>
                <div class="card-footer">
                    <button class="btn btn-secondary btn-copy-link" style="padding: 0.5rem 1rem; font-size: 0.8rem;">
                        <i class="fa-solid fa-link"></i> Copy Link
                    </button>
                    <button class="btn btn-primary btn-tweet" style="padding: 0.5rem 1rem; font-size: 0.8rem;">
                        <i class="fa-brands fa-x-twitter"></i> Tweet Update
                    </button>
                </div>
            `;

            // Bind click handlers for this specific card
            card.querySelector('.btn-copy-card').addEventListener('click', () => {
                navigator.clipboard.writeText(`[${note.type} - ${note.date}]\n${note.text_content}`)
                    .then(() => showToast('Update copied to clipboard!'))
                    .catch(() => showToast('Failed to copy', true));
            });

            card.querySelector('.btn-copy-link').addEventListener('click', () => {
                // Generate a deep link using the ID as hash anchor
                const deepLink = `${window.location.origin}/#${card.id}`;
                navigator.clipboard.writeText(deepLink)
                    .then(() => showToast('Direct link copied!'))
                    .catch(() => showToast('Failed to copy', true));
            });

            card.querySelector('.btn-tweet').addEventListener('click', () => {
                openComposerModal(note);
            });
            
            notesList.appendChild(card);
        });

        // If deep linked anchor in URL, scroll to it smoothly
        if (window.location.hash) {
            const hash = window.location.hash;
            const element = document.querySelector(hash);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.style.borderColor = 'var(--primary)';
                    element.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.3)';
                }, 400);
            }
        }
    }

    // Tweet Share Helper logic
    function openComposerModal(note) {
        // Build initial text format
        // Ensure tweet fits within limits by truncating content text if needed
        const header = `BigQuery Release (${note.type} - ${note.date}):\n`;
        const footer = `\n\nRead details: https://cloud.google.com/bigquery/docs/release-notes #BigQuery`;
        
        // Allowed content length = 280 - header length - footer length
        const maxContentLen = 280 - header.length - footer.length - 5; // buffer
        
        let contentText = note.text_content;
        
        // Clean spaces and newlines
        contentText = contentText.replace(/\s+/g, ' ').trim();
        
        if (contentText.length > maxContentLen) {
            contentText = contentText.substring(0, maxContentLen - 3) + '...';
        }
        
        const fullTweetText = `${header}${contentText}${footer}`;
        
        tweetTextarea.value = fullTweetText;
        updateComposerStats(fullTweetText);
        
        tweetModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Lock background scroll
        tweetTextarea.focus();
    }

    function closeComposerModal() {
        tweetModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    function updateComposerStats(text) {
        const len = text.length;
        charCount.textContent = `${len} / 280`;
        
        // Set warning colors
        charCount.className = 'char-count';
        if (len > 250 && len <= 280) {
            charCount.classList.add('warning');
        } else if (len > 280) {
            charCount.classList.add('error');
        }

        // Draw Progress Ring
        const percentage = Math.min((len / 280) * 100, 100);
        const offset = circleCircumference - (percentage / 100) * circleCircumference;
        
        if (progressRing) {
            progressRing.style.strokeDashoffset = offset;
            
            // Change color dynamically
            if (len > 280) {
                progressRing.style.stroke = '#f87171'; // red
            } else if (len > 250) {
                progressRing.style.stroke = '#fb923c'; // orange
            } else {
                progressRing.style.stroke = '#38bdf8'; // blue
            }
        }

        // Configure Sharing Button
        if (len > 0 && len <= 280) {
            btnPostTweet.classList.remove('disabled');
            btnPostTweet.href = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
        } else {
            btnPostTweet.classList.add('disabled');
            btnPostTweet.href = '#';
        }
    }

    // Toast Message helper
    let toastTimeout;
    function showToast(message, isError = false) {
        clearTimeout(toastTimeout);
        toastText.textContent = message;
        
        if (isError) {
            toast.style.backgroundColor = 'var(--color-issue)';
            toast.style.boxShadow = '0 10px 25px rgba(248, 113, 113, 0.3)';
            toast.querySelector('i').className = 'fa-solid fa-circle-exclamation';
        } else {
            toast.style.backgroundColor = 'rgba(16, 185, 129, 0.95)';
            toast.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.3)';
            toast.querySelector('i').className = 'fa-solid fa-circle-check';
        }
        
        toast.classList.remove('hidden');
        
        toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    // Shell Container management utilities
    function showContainer(el) {
        el.classList.remove('hidden');
    }

    function hideContainer(el) {
        el.classList.add('hidden');
    }
});
