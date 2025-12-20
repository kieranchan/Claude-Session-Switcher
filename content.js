// content.js - Claude Limit Detector (High Performance Optimized)

// Configuration
const CONFIG = {
    // An array of regexes to test against.
    // Each regex must capture the time part (e.g., "5 PM" or "11:00 PM") in its first group.
    LIMIT_REGEXES: [
        /until\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i, // Free account: "available again until 5 PM"
        /Resets\s+(\d{1,2}:\d{2}\s*(?:AM|PM))/i      // Pro account: "Usage limit reached ∙ Resets 11:00 PM"
    ],
    THROTTLE_MS: 2000, // Check at most every 2 seconds during active streaming
    MAX_NODES_PER_FRAME: 100 // Time slicing: Check 100 nodes per frame to avoid freezing
};

let isProcessing = false;
let throttleTimer = null;
let observer = null;

// --- Initialization ---

function init() {
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

// --- Recursive search function to pierce Shadow DOM ---

function scheduleCheck() {
    if (isProcessing) return;
    isProcessing = true;
    requestAnimationFrame(() => {
        try {
            searchForLimitText(document.body);
        } catch(e) {
            console.error("Claude Switcher: Error during limit search", e);
        } finally {
            isProcessing = false;
        }
    });
}

function searchForLimitText(rootNode) {
    // 1. Search text nodes in the current root
    const walker = document.createTreeWalker(
        rootNode,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                const txt = node.nodeValue.trim();
                 if (txt && txt.length > 5 && (txt.includes("until") || txt.includes("Resets") || txt.includes("limit"))) {
                    return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_SKIP;
            }
        }
    );

    let currentNode = walker.lastChild();
    while (currentNode) {
        const text = currentNode.nodeValue;
        let match = null;

        for (const regex of CONFIG.LIMIT_REGEXES) {
            match = text.match(regex);
            if (match) break;
        }
        
        if (match) {
            const timeStr = match[1];
            markAccountLimited(timeStr);
            return true; // Found, stop all searching
        }
        currentNode = walker.previousNode();
    }

    // 2. Recurse into Shadow DOMs
    const allElements = rootNode.querySelectorAll('*');
    for (const element of allElements) {
        if (element.shadowRoot) {
            if (searchForLimitText(element.shadowRoot)) {
                return true; // Found in a nested shadow DOM
            }
        }
    }

    return false; // Not found in this root or any of its children
}


// --- Logic: Account Marking ---

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
    } catch (e) {
        console.error("Claude Switcher: Error in markAccountLimited function.", e);
    }
}

function parseNextTimeOccurrence(timeStr) {
    const now = new Date();
    const d = new Date();
    // Normalize time string
    const [time, modifier] = timeStr.trim().split(/\s+/);
    let [hours, minutes] = time.split(':');
    
    hours = parseInt(hours, 10);
    minutes = minutes ? parseInt(minutes, 10) : 0;
    
    if (modifier && modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (modifier && modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
    
    d.setHours(hours, minutes, 0, 0);

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