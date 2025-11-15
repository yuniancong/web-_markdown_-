// Background service worker for Chrome Extension

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Web to Markdown Converter installed', details);

  if (details.reason === 'install') {
    // Set default settings or perform initial setup
    console.log('First time installation');
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'copyToClipboard':
      handleCopyToClipboard(message.text)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response

    case 'saveToFile':
      handleSaveToFile(message.data, message.filename)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }

  return true;
});

// Copy text to clipboard using offscreen document or direct API
async function handleCopyToClipboard(text) {
  try {
    // In service worker context, we can't directly access clipboard
    // We'll use the Permissions API approach

    // For Manifest V3, the popup should handle clipboard directly
    // This is a fallback that creates a temporary textarea

    // Since service workers can't access DOM, we'll rely on the popup
    // or create an offscreen document for clipboard access

    console.log('Clipboard operation requested');

    // The popup.js should handle this directly using navigator.clipboard
    // This is here as a backup

    return Promise.resolve();
  } catch (error) {
    console.error('Clipboard error:', error);
    throw error;
  }
}

// Save data to file
async function handleSaveToFile(data, filename) {
  try {
    // Create a blob from the data
    const blob = new Blob([data], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    // Trigger download
    await chrome.downloads.download({
      url: url,
      filename: filename || 'export.md',
      saveAs: true
    });

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return Promise.resolve();
  } catch (error) {
    console.error('Save file error:', error);
    throw error;
  }
}

// Handle context menu actions (optional feature)
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu items
  chrome.contextMenus.create({
    id: 'convert-to-markdown',
    title: 'Convert to Markdown',
    contexts: ['selection', 'page']
  });

  chrome.contextMenus.create({
    id: 'extract-table',
    title: 'Extract Table as Markdown',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'convert-to-markdown':
      chrome.tabs.sendMessage(tab.id, {
        action: 'convertSelection',
        selectionText: info.selectionText
      });
      break;

    case 'extract-table':
      chrome.tabs.sendMessage(tab.id, {
        action: 'detectTables'
      });
      break;
  }
});

// Listen for keyboard shortcuts (optional)
chrome.commands.onCommand.addListener((command) => {
  switch (command) {
    case 'detect-tables':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'detectTables' });
        }
      });
      break;

    case 'next-table':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'nextTable' });
        }
      });
      break;
  }
});
