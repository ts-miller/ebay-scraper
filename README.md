# eBay Search Exporter

A Chrome browser extension that extracts eBay search results into structured data files. Supports both **JSON** and **ZON** format exports.

## Features

- 🔍 **Extract Current Page** - Scrape all visible eBay search results from the current page
- 🔄 **Auto-Scrape Multiple Pages** - Automatically navigate and scrape up to 70 pages (240 items per page max)
- 📋 **Copy to Clipboard** - Quick copy of results in your chosen format
- 💾 **Download Files** - Export data as `.json` or `.zon` files
- 🌍 **Multi-Region Support** - Works on eBay US, UK, Canada, Germany, and Australia
- 🎯 **Filters Sponsored Content** - Automatically excludes sponsored listings
- 🔀 **Dual Format Export** - Choose between JSON or ZON format

## Installation

### From Source

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `src` folder from this project

## Usage

### Basic Export

1. Navigate to an eBay search results page
2. Click the extension icon in your browser toolbar
3. Wait for the status checks to complete (both should be green):
   - ✅ Valid eBay URL
   - ✅ Results Found
4. Choose your export format (JSON or ZON) using the toggle
5. Click either:
   - **Copy to Clipboard** - Copy results to clipboard
   - **Download File** - Save as a file

### Auto-Scrape Multiple Pages

1. Navigate to an eBay search results page
2. Click the extension icon
3. Click **"Scrape All Pages (Auto)"**
4. The extension will automatically:
   - Set results per page to 240 (maximum)
   - Scrape the current page
   - Navigate to the next page
   - Repeat until no more pages (up to 70 pages max)
   - Download the complete results automatically

**Note:** There's a random 1.5-3 second delay between pages to be respectful of eBay's servers.

## Exported Data Structure

Each listing contains the following fields:

```json
{
  "id": "123456789",
  "title": "Product Title",
  "price": "$99.99",
  "type": "Fixed Price",
  "condition": "New",
  "bids": 0,
  "time_left": "N/A",
  "shipping": "+$5.00 shipping",
  "seller": {
    "name": "seller_username",
    "feedback": "99.5%"
  },
  "link": "https://www.ebay.com/itm/123456789"
}
```

### Field Details

- **id** - eBay listing ID
- **title** - Product title (cleaned of "Sponsored", "New Listing" tags)
- **price** - Display price
- **type** - One of: "Fixed Price", "Auction", or "Best Offer"
- **condition** - Item condition (e.g., "New", "Used", "Refurbished")
- **bids** - Number of bids (for auctions)
- **time_left** - Time remaining (for auctions, "N/A" for fixed price)
- **shipping** - Shipping cost or "Calculated/Unknown"
- **seller** - Object with seller name and feedback percentage
- **link** - Clean product URL (without tracking parameters)

## Export Formats

### JSON Format

Standard JSON format with pretty-printing (2-space indentation). Compatible with all JSON parsers and tools.

**Example:**
```json
[
  {
    "id": "123456789",
    "title": "Vintage Camera",
    "price": "$49.99",
    "type": "Auction"
  }
]
```

### ZON Format

A human-readable data format based on [zonformat.org](https://zonformat.org). Uses `.` prefix notation and supports nested structures.

**Example:**
```
.[
  .{
    .id = "123456789"
    .title = "Vintage Camera"
    .price = "$49.99"
    .type = "Auction"
  }
]
```

## File Naming

Downloaded files are automatically named with:
- Search term (if sold items: adds `-sold` suffix)
- Timestamp (ISO format)
- File extension (`.json` or `.zon`)

**Examples:**
- `ebay-results-2026-02-21T14-30-15.json`
- `vintage-camera-sold-2026-02-21T14-30-15.zon`
- Auto-scraped: `vintage-camera_240-items_2026-02-21T14-30-15.json`

## Supported eBay Domains

- ✅ ebay.com (United States)
- ✅ ebay.co.uk (United Kingdom)
- ✅ ebay.ca (Canada)
- ✅ ebay.de (Germany)
- ✅ ebay.com.au (Australia)

## Permissions

This extension requires the following permissions:

- **activeTab** - Access the current eBay tab to scrape data
- **downloads** - Save exported files to your computer
- **storage** - Remember your format preference and manage auto-scrape state

## Limitations

- Maximum 70 pages per auto-scrape session
- Maximum 240 items per page (eBay's limit)
- Only scrapes visible data from search results (no additional API calls)
- Requires a valid eBay search results page

## Development

### Project Structure

```
src/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic and controls
├── content.js             # Page scraping logic
├── background.js          # Background service worker
├── zon-formatter.js       # ZON format converter
└── icons/                 # Extension icons
```

### Technologies

- Manifest V3 (Chrome Extensions)
- Vanilla JavaScript
- Chrome Storage API
- Chrome Downloads API

## License

MIT License - Feel free to modify and distribute.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## Disclaimer

This tool is for personal use and research purposes. Please respect eBay's Terms of Service and use responsibly. The auto-scrape feature includes delays to be respectful of eBay's servers.