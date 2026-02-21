// Auto-scrape logic: Check repeatedly on page load
const MAX_PAGES = 70;

chrome.storage.local.get(['isScraping', 'scrapedData', 'scrapePageCount'], (result) => {
    if (result.isScraping) {
        autoScrapeStep(result.scrapedData || [], result.scrapePageCount || 1);
    }
});

function autoScrapeStep(existingData, pageCount) {
    const currentData = scrapeData();
    console.log(`[eBay Scraper] Found ${currentData.length} items on page ${pageCount}`);
    
    const newData = existingData.concat(currentData);
    const nextBtn = document.querySelector('a.pagination__next') || document.querySelector('a[rel="next"]');

    // Continue if:
    // 1. We found items
    // 2. There is a next page
    // 3. We haven't hit the MAX_PAGES limit
    if (nextBtn && currentData.length > 0 && pageCount < MAX_PAGES) {
        chrome.storage.local.set({ 
            scrapedData: newData,
            scrapePageCount: pageCount + 1
        }, () => {
            // Random delay 1.5s - 3s to be polite
            const delay = 1500 + Math.random() * 1500;
            setTimeout(() => {
                const nextUrl = new URL(nextBtn.href);
                nextUrl.searchParams.set('_ipg', '240');
                window.location.href = nextUrl.toString();
            }, delay);
        });
    } else {
        // Finished
        chrome.storage.local.set({ isScraping: false, scrapedData: [], scrapePageCount: 1 }, () => {
            const reason = pageCount >= MAX_PAGES ? "Max page limit reached." : "No more pages.";
            
            // Extract search term for filename
            const urlParams = new URLSearchParams(window.location.search);
            let searchTerm = urlParams.get('_nkw') || 'ebay_results';

            if (urlParams.get('LH_Sold') === '1') {
                searchTerm += '-sold';
            }

            chrome.runtime.sendMessage({ 
                action: "DOWNLOAD_RESULTS", 
                data: newData,
                searchTerm: searchTerm
            });
            alert(`Scraping Complete! ${newData.length} items collected.\n(${reason})`);
        });
    }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    if (request.action === "CHECK_STATUS") {
        const isEbay = window.location.hostname.includes("ebay");
        const hasResults = !!document.querySelector('.srp-results');
        
        sendResponse({ 
            isEbay: isEbay, 
            hasResults: hasResults 
        });
        return true; // Keep channel open
    }

    if (request.action === "SCRAPE") {
        const data = scrapeData();
        sendResponse({ data: data });
        return true;
    }
});

// The main extraction function (based on your existing logic)
function scrapeData() {
    const container = document.querySelector('.srp-results');
    if (!container) return [];

    // Filter out sponsored "river" answers
    const cards = Array.from(container.querySelectorAll('.s-card')).filter(card => {
        return !card.closest('.srp-river-answer');
    });

    const results = [];

    cards.forEach(card => {
        try {
            // --- SELECTORS ---
            const titleEl = card.querySelector('.s-card__title') || card.querySelector('.s-item__title');
            const priceEl = card.querySelector('.s-card__price') || card.querySelector('.s-item__price');
            const linkEl  = card.querySelector('.s-card__link')  || card.querySelector('.s-item__link');
            
            // Condition
            const conditionEl = card.querySelector('.s-card__subtitle') || card.querySelector('.s-item__subtitle');

            // Auction Specific
            const timeLeftEl = card.querySelector('.s-card__time-left') || card.querySelector('.s-item__time-left');

            // Attributes
            const primaryAttrs = Array.from(card.querySelectorAll('.su-card-container__attributes__primary .s-card__attribute-row, .s-item__details .s-item__detail'))
                                      .map(el => el.textContent.trim());
            const attrText = primaryAttrs.join(' | ');

            const secondaryAttrs = Array.from(card.querySelectorAll('.su-card-container__attributes__secondary .s-card__attribute-row, .s-item__seller-info-text'))
                                      .map(el => el.textContent.trim());

            // --- PROCESSING ---
            if (titleEl && priceEl) {
                // Clean Title
                const cleanTitle = titleEl.textContent
                    .replace(/Opens in a new window or tab/g, '')
                    .replace(/New Listing/g, '')
                    .replace(/Sponsored/g, '')
                    .trim();

                let type = "Fixed Price";
                let bids = 0;
                let timeLeft = "N/A";

                if (timeLeftEl) {
                    timeLeft = timeLeftEl.textContent.trim();
                    type = "Auction"; 
                }

                const bidMatch = attrText.match(/(\d+)\s+bids?/i);
                if (bidMatch) {
                    type = "Auction";
                    bids = parseInt(bidMatch[1]);
                } else if (attrText.includes('Best Offer')) {
                    type = "Best Offer";
                }

                // Shipping
                const shippingRow = primaryAttrs.find(t => t.match(/shipping|delivery|freight/i));
                const shipping = shippingRow ? shippingRow.replace('Located in United States', '').trim() : "Calculated/Unknown";

                // Condition
                const condition = conditionEl ? conditionEl.textContent.trim() : "Unknown";

                // Seller
                let sellerName = "Unknown";
                let sellerFeedback = "N/A";
                
                if (secondaryAttrs.length > 0) {
                    const sText = secondaryAttrs.join(' '); 
                    const nameMatch = sText.match(/^([^\s]+)/);
                    if (nameMatch) sellerName = nameMatch[1];
                    const fbMatch = sText.match(/(\d+(?:\.\d+)?%)/);
                    if (fbMatch) sellerFeedback = fbMatch[1];
                }

                // ID
                const listingId = card.dataset.listingid || card.getAttribute('id') || "N/A";

                // Clean Link
                let cleanLink = null;
                if (linkEl && linkEl.href && /^https?:\/\//i.test(linkEl.href)) {
                    cleanLink = linkEl.href.split('?')[0];
                }

                results.push({
                    id: listingId,
                    title: cleanTitle,
                    price: priceEl.textContent.trim(),
                    type: type,
                    condition: condition,
                    bids: bids,
                    time_left: timeLeft,
                    shipping: shipping,
                    seller: { name: sellerName, feedback: sellerFeedback },
                    link: cleanLink
                });
            }
        } catch (e) {
            console.error("Parse error on card", e);
        }
    });

    return results;
}