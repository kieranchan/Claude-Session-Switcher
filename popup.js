/**
 * Claude Account Switcher - Refactored with State Management and Components
 */
const CLAUDE_URL = "https://claude.ai";
const COOKIE_NAME = "sessionKey";
const STORAGE_KEY = "accounts";
const THEME_KEY = "user_theme";

// Simplified Icons
const ICONS = {
    copy: `<svg class="svg-icon" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    edit: `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    trash: `<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    clock: `<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    sun: `<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
    moon: `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`,
    login: `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`,
    save: `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`,
    grab: `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`
};

const $ = id => document.getElementById(id);

// --- State Management (Store) ---
function createStore(initialState = {}) {
    let state = initialState;
    const listeners = new Set();

    const setState = (updater) => {
        const newState = typeof updater === 'function' ? updater(state) : updater;
        state = { ...state, ...newState };
        publish();
    };

    const subscribe = (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    };

    const publish = () => {
        for (const listener of listeners) {
            listener(state);
        }
    };

    return {
        getState: () => state,
        setState,
        subscribe,
    };
}

// --- Components ---
function AccountCard(account, index, store) {
    const li = document.createElement('li');
    li.className = 'account-card';
    li.draggable = true;
    li.dataset.index = index;

    const update = (newAccount) => {
        account = newAccount;
        const { activeKey } = store.getState();
        li.classList.toggle('active', account.key === activeKey);

        let badges = account.key === activeKey ? `<span class="badge badge-current">Current</span>` : '';
        const now = Date.now();
        if (account.availableAt && account.availableAt > now) {
            const min = Math.ceil((account.availableAt - now) / 60000);
            badges += `<span class="badge badge-limit">⏳ ${min > 60 ? Math.floor(min/60)+'h' : min+'m'}</span>`;
        }
        
        const nameEl = li.querySelector('.account-name');
        if(nameEl) nameEl.textContent = account.name || '未命名';
        
        const nameInputEl = li.querySelector('.account-name-input');
        if(nameInputEl) nameInputEl.value = account.name || '未命名';
        
        const badgesEl = li.querySelector('.badges');
        if(badgesEl) badgesEl.innerHTML = badges;
    };

    li.innerHTML = `
        <div class="account-info">
            <div class="account-header">
                <span class="account-name"></span>
                <input type="text" class="account-name-input" style="display:none;" />
                <div class="badges"></div>
            </div>
            <div class="account-key">${account.key.slice(0,10)}...${account.key.slice(-6)}</div>
        </div>
        <div class="account-actions">
            <button class="icon-btn action-limit" title="Set Cooldown">${ICONS.clock}</button>
            <button class="icon-btn action-copy" title="Copy Key">${ICONS.copy}</button>
            <button class="icon-btn action-grab" title="Grab Username">${ICONS.grab}</button>
            <button class="icon-btn action-edit" title="Edit Name">${ICONS.edit}</button>
            <button class="icon-btn action-save" title="Save Name" style="display:none;">${ICONS.save}</button>
            <button class="icon-btn action-delete delete" title="Delete Account">${ICONS.trash}</button>
        </div>`;

    update(account);

    li.addEventListener('click', (e) => {
        if (e.target.closest('.account-actions')) return;
        switchAccount(account.key);
    });
    
    // Drag Events
    li.ondragstart = () => { 
        window.dragSourceIndex = index; 
        li.classList.add('dragging'); 
    };
    li.ondragover = e => { e.preventDefault(); li.classList.add('drag-over'); };
    li.ondragleave = () => li.classList.remove('drag-over');
    li.ondrop = async (e) => {
        e.stopPropagation();
        li.classList.remove('drag-over');
        if (window.dragSourceIndex === index) return;
        
        const { accounts } = store.getState();
        const newAccounts = [...accounts];
        const [draggedItem] = newAccounts.splice(window.dragSourceIndex, 1);
        newAccounts.splice(index, 0, draggedItem);

        await chrome.storage.local.set({ [STORAGE_KEY]: newAccounts });
        store.setState({ accounts: newAccounts });
    };
    li.ondragend = () => { 
        li.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(e => e.classList.remove('drag-over'));
    };

    return { element: li, update };
}

function App(store) {
    const listEl = $('accountList');
    let components = [];

    const render = (state) => {
        listEl.innerHTML = '';
        const { accounts, filter } = state;
        
        const filteredAccounts = accounts.filter(acc => !filter || acc.name.toLowerCase().includes(filter.toLowerCase()));

        if (filteredAccounts.length === 0) {
            listEl.innerHTML = `<div class="empty-state">📭 无账号</div>`;
            return;
        }

        components = filteredAccounts.map((acc, idx) => {
            const originalIndex = accounts.indexOf(acc);
            const card = AccountCard(acc, originalIndex, store);
            listEl.appendChild(card.element);
            return card;
        });
    };
    
    store.subscribe(render);
    render(store.getState());
}

// --- Main ---
document.addEventListener('DOMContentLoaded', async () => {
    const data = await chrome.storage.local.get([STORAGE_KEY, THEME_KEY]);
    const accounts = data[STORAGE_KEY] || [];
    const accountKeySet = new Set(accounts.map(acc => acc.key));

    const store = createStore({
        accounts,
        accountKeySet,
        activeKey: await getActiveKey(),
        filter: '',
    });

    window.store = store; // For easier debugging
    
    App(store);
    initEventListeners(store);
    
    // Theme Init
    const isDark = data[THEME_KEY] === 'dark' || (!data[THEME_KEY] && window.matchMedia('(prefers-color-scheme: dark)').matches);
    applyTheme(isDark);
    
    checkNetwork();
});

function initEventListeners(store) {
    $('toggleAddBtn').onclick = () => toggleModal(true);
    $('cancelEditBtn').onclick = $('modalOverlay').onclick = () => toggleModal(false);
    $('saveBtn').onclick = () => saveAccount(store);
    $('grabBtn').onclick = () => grabKey();
    $('loginLinkBtn').onclick = logoutAndLogin;
    
    $('themeBtn').onclick = () => {
        const newIsDark = !document.body.classList.contains('dark-mode');
        applyTheme(newIsDark);
        chrome.storage.local.set({ [THEME_KEY]: newIsDark ? 'dark' : 'light' });
    };

    $('toolsToggle').onclick = (e) => { e.stopPropagation(); $('toolsMenu').classList.toggle('show'); };
    document.onclick = () => $('toolsMenu').classList.remove('show');
    
    $('searchBox').oninput = debounce((e) => store.setState({ filter: e.target.value }), 300);
    
    $('exportBtn').onclick = () => exportData(store.getState().accounts);
    $('importBtn').onclick = () => $('fileInput').click();
    $('fileInput').onchange = (e) => importData(e, store);
    $('clearAllBtn').onclick = () => clearData(store);
    
    $('netInfo').onclick = checkNetwork;
    $('ipCheckBtn').onclick = (e) => { 
        e.stopPropagation();
        const { currentIP } = store.getState();
        if(currentIP) chrome.tabs.create({url: `https://scamalytics.com/ip/${currentIP}`}); 
    };

    $('accountList').addEventListener('click', (e) => handleListClick(e, store));
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('account-name-input')) {
            e.target.closest('li').querySelector('.action-save').click();
        }
    });
}

