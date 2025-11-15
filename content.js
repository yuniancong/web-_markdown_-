// Import formatter utility functions
// Note: In Manifest V3, we'll include the formatter inline or use importScripts

// State
let detectedTables = [];
let currentTableIndex = 0;
let highlightedElement = null;
let isRangeSelectionMode = false;

// Highlight element with overlay
function highlightElement(element) {
  removeHighlight();

  if (!element) return;

  const rect = element.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.id = 'markdown-converter-highlight';
  overlay.style.cssText = `
    position: fixed;
    top: ${rect.top + window.scrollY}px;
    left: ${rect.left + window.scrollX}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    border: 3px solid #1976d2;
    background: rgba(25, 118, 210, 0.1);
    pointer-events: none;
    z-index: 999999;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
  `;

  document.body.appendChild(overlay);
  highlightedElement = overlay;

  // Scroll element into view if needed
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Remove highlight
function removeHighlight() {
  if (highlightedElement) {
    highlightedElement.remove();
    highlightedElement = null;
  }
}

// Detect all tables in the page
function detectTables() {
  // Find all table elements
  const tables = Array.from(document.querySelectorAll('table'));

  // Filter out tiny tables (likely layout tables)
  detectedTables = tables.filter(table => {
    const rows = table.querySelectorAll('tr');
    const cells = table.querySelectorAll('td, th');
    return rows.length >= 2 && cells.length >= 2;
  });

  // Sort by size (larger tables first)
  detectedTables.sort((a, b) => {
    const sizeA = a.querySelectorAll('td, th').length;
    const sizeB = b.querySelectorAll('td, th').length;
    return sizeB - sizeA;
  });

  currentTableIndex = 0;

  // Highlight first table if any
  if (detectedTables.length > 0) {
    highlightElement(detectedTables[0]);
  }

  return detectedTables.length;
}

// Convert table to Markdown
function tableToMarkdown(table) {
  if (!table) return '';

  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length === 0) return '';

  let markdown = '';
  let hasHeader = false;

  // Check if first row is header
  const firstRow = rows[0];
  const firstRowHeaders = firstRow.querySelectorAll('th');
  if (firstRowHeaders.length > 0) {
    hasHeader = true;
  }

  rows.forEach((row, rowIndex) => {
    const cells = Array.from(row.querySelectorAll('td, th'));
    if (cells.length === 0) return;

    // Extract cell contents
    const cellContents = cells.map(cell => {
      let text = cell.textContent.trim();
      // Escape pipe characters
      text = text.replace(/\|/g, '\\|');
      // Replace newlines with spaces
      text = text.replace(/\n/g, ' ');
      return text;
    });

    // Create table row
    markdown += '| ' + cellContents.join(' | ') + ' |\n';

    // Add separator after header row
    if (rowIndex === 0 && (hasHeader || rows.length > 1)) {
      const separator = cells.map(() => '---').join(' | ');
      markdown += '| ' + separator + ' |\n';
    }
  });

  return markdown;
}

// Convert DOM element to Markdown
function elementToMarkdown(element) {
  if (!element) return '';

  // If it's a table, use table converter
  if (element.tagName === 'TABLE') {
    return tableToMarkdown(element);
  }

  // Otherwise, convert based on element type
  let markdown = '';

  const processNode = (node, depth = 0) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        markdown += text + ' ';
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toLowerCase();

    switch (tag) {
      case 'h1':
        markdown += '\n# ' + node.textContent.trim() + '\n\n';
        break;
      case 'h2':
        markdown += '\n## ' + node.textContent.trim() + '\n\n';
        break;
      case 'h3':
        markdown += '\n### ' + node.textContent.trim() + '\n\n';
        break;
      case 'h4':
        markdown += '\n#### ' + node.textContent.trim() + '\n\n';
        break;
      case 'h5':
        markdown += '\n##### ' + node.textContent.trim() + '\n\n';
        break;
      case 'h6':
        markdown += '\n###### ' + node.textContent.trim() + '\n\n';
        break;
      case 'p':
        markdown += '\n' + node.textContent.trim() + '\n\n';
        break;
      case 'br':
        markdown += '\n';
        break;
      case 'strong':
      case 'b':
        markdown += '**' + node.textContent.trim() + '**';
        break;
      case 'em':
      case 'i':
        markdown += '*' + node.textContent.trim() + '*';
        break;
      case 'code':
        markdown += '`' + node.textContent.trim() + '`';
        break;
      case 'pre':
        markdown += '\n```\n' + node.textContent.trim() + '\n```\n\n';
        break;
      case 'a':
        const href = node.getAttribute('href') || '';
        const text = node.textContent.trim();
        markdown += '[' + text + '](' + href + ')';
        break;
      case 'ul':
      case 'ol':
        markdown += '\n';
        Array.from(node.children).forEach((li, index) => {
          const bullet = tag === 'ul' ? '-' : `${index + 1}.`;
          markdown += bullet + ' ' + li.textContent.trim() + '\n';
        });
        markdown += '\n';
        break;
      case 'table':
        markdown += '\n' + tableToMarkdown(node) + '\n';
        break;
      case 'blockquote':
        const lines = node.textContent.trim().split('\n');
        lines.forEach(line => {
          markdown += '> ' + line + '\n';
        });
        markdown += '\n';
        break;
      case 'hr':
        markdown += '\n---\n\n';
        break;
      default:
        // For other elements, process children
        Array.from(node.childNodes).forEach(child => {
          processNode(child, depth + 1);
        });
        break;
    }
  };

  processNode(element);

  // Clean up extra whitespace
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

  return markdown;
}

