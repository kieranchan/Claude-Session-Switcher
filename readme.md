# Claude Account Switcher 🚀

A lightweight, efficient Chrome Extension designed to manage and switch between multiple [Claude.ai](https://claude.ai) accounts seamlessly. Built with **Manifest V3** and vanilla JavaScript.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Manifest](https://img.shields.io/badge/Manifest-V3-green)
![Chrome](https://img.shields.io/badge/Chrome-Extension-orange)

## ✨ Features

* **⚡ One-Click Switching**: Instantly switch accounts without manually logging out and logging back in.
* **📥 Auto-Capture Session**: Automatically grabs the `sessionKey` from your current active tab—no need to dig into DevTools.
* **🖱️ Drag & Drop Sorting**: Organize your account list order simply by dragging items.
* **🔍 Real-time Search**: Quickly filter through your saved accounts with the built-in search bar.
* **💾 Import & Export**: Backup your accounts to a JSON file or import them to another device.
* **🧹 Safe Logout**: Clears the local session cookies to return to the login screen without destroying the server-side session.
* **🔒 Local Storage**: All sensitive data (Session Keys) is stored locally in your browser (`chrome.storage.local`). Nothing is sent to any external server.

## 🛠️ Tech Stack

* **Core**: HTML5, CSS3, JavaScript (ES6+)
* **Framework**: Chrome Extension Manifest V3
* **APIs**:
    * `chrome.cookies`: For session management.
    * `chrome.storage`: For persisting account data.
    * `HTML5 Drag and Drop API`: For list sorting.

## 📸 Preview


<img src="./preview.png" width="250" alt="App Screenshot">

## 📦 Installation

Since this extension handles sensitive session keys, it is designed to be installed locally (Side-loaded) for maximum security transparency.

1.  **Clone or Download** this repository.
    ```bash
    git clone [https://github.com/yourusername/claude-switcher.git](https://github.com/yourusername/claude-switcher.git)
    ```
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Toggle **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the folder where you cloned/downloaded this project.
6.  The extension icon should appear in your browser toolbar.

## 📖 Usage Guide

### 1. Adding an Account
* **Method A (Auto)**: Log in to Claude.ai, open the extension, and click the **📥 button** next to the input box. It will auto-fill the current session key. Give it a name and click **Save**.
* **Method B (Manual)**: Manually paste a `sessionKey` (starting with `sk-ant...`) and a name, then click **Save**.

### 2. Switching Accounts
* Simply click on the **Name** of any saved account in the list. The page will reload automatically with the new session active.

### 3. Managing List
* **Sort**: Click and hold any account item to drag and reorder it.
* **Edit**: Click the **✏️ (Pencil)** icon to modify the name or key.
* **Copy**: Click the **📋 (Clipboard)** icon to copy the key.
* **Delete**: Click the **🗑️ (Trash)** icon to remove an account.

### 4. Backup / Restore
* Use the **📤 Export Backup** button at the bottom to download a `.json` file containing your saved accounts.
* Use **📥 Import Backup** to restore accounts from a file.

## ⚠️ Security Note

* **Your Data is Yours**: This extension runs entirely client-side. Your session keys are stored in your browser's local storage and are **never** transmitted to any third-party server.
* **Best Practice**: Do not use this extension on public or shared computers, as anyone with access to the browser can potentially switch to your accounts.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.