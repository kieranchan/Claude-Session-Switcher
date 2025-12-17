// content.js - Claude Limit Detector (High Performance Optimized)

// Configuration
const CONFIG = {
    // Regex matches: "until 5 PM", "until 10:30 AM", etc.
    LIMIT_REGEX: /until\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i,
    THROTTLE_MS: 2000, // Check at most every 2 seconds during active streaming
    MAX_NODES_PER_FRAME: 100 // Time slicing: Check 100 nodes per frame to avoid freezing
};

let isProcessing = false;
let throttleTimer = null;
let observer = null;

// --- Initialization ---

function init() {
    // Use MutationObserver to detect changes efficiently
    // We observe the body for added nodes (toast messages or new chat bubbles)
    observer = new MutationObserver(handleMutations);
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
    
    // Initial check in case limit is already present
    scheduleCheck();
}

// --- Optimization Strategy: Throttled Mutation Handling ---

function handleMutations(mutations) {
    if (throttleTimer) return; // Drop if within cooldown

    throttleTimer = setTimeout(() => {
        throttleTimer = null;
        scheduleCheck();
    }, CONFIG.THROTTLE_MS);
}

// --- Optimization Strategy: Time Slicing & TreeWalker ---

function scheduleCheck() {
    if (isProcessing) return;
    isProcessing = true;

    // Use requestAnimationFrame to run check without blocking UI thread
    requestAnimationFrame(() => performOptimizedSearch());
}

function performOptimizedSearch() {
    try {
        // Optimization: Create a TreeWalker to iterate ONLY text nodes.
        // We start from the end of the document because "Limit" messages 
        // usually appear at the bottom (chat stream) or as appended Toasts.
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Filter out hidden/irrelevant nodes if possible to save regex cycles
                    // (Note: checking visibility is expensive, so we skip that and rely on fast regex)
                    const txt = node.nodeValue;
                    // Pre-filter: fast string check before regex
                    if (txt && txt.length > 5 && txt.includes("until")) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );

        // Move to the last node to start reverse traversal
        let currentNode = walker.lastChild(); 
        
        let nodesChecked = 0;
        let matchFound = false;

        // Process nodes in chunks (Time Slicing logic could be expanded here if needed, 
        // but since we filter 'until' strictly, iteration is extremely fast)
        while (currentNode) {
            const text = currentNode.nodeValue;
            const match = text.match(CONFIG.LIMIT_REGEX);
            
            if (match) {
                const timeStr = match[1];
                markAccountLimited(timeStr);
                matchFound = true;
                break; // Early exit immediately upon finding
            }

            // Safety break to prevent infinite loops in weird DOMs
            if (++nodesChecked > 5000) break; 

            currentNode = walker.previousNode();
        }

    } catch (e) {
        console.error("Claude Switcher: Search error", e);
    } finally {
        isProcessing = false;
    }
}

// --- Logic: Account Marking (Unchanged) ---

async function markAccountLimited(timeStr) {
    try {
        const { lastActiveKey, accounts } = await chrome.storage.local.get(['lastActiveKey', 'accounts']);
        if (!lastActiveKey || !accounts) return;

        const index = accounts.findIndex(a => a.key === lastActiveKey);
        if (index === -1) return;

        const limitTime = parseNextTimeOccurrence(timeStr);
        const currentLimit = accounts[index].availableAt;
        
        // Debounce: If already marked with approximately same time (+/- 1 min), skip write
        if (currentLimit && Math.abs(currentLimit - limitTime) < 60000) return;

        accounts[index].availableAt = limitTime;
        await chrome.storage.local.set({ accounts });
        
        showToast(`Limit detected: ${timeStr}`);
    } catch (e) {}
}

function parseNextTimeOccurrence(timeStr) {
    const now = new Date();
    const d = new Date();
    // Normalize time string
    const [time, modifier] = timeStr.trim().split(/\s+/);
    let [hours, minutes] = time.split(':');
    
    hours = parseInt(hours, 10);
    minutes = minutes ? parseInt(minutes, 10) : 0;
    
    if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
    
    d.setHours(hours, minutes, 0, 0);
    // If the parsed time is earlier than now (e.g. 11 PM vs 1 AM next day), add 1 day
    // But be careful: 4 PM limit detected at 3 PM is today. 
    // 1 AM limit detected at 11 PM is tomorrow.
    if (d < now) d.setDate(d.getDate() + 1);
    
    return d.getTime();
}

function showToast(msg) {
    if (document.getElementById('claude-switcher-toast')) return;

    const div = document.createElement('div');
    div.id = 'claude-switcher-toast';
    Object.assign(div.style, {
        position: 'fixed', top: '20px', right: '20px',
        backgroundColor: '#d97757', color: 'white',
        padding: '8px 16px', borderRadius: '4px',
        zIndex: '2147483647', fontSize: '12px', // Max Z-Index
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)', pointerEvents: 'none',
        fontFamily: 'sans-serif'
    });
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}