# Gemini
## Project Overview

This is a Chrome Extension for managing and switching between multiple `claude.ai` accounts. It is built with vanilla JavaScript, HTML, and CSS, following the Manifest V3 specification.

**Key Files:**
*   `manifest.json`: The extension's manifest file, defining permissions and structure.
*   `popup.html` / `popup.js` / `popup.css`: The UI and logic for the extension's popup.
*   `content.js`: A content script injected into `claude.ai` pages to detect usage limits.
*   `readme.md`: The project's README file, containing detailed information about its features and usage.

## Building and Running

This is a browser extension and does not have a build process. To run the extension:

1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Toggle **Developer mode** in the top right corner.
3.  Click **Load unpacked**.
4.  Select the project directory.

## Development Conventions

*   **Core Technology:** The project is built with vanilla JavaScript (ES6+), HTML5, and CSS3. It does not use any external frameworks.
*   **State Management:** The popup script (`popup.js`) uses a simple, custom `createStore` function to manage application state. This is a centralized pattern for handling data and UI updates.
*   **Component-like Structure:** The `AccountCard` function in `popup.js` acts as a reusable component for rendering each account in the list.
*   **Performance:** The code has been refactored to improve performance, particularly in the `App` component's rendering logic.
*   **No Linter/Formatter:** There is no configuration for a linter or code formatter. Adding one (like Prettier or ESLint) could help maintain a consistent code style.
