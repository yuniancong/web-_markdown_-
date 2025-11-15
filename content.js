// Import formatter utility functions
// Note: In Manifest V3, we'll include the formatter inline or use importScripts

// State
let detectedTables = [];
let currentTableIndex = 0;
let highlightedElement = null;
let highlightedTarget = null;
let isRangeSelectionMode = false;
let actionPanel = null;
let currentSelectedMarkdown = '';
let currentSelectedElement = null; // Track currently selected element for adjustment
let navigationMode = 'expand'; // 'expand' or 'shrink' mode

// Highlight element with overlay - fixed version
function highlightElement(element) {
  removeHighlight();

  if (!element) return;

  highlightedTarget = element;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'markdown-converter-highlight';

  // Update position function
  const updatePosition = () => {
    if (!highlightedTarget || !document.body.contains(highlightedTarget)) {
      removeHighlight();
      return;
    }

    const rect = highlightedTarget.getBoundingClientRect();
    overlay.style.cssText = `
      position: absolute;
      top: ${rect.top + window.scrollY}px;
      left: ${rect.left + window.scrollX}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 3px solid #1976d2;
      background: rgba(25, 118, 210, 0.1);
      pointer-events: none;
      z-index: 999998;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
      transition: none;
    `;
  };

  updatePosition();
  document.body.appendChild(overlay);
  highlightedElement = overlay;

  // Update position on scroll or resize
  const scrollHandler = () => updatePosition();
  window.addEventListener('scroll', scrollHandler, true);
  window.addEventListener('resize', scrollHandler);

  // Store handlers for cleanup
  overlay._scrollHandler = scrollHandler;

  // Scroll element into view if needed
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Remove highlight
function removeHighlight() {
  if (highlightedElement) {
    if (highlightedElement._scrollHandler) {
      window.removeEventListener('scroll', highlightedElement._scrollHandler, true);
      window.removeEventListener('resize', highlightedElement._scrollHandler);
    }
    highlightedElement.remove();
    highlightedElement = null;
  }
  highlightedTarget = null;
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

    // Show action panel for the first table
    const markdown = tableToMarkdown(detectedTables[0]);
    showActionPanelForTable(markdown, 0, detectedTables.length);
  }

  return detectedTables.length;
}

