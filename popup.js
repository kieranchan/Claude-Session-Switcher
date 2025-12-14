// 常量定义
const CLAUDE_URL = "https://claude.ai";
const COOKIE_NAME = "sessionKey";
const COOKIE_DOMAIN = ".claude.ai";

// 状态变量
let editingIndex = -1;
let dragStartIndex = -1;
let currentIP = ""; // 存储当前 IP 用于跳转查询

document.addEventListener('DOMContentLoaded', async () => {
    refreshList();
    checkNetworkInfo(); // 启动检测

    document.getElementById('addBtn').addEventListener('click', handleSaveOrUpdate);
    document.getElementById('grabBtn').addEventListener('click', autoGrabKey);
    document.getElementById('clearBtn').addEventListener('click', resetFormAndLogout);
    document.getElementById('searchBox').addEventListener('input', filterAccounts);

    // IP 区域点击刷新
    document.getElementById('ipCard').addEventListener('click', (e) => {
        // 如果点的是安全体检按钮，不触发刷新
        if(e.target.closest('#safetyBtn')) return;

        document.getElementById('ipText').textContent = "刷新中...";
        checkNetworkInfo();
    });

    // 安全体检跳转
    document.getElementById('safetyBtn').addEventListener('click', () => {
        if(currentIP) {
            // 跳转到专业的 IP 欺诈查询网站
            chrome.tabs.create({ url: `https://scamalytics.com/ip/${currentIP}` });
        } else {
            alert("请等待 IP 检测完成");
        }
    });

    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', handleImportFile);
});

/* ================== 新增：网络信息检测 (Geo + ISP) ================== */
async function checkNetworkInfo() {
    try {
        // 使用 ipwho.is (免费, 无需 Key, 支持 HTTPS, 含 Geo 和 ISP)
        const response = await fetch('https://ipwho.is/');
        const data = await response.json();

        if (data.success) {
            currentIP = data.ip;
            document.getElementById('ipText').textContent = data.ip;

            // 显示地理位置: 城市, 国家代码 (如: Los Angeles, US)
            document.getElementById('geoText').textContent = `${data.city}, ${data.country_code}`;

            // 显示运营商 (ISP)
            document.getElementById('ispText').textContent = data.connection.isp || data.connection.org || "未知ISP";

            // 简单的视觉提示：如果 IP 和当前时区不符，或者看起来正常，改变颜色
            document.getElementById('geoText').style.color = '#d97757';
        } else {
            throw new Error("API Limit");
        }
    } catch (e) {
        console.error(e);
        document.getElementById('ipText').textContent = "检测失败";
        document.getElementById('geoText').textContent = "网络错误";
    }
}

/* ================== 核心功能 ================== */

async function handleSaveOrUpdate() {
    const nameInput = document.getElementById('accName');
    const keyInput = document.getElementById('accKey');
    const name = nameInput.value.trim();
    const key = keyInput.value.trim();
    if (!name || !key) { alert("请填写完整信息"); return; }
    const { accounts = [] } = await chrome.storage.local.get('accounts');
    if (editingIndex >= 0) {
        accounts[editingIndex] = { name, key };
        editingIndex = -1;
    } else {
        if (accounts.some(a => a.key === key)) { alert("Key 已存在"); return; }
        accounts.push({ name, key });
    }
    await chrome.storage.local.set({ accounts });
    resetFormUI();
    refreshList();
}

async function refreshList() {
    const { accounts = [] } = await chrome.storage.local.get('accounts');
    const listEl = document.getElementById('accountList');
    listEl.innerHTML = '';
    const currentCookie = await chrome.cookies.get({ url: CLAUDE_URL, name: COOKIE_NAME });
    const currentVal = currentCookie ? decodeURIComponent(currentCookie.value) : "";

    accounts.forEach((acc, index) => {
        const li = document.createElement('li');
        li.setAttribute('draggable', true);
        li.dataset.index = index;
        if (currentVal === acc.key) li.classList.add('active');

        li.innerHTML = `
            <div class="account-info" title="点击切换账号">
                <span class="account-name">
                    <span class="name-text">${acc.name}</span> 
                    <span class="current-badge">Current</span>
                </span>
                <span class="account-key">Key: ${acc.key.substring(0, 10)}...${acc.key.substring(acc.key.length - 6)}</span>
            </div>
            <div class="action-group">
                <button class="icon-btn copy-btn" title="复制 Key">📋</button>
                <button class="icon-btn edit-btn" title="修改">✏️</button>
                <button class="icon-btn del-btn" title="删除">🗑️</button>
            </div>
        `;

        addDragEvents(li, index);
        li.querySelector('.account-info').addEventListener('click', () => switchAccount(acc.key));
        li.querySelector('.copy-btn').addEventListener('click', (e) => { e.stopPropagation(); handleCopy(acc.key, e.target); });
        li.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); startEdit(index, acc.name, acc.key); });
        li.querySelector('.del-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            if(confirm(`确定删除 ${acc.name} 吗？`)) {
                accounts.splice(index, 1);
                await chrome.storage.local.set({ accounts });
                if (editingIndex === index) resetFormUI();
                refreshList();
            }
        });
        listEl.appendChild(li);
    });

    const searchVal = document.getElementById('searchBox').value;
    if (searchVal) { const event = { target: document.getElementById('searchBox') }; filterAccounts(event); }
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

async function switchAccount(key) {
    if (!key) return;
    try {
        await chrome.cookies.remove({ url: CLAUDE_URL, name: COOKIE_NAME });
        await chrome.cookies.set({
            url: CLAUDE_URL, name: COOKIE_NAME, value: key,
            domain: COOKIE_DOMAIN, path: "/", secure: true, sameSite: "lax",
            expirationDate: (Date.now() / 1000) + (86400 * 30)
        });
        const tabs = await chrome.tabs.query({ url: "*://claude.ai/*" });
        if (tabs.length > 0) chrome.tabs.reload(tabs[0].id);
        else chrome.tabs.create({ url: CLAUDE_URL });
        setTimeout(refreshList, 200);
    } catch (e) { alert("切换失败"); }
}