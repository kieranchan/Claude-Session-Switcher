# Claude Account Switcher

## Project Overview
**Claude Account Switcher** is a Chrome Extension designed to manage and seamlessly switch between multiple [Claude.ai](https://claude.ai) accounts. It allows users to store session keys locally and switch contexts without the need for repeated manual logins.

Key functionalities include:
- **One-Click Switching**: Toggles between accounts by manipulating the `sessionKey` cookie.
- **Network Monitoring**: Displays real-time IP, Geolocation, and ISP info to verify VPN/Proxy status.
- **Session Management**: Automatically captures session keys from the active tab.
- **Data Persistence**: Uses `chrome.storage.local` to save account details securely within the browser.
- **Import/Export**: JSON-based backup system.

## Architecture & Tech Stack
*   **Type**: Chrome Extension (Manifest V3)
*   **Core**: HTML5, CSS3 (Inline), Vanilla JavaScript (ES6+).
*   **APIs**:
    *   `chrome.cookies`: For manipulating the authentication cookie.
    *   `chrome.storage`: For persisting the list of accounts.
    *   `chrome.tabs` / `activeTab`: For capturing current session keys and opening external links.
    *   **External**: `ipwho.is` (for IP data), `scamalytics.com` (linked for security checks).
*   **No Build System**: The project uses raw files (`.js`, `.html`, `.json`) directly usable by the browser.

## Directory Overview
*   **`manifest.json`**: The entry point configuration. Defines permissions (`cookies`, `storage`), host permissions (`claude.ai`), and the popup action.
*   **`popup.html`**: The main interface. Contains the DOM structure and inline CSS styles for the popup window.
*   **`popup.js`**: Contains all application logic. Handles DOM events, storage I/O, and cookie manipulation.
*   **`icon.png`**: Extension icon.
*   **`preview.png`**: Screenshot used in the README.

## Installation & Running
This extension is intended to be "side-loaded" (installed locally).

1.  **Clone/Download** the repository.
2.  Open Chrome and go to `chrome://extensions/`.
3.  Enable **Developer mode** (top right toggle).
4.  Click **Load unpacked**.
5.  Select the project directory.

## Development Conventions
*   **Single-File Logic**: All JavaScript logic resides in `popup.js`. When adding features, keep functions modular within this file.
*   **Inline Styling**: CSS is embedded in `popup.html`'s `<style>` block. Maintain this pattern for simplicity unless the styles grow significantly.
*   **Async/Await**: The codebase uses `async/await` heavily for Chrome API calls (storage, cookies).
*   **Security**:
    *   Never transmit session keys to a remote server.
    *   `ipwho.is` calls are read-only and anonymous.
