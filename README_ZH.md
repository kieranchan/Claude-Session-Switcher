# Claude Account Switcher 🚀

[🇺🇸 English](README.md) | **[🇨🇳 中文文档](README_ZH.md)**

一个轻量、高效的 Chrome 扩展，用于在多个 [Claude.ai](https://claude.ai) 账号之间无缝切换。基于 **Manifest V3** 和原生 JavaScript 构建，拥有现代化的 UI 设计。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Manifest](https://img.shields.io/badge/Manifest-V3-green)
![Chrome](https://img.shields.io/badge/Chrome-Extension-orange)

## ✨ 功能特性

* **⚡ 一键切换**: 无需手动退出再登录，点击即可瞬间切换账号。
* **🚪 快速重新登录**: 快捷清除当前会话并跳转至登录页，方便添加新账号。
* **🎨 现代化 UI**: 采用卡片式设计，配备 SVG 图标和响应式布局，美观易用。
* **📥 智能自动获取**: 
    * 自动从当前标签页抓取 `sessionKey`。
    * **[新]** 智能用户名提取：利用 DOM 技术直接从 Claude 侧边栏读取并填入您的用户名。
* **⏳ 限制追踪**: 
    * **自动检测**: 后台自动识别 Claude 的“消息额度已满”提示。
    * **手动计时**: 可以手动为账号设置冷却倒计时。
* **🌍 网络监控**: 
    * 底部状态栏实时显示当前 **IP** 和 **地理位置**。
    * **一键体检**: 专用按钮跳转至外部服务，评估当前 IP 的风险指数（欺诈分数）。
* **✏️ 弹窗编辑**: 在简洁的模态框（遮罩层）中添加或修改账号，操作更专注。
* **🖱️ 拖拽排序**: 长按并拖动即可调整账号列表顺序。
* **💾 导入与导出**: 支持将账号列表备份为 JSON 文件，或导入到其他设备。
* **🔒 安全本地化**: 
    * 所有 Key 仅存储在浏览器的 `chrome.storage.local` 中。
    * 绝不上传至任何远程服务器。
    * **明文确认**: Key 输入框默认显示明文，确保您知道自己保存的是什么内容。

## 🛠️ 技术栈

* **核心**: HTML5, CSS3 (Variables & Flexbox), JavaScript (ES6+).
* **架构**: 
    * 命名空间模式 (`App.UI`, `App.Storage` 等).
    * CSS 变量主题化.
* **API**: `chrome.cookies`, `chrome.storage`, `chrome.scripting`, `chrome.activeTab`.

## 📸 预览

<img src="assets/preview.png" width="300" alt="Preview">

## 📦 安装指南

由于本插件处理敏感的 Session Key，为了最大的安全透明度，建议采用**本地安装**（旁加载）方式。

1.  **克隆或下载** 本仓库。
    ```bash
    git clone https://github.com/yourusername/claude-switcher.git
    ```
2.  打开 Chrome 浏览器，访问 `chrome://extensions/`。
3.  打开右上角的 **开发者模式 (Developer mode)** 开关。
4.  点击左上角的 **加载已解压的扩展程序 (Load unpacked)**。
5.  选择您下载/克隆的项目文件夹。

## 📖 使用说明

### 1. 添加账号
1.  点击右上角的 **+** 按钮。
    > **提示**: 点击标题栏的 **门/登录图标** 可快速注销并跳转至登录页。
2.  **自动方式**: 确保您已在 Claude.ai 登录，打开插件弹窗，点击 **📥 按钮**。插件会自动填入 Key 和用户名。
3.  **手动方式**: 将 `sk-ant...` 开头的 Key 粘贴到输入框（明文显示），并填写备注名。
4.  点击 **保存**。

### 2. 切换账号
* 点击列表中的任意 **账号卡片**。
* 插件会自动替换 Cookie 并刷新 Claude 页面，立即生效。

### 3. 网络与安全
* **查看 IP**: 关注底部状态栏的信息。
* **安全报告**: 点击 IP 旁边的 **🔗 (链接)** 图标，查看详细的 IP 欺诈/风险报告。
* **刷新信息**: 点击 IP 文字本身即可重新检测网络状态。

### 4. 备份与工具
* 点击右上角标题栏的 **...** (菜单) 按钮。
* **导出配置**: 将当前所有账号保存为文件。
* **导入配置**: 从文件恢复账号。
* **清空数据**: 彻底清除本地存储的所有账号信息。

## ⚠️ 安全声明

* **仅限本地**: 您的数据永远不会离开您的浏览器。
* **权限说明**: 
    * `cookies`: 用于修改 Cookie 实现账号切换。
    * `scripting`: 用于从页面 DOM 中读取用户名（自动填充功能）。
    * `storage`: 用于保存账号列表。

## 📄 许可证

本项目基于 MIT 许可证开源 - 详情请参阅 [LICENSE](LICENSE) 文件。
