// 常量定义
const CLAUDE_URL = "https://claude.ai";
const COOKIE_NAME = "sessionKey";
const COOKIE_DOMAIN = ".claude.ai";

// 状态变量
let editingIndex = -1;  // 当前正在编辑的索引
let dragStartIndex = -1; // 拖拽起始索引

document.addEventListener('DOMContentLoaded', async () => {
    refreshList();

    // 基础操作绑定
    document.getElementById('addBtn').addEventListener('click', handleSaveOrUpdate);
    document.getElementById('grabBtn').addEventListener('click', autoGrabKey);
    document.getElementById('clearBtn').addEventListener('click', resetFormAndLogout);

    // 搜索绑定
    document.getElementById('searchBox').addEventListener('input', filterAccounts);

    // 导入导出绑定
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', handleImportFile);
});

/* ================== 核心功能：增删改查 ================== */

async function handleSaveOrUpdate() {
    const nameInput = document.getElementById('accName');
    const keyInput = document.getElementById('accKey');
    const name = nameInput.value.trim();
    const key = keyInput.value.trim();

    if (!name || !key) {
        alert("请填写完整信息");
        return;
    }

    const { accounts = [] } = await chrome.storage.local.get('accounts');

    if (editingIndex >= 0) {
        // --- 更新模式 ---
        accounts[editingIndex] = { name, key };
        editingIndex = -1;
    } else {
        // --- 新增模式 ---
        if (accounts.some(a => a.key === key)) {
            alert("这个 Key 已经存在了");
            return;
        }
        accounts.push({ name, key });
    }

    await chrome.storage.local.set({ accounts });
    resetFormUI();
    refreshList();
}

/* ================== 列表渲染、搜索与拖拽 ================== */

async function refreshList() {
    const { accounts = [] } = await chrome.storage.local.get('accounts');
    const listEl = document.getElementById('accountList');
    listEl.innerHTML = '';

    // 获取当前 Cookie 用于高亮
    const currentCookie = await chrome.cookies.get({ url: CLAUDE_URL, name: COOKIE_NAME });
    const currentVal = currentCookie ? decodeURIComponent(currentCookie.value) : "";

    accounts.forEach((acc, index) => {
        const li = document.createElement('li');
        li.setAttribute('draggable', true); // 开启拖拽
        li.dataset.index = index; // 存储真实索引

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

        // 绑定拖拽事件
        addDragEvents(li, index);

        // 点击切换
        li.querySelector('.account-info').addEventListener('click', (e) => switchAccount(acc.key));

        // 复制
        li.querySelector('.copy-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            handleCopy(acc.key, e.target);
        });

        // 编辑
        li.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            startEdit(index, acc.name, acc.key);
        });

        // 删除
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

    // 如果搜索框里有字，重新触发一次过滤，防止列表刷新后搜索失效
    const searchVal = document.getElementById('searchBox').value;
    if (searchVal) {
        // 手动触发 input 事件逻辑
        const event = { target: document.getElementById('searchBox') };
        filterAccounts(event);
    }
}

// 搜索过滤逻辑
function filterAccounts(e) {
    const term = e.target.value.toLowerCase();
    const listItems = document.querySelectorAll('#accountList li');

    listItems.forEach(li => {
        // 修改点：只获取 name-text 类的文本，忽略 current-badge
        // 加上 ?. 也就是可选链，防止有时候元素还没渲染出来报错
        const nameEl = li.querySelector('.name-text');
        const name = nameEl ? nameEl.textContent.toLowerCase() : "";

        // 进阶优化：如果想同时也支持搜 Key，可以写成：
        // const key = li.querySelector('.account-key').textContent.toLowerCase();
        // if (name.includes(term) || key.includes(term)) { ... }

        if (name.includes(term)) {
            li.style.display = 'flex';
        } else {
            li.style.display = 'none';
        }
    });
}

// 拖拽逻辑
function addDragEvents(li, index) {
    li.addEventListener('dragstart', () => {
        dragStartIndex = index;
        li.classList.add('dragging');
    });
    li.addEventListener('dragover', (e) => {
        e.preventDefault();
        li.classList.add('drag-over');
    });
    li.addEventListener('dragleave', () => {
        li.classList.remove('drag-over');
    });
    li.addEventListener('drop', async () => {
        li.classList.remove('drag-over');
        const dragEndIndex = index;
        swapItems(dragStartIndex, dragEndIndex);
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

/* ================== 导入导出 (JSON/TXT) ================== */

async function exportData() {
    const { accounts = [] } = await chrome.storage.local.get('accounts');
    if (accounts.length === 0) {
        alert("列表为空，无法导出");
        return;
    }
    // 使用 JSON 格式导出
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

        try {
            // 优先尝试 JSON
            newAccounts = JSON.parse(text);
            if (!Array.isArray(newAccounts)) throw new Error("Not Array");
        } catch (err) {
            // 失败则尝试 TXT 解析 (兼容旧版)
            console.log("JSON parse failed, trying TXT...");
            const lines = text.split('\n');
            lines.forEach(line => {
                line = line.trim();
                if (!line || line.startsWith("Format:")) return;
                let parts = [];
                if (line.includes('|')) parts = line.split('|');
                else if (line.includes(',')) {
                    const idx = line.indexOf(',');
                    parts = [line.slice(0, idx), line.slice(idx + 1)];
                }
                if (parts.length >= 2) newAccounts.push({ name: parts[0].trim(), key: parts[1].trim() });
            });
        }

        if (newAccounts.length === 0) {
            alert("文件格式无法识别或内容为空");
            return;
        }

        const { accounts = [] } = await chrome.storage.local.get('accounts');
        let count = 0;
        newAccounts.forEach(nw => {
            if (nw.key && nw.key.startsWith("sk-ant") && !accounts.some(a => a.key === nw.key)) {
                accounts.push({ name: nw.name || "未命名", key: nw.key });
                count++;
            }
        });

        await chrome.storage.local.set({ accounts });
        alert(`成功导入 ${count} 个新账号`);
        refreshList();
        event.target.value = '';
    };
    reader.readAsText(file);
}

/* ================== 辅助函数：复制、编辑、获取、切换 ================== */

function startEdit(index, name, key) {
    editingIndex = index;
    document.getElementById('accName').value = name;
    document.getElementById('accKey').value = key;
    const addBtn = document.getElementById('addBtn');
    addBtn.textContent = "🔄 更新账号";
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
        } else {
            alert("未检测到登录状态");
        }
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