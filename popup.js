// 常量定义
const CLAUDE_URL = "https://claude.ai";
const COOKIE_NAME = "sessionKey";
const COOKIE_DOMAIN = ".claude.ai";

let editingIndex = -1;
let dragStartIndex = -1; // 记录被拖拽项的索引

document.addEventListener('DOMContentLoaded', async () => {
    refreshList();

    // 基础功能
    document.getElementById('addBtn').addEventListener('click', handleSaveOrUpdate);
    document.getElementById('grabBtn').addEventListener('click', autoGrabKey);
    document.getElementById('clearBtn').addEventListener('click', resetFormAndLogout);

    // 导入导出功能
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
        accounts[editingIndex] = { name, key };
        editingIndex = -1;
    } else {
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

/* ================== UI 渲染与拖拽逻辑 ================== */

async function refreshList() {
    const { accounts = [] } = await chrome.storage.local.get('accounts');
    const listEl = document.getElementById('accountList');
    listEl.innerHTML = '';

    const currentCookie = await chrome.cookies.get({ url: CLAUDE_URL, name: COOKIE_NAME });
    const currentVal = currentCookie ? decodeURIComponent(currentCookie.value) : "";

    accounts.forEach((acc, index) => {
        const li = document.createElement('li');
        // 开启拖拽
        li.setAttribute('draggable', true);
        li.dataset.index = index;

        if (currentVal === acc.key) li.classList.add('active');

        li.innerHTML = `
            <div class="account-info" title="点击切换账号">
                <span class="account-name">${acc.name} <span class="current-badge">Current</span></span>
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

        // 绑定按钮事件
        li.addEventListener('click', (e) => {
            // 如果点的是按钮，不触发切换
            if(e.target.closest('button')) return;
            switchAccount(acc.key);
        });

        li.querySelector('.copy-btn').addEventListener('click', (e) => handleCopy(acc.key, e.target));

        li.querySelector('.edit-btn').addEventListener('click', () => {
            startEdit(index, acc.name, acc.key);
        });

        li.querySelector('.del-btn').addEventListener('click', async () => {
            if(confirm(`确定删除 ${acc.name} 吗？`)) {
                accounts.splice(index, 1);
                await chrome.storage.local.set({ accounts });
                if (editingIndex === index) resetFormUI();
                refreshList();
            }
        });

        listEl.appendChild(li);
    });
}

function addDragEvents(li, index) {
    li.addEventListener('dragstart', () => {
        dragStartIndex = index;
        li.classList.add('dragging');
    });

    li.addEventListener('dragover', (e) => {
        e.preventDefault(); // 允许放置
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
    const itemMoved = accounts.splice(fromIndex, 1)[0]; // 移除旧位置
    accounts.splice(toIndex, 0, itemMoved); // 插入新位置

    await chrome.storage.local.set({ accounts });
    refreshList();
}

/* ================== 导入导出功能 ================== */

// 导出格式：Name|sk-ant-xxx (每行一个)
async function exportData() {
    const { accounts = [] } = await chrome.storage.local.get('accounts');
    if (accounts.length === 0) {
        alert("列表为空，无法导出");
        return;
    }

    // 组装文本内容
    let content = "Format: Name|Key (Don't change this line)\n";
    accounts.forEach(acc => {
        content += `${acc.name}|${acc.key}\n`;
    });

    // 创建 Blob 并下载
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claude_accounts_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// 导入功能
async function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split('\n');

        const { accounts = [] } = await chrome.storage.local.get('accounts');
        let successCount = 0;

        lines.forEach(line => {
            line = line.trim();
            // 跳过空行和格式说明行
            if (!line || line.startsWith("Format:")) return;

            // 支持两种分隔符：竖线 | 或者 逗号 ,
            let parts = [];
            if (line.includes('|')) {
                parts = line.split('|');
            } else if (line.includes(',')) {
                // 如果用户自己手写逗号分隔
                const idx = line.indexOf(',');
                parts = [line.slice(0, idx), line.slice(idx + 1)];
            }

            if (parts.length >= 2) {
                const name = parts[0].trim();
                const key = parts[1].trim();

                // 只有 Key 看起来像真的才导入
                if (key.startsWith("sk-ant") && !accounts.some(a => a.key === key)) {
                    accounts.push({ name, key });
                    successCount++;
                }
            }
        });

        await chrome.storage.local.set({ accounts });
        alert(`成功导入 ${successCount} 个新账号！`);
        refreshList();
        event.target.value = ''; // 重置 input 允许再次选择同名文件
    };
    reader.readAsText(file);
}

/* ================== 辅助功能（保持不变） ================== */

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
        if (tabs[0] && tabs[0].url.includes("claude.ai")) {
            chrome.tabs.reload(tabs[0].id);
        }
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