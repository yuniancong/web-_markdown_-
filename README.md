# Web to Markdown Converter

A Chrome extension (Manifest V3) that extracts HTML tables and DOM content as Markdown, optimized for Heptabase.

## Features

- **Table Detection**: Automatically detect all tables on any webpage
- **Table Cycling**: Browse through detected tables one by one (similar to Instant Data Scraper's "Try another table" feature)
- **Custom Range Selection**: Select any DOM element on the page to convert to Markdown
- **Markdown Conversion**: Convert HTML tables, headings, lists, and other elements to clean Markdown
- **Clipboard Integration**: Copy converted Markdown directly to clipboard
- **Heptabase Compatible**: Generates Markdown that pastes cleanly into Heptabase

## Installation

### From Source

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the extension directory (`web-_markdown_-`)

### Generate Icons (Optional)

If icons are not present, you can generate them:

```bash
cd icons
python3 generate-icons.py
```

Or open `icons/icon-generator.html` in your browser to generate and download icons manually.

## Usage

### Detect and Extract Tables

1. Navigate to any webpage with tables
2. Click the extension icon in your Chrome toolbar
3. Click "Detect Tables" to find all tables on the page
4. Use "Try Another Table" to cycle through different tables
5. Preview the Markdown in the popup
6. Click "Copy as Markdown" to copy to clipboard
7. Paste into Heptabase or any Markdown editor

### Select Custom Range

1. Click the extension icon
2. Click "Select Custom Range"
3. Hover over elements on the page (they will be highlighted)
4. Click on the element you want to convert
5. The Markdown will be generated and shown in the preview
6. Click "Copy as Markdown" to copy to clipboard

## Architecture

The extension consists of several key components:

### Manifest V3 Configuration (`manifest.json`)
- Defines extension permissions and structure
- Configures content scripts, background service worker, and popup

### Popup UI (`popup.html`, `popup.css`, `popup.js`)
- User interface for controlling the extension
- Displays detected tables and preview
- Handles user actions and messaging

### Content Script (`content.js`, `content.css`)
- Runs on all webpages
- Detects and highlights tables and elements
- Converts DOM elements to Markdown
- Handles range selection mode

### Background Service Worker (`background.js`)
- Manages clipboard operations
- Handles context menu actions
- Provides keyboard shortcuts (optional)

### Markdown Formatter (`formatter.js`)
- Utility functions for converting HTML to Markdown
- Supports tables, headings, lists, code blocks, and more
- Ensures Heptabase-compatible output

## Supported Markdown Elements

The extension converts the following HTML elements to Markdown:

- **Tables**: Full table support with headers
- **Headings**: H1-H6
- **Paragraphs**: Standard text blocks
- **Bold/Italic**: Strong and emphasis
- **Links**: Anchor tags with URLs
- **Images**: Image tags with alt text
- **Lists**: Ordered and unordered lists
- **Code**: Inline code and code blocks
- **Blockquotes**: Quote formatting
- **Horizontal Rules**: Dividers

## Development

### File Structure

```
web-_markdown_-/
├── manifest.json           # Extension configuration
├── popup.html              # Popup UI structure
├── popup.css               # Popup styles
├── popup.js                # Popup logic
├── content.js              # Content script
├── content.css             # Content script styles
├── background.js           # Background service worker
├── formatter.js            # Markdown formatter utility
├── icons/                  # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   ├── generate-icons.py   # Icon generator script
│   └── icon-generator.html # Browser-based icon generator
└── README.md               # This file
```

### Building

No build process required. The extension can be loaded directly as an unpacked extension.

### Testing

1. Load the extension in Chrome
2. Navigate to test pages with various content types
3. Test table detection on pages with multiple tables
4. Test custom range selection on different elements
5. Verify Markdown output in Heptabase or a Markdown editor

### Debugging

- Open Chrome DevTools for the popup: Right-click the popup and select "Inspect"
- View content script logs: Open DevTools on the webpage (F12)
- View background script logs: Go to `chrome://extensions/` and click "service worker"

## Permissions

The extension requires the following permissions:

- `activeTab`: To access the current tab's content
- `scripting`: To inject content scripts
- `clipboardWrite`: To copy Markdown to clipboard
- `<all_urls>`: To work on any website

## Privacy

This extension:
- Does NOT collect any user data
- Does NOT send data to external servers
- Only processes content locally in your browser
- Only accesses clipboard when you explicitly click "Copy"

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License

## Credits

Inspired by Instant Data Scraper's table cycling feature.
Built for seamless integration with Heptabase.