// --- Actions ---

async function saveAccount(store) {
    const name = $('inputName').value.trim();
    let key = $('inputKey').value.trim();
    if (!name || !key) return showToast("请填写完整");
    if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);

    const { accounts, accountKeySet } = store.getState();
    if (accountKeySet.has(key)) return showToast("Key 已存在");

    const newAccount = { name, key };
    const newAccounts = [...accounts, newAccount];
    
    await chrome.storage.local.set({ [STORAGE_KEY]: newAccounts });
    store.setState({ 
        accounts: newAccounts,
        accountKeySet: new Set(accountKeySet).add(key)
    });

    showToast("已保存");
    toggleModal(false);
}

async function grabKey(store, index = -1) {
    try {
        const cookie = await chrome.cookies.get({ url: CLAUDE_URL, name: COOKIE_NAME });
        if (!cookie) return showToast("未登录");
        const key = decodeURIComponent(cookie.value);
        
        let foundName = null;
        const tabs = await chrome.tabs.query({ url: "https://claude.ai/*" });
        if (tabs.length > 0) {
            try {
                const res = await chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => document.querySelector('span.w-full.text-start.block.truncate')?.textContent.trim()
                });
                if (res?.[0]?.result) foundName = res[0].result;
            } catch (e) { console.log("DOM grab failed", e); }
        }

        if (!foundName) {
            try {
                const res = await fetch("https://claude.ai/api/organizations", {
                    method: "GET",
                    headers: { "Content-Type": "application/json", "Cookie": `${COOKIE_NAME}=${key}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data?.[0]?.name) foundName = data[0].name;
                }
            } catch (e) { console.log("API grab failed", e); }
        }

        if (index >= 0) {
            if (foundName) {
                const { accounts } = store.getState();
                const newAccounts = [...accounts];
                newAccounts[index].name = foundName;

                await chrome.storage.local.set({ [STORAGE_KEY]: newAccounts });
                store.setState({ accounts: newAccounts });
                showToast("用户名已更新");
            } else {
                showToast("未能获取用户名");
            }
        } else {
            $('inputKey').value = key;
            if (foundName) $('inputName').value = foundName;
            $('inputName').focus();
        }
    } catch { showToast("获取失败"); }
}

async function switchAccount(key) {
    if (!key) return;
    
    await chrome.cookies.set({
        url: CLAUDE_URL, name: COOKIE_NAME, value: key, domain: ".claude.ai",
        path: "/", secure: true, sameSite: "lax", expirationDate: (Date.now()/1000) + (86400*30)
    });
    await chrome.storage.local.set({ lastActiveKey: key });

    window.store.setState({ activeKey: key });
    
    const [tab] = await chrome.tabs.query({ url: "*://claude.ai/*" });
    if (tab) {
        await chrome.tabs.update(tab.id, { url: "https://claude.ai/chats", active: true });
        chrome.windows.update(tab.windowId, { focused: true });
    } else {
        chrome.tabs.create({ url: "https://claude.ai/chats" });
    }
}

async function logoutAndLogin() {
    await chrome.cookies.remove({ url: CLAUDE_URL, name: COOKIE_NAME });
    const [tab] = await chrome.tabs.query({ url: "*://claude.ai/*" });
    if (tab) {
        await chrome.tabs.update(tab.id, { url: "https://claude.ai/login", active: true });
        chrome.windows.update(tab.windowId, { focused: true });
    } else {
        chrome.tabs.create({ url: "https://claude.ai/login" });
    }
}

function handleListClick(e, store) {
    const li = e.target.closest('li');
    if (!li) return;
    const idx = parseInt(li.dataset.index);
    const { accounts } = store.getState();
    const acc = accounts[idx];

    const target = e.target.closest('.icon-btn');
    if (!target) return;

    if (target.classList.contains('action-limit')) {
        const h = parseFloat(prompt("冷却时间(小时), 0清除:", "4"));
        if (!isNaN(h)) {
            const newAccounts = [...accounts];
            if (h <= 0) delete newAccounts[idx].availableAt;
            else newAccounts[idx].availableAt = Date.now() + (h * 3600000);
            
            chrome.storage.local.set({ [STORAGE_KEY]: newAccounts }).then(() => {
                store.setState({ accounts: newAccounts });
            });
        }
    } else if (target.classList.contains('action-copy')) {
        navigator.clipboard.writeText(acc.key);
        showToast("已复制");
    } else if (target.classList.contains('action-grab')) {
        grabKey(store, idx);
    } else if (target.classList.contains('action-edit')) {
        toggleEditState(li, true);
        li.querySelector('.account-name-input').onclick = (e) => e.stopPropagation();
    } else if (target.classList.contains('action-save')) {
        const newName = li.querySelector('.account-name-input').value.trim();
        if (newName) {
            const newAccounts = [...accounts];
            newAccounts[idx].name = newName;
            
            chrome.storage.local.set({ [STORAGE_KEY]: newAccounts }).then(() => {
                store.setState({ accounts: newAccounts });
                showToast("已更新");
                toggleEditState(li, false);
            });
        }
    } else if (target.classList.contains('action-delete')) {
        if(confirm("确定删除?")) {
            const newAccounts = accounts.filter((_, i) => i !== idx);
            const newAccountKeySet = new Set(newAccounts.map(a => a.key));
            
            chrome.storage.local.set({ [STORAGE_KEY]: newAccounts }).then(() => {
                store.setState({ accounts: newAccounts, accountKeySet: newAccountKeySet });
            });
        }
    }
}

function importData(e, store) {
    const reader = new FileReader();
    reader.onload = async (ev) => {
        try {
            const json = JSON.parse(ev.target.result);
            if(Array.isArray(json)) {
                const { accounts, accountKeySet } = store.getState();
                let newAccounts = [...accounts];
                let newKeys = new Set(accountKeySet);
                let addedCount = 0;

                json.forEach(a => {
                    if (a.key && !newKeys.has(a.key)) {
                        newAccounts.push(a);
                        newKeys.add(a.key);
                        addedCount++;
                    }
                });
                
                if (addedCount > 0) {
                    await chrome.storage.local.set({ [STORAGE_KEY]: newAccounts });
                    store.setState({ accounts: newAccounts, accountKeySet: newKeys });
                    showToast(`导入 ${addedCount} 个账号`);
                } else {
                    showToast("没有新账号");
                }
            }
        } catch { showToast("格式错误"); }
    };
    if(e.target.files[0]) reader.readAsText(e.target.files[0]);
}

function clearData(store) {
    if(confirm("清空不可恢复!")) {
        chrome.storage.local.set({ [STORAGE_KEY]: [] }).then(() => {
            store.setState({ accounts: [], accountKeySet: new Set() });
        });
    }
}

// --- UI & Helpers ---

function toggleModal(show) {
    const el = $('editForm'), overlay = $('modalOverlay');
    if (show) {
        $('modalTitle').textContent = "添加账号";
        el.classList.add('open'); overlay.classList.add('open');
        $('inputName').focus();
    } else {
        el.classList.remove('open'); overlay.classList.remove('open');
        $('inputName').value = $('inputKey').value = '';
    }
}

async function getActiveKey() {
    const cookie = await chrome.cookies.get({ url: CLAUDE_URL, name: COOKIE_NAME }).catch(() => null);
    return cookie ? decodeURIComponent(cookie.value) : "";
}

function toggleEditState(li, isEditing) {
    li.querySelector('.account-name').style.display = isEditing ? 'none' : 'inline-block';
    li.querySelector('.account-name-input').style.display = isEditing ? 'inline-block' : 'none';
    li.querySelector('.action-edit').style.display = isEditing ? 'none' : 'inline-block';
    li.querySelector('.action-save').style.display = isEditing ? 'inline-block' : 'none';

    if (isEditing) {
        li.querySelector('.account-name-input').focus();
        li.querySelector('.account-name-input').select();
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

async function checkNetwork() {
    try {
        const res = await fetch('https://ipwho.is/');
        const data = await res.json();
        if(data.success) {
            window.store.setState({ currentIP: data.ip });
            $('ipText').textContent = data.ip;
            $('geoText').textContent = `${data.city}, ${data.country_code}`;
            $('netDot').classList.add('online');
        }
    } catch { 
        $('ipText').textContent = "Error"; 
        window.store.setState({ currentIP: null });
    }
}

function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    $('themeBtn').innerHTML = isDark ? ICONS.sun : ICONS.moon;
}

function showToast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 3000);
}

function exportData(accounts) {
    const blob = new Blob([JSON.stringify(accounts, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `claude_accounts.json`; a.click();
    URL.revokeObjectURL(url);
}
