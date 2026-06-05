import axios from 'axios';
import * as cheerio from 'cheerio';
import { createHash } from 'node:crypto';

export async function checkPublicUrl(url) {
  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);
    $('script, style, noscript, meta').remove();

    const textContent = $('body').text().replace(/\s+/g, ' ').trim();
    const contentHash = createHash('md5').update(textContent).digest('hex');
    const title = $('title').text().trim() || url;
    const snippet = textContent.substring(0, 400);

    return { success: true, contentHash, title, snippet, statusCode: response.status, url };
  } catch (err) {
    return { success: false, contentHash: null, title: url, snippet: err.message, statusCode: err.response?.status || 0, url };
  }
}
