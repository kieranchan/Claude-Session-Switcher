// 常量定义
const CLAUDE_URL = "https://claude.ai";
const COOKIE_NAME = "sessionKey";
const COOKIE_DOMAIN = ".claude.ai";

// 状态变量
let editingIndex = -1;
let dragStartIndex = -1;
let currentIP = "";

document.addEventListener('DOMContentLoaded', async () => {
    refreshList(); // 初始化加载
    checkNetworkInfo();

    document.getElementById('addBtn').addEventListener('click', handleSaveOrUpdate);
    document.getElementById('grabBtn').addEventListener('click', autoGrabKey);
    document.getElementById('clearBtn').addEventListener('click', resetFormAndLogout);
    document.getElementById('searchBox').addEventListener('input', filterAccounts);

    document.getElementById('ipCard').addEventListener('click', (e) => {
        if(e.target.closest('#safetyBtn')) return;
        document.getElementById('ipText').textContent = "刷新中...";
        checkNetworkInfo();
    });

    document.getElementById('safetyBtn').addEventListener('click', () => {
        if(currentIP) chrome.tabs.create({ url: `https://scamalytics.com/ip/${currentIP}` });
        else alert("请等待 IP 检测完成");
    });

    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', handleImportFile);
});

/* ================== 核心功能：切换账号 (含自动聚焦) ================== */

async function switchAccount(key) {
    if (!key) return;
    try {
        // 1. 先清除旧 Cookie
        await chrome.cookies.remove({ url: CLAUDE_URL, name: COOKIE_NAME });

        // 2. 设置新 Cookie
        await chrome.cookies.set({
            url: CLAUDE_URL,
            name: COOKIE_NAME,
            value: key,
            domain: COOKIE_DOMAIN,
            path: "/",
            secure: true,
            sameSite: "lax",
            expirationDate: (Date.now() / 1000) + (86400 * 30)
        });

        // 保存当前活跃的 key，供 content script 使用
        await chrome.storage.local.set({ lastActiveKey: key });

        // 3. 处理页面跳转 + 聚焦 (NEW!)
        const tabs = await chrome.tabs.query({ url: "*://claude.ai/*" });
        if (tabs.length > 0) {
            const tabId = tabs[0].id;
            const windowId = tabs[0].windowId;

            // A. 更新 URL 并设置为 "active: true" (这会让标签页跳到最前)
            await chrome.tabs.update(tabId, {
                url: "https://claude.ai/chats",
                active: true
            });

            // B. 确保该标签页所在的窗口也是最顶层的 (防止窗口在后面)
            await chrome.windows.update(windowId, { focused: true });
        } else {
            // C. 没找到就新建 (新建默认就是 active 的)
            await chrome.tabs.create({ url: "https://claude.ai/chats" });
        }

        // 4. 立即更新 UI
        setTimeout(() => refreshList(key), 50);

    } catch (e) {
        console.error(e);
        alert("切换失败");
    }
}

/* ================== 列表渲染 ================== */

