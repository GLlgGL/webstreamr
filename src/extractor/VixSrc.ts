import { Context, CountryCode, Format, Meta, UrlResult } from '../types';
import {
  CustomRequestInit,
  guessHeightFromPlaylist,
  iso639FromCountryCode,
} from '../utils';
import { Extractor } from './Extractor';

export class VixSrc extends Extractor {
  public readonly id = 'vixsrc';

  public readonly label = 'VixSrc';

  public override readonly ttl: number = 21600000; // 6h

  public supports(_ctx: Context, url: URL): boolean {
    return null !== url.host.match(/vixsrc/);
  }

  protected async extractInternal(ctx: Context, url: URL, meta: Meta): Promise<UrlResult[]> {
    const headers = { Referer: url.href };

    const html = await this.fetcher.text(ctx, url);

    const tokenMatch = html.match(/['"]token['"]: ?['"](.*?)['"]/) as string[];
    const expiresMatch = html.match(/['"]expires['"]: ?['"](.*?)['"]/) as string[];
    const urlMatch = html.match(/url: ?['"](.*?)['"]/) as string[];

    const baseUrl = new URL(`${urlMatch[1]}`);
    const playlistUrl = new URL(`${baseUrl.origin}${baseUrl.pathname}.m3u8?${baseUrl.searchParams}`);
    playlistUrl.searchParams.append('token', tokenMatch[1] as string);
    playlistUrl.searchParams.append('expires', expiresMatch[1] as string);
    playlistUrl.searchParams.append('h', '1');

    const countryCodes = await this.determineCountryCodesFromPlaylist(ctx, playlistUrl, { headers });

    return [
      {
        url: playlistUrl,
        format: Format.hls,
        label: this.label,
        sourceId: `${this.id}_${meta.countryCodes?.join('_')}`,
        ttl: this.ttl,
        meta: {
          countryCodes,
          height: await guessHeightFromPlaylist(ctx, this.fetcher, playlistUrl, { headers }),
        },
      },
    ];
  };

  private async determineCountryCodesFromPlaylist(ctx: Context, playlistUrl: URL, init?: CustomRequestInit): Promise<CountryCode[]> {
    const playlist = await this.fetcher.text(ctx, playlistUrl, init);

    const countryCodes: CountryCode[] = [CountryCode.it];

    (Object.keys(CountryCode) as CountryCode[]).forEach((countryCode) => {
      const iso639 = iso639FromCountryCode(countryCode);

      if (!countryCodes.includes(countryCode) && (new RegExp(`#EXT-X-MEDIA:TYPE=AUDIO.*LANGUAGE="${iso639}"`)).test(playlist)) {
        countryCodes.push(countryCode);
      }
    });

    return countryCodes;
  }
}
