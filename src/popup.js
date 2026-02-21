document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const statusUrl = document.getElementById('check-url');
    const statusDom = document.getElementById('check-dom');
    const btnCopy = document.getElementById('btn-copy');
    const btnDownload = document.getElementById('btn-download');
    const btnScrapeAll = document.getElementById('btn-scrape-all');
    const msg = document.getElementById('message');
    const formatToggle = document.getElementById('format-toggle-input');
    const formatLabel = document.getElementById('format-label');

    // State
    let currentFormat = 'json'; // 'json' or 'zon'

    // Load saved format preference
    chrome.storage.local.get(['exportFormat'], (result) => {
        if (result.exportFormat === 'zon') {
            currentFormat = 'zon';
            formatToggle.checked = true;
            formatLabel.textContent = 'ZON';
            updateButtonLabels();
        }
    });

    // Handle format toggle
    formatToggle.addEventListener('change', () => {
        currentFormat = formatToggle.checked ? 'zon' : 'json';
        formatLabel.textContent = currentFormat.toUpperCase();
        chrome.storage.local.set({ exportFormat: currentFormat });
        updateButtonLabels();
    });

    function updateButtonLabels() {
        const ext = currentFormat.toUpperCase();
        btnCopy.textContent = `Copy ${ext} to Clipboard`;
        btnDownload.textContent = `Download .${currentFormat} File`;
    }

    function updateStatus(element, isSuccess, successText, failText) {
        element.className = `status-item ${isSuccess ? 'success' : 'error'}`;
        element.querySelector('.text').textContent = isSuccess ? successText : failText;
        return isSuccess;
    }

    // 1. Check Status on Load
    function setPending(element, text) {
        element.className = 'status-item pending';
        element.querySelector('.text').textContent = text;
    }

    let attempts = 0;
    const maxAttempts = 15;

    function checkPage() {
        try {
            chrome.tabs.sendMessage(tab.id, { action: "CHECK_STATUS" }, (response) => {
                if (chrome.runtime.lastError || !response) {
                    if (attempts < maxAttempts) {
                        attempts++;
                        setTimeout(checkPage, 1000);
                    } else {
                        updateStatus(statusUrl, false, "", "Error connecting to page");
                        updateStatus(statusDom, false, "", "Reload page to fix");
                    }
                    return;
                }

                const isEbay = updateStatus(statusUrl, response.isEbay, "Valid eBay URL", "Not an eBay Page");

                if (!isEbay) {
                    updateStatus(statusDom, false, "", "No Results Found");
                    return;
                }

                if (response.hasResults) {
                    updateStatus(statusDom, true, "Results Found", "No Results Found");
                    btnCopy.disabled = false;
                    btnDownload.disabled = false;
                    btnScrapeAll.disabled = false;
                } else {
                    if (attempts < maxAttempts) {
                        attempts++;
                        setPending(statusDom, "Loading results...");
                        setTimeout(checkPage, 1000);
                    } else {
                        updateStatus(statusDom, false, "Results Found", "No Results Found");
                    }
                }
            });
        } catch (e) {
            console.error(e);
            if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkPage, 1000);
            }
        }
    }

    checkPage();

    // 2. Handle Copy
    btnCopy.addEventListener('click', () => {
        chrome.tabs.sendMessage(tab.id, { action: "SCRAPE" }, (response) => {
            if (response && response.data) {
                const outputStr = currentFormat === 'zon' 
                    ? convertToZon(response.data)
                    : JSON.stringify(response.data, null, 2);
                
                navigator.clipboard.writeText(outputStr).then(() => {
                    msg.textContent = `\u2705 Copied ${response.data.length} items as ${currentFormat.toUpperCase()}!`;
                    setTimeout(() => msg.textContent = '', 3000);
                });
            }
        });
    });

    // 3. Handle Download
    btnDownload.addEventListener('click', () => {
        chrome.tabs.sendMessage(tab.id, { action: "SCRAPE" }, (response) => {
            if (response && response.data) {
                const outputStr = currentFormat === 'zon' 
                    ? convertToZon(response.data)
                    : JSON.stringify(response.data, null, 2);
                
                const mimeType = currentFormat === 'zon' 
                    ? 'text/plain' 
                    : 'application/json';
                
                const blob = new Blob([outputStr], { type: mimeType });
                const url = URL.createObjectURL(blob);
                
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                
                let filenamePrefix = 'ebay-results';
                try {
                    const currentUrl = new URL(tab.url);
                    if (currentUrl.searchParams.get('LH_Sold') === '1') {
                        filenamePrefix += '-sold';
                    }
                } catch (e) {
                    // Ignore URL parsing errors
                }

                chrome.downloads.download({
                    url: url,
                    filename: `${filenamePrefix}-${timestamp}.${currentFormat}`,
                    saveAs: true
                });

                msg.textContent = `\u2B07 Downloading...`;
            }
        });
    });

    // 4. Handle Auto-Scrape
    btnScrapeAll.addEventListener('click', async () => {
        if (!chrome.storage) {
            alert("Please reload the extension to enable storage permissions.\n(Go to chrome://extensions -> Reload)");
            return;
        }

        msg.textContent = "Initializing auto-scrape...";
        btnScrapeAll.disabled = true;
        
        // Reset storage state
        await chrome.storage.local.set({ 
            isScraping: true, 
            scrapedData: [],
            scrapePageCount: 1
        });

        // Construct URL with max results per page
        const currentUrl = new URL(tab.url);
        currentUrl.searchParams.set('_ipg', '240');
        currentUrl.searchParams.set('_pgn', '1');

        // Navigate
        chrome.tabs.update(tab.id, { url: currentUrl.toString() });
    });
});