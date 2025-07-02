// popup.js - Basic popup functionality

document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup loaded');
  
  // Get current tab classification
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs[0]) {
      // Try to get classification from content script
      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_CLASSIFICATION' }, function(response) {
        if (response && response.data) {
          displayClassification(response.data);
        }
      });
    }
  });
  
  function displayClassification(classification) {
    const container = document.getElementById('classification-result');
    if (container) {
      container.innerHTML = `
        <h3>Page Classification</h3>
        <p><strong>Category:</strong> ${classification.category}</p>
        <p><strong>Subcategory:</strong> ${classification.subcategory}</p>
        <p><strong>Confidence:</strong> ${(classification.confidence * 100).toFixed(1)}%</p>
        <p><strong>Method:</strong> ${classification.metadata.method}</p>
      `;
    }
  }
});
