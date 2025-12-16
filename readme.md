# Claude Account Switcher 🚀

**[🇺🇸 English](README.md) | [🇨🇳 中文文档](README_ZH.md)**

A lightweight, efficient Chrome Extension designed to manage and switch between multiple [Claude.ai](https://claude.ai) accounts seamlessly. Built with **Manifest V3**, **Modern UI**, and vanilla JavaScript.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Manifest](https://img.shields.io/badge/Manifest-V3-green)
![Chrome](https://img.shields.io/badge/Chrome-Extension-orange)

## ✨ Features

* **⚡ One-Click Switching**: Instantly switch accounts without manually logging out and logging back in.
* **🎨 Modern UI**: Clean, card-based design with SVG icons and a responsive layout.
* **📥 Smart Auto-Capture**: 
    * Automatically grabs the `sessionKey` from your current active tab.
    * **[NEW]** Intelligent username extraction: Automatically finds and fills your username directly from the Claude sidebar.
* **⏳ Limit Tracker**: 
    * **Auto-Detect**: Background detection of Claude's "message limit" warnings.
    * **Manual Timer**: Set custom cooldown timers for accounts.
* **🌍 Network Monitor**: 
    * Compact status bar showing **IP** and **Location**.
    * **One-Click Check**: Dedicated button to analyze IP risk score via external services.
* **✏️ Modal Editing**: Add or edit accounts in a focused, non-intrusive modal overlay.
* **🖱️ Drag & Drop Sorting**: Organize your account list order simply by dragging items.
* **💾 Import & Export**: Backup your accounts to JSON/CSV or import them to another device.
* **🔒 Secure & Local**: 
    * Keys are stored in `chrome.storage.local`.
    * No remote servers.
    * **Plaintext Verification**: Key input shows as text to ensure you know exactly what you are saving.

## 🛠️ Tech Stack

* **Core**: HTML5, CSS3 (Variables & Flexbox), JavaScript (ES6+).
* **Architecture**: 
    * Namespace-based JS (`App.UI`, `App.Storage`, etc.).
    * CSS Variables for theming.
* **APIs**: `chrome.cookies`, `chrome.storage`, `chrome.scripting`, `chrome.activeTab`.

## 📸 Preview

*(Add your screenshot here)*

## 📦 Installation

Since this extension handles sensitive session keys, it is designed to be installed locally (Side-loaded) for maximum security transparency.

1.  **Clone or Download** this repository.
    ```bash
    git clone https://github.com/yourusername/claude-switcher.git
    ```
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Toggle **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the folder where you cloned/downloaded this project.

## 📖 Usage Guide

### 1. Adding an Account
1.  Click the **+** button in the top right.
2.  **Auto Method**: Log in to Claude.ai, open the modal, and click the **📥 button**. It will fill the Key AND your Username.
3.  **Manual Method**: Paste your `sk-ant...` key into the input (visible as text) and give it a name.
4.  Click **Save**.

### 2. Switching Accounts
* Simply click the **Name/Card** of any account in the list.
* The extension will update your cookies and reload the Claude tab instantly.

### 3. Network & Security
* **Check IP**: Look at the bottom status bar.
* **Security Report**: Click the **🔗 (Link)** icon next to the IP to view a fraud report.
* **Refresh**: Click the IP text itself to re-fetch network info.

### 4. Backup & Tools
* Click the **...** (Menu) button in the top-right header.
* **Export**: Save your accounts to a file.
* **Import**: Load accounts from a file.
* **Clear Data**: Wipe all local data.

## ⚠️ Security Note

* **Local Only**: Your data never leaves your browser.
* **Permissions**: 
    * `cookies`: To switch accounts.
    * `scripting`: To read your username from the page (Auto-fill feature).
    * `storage`: To save your list.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.