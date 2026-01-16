import { ContentType } from 'stremio-addon-sdk';
import { Context, CountryCode } from '../types';
import { Fetcher, getTmdbId, Id, TmdbId } from '../utils';
import { Source, SourceResult } from './Source';

const BASE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://shqipflix.cc',
};

/**
 * Shqipflix sometimes returns JSON wrapped in <pre>...</pre>
 */
function parseHtmlWrappedJson<T = any>(input: string): T | null {
  const trimmed = input.trim();

  // Raw JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }

  // <pre> wrapped JSON
  const match = trimmed.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (!match || !match[1]) return null;

  return JSON.parse(match[1].trim());
}

export class Shqipflix extends Source {
  public readonly id = 'shqipflix';
  public readonly label = 'Shqipflix';
  public readonly contentTypes: ContentType[] = ['movie'];
  public readonly countryCodes: CountryCode[] = [CountryCode.al];
  public readonly baseUrl = 'https://shqipflix.cc';

  constructor(private readonly fetcher: Fetcher) {
    super();
  }

  public async handleInternal(
    ctx: Context,
    type: ContentType,
    id: Id
  ): Promise<SourceResult[]> {
    if (type !== 'movie') return [];

    // 1️⃣ Resolve TMDB ID
    const tmdbId: TmdbId = await getTmdbId(ctx, this.fetcher, id);
    if (!tmdbId?.id) return [];

    // 2️⃣ Fetch catalog
    const rawCatalog = await this.fetcher.text(
      ctx,
      new URL(`/api/content?v=${Date.now()}`, this.baseUrl),
      {
        headers: {
          ...BASE_HEADERS,
          Referer: `${this.baseUrl}/`,
        },
      }
    );

    const catalog = parseHtmlWrappedJson<any[]>(rawCatalog);
    if (!Array.isArray(catalog)) return [];

    // 3️⃣ Match TMDB ID
    const item = catalog.find(
      (c) => String(c.tmdb_id) === String(tmdbId.id)
    );
    if (!item) return [];

    const numericId = item.numeric_id;
    const uuid = item.id;

    // 4️⃣ Fetch details
    const rawDetails = await this.fetcher.text(
      ctx,
      new URL(`/api/content/${uuid}?v=${Date.now()}`, this.baseUrl),
      {
        headers: {
          ...BASE_HEADERS,
          Referer: `${this.baseUrl}/movie/${numericId}`,
        },
      }
    );

    const details = parseHtmlWrappedJson<any>(rawDetails);
    if (!details || !Array.isArray(details.links)) return [];

    // 5️⃣ Streams
    return details.links
      .filter((l: any) => l?.url)
      .map((l: any) => ({
        url: new URL(l.url),
        meta: {
          title: `${details.title} - Shqipflix`,
          referer: `${this.baseUrl}/movie/${numericId}`,
          countryCodes: [CountryCode.al],
        },
      }));
  }
}
