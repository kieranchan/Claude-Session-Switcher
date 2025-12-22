# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A lightweight Chrome Extension (Manifest V3) for managing and switching between multiple Claude.ai accounts. Built with vanilla JavaScript, HTML5, and CSS3 - no frameworks or build processes required.

## Core Architecture

### State Management Pattern

The extension uses a custom lightweight state management system implemented in `popup.js`:

- **Store**: A centralized state container created via `createStore()` function
  - Manages global state: `accounts`, `accountKeySet`, `activeKey`, `filter`, `currentIP`
  - Implements pub/sub pattern with `setState()` and `subscribe()`
  - All UI updates are reactive to state changes

### Component-Based UI

- **AccountCard Component** (`popup.js:54`): Renders individual account cards with drag-drop functionality
  - Each component instance maintains local update function
  - Self-contained event handlers for card-level interactions
  - Supports inline editing mode with state toggling

- **App Component** (`popup.js:150`): Main rendering orchestrator
  - Maintains component registry via `Map` for efficient updates
  - Implements differential rendering (only updates changed components)
  - Handles filtering and re-ordering without full re-renders

### Multi-Script Communication Flow

1. **popup.js** (Main UI): Manages account list, user interactions, and Chrome storage
2. **content.js** (Injected into claude.ai): Detects usage limits via DOM monitoring
3. **Chrome Storage API**: Bridges communication between scripts
   - `accounts`: Array of account objects `{name, key, availableAt?}`
   - `lastActiveKey`: Currently active sessionKey
   - `user_theme`: Theme preference

### Cookie-Based Account Switching

Account switching works by manipulating the `sessionKey` cookie on `.claude.ai` domain:
- `switchAccount()` sets the cookie and reloads the Claude tab
- The extension reads/writes cookies via Chrome's `cookies` API
- Cookie format: `{name: "sessionKey", value: "sk-ant-...", domain: ".claude.ai"}`

### Performance Optimizations

**In popup.js:**
- Debounced search (300ms) for smooth filtering
- Hash Map (`accountKeySet`) for O(1) duplicate detection
- Component reuse via Map registry to avoid unnecessary DOM operations

**In content.js:**
- TreeWalker API for efficient DOM traversal (avoids recursive iteration)
- Throttled MutationObserver (2000ms) to prevent excessive checks
- Regex-based limit detection with two patterns for Free/Pro accounts
- Shadow DOM piercing to detect limits in web components

### Limit Detection Algorithm

`content.js` uses a multi-stage detection system:

1. **MutationObserver** watches for DOM changes on claude.ai
2. **Throttling** limits checks to once per 2 seconds
3. **TreeWalker** efficiently traverses text nodes looking for keywords
4. **Regex Matching**: Detects two patterns:
   - Free tier: `"until 5 PM"` format
   - Pro tier: `"Resets 11:00 PM"` format
5. **Time Parsing**: Converts time strings to future timestamps
6. **Auto-marking**: Updates `availableAt` field in storage for the active account

## Development Commands

### Loading the Extension

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the project root directory

### Testing Changes

After modifying code:
- **For popup.js/html/css**: Close and reopen the extension popup
- **For content.js**: Navigate to `chrome://extensions/` and click the refresh icon on the extension card, then reload any open claude.ai tabs
- **For manifest.json**: Click "Reload" on the extension card

No build process is required - changes are reflected immediately after reload.

### Debugging

- **Popup debugging**: Right-click the extension icon → "Inspect popup"
- **Content script debugging**: Open DevTools on claude.ai tab → Console tab
- **State inspection**: Access `window.store.getState()` in popup console

## Key Technical Constraints

- **No frameworks**: Pure vanilla JavaScript only (ES6+)
- **No build tools**: Direct file loading, no transpilation or bundling
- **No package.json**: No npm dependencies
- **Local storage only**: All data stored in `chrome.storage.local`, no backend
- **Manifest V3**: Must follow Chrome's latest extension standards

## Data Model

```javascript
// Account object structure
{
  name: string,           // Display name/label
  key: string,            // sk-ant-... session key
  availableAt?: number    // Optional timestamp (ms) when account limit expires
}
```

## Important Implementation Notes

- Use `const $ = id => document.getElementById(id)` helper for DOM queries
- All account mutations must update both `accounts` array and `accountKeySet` Set
- Drag-drop uses global `window.dragSourceIndex` to track source position
- Theme state is separate from main store (managed via direct DOM class toggling)
- Network check fetches IP info from `https://ipwho.is/` on demand
