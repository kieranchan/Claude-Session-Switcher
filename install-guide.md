# Claude Switcher Installation Guide

This guide provides instructions for both developers and end-users to install the Claude Switcher extension.

---

## For End-Users (Recommended)

This method is the simplest way to install the extension without needing to deal with the source code directly.

### Step 1: Create the ZIP file (For the Project Owner)

Before you can distribute the extension, you need to package it as a `.zip` file.

1.  Navigate to your project directory (`claude_switcher`).
2.  Select **all the files and folders** inside the directory (e.g., `manifest.json`, `popup.html`, `assets/`, etc.).
3.  **Important**: Do NOT select the parent `claude_switcher` folder itself. You must select the contents *inside* it.
4.  Right-click on the selected files and choose "Compress" or "Send to > Compressed (zipped) folder".
5.  Name the resulting file `claude_switcher.zip`. This is the file you will share with users.

### Step 2: Install the ZIP file (For the End-User)

1.  Open Google Chrome.
2.  Navigate to the extensions page by typing `chrome://extensions` in the address bar and pressing Enter.
3.  In the top right corner of the page, toggle on **Developer mode**. This is required to install extensions manually.
4.  Now, simply **drag and drop** the `claude_switcher.zip` file you received directly onto the `chrome://extensions` page.
5.  The extension will be installed and should appear in your list of extensions. You can now disable Developer mode if you wish.

---

## For Developers

This method is for developers who want to run the extension directly from the source code.

1.  Open Google Chrome.
2.  Navigate to the extensions page by typing `chrome://extensions` in the address bar and pressing Enter.
3.  In the top right corner, toggle on **Developer mode**.
4.  Click the **Load unpacked** button that appears on the top left.
5.  In the file selection dialog, navigate to and select your `claude_switcher` project directory (the folder that contains `manifest.json`).
6.  The extension will be loaded immediately. If you make changes to the code, you will need to click the "Reload" icon on the extension's card in this page to see them take effect.
