# Claude Account Switcher 🚀

A lightweight, efficient Chrome Extension designed to manage and switch between multiple [Claude.ai](https://claude.ai) accounts seamlessly. Built with **Manifest V3** and vanilla JavaScript.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Manifest](https://img.shields.io/badge/Manifest-V3-green)
![Chrome](https://img.shields.io/badge/Chrome-Extension-orange)

## ✨ Features

* **⚡ One-Click Switching**: Instantly switch accounts without manually logging out and logging back in.
* **⏳ Smart Limit Detector**: **[NEW]** Automatically detects Claude's message limit warnings (e.g., "until 5 PM") and marks the account with a cooling-down timer.
* **🌍 Network Monitor**: **[NEW]** Real-time display of your current **IP Address**, **Geolocation**, and **ISP**. Essential for verifying VPN/Proxy status.
* **🛡️ Security Check**: Built-in shortcut to analyze your IP's fraud score (Risk Score) via external security services.
* **📥 Auto-Capture Session**: Automatically grabs the `sessionKey` from your current active tab—no need to dig into DevTools.
* **🖱️ Drag & Drop Sorting**: Organize your account list order simply by dragging items (Optimized for smooth UX).
* **🔍 Real-time Search**: Quickly filter through your saved accounts by name with the built-in search bar.
* **💾 Import & Export**: Backup your accounts to a JSON file or import them to another device.
* **🧹 Safe Logout**: Clears the local session cookies to return to the login screen without destroying the server-side session.
* **🔒 Local Storage**: All sensitive data (Session Keys) is stored locally in your browser (`chrome.storage.local`).

## 🛠️ Tech Stack

* **Core**: HTML5, CSS3, JavaScript (ES6+)
* **Framework**: Chrome Extension Manifest V3
* **APIs & Services**:
    * `chrome.cookies`: For session management.
    * `chrome.storage`: For persisting account data.
    * `HTML5 Drag and Drop API`: For list sorting.
    * `ipwho.is`: For fetching IP and Geolocation data (HTTPS, No-Key).

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

### 2. Monitoring Network
* The **IP Card** below the search bar shows your current network status.
* Click the **🛡️ Safety Check** button to open a detailed fraud report for your current IP (powered by Scamalytics).
* Click the IP text area to refresh the data manually.

### 3. Managing List
* **Sort**: Click and hold any account item to drag and reorder it.
* **Search**: Type in the search box to filter accounts by name.
* **Edit**: Click the **✏️ (Pencil)** icon to modify the name or key.
* **Copy**: Click the **📋 (Clipboard)** icon to copy the key.
* **Delete**: Click the **🗑️ (Trash)** icon to remove an account.

### 4. Backup / Restore
* Use the **📤 Export Backup** button at the bottom to download a `.json` file containing your saved accounts.
* Use **📥 Import Backup** to restore accounts from a file.

### 5. Limit Management
* **Auto-Detection**: When Claude displays a limit message (e.g., "You are out of messages until 5 PM"), the extension automatically detects it and marks the current account as "Limited" with a countdown timer.
* **Manual Mark**: Click the **⏳ (Hourglass)** icon on any account to manually set a cooling-down duration (in hours).
* **Visual Indicator**: Limited accounts appear red with a `CD: Xh Ym` badge in the list.

## ⚠️ Security Note

* **Data Privacy**: Your session keys are stored **exclusively** in your browser's local storage and are never transmitted to any server.
* **Network Check**: The extension makes a read-only request to `ipwho.is` to display your IP/Geo information. No personal data or session keys are sent with this request.
* **Best Practice**: Do not use this extension on public or shared computers.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.