async function refreshList(optionalActiveKey = null) {
    const { accounts = [] } = await chrome.storage.local.get('accounts');
    const listEl = document.getElementById('accountList');
    listEl.innerHTML = '';

    let currentVal = "";
    if (optionalActiveKey) {
        currentVal = optionalActiveKey;
    } else {
        const currentCookie = await chrome.cookies.get({ url: CLAUDE_URL, name: COOKIE_NAME });
        currentVal = currentCookie ? decodeURIComponent(currentCookie.value) : "";
    }

    const now = Date.now();
    const fragment = document.createDocumentFragment();

    accounts.forEach((acc, index) => {
        const li = document.createElement('li');
        li.setAttribute('draggable', true);
        li.dataset.index = index;
        li.dataset.key = acc.key;
        li.dataset.name = acc.name;

        // Check limit
        const isLimited = acc.availableAt && acc.availableAt > now;
        let limitText = "";
        if (isLimited) {
            const diff = acc.availableAt - now;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.ceil((diff % (1000 * 60 * 60)) / (1000 * 60));
            limitText = `CD: ${hours}h ${mins}m`;
            li.classList.add('limited');
        }

        if (currentVal === acc.key) li.classList.add('active');

        li.innerHTML = `
            <div class="account-info" title="点击切换账号">
                <span class="account-name">
                    <span class="name-text">${acc.name}</span> 
                    <span class="current-badge">Current</span>
                    <span class="limit-badge">${limitText}</span>
                </span>
                <span class="account-key">Key: ${acc.key.substring(0, 10)}...${acc.key.substring(acc.key.length - 6)}</span>
            </div>
            <div class="action-group">
                <button class="icon-btn limit-btn" title="标记限制">⏳</button>
                <button class="icon-btn copy-btn" title="复制 Key">📋</button>
                <button class="icon-btn edit-btn" title="修改">✏️</button>
                <button class="icon-btn del-btn" title="删除">🗑️</button>
            </div>
        `;
        
        // Drag events still need individual attachment or careful delegation (native drag is tricky with delegation)
        // Keeping drag events here for stability as they are specific to the row
        addDragEvents(li, index);
        
        fragment.appendChild(li);
    });
    
    listEl.appendChild(fragment);

    // Ensure we don't add multiple delegation listeners if refreshList is called multiple times
    if (!listEl.hasAttribute('data-listening')) {
        listEl.setAttribute('data-listening', 'true');
        listEl.addEventListener('click', async (e) => {
            const li = e.target.closest('li');
            if (!li) return;
            
            const index = parseInt(li.dataset.index);
            const key = li.dataset.key;
            const name = li.dataset.name;
            const { accounts } = await chrome.storage.local.get('accounts');

            // Handle Buttons
            if (e.target.closest('.limit-btn')) {
                handleSetLimit(index);
            } else if (e.target.closest('.copy-btn')) {
                handleCopy(key, e.target.closest('.copy-btn'));
            } else if (e.target.closest('.edit-btn')) {
                startEdit(index, name, key);
            } else if (e.target.closest('.del-btn')) {
                if(confirm(`确定删除 ${name} 吗？`)) {
                    accounts.splice(index, 1);
                    await chrome.storage.local.set({ accounts });
                    if (editingIndex === index) resetFormUI();
                    refreshList();
                }
            } else if (e.target.closest('.account-info')) {
                // Main click area (Switch Account)
                switchAccount(key);
            }
        });
    }

    const searchVal = document.getElementById('searchBox').value;
    if (searchVal) {
        const event = { target: document.getElementById('searchBox') };
        filterAccounts(event);
    }
}

/* ================== 网络检测 ================== */

async function checkNetworkInfo() {
    try {
        const response = await fetch('https://ipwho.is/');
        const data = await response.json();
        if (data.success) {
            currentIP = data.ip;
            document.getElementById('ipText').textContent = data.ip;
            document.getElementById('geoText').textContent = `${data.city}, ${data.country_code}`;
            document.getElementById('ispText').textContent = data.connection.isp || data.connection.org || "未知ISP";
            document.getElementById('geoText').style.color = '#d97757';
        } else { throw new Error("API Limit"); }
    } catch (e) {
        document.getElementById('ipText').textContent = "检测失败";
        document.getElementById('geoText').textContent = "网络错误";
    }
}

/* ================== 其他辅助函数 ================== */

async function handleSaveOrUpdate() {
    const nameInput = document.getElementById('accName');
    const keyInput = document.getElementById('accKey');
    const name = nameInput.value.trim();
    const key = keyInput.value.trim();
    if (!name || !key) { alert("请填写完整信息"); return; }
    const { accounts = [] } = await chrome.storage.local.get('accounts');
    if (editingIndex >= 0) {
        // 保留原有的 limit 信息
        const oldAcc = accounts[editingIndex];
        accounts[editingIndex] = { ...oldAcc, name, key };
        editingIndex = -1;
    } else {
        if (accounts.some(a => a.key === key)) { alert("Key 已存在"); return; }
        accounts.push({ name, key });
    }
    await chrome.storage.local.set({ accounts });
    resetFormUI();
    refreshList();
}

function filterAccounts(e) {
    const term = e.target.value.toLowerCase();
    const listItems = document.querySelectorAll('#accountList li');
    listItems.forEach(li => {
        const nameEl = li.querySelector('.name-text');
        const name = nameEl ? nameEl.textContent.toLowerCase() : "";
        li.style.display = name.includes(term) ? 'flex' : 'none';
    });
}