// Cycle to next table
function nextTable() {
  if (detectedTables.length === 0) {
    return { success: false, error: 'No tables detected' };
  }

  currentTableIndex = (currentTableIndex + 1) % detectedTables.length;
  const table = detectedTables[currentTableIndex];

  highlightElement(table);

  const markdown = tableToMarkdown(table);

  return {
    success: true,
    currentIndex: currentTableIndex,
    tableCount: detectedTables.length,
    markdown: markdown,
    preview: markdown.substring(0, 500)
  };
}

// Range selection handlers
let rangeSelectionOverlay = null;

function activateRangeSelection() {
  isRangeSelectionMode = true;
  document.body.style.cursor = 'crosshair';

  // Create instruction overlay
  const instruction = document.createElement('div');
  instruction.id = 'markdown-converter-instruction';
  instruction.textContent = 'Click on any element to convert it to Markdown';
  instruction.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: #1976d2;
    color: white;
    padding: 12px 24px;
    border-radius: 4px;
    z-index: 9999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;

  document.body.appendChild(instruction);
  rangeSelectionOverlay = instruction;

  // Add hover effect
  const hoverHandler = (e) => {
    if (!isRangeSelectionMode) return;

    e.stopPropagation();
    const element = e.target;

    // Skip our own overlays
    if (element.id === 'markdown-converter-highlight' ||
        element.id === 'markdown-converter-instruction') {
      return;
    }

    highlightElement(element);
  };

  // Add click handler
  const clickHandler = (e) => {
    if (!isRangeSelectionMode) return;

    e.preventDefault();
    e.stopPropagation();

    const element = e.target;

    // Skip our own overlays
    if (element.id === 'markdown-converter-highlight' ||
        element.id === 'markdown-converter-instruction') {
      return;
    }

    // Convert element to markdown
    const markdown = elementToMarkdown(element);

    // Send to popup
    chrome.runtime.sendMessage({
      action: 'rangeSelected',
      markdown: markdown
    });

    // Cleanup
    deactivateRangeSelection();

    document.removeEventListener('mouseover', hoverHandler);
    document.removeEventListener('click', clickHandler);
  };

  document.addEventListener('mouseover', hoverHandler);
  document.addEventListener('click', clickHandler);

  return { success: true };
}

function deactivateRangeSelection() {
  isRangeSelectionMode = false;
  document.body.style.cursor = '';

  if (rangeSelectionOverlay) {
    rangeSelectionOverlay.remove();
    rangeSelectionOverlay = null;
  }
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'detectTables':
      const count = detectTables();
      const result = {
        success: true,
        tableCount: count,
        currentIndex: 0
      };

      if (count > 0) {
        result.markdown = tableToMarkdown(detectedTables[0]);
        result.preview = result.markdown.substring(0, 500);
      }

      sendResponse(result);
      break;

    case 'nextTable':
      sendResponse(nextTable());
      break;

    case 'selectRange':
      sendResponse(activateRangeSelection());
      break;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }

  return true; // Keep the message channel open for async response
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  removeHighlight();
  deactivateRangeSelection();
});
