/**
 * Claude Account Switcher - Main Logic
 * Refactored to Namespace pattern for cleaner organization while maintaining single-file structure.
 */

const CONSTANTS = {
    CLAUDE_URL: "https://claude.ai",
    COOKIE_NAME: "sessionKey",
    COOKIE_DOMAIN: ".claude.ai",
    STORAGE_KEY: "accounts",
    LAST_ACTIVE_KEY: "lastActiveKey",
    NET_CACHE_KEY: "cachedNetwork"
};

// --- Icons (SVG Strings) ---
const ICONS = {
    copy: `<svg class="svg-icon" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    edit: `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    trash: `<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    clock: `<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`
};

const App = {
    state: {
        accounts: [],
        editingIndex: -1,
        dragStartIndex: -1,
        currentIP: null,
        filterTerm: ""
    },

    init: async () => {
        // Global Error Handler for Popup
        window.addEventListener('error', (e) => {
            const errDiv = document.createElement('div');
            errDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:10px;font-size:11px;z-index:9999;word-break:break-all;';
            errDiv.textContent = `Error: ${e.message} at ${e.filename}:${e.lineno}`;
            document.body.prepend(errDiv);
        });

        await App.Storage.load();
        App.UI.initListeners();
        App.UI.render();
        App.Network.check();
    },

    // --- Logic & Actions ---
    Actions: {
        addOrUpdateAccount: async (name, key) => {
            if (!name || !key) return App.UI.showToast("请填写完整信息");
            
            // Clean key
            key = key.trim();
            if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);

            if (App.state.editingIndex >= 0) {
                // Update
                const acc = App.state.accounts[App.state.editingIndex];
                App.state.accounts[App.state.editingIndex] = { ...acc, name, key };
                App.state.editingIndex = -1;
                App.UI.toggleEditForm(false);
                App.UI.showToast("账号已更新");
            } else {
                // Add
                if (App.state.accounts.some(a => a.key === key)) {
                    return App.UI.showToast("Key 已存在");
                }
                App.state.accounts.push({ name, key });
                App.UI.toggleEditForm(false);
                App.UI.showToast("账号已保存");
            }
            await App.Storage.save();
            App.UI.render();
        },

        deleteAccount: async (index) => {
            if (confirm("确定删除该账号吗？")) {
                App.state.accounts.splice(index, 1);
                await App.Storage.save();
                if (App.state.editingIndex === index) App.UI.resetForm();
                App.UI.render();
            }
        },

        switchAccount: async (key) => {
            if (!key) return;
            try {
                // 1. Set Cookie
                await chrome.cookies.set({
                    url: CONSTANTS.CLAUDE_URL,
                    name: CONSTANTS.COOKIE_NAME,
                    value: key,
                    domain: CONSTANTS.COOKIE_DOMAIN,
                    path: "/",
                    secure: true,
                    sameSite: "lax",
                    expirationDate: (Date.now() / 1000) + (86400 * 30)
                });

                // 2. Mark Active in Storage
                await chrome.storage.local.set({ [CONSTANTS.LAST_ACTIVE_KEY]: key });
                
                // 3. Reload/Focus Tab
                const tabs = await chrome.tabs.query({ url: "*://claude.ai/*" });
                if (tabs.length > 0) {
                    await Promise.all([
                        chrome.tabs.update(tabs[0].id, { url: "https://claude.ai/chats", active: true }),
                        chrome.windows.update(tabs[0].windowId, { focused: true })
                    ]);
                } else {
                    await chrome.tabs.create({ url: "https://claude.ai/chats" });
                }

                App.UI.render(); // Re-render to show active state
            } catch (e) {
                console.error(e);
                App.UI.showToast("切换失败: " + e.message);
            }
        },

        setLimit: async (index) => {
            const input = prompt("设置冷却时间 (小时): \n0 清除限制", "4");
            if (input === null) return;
            
            const hours = parseFloat(input);
            if (!input || isNaN(hours) || hours <= 0) {
                delete App.state.accounts[index].availableAt;
            } else {
                App.state.accounts[index].availableAt = Date.now() + (hours * 3600 * 1000);
            }
            await App.Storage.save();
            App.UI.render();
        },

        grabKey: async () => {
            try {
                // 1. 获取 Cookie (Session Key)
                const cookie = await chrome.cookies.get({ url: CONSTANTS.CLAUDE_URL, name: CONSTANTS.COOKIE_NAME });
                if (cookie) {
                    const sessionKey = decodeURIComponent(cookie.value);
                    const keyInput = document.getElementById('inputKey');
                    keyInput.value = sessionKey; // 仅填充 Key
                    
                    // 2. 尝试从 DOM 获取用户名
                    try {
                        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                        if (tab && tab.id) {
                            const results = await chrome.scripting.executeScript({
                                target: { tabId: tab.id },
                                func: () => {
                                    const el = document.querySelector('span.w-full.text-start.block.truncate');
                                    return el ? el.textContent.trim() : null;
                                }
                            });
                            
                            if (results && results[0] && results[0].result) {
                                const userName = results[0].result;
                                document.getElementById('inputName').value = userName; // 仅填充 Name
                            }
                        }
                    } catch(e) {
                        console.warn("DOM Extract Error", e);
                    }

                    document.getElementById('inputName').focus();
                } else {
                    App.UI.showToast("当前网页未登录或无法读取");
                }
            } catch (e) {
                App.UI.showToast("获取失败");
            }
        },

        exportData: () => {
            if (App.state.accounts.length === 0) return App.UI.showToast("无数据可导出");
            const blob = new Blob([JSON.stringify(App.state.accounts, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `claude_accounts_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        },

        importData: async (file) => {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const text = e.target.result;
                    let newItems = [];
                    // Try JSON
                    try {
                        const json = JSON.parse(text);
                        if (Array.isArray(json)) newItems = json;
                    } catch {
                        // Try CSV/Line format
                        text.split('\n').forEach(line => {
                            const [name, key] = line.includes('|') ? line.split('|') : line.split(',');
                            if (key && key.trim().length > 10) newItems.push({ name: name.trim(), key: key.trim() });
                        });
                    }

                    if (newItems.length === 0) throw new Error("Format error");

                    let count = 0;
                    newItems.forEach(item => {
                        if (!App.state.accounts.some(a => a.key === item.key)) {
                            App.state.accounts.push({
                                name: item.name || "Imported",
                                key: item.key
                            });
                            count++;
                        }
                    });
                    
                    await App.Storage.save();
                    App.UI.render();
                    App.UI.showToast(`成功导入 ${count} 个账号`);
                } catch (err) {
                    App.UI.showToast("导入失败: 文件格式错误");
                }
            };
            reader.readAsText(file);
        },
        
        reorderAccounts: async (fromIndex, toIndex) => {
            if (fromIndex === toIndex) return;
            const moved = App.state.accounts.splice(fromIndex, 1)[0];
            App.state.accounts.splice(toIndex, 0, moved);
            await App.Storage.save();
            App.UI.render();
        }
    },

    // --- Storage Wrapper ---
    Storage: {
        load: async () => {
            const data = await chrome.storage.local.get([CONSTANTS.STORAGE_KEY]);
            App.state.accounts = data[CONSTANTS.STORAGE_KEY] || [];
        },
        save: async () => {
            await chrome.storage.local.set({ [CONSTANTS.STORAGE_KEY]: App.state.accounts });
        }
    },

    // --- UI Rendering & Events ---
    UI: {
        els: {}, // Cache elements

        initListeners: () => {
            const $ = (id) => document.getElementById(id);
            
            // Toggle Tools Menu (Moved to top)
            const toolsBtn = $('toolsToggle');
            if (toolsBtn) {
                toolsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Removed preventDefault
                    $('toolsMenu').classList.toggle('show');
                });
            }
            document.addEventListener('click', () => {
                 const menu = $('toolsMenu');
                 if(menu) menu.classList.remove('show');
            });
            
            $('toggleAddBtn').onclick = () => App.UI.toggleEditForm();
            $('cancelEditBtn').onclick = () => App.UI.toggleEditForm(false);
            $('modalOverlay').onclick = () => App.UI.toggleEditForm(false); // Click outside to close

            $('saveBtn').onclick = () => App.Actions.addOrUpdateAccount($('inputName').value, $('inputKey').value);
            $('grabBtn').onclick = App.Actions.grabKey;
            
            $('searchBox').oninput = (e) => {
                App.state.filterTerm = e.target.value.toLowerCase();
                App.UI.render();
            };
            
            // ... (rest of initListeners)

            $('netInfo').onclick = App.Network.check;
            $('ipCheckBtn').onclick = (e) => {
                e.stopPropagation();
                if(App.state.currentIP) {
                    chrome.tabs.create({ url: `https://scamalytics.com/ip/${App.state.currentIP}` });
                }
            };
            
            $('exportBtn').onclick = App.Actions.exportData;
            $('importBtn').onclick = () => $('fileInput').click();
            $('fileInput').onchange = (e) => App.Actions.importData(e.target.files[0]);
            
            $('clearAllBtn').onclick = async () => {
                if(confirm("确定清空所有账号？不可恢复！")) {
                    App.state.accounts = [];
                    await App.Storage.save();
                    App.UI.render();
                }
            };
        },

        toggleEditForm: (show = null) => {
            const form = document.getElementById('editForm');
            const overlay = document.getElementById('modalOverlay');
            const isOpen = show !== null ? show : !form.classList.contains('open');
            
            if (isOpen) {
                // Default to "Add" title if not editing
                if (App.state.editingIndex === -1) {
                    document.getElementById('modalTitle').textContent = "添加账号";
                }
                form.classList.add('open');
                overlay.classList.add('open');
                document.getElementById('inputName').focus();
            } else {
                form.classList.remove('open');
                overlay.classList.remove('open');
                App.UI.resetForm();
            }
        },

        resetForm: () => {
            document.getElementById('inputName').value = '';
            document.getElementById('inputKey').value = '';
            App.state.editingIndex = -1;
        },

        showToast: (msg) => {
            const el = document.getElementById('toast');
            el.textContent = msg;
            el.classList.add('visible');
            setTimeout(() => el.classList.remove('visible'), 3000);
        },

        render: async () => {
            const listEl = document.getElementById('accountList');
            listEl.innerHTML = '';
            
            // Get current active key (for highlighting)
            let activeKey = "";
            try {
                const cookie = await chrome.cookies.get({ url: CONSTANTS.CLAUDE_URL, name: CONSTANTS.COOKIE_NAME });
                if (cookie) activeKey = decodeURIComponent(cookie.value);
            } catch (e) {}

            const now = Date.now();
            const filtered = App.state.accounts
                .map((acc, idx) => ({ ...acc, originalIndex: idx }))
                .filter(acc => (acc.name || "").toLowerCase().includes(App.state.filterTerm));

            if (filtered.length === 0) {
                listEl.innerHTML = `<div class="empty-state"><span class="empty-icon">📭</span>暂无账号</div>`;
                return;
            }

            const frag = document.createDocumentFragment();

            filtered.forEach(acc => {
                const li = document.createElement('li');
                li.className = 'account-card';
                if (acc.key === activeKey) li.classList.add('active');
                
                const safeName = acc.name || "未命名";

                // Limit Check
                let badgesHtml = "";
                if (acc.key === activeKey) badgesHtml += `<span class="badge badge-current">Current</span>`;
                
                if (acc.availableAt && acc.availableAt > now) {
                    const diffMins = Math.ceil((acc.availableAt - now) / 60000);
                    const timeStr = diffMins > 60 ? `${Math.floor(diffMins/60)}h ${diffMins%60}m` : `${diffMins}m`;
                    badgesHtml += `<span class="badge badge-limit" title="冷却中">⏳ ${timeStr}</span>`;
                }

                li.innerHTML = `
                    <div class="account-info">
                        <div class="account-header">
                            <span class="account-name">${safeName}</span>
                            <div class="badges">${badgesHtml}</div>
                        </div>
                        <div class="account-key">${acc.key.substring(0, 12)}...${acc.key.slice(-6)}</div>
                    </div>
                    <div class="account-actions">
                        <button class="icon-btn action-limit" title="设置冷却">${ICONS.clock}</button>
                        <button class="icon-btn action-copy" title="复制 Key">${ICONS.copy}</button>
                        <button class="icon-btn action-edit" title="编辑">${ICONS.edit}</button>
                        <button class="icon-btn action-delete delete" title="删除">${ICONS.trash}</button>
                    </div>
                `;

                // Events
                li.querySelector('.account-info').onclick = () => App.Actions.switchAccount(acc.key);
                li.querySelector('.action-limit').onclick = (e) => { e.stopPropagation(); App.Actions.setLimit(acc.originalIndex); };
                li.querySelector('.action-copy').onclick = (e) => { 
                    e.stopPropagation(); 
                    navigator.clipboard.writeText(acc.key); 
                    App.UI.showToast("已复制"); 
                };
                li.querySelector('.action-edit').onclick = (e) => {
                    e.stopPropagation();
                    App.state.editingIndex = acc.originalIndex;
                    document.getElementById('inputName').value = acc.name;
                    document.getElementById('inputKey').value = acc.key;
                    document.getElementById('modalTitle').textContent = "编辑账号";
                    App.UI.toggleEditForm(true);
                };
                li.querySelector('.action-delete').onclick = (e) => {
                    e.stopPropagation();
                    App.Actions.deleteAccount(acc.originalIndex);
                };

                // Drag & Drop
                li.setAttribute('draggable', true);
                li.ondragstart = () => {
                    App.state.dragStartIndex = acc.originalIndex;
                    li.classList.add('dragging');
                };
                li.ondragover = (e) => {
                    e.preventDefault();
                    li.classList.add('drag-over');
                };
                li.ondragleave = () => li.classList.remove('drag-over');
                li.ondrop = (e) => {
                    e.stopPropagation();
                    li.classList.remove('drag-over');
                    App.Actions.reorderAccounts(App.state.dragStartIndex, acc.originalIndex);
                };
                li.ondragend = () => {
                    li.classList.remove('dragging');
                    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
                };

                frag.appendChild(li);
            });

            listEl.appendChild(frag);
        }
    },

    // --- Network Check ---
    Network: {
        check: async () => {
            const cached = await chrome.storage.local.get([CONSTANTS.NET_CACHE_KEY]);
            if (cached[CONSTANTS.NET_CACHE_KEY]) {
                App.Network.updateUI(cached[CONSTANTS.NET_CACHE_KEY]);
            }

            try {
                const res = await fetch('https://ipwho.is/');
                const data = await res.json();
                if (data.success) {
                    const info = {
                        ip: data.ip,
                        geo: `${data.city}, ${data.country_code}`,
                        isp: data.connection.isp
                    };
                    App.Network.updateUI(info);
                    chrome.storage.local.set({ [CONSTANTS.NET_CACHE_KEY]: info });
                }
            } catch (e) {
                document.getElementById('ipText').textContent = "网络错误";
            }
        },

        updateUI: (info) => {
            document.getElementById('ipText').textContent = info.ip;
            document.getElementById('geoText').textContent = info.geo;
            document.getElementById('netDot').classList.add('online');
            
            App.state.currentIP = info.ip;
            // Removed dynamic onclick binding. Events are static now.
        }
    }
};

// Start
document.addEventListener('DOMContentLoaded', App.init);