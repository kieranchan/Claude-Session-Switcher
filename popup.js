/**
 * Claude Account Switcher - Optimized
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
    login: `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`
};

const $ = id => document.getElementById(id);
let accounts = [];
let editingIndex = -1;
let dragSourceIndex = -1;
let isDark = false;
let currentIP = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Load Data
    const data = await chrome.storage.local.get([STORAGE_KEY, THEME_KEY]);
    accounts = data[STORAGE_KEY] || [];
    
    // Theme Init
    isDark = data[THEME_KEY] === 'dark' || (!data[THEME_KEY] && window.matchMedia('(prefers-color-scheme: dark)').matches);
    applyTheme();

    // Event Listeners
    $('toggleAddBtn').onclick = () => toggleModal(true);
    $('cancelEditBtn').onclick = $('modalOverlay').onclick = () => toggleModal(false);
    $('saveBtn').onclick = saveAccount;
    $('grabBtn').onclick = grabKey;
    $('loginLinkBtn').onclick = logoutAndLogin;
    $('themeBtn').onclick = toggleTheme;
    $('toolsToggle').onclick = (e) => { e.stopPropagation(); $('toolsMenu').classList.toggle('show'); };
    document.onclick = () => $('toolsMenu').classList.remove('show');
    
    $('searchBox').oninput = render;
    $('exportBtn').onclick = exportData;
    $('importBtn').onclick = () => $('fileInput').click();
    $('fileInput').onchange = importData;
    $('clearAllBtn').onclick = clearData;
    
    $('netInfo').onclick = checkNetwork;
    $('ipCheckBtn').onclick = (e) => { e.stopPropagation(); if(currentIP) chrome.tabs.create({url: `https://scamalytics.com/ip/${currentIP}`}); };

    // Delegation for List Actions
    $('accountList').addEventListener('click', handleListClick);
    
    // Initial Render
    render();
    checkNetwork();
});

// --- Core Logic ---

async function saveAccount() {
    const name = $('inputName').value.trim();
    let key = $('inputKey').value.trim();
    if (!name || !key) return showToast("请填写完整");
    if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);

    if (editingIndex >= 0) {
        accounts[editingIndex] = { ...accounts[editingIndex], name, key };
        showToast("已更新");
    } else {
        if (accounts.some(a => a.key === key)) return showToast("Key 已存在");
        accounts.push({ name, key });
        showToast("已保存");
    }
    await chrome.storage.local.set({ [STORAGE_KEY]: accounts });
    toggleModal(false);
    render();
}

async function grabKey() {
    try {
        const cookie = await chrome.cookies.get({ url: CLAUDE_URL, name: COOKIE_NAME });
        if (!cookie) return showToast("未登录");
        
        $('inputKey').value = decodeURIComponent(cookie.value);
        
        // Extract Username from DOM
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            const res = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => document.querySelector('span.w-full.text-start.block.truncate')?.textContent.trim()
            });
            if (res?.[0]?.result) $('inputName').value = res[0].result;
        }
        $('inputName').focus();
    } catch { showToast("获取失败"); }
}

async function switchAccount(key) {
    if (!key) return;
    await chrome.cookies.set({
        url: CLAUDE_URL, name: COOKIE_NAME, value: key, domain: ".claude.ai",
        path: "/", secure: true, sameSite: "lax", expirationDate: (Date.now()/1000) + (86400*30)
    });
    await chrome.storage.local.set({ lastActiveKey: key });
    
    const [tab] = await chrome.tabs.query({ url: "*://claude.ai/*" });
    if (tab) {
        await chrome.tabs.update(tab.id, { url: "https://claude.ai/chats", active: true });
        chrome.windows.update(tab.windowId, { focused: true });
    } else {
        chrome.tabs.create({ url: "https://claude.ai/chats" });
    }
    render();
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

// --- UI & Helpers ---

function toggleModal(show) {
    const el = $('editForm'), overlay = $('modalOverlay');
    if (show) {
        $('modalTitle').textContent = editingIndex === -1 ? "添加账号" : "编辑账号";
        el.classList.add('open'); overlay.classList.add('open');
        $('inputName').focus();
    } else {
        el.classList.remove('open'); overlay.classList.remove('open');
        $('inputName').value = $('inputKey').value = '';
        editingIndex = -1;
    }
}

async function render() {
    const list = $('accountList');
    list.innerHTML = '';
    const filter = $('searchBox').value.toLowerCase();
    
    const cookie = await chrome.cookies.get({ url: CLAUDE_URL, name: COOKIE_NAME }).catch(() => null);
    const activeKey = cookie ? decodeURIComponent(cookie.value) : "";
    const now = Date.now();

    accounts.forEach((acc, idx) => {
        if (filter && !acc.name.toLowerCase().includes(filter)) return;

        const li = document.createElement('li');
        li.className = `account-card ${acc.key === activeKey ? 'active' : ''}`;
        li.draggable = true;
        li.dataset.index = idx;
        
        let badges = acc.key === activeKey ? `<span class="badge badge-current">Current</span>` : '';
        if (acc.availableAt && acc.availableAt > now) {
            const min = Math.ceil((acc.availableAt - now) / 60000);
            badges += `<span class="badge badge-limit">⏳ ${min > 60 ? Math.floor(min/60)+'h' : min+'m'}</span>`;
        }

        li.innerHTML = `
            <div class="account-info">
                <div class="account-header"><span class="account-name">${acc.name || '未命名'}</span><div class="badges">${badges}</div></div>
                <div class="account-key">${acc.key.slice(0,10)}...${acc.key.slice(-6)}</div>
            </div>
            <div class="account-actions">
                <button class="icon-btn action-limit">${ICONS.clock}</button>
                <button class="icon-btn action-copy">${ICONS.copy}</button>
                <button class="icon-btn action-edit">${ICONS.edit}</button>
                <button class="icon-btn action-delete delete">${ICONS.trash}</button>
            </div>`;
        
        // Drag Events
        li.ondragstart = () => { dragSourceIndex = idx; li.classList.add('dragging'); };
        li.ondragover = e => { e.preventDefault(); li.classList.add('drag-over'); };
        li.ondragleave = () => li.classList.remove('drag-over');
        li.ondrop = async (e) => {
            e.stopPropagation();
            li.classList.remove('drag-over');
            if(dragSourceIndex === idx) return;
            accounts.splice(idx, 0, accounts.splice(dragSourceIndex, 1)[0]);
            await chrome.storage.local.set({ [STORAGE_KEY]: accounts });
            render();
        };
        li.ondragend = () => { li.classList.remove('dragging'); document.querySelectorAll('.drag-over').forEach(e=>e.classList.remove('drag-over')); };
        
        list.appendChild(li);
    });
    
    if(!list.hasChildNodes()) list.innerHTML = `<div class="empty-state">📭 无账号</div>`;
}

function handleListClick(e) {
    const li = e.target.closest('li');
    if (!li) return;
    const idx = parseInt(li.dataset.index);
    const acc = accounts[idx];

    if (e.target.closest('.action-limit')) {
        const h = parseFloat(prompt("冷却时间(小时), 0清除:", "4"));
        if (!isNaN(h)) {
            if (h <= 0) delete acc.availableAt;
            else acc.availableAt = Date.now() + (h * 3600000);
            chrome.storage.local.set({ [STORAGE_KEY]: accounts }).then(render);
        }
    } else if (e.target.closest('.action-copy')) {
        navigator.clipboard.writeText(acc.key);
        showToast("已复制");
    } else if (e.target.closest('.action-edit')) {
        editingIndex = idx;
        $('inputName').value = acc.name;
        $('inputKey').value = acc.key;
        toggleModal(true);
    } else if (e.target.closest('.action-delete')) {
        if(confirm("确定删除?")) {
            accounts.splice(idx, 1);
            chrome.storage.local.set({ [STORAGE_KEY]: accounts }).then(render);
        }
    } else {
        switchAccount(acc.key);
    }
}

// --- Utils ---

async function checkNetwork() {
    try {
        const res = await fetch('https://ipwho.is/');
        const data = await res.json();
        if(data.success) {
            $('ipText').textContent = currentIP = data.ip;
            $('geoText').textContent = `${data.city}, ${data.country_code}`;
            $('netDot').classList.add('online');
        }
    } catch { $('ipText').textContent = "Error"; }
}

function toggleTheme() {
    isDark = !isDark;
    applyTheme();
    chrome.storage.local.set({ [THEME_KEY]: isDark ? 'dark' : 'light' });
}

function applyTheme() {
    document.body.classList.toggle('dark-mode', isDark);
    $('themeBtn').innerHTML = isDark ? ICONS.sun : ICONS.moon;
}

function showToast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 3000);
}

function exportData() {
    const blob = new Blob([JSON.stringify(accounts, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `claude_accounts.json`; a.click();
}

function importData(e) {
    const reader = new FileReader();
    reader.onload = async (ev) => {
        try {
            const json = JSON.parse(ev.target.result);
            if(Array.isArray(json)) {
                json.forEach(a => { if(!accounts.some(x=>x.key===a.key)) accounts.push(a); });
                await chrome.storage.local.set({ [STORAGE_KEY]: accounts });
                render(); showToast(`导入成功`);
            }
        } catch { showToast("格式错误"); }
    };
    if(e.target.files[0]) reader.readAsText(e.target.files[0]);
}

function clearData() {
    if(confirm("清空不可恢复!")) {
        accounts = [];
        chrome.storage.local.set({ [STORAGE_KEY]: [] }).then(render);
    }
}