function addDragEvents(li, index) {
    li.addEventListener('dragstart', () => { dragStartIndex = index; li.classList.add('dragging'); });
    li.addEventListener('dragover', (e) => { e.preventDefault(); li.classList.add('drag-over'); });
    li.addEventListener('dragleave', () => { li.classList.remove('drag-over'); });
    li.addEventListener('drop', async () => {
        li.classList.remove('drag-over');
        swapItems(dragStartIndex, index);
    });
    li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
}

async function swapItems(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const { accounts = [] } = await chrome.storage.local.get('accounts');
    const itemMoved = accounts.splice(fromIndex, 1)[0];
    accounts.splice(toIndex, 0, itemMoved);
    await chrome.storage.local.set({ accounts });
    refreshList();
}

async function exportData() {
    const { accounts = [] } = await chrome.storage.local.get('accounts');
    if (accounts.length === 0) { alert("无数据"); return; }
    const content = JSON.stringify(accounts, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claude_accounts_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

async function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        let newAccounts = [];
        try { newAccounts = JSON.parse(text); }
        catch (err) {
            text.split('\n').forEach(line => {
                line = line.trim();
                if (!line || line.startsWith("Format:")) return;
                let parts = line.includes('|') ? line.split('|') : line.split(',');
                if (parts.length >= 2) newAccounts.push({ name: parts[0].trim(), key: parts[1].trim() });
            });
        }
        if (newAccounts.length === 0) { alert("无效文件"); return; }
        const { accounts = [] } = await chrome.storage.local.get('accounts');
        let count = 0;
        newAccounts.forEach(nw => {
            if (nw.key && nw.key.startsWith("sk-ant") && !accounts.some(a => a.key === nw.key)) {
                accounts.push({ name: nw.name || "未命名", key: nw.key });
                count++;
            }
        });
        await chrome.storage.local.set({ accounts });
        alert(`导入 ${count} 个`);
        refreshList();
        event.target.value = '';
    };
    reader.readAsText(file);
}

function startEdit(index, name, key) {
    editingIndex = index;
    document.getElementById('accName').value = name;
    document.getElementById('accKey').value = key;
    const addBtn = document.getElementById('addBtn');
    addBtn.textContent = "🔄 更新";
    addBtn.classList.add('updating');
    document.getElementById('accName').focus();
}

function handleCopy(text, btnElement) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btnElement.textContent;
        btnElement.textContent = "✅";
        setTimeout(() => btnElement.textContent = originalText, 1000);
    });
}

function resetFormUI() {
    document.getElementById('accName').value = '';
    document.getElementById('accKey').value = '';
    editingIndex = -1;
    const addBtn = document.getElementById('addBtn');
    addBtn.textContent = "💾 保存账号";
    addBtn.classList.remove('updating');
}

async function resetFormAndLogout() {
    resetFormUI();
    try {
        await chrome.cookies.remove({ url: CLAUDE_URL, name: COOKIE_NAME });
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0] && tabs[0].url.includes("claude.ai")) chrome.tabs.reload(tabs[0].id);
        refreshList();
    } catch (e) {}
}

async function autoGrabKey() {
    try {
        const cookie = await chrome.cookies.get({ url: CLAUDE_URL, name: COOKIE_NAME });
        if (cookie) {
            document.getElementById('accKey').value = decodeURIComponent(cookie.value);
            document.getElementById('accName').focus();
        } else { alert("未登录"); }
    } catch (e) {}
}

/* ================== 新增：限制管理 ================== */

async function handleSetLimit(index) {
    const { accounts = [] } = await chrome.storage.local.get('accounts');
    // Prompt 用户输入小时数
    const input = prompt("该账号需要冷却多久？(单位：小时)\n输入 0 或留空则清除限制\n例如: 5 或 2.5", "4");
    
    if (input === null) return; // 用户取消

    const hours = parseFloat(input);
    
    if (!input || isNaN(hours) || hours <= 0) {
        // 清除限制
        delete accounts[index].availableAt;
    } else {
        // 设置限制时间戳
        accounts[index].availableAt = Date.now() + (hours * 60 * 60 * 1000);
    }

    await chrome.storage.local.set({ accounts });
    refreshList();
}
