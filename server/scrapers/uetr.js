import axios from 'axios';
import * as cheerio from 'cheerio';
import { createHash } from 'node:crypto';

const COMMBANK_BASE = 'https://www.commbank.com.au/business-banking/paymenttracker/';

const STATUS_PATTERNS = [
  { pattern: /payee\s+credited/i,           label: 'Payee credited' },
  { pattern: /settlement\s+completed/i,     label: 'Payee credited' },
  { pattern: /in\s+progress/i,              label: 'In progress' },
  { pattern: /processing/i,                 label: 'Processing' },
  { pattern: /rejected|failed/i,            label: 'Failed' },
  { pattern: /pending/i,                    label: 'Pending' },
  { pattern: /settled/i,                    label: 'Settled' },
];

export async function checkUETR(uetr) {
  const url = `${COMMBANK_BASE}?UETR=${uetr}`;
  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-AU,en;q=0.9',
      },
    });

    const $ = cheerio.load(response.data);
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

    let status = 'Tracking details unavailable';
    for (const { pattern, label } of STATUS_PATTERNS) {
      if (pattern.test(bodyText)) { status = label; break; }
    }

    const dateMatch = bodyText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+ \d{1,2},?\s+\d{4})/);
    const bankUpdateTime = dateMatch?.[1] ?? null;
    const detail = bodyText.substring(0, 500);
    const contentHash = createHash('md5').update(response.data).digest('hex');

    return { success: true, status, detail, bankUpdateTime, url, contentHash };
  } catch (err) {
    return { success: false, status: 'Error', detail: err.message, url, contentHash: null };
  }
}
