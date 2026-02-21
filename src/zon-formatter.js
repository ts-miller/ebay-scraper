// ZON Format Converter
// Converts JavaScript objects to ZON format
// Based on: https://zonformat.org

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
        // Escape special characters
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
            // Check if key needs quotes (contains special chars)
            const needsQuotes = /[^a-zA-Z0-9_]/.test(key) || /^\d/.test(key);
            const keyStr = needsQuotes ? `"${key}"` : key;
            return `${nextSpaces}.${keyStr} = ${toZon(value[key], indent + 1)}`;
        });
        
        return `.{\n${fields.join('\n')}\n${spaces}}`;
    }

    return '.null';
}

function convertToZon(data) {
    return toZon(data, 0);
}
