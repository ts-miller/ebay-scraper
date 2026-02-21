// ZON Format Converter (inline for service worker)
function toZon(value, indent = 0) {
    const spaces = '  '.repeat(indent);
    const nextSpaces = '  '.repeat(indent + 1);

    if (value === null || value === undefined) {
        return '.null';
    }

    if (typeof value === 'boolean') {
        return value ? '.true' : '.false';
    }

    if (typeof value === 'number') {
        return String(value);
    }

    if (typeof value === 'string') {
        const escaped = value
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
        return `"${escaped}"`;
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return '.[]';
        }
        
        const items = value.map(item => `${nextSpaces}${toZon(item, indent + 1)}`);
        return `.[\n${items.join('\n')}\n${spaces}]`;
    }

    if (typeof value === 'object') {
        const keys = Object.keys(value);
        if (keys.length === 0) {
            return '.{}';
        }
        
        const fields = keys.map(key => {
            const needsQuotes = /[^a-zA-Z0-9_]/.test(key) || /^\d/.test(key);
            const keyStr = needsQuotes ? `"${key}"` : key;
            return `${nextSpaces}.${keyStr} = ${toZon(value[key], indent + 1)}`;
        });
        
        return `.{\n${fields.join('\n')}\n${spaces}}`;
    }

    return '.null';
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "DOWNLOAD_RESULTS") {
        const { data, searchTerm } = request;
        
        // Get user's format preference
        chrome.storage.local.get(['exportFormat'], (result) => {
            const format = result.exportFormat || 'json';
            
            const outputStr = format === 'zon' 
                ? toZon(data, 0)
                : JSON.stringify(data, null, 2);
            
            const dataUrl = `data:text/plain;base64,${btoa(unescape(encodeURIComponent(outputStr)))}`;

            // Sanitized search term
            const sanitizedTerm = (searchTerm || 'ebay-scrape').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
            const itemCount = data.length;

            // Current timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

            chrome.downloads.download({
                url: dataUrl,
                filename: `${sanitizedTerm}_${itemCount}-items_${timestamp}.${format}`,
                saveAs: true
            });

            sendResponse({ success: true });
        });
        
        return true; // Keep channel open for async response
    }
});