// Show action panel specifically for table with navigation
function showActionPanelForTable(markdown, currentIndex, totalCount) {
  removeActionPanel();

  currentSelectedMarkdown = markdown;

  const panel = document.createElement('div');
  panel.id = 'markdown-converter-action-panel';
  panel.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 2px solid #1976d2;
    border-radius: 8px;
    padding: 20px;
    z-index: 10000000;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    min-width: 350px;
    max-width: 500px;
  `;

  const hasMultipleTables = totalCount > 1;

  panel.innerHTML = `
    <div style="margin-bottom: 15px;">
      <h3 style="margin: 0 0 10px 0; color: #1976d2; font-size: 16px;">
        表格 ${currentIndex + 1} / ${totalCount}
      </h3>
      <p style="margin: 0; color: #666; font-size: 13px;">已转换为 Markdown 格式</p>
    </div>
    ${hasMultipleTables ? `
      <div style="display: flex; gap: 10px; margin-bottom: 10px;">
        <button id="md-prev-btn" style="
          flex: 1;
          padding: 8px 12px;
          background: #1976d2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
        ">← 上一个表格</button>
        <button id="md-next-btn" style="
          flex: 1;
          padding: 8px 12px;
          background: #1976d2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
        ">下一个表格 →</button>
      </div>
    ` : ''}
    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
      <button id="md-copy-btn" style="
        flex: 1;
        padding: 10px 16px;
        background: #2e7d32;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      ">📋 复制到剪贴板</button>
      <button id="md-cancel-btn" style="
        padding: 10px 16px;
        background: #757575;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      ">关闭</button>
    </div>
    <div style="
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 10px;
      max-height: 200px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.4;
    ">${markdown.substring(0, 400)}${markdown.length > 400 ? '\n...' : ''}</div>
  `;

  document.body.appendChild(panel);
  actionPanel = panel;

  // Copy button
  panel.querySelector('#md-copy-btn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(currentSelectedMarkdown);

      const btn = panel.querySelector('#md-copy-btn');
      btn.textContent = '✓ 已复制！';
      btn.style.background = '#4caf50';

      setTimeout(() => {
        removeActionPanel();
        removeHighlight();
      }, 1200);
    } catch (error) {
      alert('复制失败：' + error.message);
    }
  });

  // Cancel button
  panel.querySelector('#md-cancel-btn').addEventListener('click', () => {
    removeActionPanel();
    removeHighlight();
  });

  // Navigation buttons
  if (hasMultipleTables) {
    panel.querySelector('#md-prev-btn').addEventListener('click', () => {
      const result = previousTable();
      if (result.success) {
        showActionPanelForTable(result.markdown, result.currentIndex, result.tableCount);
      }
    });

    panel.querySelector('#md-next-btn').addEventListener('click', () => {
      const result = nextTable();
      if (result.success) {
        showActionPanelForTable(result.markdown, result.currentIndex, result.tableCount);
      }
    });
  }
}

// Previous table function
function previousTable() {
  if (detectedTables.length === 0) {
    return { success: false, error: 'No tables detected' };
  }

  currentTableIndex = (currentTableIndex - 1 + detectedTables.length) % detectedTables.length;
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

// Show action panel after selection with mode-based navigation
function showActionPanel(markdown, element) {
  removeActionPanel();

  currentSelectedMarkdown = markdown;
  currentSelectedElement = element;

  const panel = document.createElement('div');
  panel.id = 'markdown-converter-action-panel';
  panel.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 2px solid #1976d2;
    border-radius: 8px;
    padding: 20px;
    z-index: 10000000;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    min-width: 400px;
    max-width: 500px;
  `;

  // Get element description
  const elementDesc = getElementDescription(element);

  // Check available directions based on current mode
  const navInfo = getNavigationInfo(element, navigationMode);

  panel.innerHTML = `
    <div style="margin-bottom: 15px;">
      <h3 style="margin: 0 0 5px 0; color: #1976d2; font-size: 16px;">内容已选定</h3>
      <p style="margin: 0 0 8px 0; color: #888; font-size: 11px;">${elementDesc}</p>
      <p style="margin: 0; color: #666; font-size: 12px;">先选择模式，再用方向键微调</p>
    </div>

    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
      <button id="md-mode-expand" style="
        flex: 1;
        padding: 10px 16px;
        background: ${navigationMode === 'expand' ? '#1976d2' : '#e0e0e0'};
        color: ${navigationMode === 'expand' ? 'white' : '#666'};
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: ${navigationMode === 'expand' ? '600' : '400'};
        transition: all 0.2s;
      ">⬆️ 扩大范围</button>
      <button id="md-mode-shrink" style="
        flex: 1;
        padding: 10px 16px;
        background: ${navigationMode === 'shrink' ? '#1976d2' : '#e0e0e0'};
        color: ${navigationMode === 'shrink' ? 'white' : '#666'};
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: ${navigationMode === 'shrink' ? '600' : '400'};
        transition: all 0.2s;
      ">⬇️ 缩小范围</button>
    </div>

    <div style="margin-bottom: 12px; background: #f9f9f9; padding: 10px; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; color: #555; font-size: 11px; text-align: center; font-weight: 500;">
        ${navigationMode === 'expand' ? '扩大模式：导航到更大的元素' : '缩小模式：导航到子元素'}
      </p>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; max-width: 200px; margin: 0 auto;">
        <div></div>
        <button id="md-nav-up" style="
          padding: 10px;
          background: ${navInfo.canGoUp ? '#1976d2' : '#e0e0e0'};
          color: ${navInfo.canGoUp ? 'white' : '#999'};
          border: none;
          border-radius: 4px;
          cursor: ${navInfo.canGoUp ? 'pointer' : 'not-allowed'};
          font-size: 20px;
        " ${!navInfo.canGoUp ? 'disabled' : ''}>↑</button>
        <div></div>

        <button id="md-nav-left" style="
          padding: 10px;
          background: ${navInfo.canGoLeft ? '#1976d2' : '#e0e0e0'};
          color: ${navInfo.canGoLeft ? 'white' : '#999'};
          border: none;
          border-radius: 4px;
          cursor: ${navInfo.canGoLeft ? 'pointer' : 'not-allowed'};
          font-size: 20px;
        " ${!navInfo.canGoLeft ? 'disabled' : ''}>←</button>
        <div style="display: flex; align-items: center; justify-content: center; background: ${navigationMode === 'expand' ? '#e3f2fd' : '#fff3e0'}; border-radius: 4px; font-size: 16px; border: 2px solid ${navigationMode === 'expand' ? '#1976d2' : '#ff9800'};">◉</div>
        <button id="md-nav-right" style="
          padding: 10px;
          background: ${navInfo.canGoRight ? '#1976d2' : '#e0e0e0'};
          color: ${navInfo.canGoRight ? 'white' : '#999'};
          border: none;
          border-radius: 4px;
          cursor: ${navInfo.canGoRight ? 'pointer' : 'not-allowed'};
          font-size: 20px;
        " ${!navInfo.canGoRight ? 'disabled' : ''}>→</button>

        <div></div>
        <button id="md-nav-down" style="
          padding: 10px;
          background: ${navInfo.canGoDown ? '#1976d2' : '#e0e0e0'};
          color: ${navInfo.canGoDown ? 'white' : '#999'};
          border: none;
          border-radius: 4px;
          cursor: ${navInfo.canGoDown ? 'pointer' : 'not-allowed'};
          font-size: 20px;
        " ${!navInfo.canGoDown ? 'disabled' : ''}>↓</button>
        <div></div>
      </div>
    </div>

    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
      <button id="md-copy-btn" style="
        flex: 1;
        padding: 10px 16px;
        background: #2e7d32;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      ">📋 复制到剪贴板</button>
      <button id="md-cancel-btn" style="
        padding: 10px 16px;
        background: #757575;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      ">取消</button>
    </div>

    <div id="md-preview" style="
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 10px;
      max-height: 160px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.4;
    ">${markdown.substring(0, 400)}${markdown.length > 400 ? '\n...' : ''}</div>
  `;

  document.body.appendChild(panel);
  actionPanel = panel;

  // Mode toggle listeners
  panel.querySelector('#md-mode-expand').addEventListener('click', () => {
    navigationMode = 'expand';
    showActionPanel(currentSelectedMarkdown, currentSelectedElement);
  });

  panel.querySelector('#md-mode-shrink').addEventListener('click', () => {
    navigationMode = 'shrink';
    showActionPanel(currentSelectedMarkdown, currentSelectedElement);
  });

  // Copy and cancel listeners
  panel.querySelector('#md-copy-btn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(currentSelectedMarkdown);
      const btn = panel.querySelector('#md-copy-btn');
      btn.textContent = '✓ 已复制！';
      btn.style.background = '#4caf50';
      setTimeout(() => {
        removeActionPanel();
        removeHighlight();
      }, 1000);
    } catch (error) {
      alert('复制失败：' + error.message);
    }
  });

  panel.querySelector('#md-cancel-btn').addEventListener('click', () => {
    removeActionPanel();
    removeHighlight();
  });

  // Navigation button handlers
  if (navInfo.canGoUp) {
    panel.querySelector('#md-nav-up').addEventListener('click', () => {
      navigateDirection('up');
    });
  }

  if (navInfo.canGoDown) {
    panel.querySelector('#md-nav-down').addEventListener('click', () => {
      navigateDirection('down');
    });
  }

  if (navInfo.canGoLeft) {
    panel.querySelector('#md-nav-left').addEventListener('click', () => {
      navigateDirection('left');
    });
  }

  if (navInfo.canGoRight) {
    panel.querySelector('#md-nav-right').addEventListener('click', () => {
      navigateDirection('right');
    });
  }
}

