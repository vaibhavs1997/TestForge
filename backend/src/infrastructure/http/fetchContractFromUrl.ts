const MAX_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 30_000;
import { secureHttpExecutor } from './SecureHttpExecutor.js';

export async function fetchContractFromUrl(
  urlString: string,
): Promise<{ content: string; fileName: string }> {
  let parsed: URL;
  try {
    parsed = new URL(urlString.trim());
  } catch {
    throw new Error('Invalid URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported');
  }
  try {
    const response = await secureHttpExecutor.execute<ArrayBuffer>({
      url: parsed.toString(),
      method: 'GET',
      timeout: FETCH_TIMEOUT_MS,
      maxContentLength: MAX_BYTES,
      responseType: 'arraybuffer',
      validateStatus: () => true,
      headers: { Accept: 'application/json, application/yaml, text/yaml, */*' },
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const buffer = response.data;
    if (buffer.byteLength > MAX_BYTES) {
      throw new Error('Remote contract exceeds 10 MB limit');
    }

    const content = new TextDecoder('utf-8').decode(buffer);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    const fileName = last && last.includes('.') ? last : 'contract.json';

    return { content, fileName };
  } catch (err) {
    if (err instanceof Error && /timeout/i.test(err.message)) throw new Error('Timed out fetching contract URL');
    throw err;
  }
}

export default fetchContractFromUrl;
