# Installation Guide

## Chrome Extension Installation

Follow these steps to install the Web to Markdown Converter extension in Google Chrome.

### Step 1: Download or Clone the Repository

If you haven't already, download or clone this repository to your local machine:

```bash
git clone <repository-url>
cd web-_markdown_-
```

### Step 2: Verify Icon Files

The extension requires icon files. They should already be generated. To verify:

```bash
ls icons/
# You should see: icon16.png, icon48.png, icon128.png
```

If icons are missing, generate them:

```bash
cd icons
python3 generate-icons.py
cd ..
```

### Step 3: Open Chrome Extensions Page

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Or click the three-dot menu → More Tools → Extensions

### Step 4: Enable Developer Mode

1. In the top-right corner of the Extensions page
2. Toggle the **Developer mode** switch to ON
3. You'll see additional options appear

### Step 5: Load the Extension

1. Click the **Load unpacked** button
2. Browse to the `web-_markdown_-` directory
3. Select the folder and click **Open** (or **Select Folder**)

### Step 6: Verify Installation

1. The extension should now appear in your extensions list
2. You should see "Web to Markdown Converter" with version 1.0.0
3. Make sure the extension is enabled (toggle switch is ON)
4. Pin the extension to your toolbar for easy access:
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Web to Markdown Converter"
   - Click the pin icon

## Quick Start Guide

### Using the Extension

1. **Navigate to a webpage** with tables or content you want to convert

2. **Click the extension icon** in your Chrome toolbar

3. **Choose an action**:

   - **Detect Tables**: Automatically find all tables on the page
   - **Try Another Table**: Cycle through detected tables
   - **Copy as Markdown**: Copy the current selection to clipboard
   - **Select Custom Range**: Manually select any DOM element

### Example: Converting a Wikipedia Table

1. Go to any Wikipedia page with tables (e.g., https://en.wikipedia.org/wiki/List_of_countries_by_population)
2. Click the extension icon
3. Click "Detect Tables"
4. Use "Try Another Table" to browse different tables
5. When you find the table you want, click "Copy as Markdown"
6. Paste into Heptabase or any Markdown editor

### Example: Converting Custom Content

1. Go to any webpage
2. Click the extension icon
3. Click "Select Custom Range"
4. Hover over elements on the page (they'll be highlighted)
5. Click the element you want to convert
6. Review the preview
7. Click "Copy as Markdown"
8. Paste into your Markdown editor

## Troubleshooting

### Extension Not Loading

**Problem**: "Error loading extension" or "Manifest file is missing or unreadable"

**Solution**:
1. Make sure you selected the correct folder (the one containing `manifest.json`)
2. Verify all files are present:
   ```bash
   ls -la
   # Should show: manifest.json, popup.html, popup.js, etc.
   ```
3. Check file permissions (all files should be readable)

### Icons Not Displaying

**Problem**: Extension loaded but shows no icon or generic icon

**Solution**:
1. Verify icon files exist:
   ```bash
   ls icons/
   ```
2. If missing, generate icons:
   ```bash
   cd icons
   python3 generate-icons.py
   ```
3. Reload the extension:
   - Go to `chrome://extensions/`
   - Click the refresh icon on the extension card

### "No Active Tab Found" Error

**Problem**: Extension shows "No active tab found" when clicking buttons

**Solution**:
1. Make sure you're on a normal webpage (not chrome:// URLs)
2. Refresh the page
3. Try reloading the extension

### Content Script Not Injecting

**Problem**: "Detect Tables" doesn't work or highlights don't appear

**Solution**:
1. Check if the page allows content scripts (some sites block them)
2. Refresh the page after loading the extension
3. Check the browser console for errors:
   - Right-click on page → Inspect → Console tab
4. Some sites may have Content Security Policies that block extensions

### Copy to Clipboard Fails

**Problem**: "Failed to copy" error message

**Solution**:
1. Make sure clipboard permission is granted
2. Try clicking directly in the popup window before copying
3. Some browsers require user interaction in the popup window

### Extension Permissions Warning

**Problem**: Chrome shows warning about extension permissions

**Solution**:
This is normal. The extension needs:
- **activeTab**: To read the current page's content
- **scripting**: To inject content scripts
- **clipboardWrite**: To copy Markdown to clipboard
- **contextMenus**: For right-click menu options
- **<all_urls>**: To work on any website

All processing is done locally - no data is sent to external servers.

## Updating the Extension

When you make changes to the code:

1. Go to `chrome://extensions/`
2. Find "Web to Markdown Converter"
3. Click the refresh/reload icon (circular arrow)
4. Test your changes

## Uninstalling

To remove the extension:

1. Go to `chrome://extensions/`
2. Find "Web to Markdown Converter"
3. Click **Remove**
4. Confirm the removal

## Getting Help

If you encounter issues:

1. Check the [README.md](README.md) for general information
2. Review this installation guide
3. Check browser console for error messages
4. Open an issue on the project repository

## Next Steps

- Read the [README.md](README.md) for detailed feature documentation
- Try the extension on different websites
- Explore the custom range selection feature
- Experiment with different content types