// Get a description of the element
function getElementDescription(element) {
  if (!element) return '';

  const tag = element.tagName.toLowerCase();
  let desc = `<${tag}>`;

  if (element.id) {
    desc += ` #${element.id}`;
  }

  if (element.className && typeof element.className === 'string') {
    const classes = element.className.split(' ').filter(c => c && !c.startsWith('markdown-converter'));
    if (classes.length > 0) {
      desc += ` .${classes.slice(0, 2).join('.')}`;
    }
  }

  return desc;
}

// Get valid sibling (skip non-content elements)
function getValidSibling(element, direction) {
  if (!element) return null;

  let sibling = direction === 'previous' ? element.previousElementSibling : element.nextElementSibling;

  while (sibling) {
    const tag = sibling.tagName.toLowerCase();

    // Skip non-content elements and our own overlays
    if (tag !== 'script' && tag !== 'style' && tag !== 'noscript' &&
        sibling.id !== 'markdown-converter-highlight' &&
        sibling.id !== 'markdown-converter-instruction' &&
        sibling.id !== 'markdown-converter-action-panel') {
      return sibling;
    }

    sibling = direction === 'previous' ? sibling.previousElementSibling : sibling.nextElementSibling;
  }

  return null;
}

// Get valid child (skip non-content elements)
function getValidChild(element, position = 'first') {
  if (!element || !element.children || element.children.length === 0) {
    return null;
  }

  const children = Array.from(element.children);
  const startIndex = position === 'first' ? 0 : children.length - 1;
  const step = position === 'first' ? 1 : -1;

  for (let i = startIndex; position === 'first' ? i < children.length : i >= 0; i += step) {
    const child = children[i];
    const tag = child.tagName.toLowerCase();

    // Skip non-content elements and our own overlays
    if (tag !== 'script' && tag !== 'style' && tag !== 'noscript' &&
        child.id !== 'markdown-converter-highlight' &&
        child.id !== 'markdown-converter-instruction' &&
        child.id !== 'markdown-converter-action-panel') {
      return child;
    }
  }

  return null;
}

