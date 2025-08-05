// Background script for the DevToolkit Pro extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('DevToolkit Pro extension installed');
  
  // Set default settings
  chrome.storage.sync.set({
    theme: 'light',
    autoFormat: true,
    colorHistory: []
  });
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'colorPicked':
      // Store color in history
      chrome.storage.sync.get(['colorHistory'], (result) => {
        const history = result.colorHistory || [];
        history.unshift(request.color);
        
        // Keep only last 20 colors
        if (history.length > 20) {
          history.splice(20);
        }
        
        chrome.storage.sync.set({ colorHistory: history });
      });
      break;
      
    case 'saveCodeSnippet':
      // Save code snippet
      chrome.storage.local.get(['codeSnippets'], (result) => {
        const snippets = result.codeSnippets || [];
        snippets.push({
          id: Date.now(),
          language: request.language,
          code: request.code,
          title: request.title || 'Untitled',
          timestamp: new Date().toISOString()
        });
        
        chrome.storage.local.set({ codeSnippets: snippets });
      });
      break;
      
    case 'getPerformanceMetrics':
      // Get performance metrics from active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            const metrics = {
              timing: performance.timing,
              navigation: performance.navigation,
              memory: performance.memory || null,
              resources: performance.getEntriesByType('resource').slice(0, 10)
            };
            return metrics;
          }
        }, (results) => {
          sendResponse(results[0]?.result || null);
        });
      });
      return true; // Keep message channel open for async response
      
    case 'injectCSS':
      // Inject CSS into active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.insertCSS({
          target: { tabId: tabs[0].id },
          css: request.css
        });
      });
      break;
      
    case 'removeCSS':
      // Remove injected CSS
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.removeCSS({
          target: { tabId: tabs[0].id },
          css: request.css
        });
      });
      break;
  }
});

// Context menu items (optional enhancement)
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'pickColor':
      chrome.tabs.sendMessage(tab.id, { action: 'startColorPicker' });
      break;
    case 'analyyzePage':
      chrome.tabs.sendMessage(tab.id, { action: 'analyyzePage' });
      break;
  }
});

// Handle tab updates to refresh analytics
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Optionally refresh analytics data
    chrome.storage.session.remove(`analytics_${tabId}`);
  }
});

// Clean up storage periodically
chrome.alarms.create('cleanup', { delayInMinutes: 60, periodInMinutes: 1440 }); // Daily cleanup

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup') {
    // Clean up old analytics data and temporary storage
    chrome.storage.session.clear();
    
    // Clean up old code snippets (keep only last 50)
    chrome.storage.local.get(['codeSnippets'], (result) => {
      const snippets = result.codeSnippets || [];
      if (snippets.length > 50) {
        const recentSnippets = snippets
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 50);
        chrome.storage.local.set({ codeSnippets: recentSnippets });
      }
    });
  }
});

// Handle installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First time installation
    chrome.tabs.create({
      url: 'data:text/html,<h1>Welcome to DevToolkit Pro!</h1><p>Click the extension icon to get started.</p>'
    });
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('DevToolkit Pro updated to version', chrome.runtime.getManifest().version);
  }
});