chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://')) {
    console.log('Cannot interact with special pages');
    return;
  }

  try {
    // First, try to send a message to see if the content script is already there.
    await chrome.tabs.sendMessage(tab.id, { action: 'toggleEditor' });
  } catch (error) {
    // If it fails, the content script is not injected yet.
    console.log('Content script not found, injecting...');
    try {
      // Inject CSS and JS
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['editor.css', 'hljs-theme.css'] });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['highlight.min.js', 'content.js'] });

      // Wait a moment for the script to load, then send the message again.
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { action: 'toggleEditor' });
      }, 200);
    } catch (injectError) {
      console.error('Failed to inject content script:', injectError);
    }
  }
});