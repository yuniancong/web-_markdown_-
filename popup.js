// DOM elements
const detectTablesBtn = document.getElementById('detectTables');
const nextTableBtn = document.getElementById('nextTable');
const copyMarkdownBtn = document.getElementById('copyMarkdown');
const exportPackageBtn = document.getElementById('exportPackage');
const selectRangeBtn = document.getElementById('selectRange');
const statusDiv = document.getElementById('status');
const tableCountP = document.getElementById('tableCount');
const currentTableP = document.getElementById('currentTable');
const previewContent = document.getElementById('previewContent');

// State
let currentTabId = null;
let tablesDetected = false;
let currentMarkdown = '';

// Initialize
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    currentTabId = tabs[0].id;
  }
});

// Update status message
function updateStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = 'status';
  if (type === 'success') {
    statusDiv.classList.add('success');
  } else if (type === 'error') {
    statusDiv.classList.add('error');
  }
}

// Update UI based on state
function updateUI(data) {
  if (data.tableCount !== undefined) {
    tableCountP.textContent = `Found ${data.tableCount} table(s)`;
    tablesDetected = data.tableCount > 0;
    nextTableBtn.disabled = !tablesDetected;
    copyMarkdownBtn.disabled = !tablesDetected;
    exportPackageBtn.disabled = !tablesDetected;
  }

  if (data.currentIndex !== undefined && data.tableCount > 0) {
    currentTableP.textContent = `Viewing table ${data.currentIndex + 1} of ${data.tableCount}`;
  }

  if (data.markdown !== undefined) {
    currentMarkdown = data.markdown;
    previewContent.textContent = data.markdown;
    copyMarkdownBtn.disabled = !data.markdown;
    exportPackageBtn.disabled = !data.markdown;
  }

  if (data.preview !== undefined) {
    previewContent.textContent = data.preview;
  }
}

// Detect tables in the current page
detectTablesBtn.addEventListener('click', async () => {
  if (!currentTabId) {
    updateStatus('No active tab found', 'error');
    return;
  }

  updateStatus('Detecting tables...');

  try {
    const response = await chrome.tabs.sendMessage(currentTabId, {
      action: 'detectTables'
    });

    if (response.success) {
      updateStatus(`Found ${response.tableCount} table(s)`, 'success');
      updateUI(response);
    } else {
      updateStatus(response.error || 'Failed to detect tables', 'error');
    }
  } catch (error) {
    updateStatus('Error: ' + error.message, 'error');
    console.error('Detection error:', error);
  }
});

// Cycle to next table
nextTableBtn.addEventListener('click', async () => {
  if (!currentTabId) {
    updateStatus('No active tab found', 'error');
    return;
  }

  updateStatus('Loading next table...');

  try {
    const response = await chrome.tabs.sendMessage(currentTabId, {
      action: 'nextTable'
    });

    if (response.success) {
      updateStatus('Table loaded', 'success');
      updateUI(response);
    } else {
      updateStatus(response.error || 'Failed to load next table', 'error');
    }
  } catch (error) {
    updateStatus('Error: ' + error.message, 'error');
    console.error('Next table error:', error);
  }
});

// Copy markdown to clipboard
copyMarkdownBtn.addEventListener('click', async () => {
  if (!currentMarkdown) {
    updateStatus('No content to copy', 'error');
    return;
  }

  try {
    // Use the Clipboard API
    await navigator.clipboard.writeText(currentMarkdown);
    updateStatus('Copied to clipboard!', 'success');

    // Reset status after 2 seconds
    setTimeout(() => {
      updateStatus('Ready to extract content');
    }, 2000);
  } catch (error) {
    // Fallback to background script if Clipboard API fails
    try {
      await chrome.runtime.sendMessage({
        action: 'copyToClipboard',
        text: currentMarkdown
      });
      updateStatus('Copied to clipboard!', 'success');
      setTimeout(() => {
        updateStatus('Ready to extract content');
      }, 2000);
    } catch (bgError) {
      updateStatus('Failed to copy: ' + error.message, 'error');
      console.error('Copy error:', error, bgError);
    }
  }
});

// Export package with images
exportPackageBtn.addEventListener('click', async () => {
  if (!currentMarkdown) {
    updateStatus('No content to export', 'error');
    return;
  }

  updateStatus('Preparing export package...');

  try {
    // Get current tab URL
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
      throw new Error('No active tab');
    }

    const pageUrl = tabs[0].url;
    const pageTitle = tabs[0].title || 'export';
    const filename = pageTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);

    updateStatus('Downloading images...');

    // Create package with images
    const packageData = await ImageHandler.createPackage(
      currentMarkdown,
      pageUrl,
      filename
    );

    if (packageData.hasImages) {
      updateStatus(`Downloaded ${packageData.successCount}/${packageData.totalImages} images, creating ZIP...`);
    } else {
      updateStatus('No images found, creating ZIP...');
    }

    // Create ZIP file
    const zipBlob = await ImageHandler.createZip(packageData, filename);

    // Trigger download
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    const message = packageData.hasImages
      ? `Package exported with ${packageData.successCount} image(s)!`
      : 'Package exported (no images)!';
    updateStatus(message, 'success');

    // Reset status after 3 seconds
    setTimeout(() => {
      updateStatus('Ready to extract content');
    }, 3000);
  } catch (error) {
    updateStatus('Export failed: ' + error.message, 'error');
    console.error('Export error:', error);
  }
});

// Select custom range
selectRangeBtn.addEventListener('click', async () => {
  if (!currentTabId) {
    updateStatus('No active tab found', 'error');
    return;
  }

  updateStatus('Click and drag to select a range...');

  try {
    const response = await chrome.tabs.sendMessage(currentTabId, {
      action: 'selectRange'
    });

    if (response.success) {
      updateStatus('Range selection mode activated', 'success');
    } else {
      updateStatus(response.error || 'Failed to activate range selection', 'error');
    }
  } catch (error) {
    updateStatus('Error: ' + error.message, 'error');
    console.error('Range selection error:', error);
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updatePreview') {
    updateUI(message.data);
    updateStatus('Content updated', 'success');
  } else if (message.action === 'rangeSelected') {
    updateUI({
      markdown: message.markdown,
      preview: message.markdown
    });
    updateStatus('Range selected and converted', 'success');
    copyMarkdownBtn.disabled = false;
    exportPackageBtn.disabled = false;
  }
});