// Get parent element
function getValidParent(element) {
  if (!element || !element.parentElement) return null;

  const parent = element.parentElement;
  if (parent.tagName === 'HTML' || parent.tagName === 'BODY') return null;
  if (parent.id === 'markdown-converter-highlight' ||
      parent.id === 'markdown-converter-instruction' ||
      parent.id === 'markdown-converter-action-panel') return null;

  return parent;
}

// Get navigation information based on current mode
function getNavigationInfo(element, mode) {
  if (mode === 'expand') {
    // Expand mode: navigate in parent level
    const parent = getValidParent(element);
    return {
      canGoUp: parent !== null,
      canGoDown: parent !== null,
      canGoLeft: parent ? getValidSibling(parent, 'previous') !== null : false,
      canGoRight: parent ? getValidSibling(parent, 'next') !== null : false
    };
  } else {
    // Shrink mode: navigate in children level
    const children = element ? Array.from(element.children || []) : [];
    const validChildren = children.filter(c => {
      const tag = c.tagName.toLowerCase();
      return tag !== 'script' && tag !== 'style' && tag !== 'noscript';
    });

    return {
      canGoUp: validChildren.length > 1, // Can navigate between children
      canGoDown: validChildren.length > 1,
      canGoLeft: getValidChild(element, 'first') !== null,
      canGoRight: getValidChild(element, 'last') !== null
    };
  }
}

