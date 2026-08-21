const MAX_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 30_000;
import { assertSafeOutboundUrl } from '../security/outboundUrl';

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
  await assertSafeOutboundUrl(parsed.toString());

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(urlString, {
      signal: controller.signal,
      redirect: 'manual',
      headers: { Accept: 'application/json, application/yaml, text/yaml, */*' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      throw new Error('Remote contract exceeds 10 MB limit');
    }

    const content = new TextDecoder('utf-8').decode(buffer);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    const fileName = last && last.includes('.') ? last : 'contract.json';

    return { content, fileName };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Timed out fetching contract URL');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export default fetchContractFromUrl;
