// DOM elements
const detectTablesBtn = document.getElementById('detectTables');
const selectRangeBtn = document.getElementById('selectRange');
const statusDiv = document.getElementById('status');

// State
let currentTabId = null;

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

// Detect tables in the current page
detectTablesBtn.addEventListener('click', async () => {
  if (!currentTabId) {
    updateStatus('未找到活动标签页', 'error');
    return;
  }

  updateStatus('正在检测表格...');

  try {
    const response = await chrome.tabs.sendMessage(currentTabId, {
      action: 'detectTables'
    });

    if (response.success) {
      if (response.tableCount > 0) {
        updateStatus(`找到 ${response.tableCount} 个表格，在页面上显示操作面板`, 'success');
        // Close popup after a short delay so user can see the page
        setTimeout(() => window.close(), 800);
      } else {
        updateStatus('未找到表格，请尝试其他页面', 'error');
      }
    } else {
      updateStatus(response.error || '检测表格失败', 'error');
    }
  } catch (error) {
    updateStatus('错误: ' + error.message, 'error');
    console.error('Detection error:', error);
  }
});

// Select custom range
selectRangeBtn.addEventListener('click', async () => {
  if (!currentTabId) {
    updateStatus('未找到活动标签页', 'error');
    return;
  }

  updateStatus('已激活选择模式...');

  try {
    const response = await chrome.tabs.sendMessage(currentTabId, {
      action: 'selectRange'
    });

    if (response.success) {
      updateStatus('请在页面上选择元素', 'success');
      // Close popup to let user interact with the page
      setTimeout(() => window.close(), 600);
    } else {
      updateStatus(response.error || '激活选择模式失败', 'error');
    }
  } catch (error) {
    updateStatus('错误: ' + error.message, 'error');
    console.error('Range selection error:', error);
  }
});
