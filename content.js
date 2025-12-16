// content.js - Claude Limit Detector (Optimized)

// Regex patterns for limit messages
const LIMIT_REGEX = /until\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i;

let lastTextLength = 0;
const CHECK_INTERVAL = 2000; // Check every 2 seconds

// Use Polling instead of MutationObserver to save CPU during text streaming
setInterval(() => {
    // Optimization: Quick check on body text length
    // The limit message adds text, so length changes.
    // If length is stable, we might not need to regex (unless it's a replacement).
    // For safety, we check periodically.
    checkLimitMessage();
}, CHECK_INTERVAL);

async function checkLimitMessage() {
    try {
        const bodyText = document.body.innerText;
        
        // Simple optimization: If text is too short or hasn't changed much (heuristic)
        // But for "limits", it's critical, so we just run the fast regex.
        // The Regex is simple enough to run on the whole body string every 2s without lag.
        
        // Quick exit if keyword not found
        if (bodyText.indexOf("until") === -1) return;

        const match = bodyText.match(LIMIT_REGEX);
        if (match) {
            const timeStr = match[1]; 
            await markAccountLimited(timeStr);
        }
    } catch (e) {
        // Silent fail
    }
}

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
    const [time, modifier] = timeStr.split(/\s+/);
    let [hours, minutes] = time.split(':');
    
    hours = parseInt(hours, 10);
    minutes = minutes ? parseInt(minutes, 10) : 0;
    
    if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
    
    d.setHours(hours, minutes, 0, 0);
    if (d < now) d.setDate(d.getDate() + 1);
    
    return d.getTime();
}

function showToast(msg) {
    // Check if toast already exists to avoid stacking
    if (document.getElementById('claude-switcher-toast')) return;

    const div = document.createElement('div');
    div.id = 'claude-switcher-toast';
    Object.assign(div.style, {
        position: 'fixed', top: '20px', right: '20px',
        backgroundColor: '#d97757', color: 'white',
        padding: '8px 16px', borderRadius: '4px',
        zIndex: '10000', fontSize: '12px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)', pointerEvents: 'none'
    });
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}