// Navigate in a specific direction based on current mode
function navigateDirection(direction) {
  if (!currentSelectedElement) return;

  let newElement = null;

  if (navigationMode === 'expand') {
    // Expand mode: navigate to expand selection
    const parent = getValidParent(currentSelectedElement);

    switch (direction) {
      case 'up':
      case 'down':
        // Go to parent element (expand upward)
        newElement = parent;
        break;

      case 'left':
        // Go to parent's previous sibling (move to another branch)
        if (parent) {
          newElement = getValidSibling(parent, 'previous');
        }
        break;

      case 'right':
        // Go to parent's next sibling (move to another branch)
        if (parent) {
          newElement = getValidSibling(parent, 'next');
        }
        break;
    }
  } else {
    // Shrink mode: navigate to children
    switch (direction) {
      case 'up':
        // Go to previous child
        const firstChild = getValidChild(currentSelectedElement, 'first');
        if (firstChild) {
          newElement = getValidSibling(firstChild, 'previous') || firstChild;
        }
        break;

      case 'down':
        // Go to next child
        const child = getValidChild(currentSelectedElement, 'first');
        if (child) {
          newElement = getValidSibling(child, 'next') || child;
        }
        break;

      case 'left':
        // Go to first child (dive deeper)
        newElement = getValidChild(currentSelectedElement, 'first');
        break;

      case 'right':
        // Go to last child (dive deeper)
        newElement = getValidChild(currentSelectedElement, 'last');
        break;
    }
  }

  if (!newElement) {
    return;
  }

  // Update selection
  currentSelectedElement = newElement;
  highlightElement(newElement);

  // Convert to markdown
  const markdown = elementToMarkdown(newElement);
  currentSelectedMarkdown = markdown;

  // Update the panel
  showActionPanel(markdown, newElement);
}

function removeActionPanel() {
  if (actionPanel) {
    actionPanel.remove();
    actionPanel = null;
  }
  currentSelectedMarkdown = '';
  currentSelectedElement = null;
}

// Range selection handlers
let rangeSelectionOverlay = null;
let hoverHandler = null;
let clickHandler = null;

function activateRangeSelection() {
  isRangeSelectionMode = true;
  document.body.style.cursor = 'crosshair';

  // Create instruction overlay
  const instruction = document.createElement('div');
  instruction.id = 'markdown-converter-instruction';
  instruction.innerHTML = `
    <div style="text-align: center;">
      <div style="font-size: 16px; font-weight: 500; margin-bottom: 5px;">🖱️ 选择内容转换为 Markdown</div>
      <div style="font-size: 12px; opacity: 0.9;">悬停高亮元素，点击选择</div>
    </div>
  `;
  instruction.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #1976d2;
    color: white;
    padding: 15px 30px;
    border-radius: 8px;
    z-index: 9999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideDown 0.3s ease;
  `;

  document.body.appendChild(instruction);
  rangeSelectionOverlay = instruction;

  // Add hover effect
  hoverHandler = (e) => {
    if (!isRangeSelectionMode) return;

    e.stopPropagation();
    const element = e.target;

    // Skip our own overlays
    if (element.id === 'markdown-converter-highlight' ||
        element.id === 'markdown-converter-instruction' ||
        element.id === 'markdown-converter-action-panel' ||
        element.closest('#markdown-converter-action-panel')) {
      return;
    }

    highlightElement(element);
  };

  // Add click handler
  clickHandler = (e) => {
    if (!isRangeSelectionMode) return;

    e.preventDefault();
    e.stopPropagation();

    const element = e.target;

    // Skip our own overlays
    if (element.id === 'markdown-converter-highlight' ||
        element.id === 'markdown-converter-instruction' ||
        element.id === 'markdown-converter-action-panel' ||
        element.closest('#markdown-converter-action-panel')) {
      return;
    }

    // Convert element to markdown
    const markdown = elementToMarkdown(element);

    // Show action panel with range adjustment
    showActionPanel(markdown, element);

    // Also send to popup
    chrome.runtime.sendMessage({
      action: 'rangeSelected',
      markdown: markdown
    });

    // Cleanup selection mode
    deactivateRangeSelection();
  };

  document.addEventListener('mouseover', hoverHandler);
  document.addEventListener('click', clickHandler, true);

  return { success: true };
}

function deactivateRangeSelection() {
  isRangeSelectionMode = false;
  document.body.style.cursor = '';

  if (rangeSelectionOverlay) {
    rangeSelectionOverlay.remove();
    rangeSelectionOverlay = null;
  }

  if (hoverHandler) {
    document.removeEventListener('mouseover', hoverHandler);
    hoverHandler = null;
  }

  if (clickHandler) {
    document.removeEventListener('click', clickHandler, true);
    clickHandler = null;
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
  removeActionPanel();
  deactivateRangeSelection();
});

// Also cleanup when visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Page is hidden, cleanup might be needed
  }
});
