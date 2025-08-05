// Content script for interacting with web pages
(function() {
  'use strict';

  // Color picker functionality
  let isPickingColor = false;
  let colorPickerOverlay = null;

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'startColorPicker':
        startColorPicker();
        break;
      case 'stopColorPicker':
        stopColorPicker();
        break;
      case 'analyyzePage':
        sendResponse(analyyzePage());
        break;
    }
  });

  function startColorPicker() {
    if (isPickingColor) return;
    
    isPickingColor = true;
    document.body.style.cursor = 'crosshair';
    
    // Create overlay
    colorPickerOverlay = document.createElement('div');
    colorPickerOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 999999;
      cursor: crosshair;
      background: transparent;
    `;
    
    colorPickerOverlay.addEventListener('click', handleColorPick);
    colorPickerOverlay.addEventListener('mousemove', showColorPreview);
    document.body.appendChild(colorPickerOverlay);
    
    // Add escape key listener
    document.addEventListener('keydown', handleEscapeKey);
  }

  function stopColorPicker() {
    if (!isPickingColor) return;
    
    isPickingColor = false;
    document.body.style.cursor = '';
    
    if (colorPickerOverlay) {
      colorPickerOverlay.remove();
      colorPickerOverlay = null;
    }
    
    document.removeEventListener('keydown', handleEscapeKey);
  }

  function handleColorPick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1;
    canvas.height = 1;
    
    // This is a simplified version - in reality, you'd need to capture
    // the pixel data at the cursor position
    const color = getColorAtPosition(event.clientX, event.clientY);
    
    chrome.runtime.sendMessage({
      action: 'colorPicked',
      color: color
    });
    
    stopColorPicker();
  }

  function getColorAtPosition(x, y) {
    // This is a placeholder - actual implementation would require
    // more complex pixel sampling
    const element = document.elementFromPoint(x, y);
    if (element) {
      const styles = window.getComputedStyle(element);
      return styles.backgroundColor || styles.color || '#000000';
    }
    return '#000000';
  }

  function showColorPreview(event) {
    // Show a small preview of the color being hovered
    // Implementation would show a small tooltip with color info
  }

  function handleEscapeKey(event) {
    if (event.key === 'Escape') {
      stopColorPicker();
    }
  }

  function analyyzePage() {
    const stats = {
      title: document.title,
      url: window.location.href,
      elements: document.querySelectorAll('*').length,
      images: document.querySelectorAll('img').length,
      links: document.querySelectorAll('a').length,
      forms: document.querySelectorAll('form').length,
      scripts: document.querySelectorAll('script').length,
      stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
      headings: {
        h1: document.querySelectorAll('h1').length,
        h2: document.querySelectorAll('h2').length,
        h3: document.querySelectorAll('h3').length,
        h4: document.querySelectorAll('h4').length,
        h5: document.querySelectorAll('h5').length,
        h6: document.querySelectorAll('h6').length
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      performance: performance.timing ? {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
      } : null,
      accessibility: analyzeAccessibility()
    };
    
    return stats;
  }

  function analyzeAccessibility() {
    return {
      imagesWithoutAlt: document.querySelectorAll('img:not([alt])').length,
      inputsWithoutLabels: document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])').length,
      headingStructure: analyzeHeadingStructure(),
      colorContrast: analyzeColorContrast()
    };
  }

  function analyzeHeadingStructure() {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const structure = headings.map(h => ({
      level: parseInt(h.tagName.charAt(1)),
      text: h.textContent.trim().substring(0, 50)
    }));
    
    return {
      total: headings.length,
      structure: structure,
      hasH1: document.querySelector('h1') !== null,
      multipleH1: document.querySelectorAll('h1').length > 1
    };
  }

  function analyzeColorContrast() {
    // Simplified color contrast analysis
    const textElements = document.querySelectorAll('p, span, div, a, button, h1, h2, h3, h4, h5, h6');
    let lowContrastElements = 0;
    
    textElements.forEach(element => {
      const styles = window.getComputedStyle(element);
      const textColor = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      // This would need a proper contrast ratio calculation
      // For now, just check if colors are set
      if (textColor === 'rgb(0, 0, 0)' && backgroundColor === 'rgba(0, 0, 0, 0)') {
        lowContrastElements++;
      }
    });
    
    return {
      total: textElements.length,
      potentialIssues: lowContrastElements
    };
  }

  // Performance monitoring
  function monitorPerformance() {
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      return {
        navigation: navigation,
        paint: paint,
        memory: performance.memory ? {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        } : null
      };
    }
    return null;
  }

  // Initialize content script
  console.log('DevToolkit Pro content script loaded');
})();