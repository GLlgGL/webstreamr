import winston from 'winston';
import { createTestContext } from '../test';
import { CountryCode } from '../types';
import { FetcherMock } from '../utils';
import { ExtractorRegistry } from './ExtractorRegistry';
import { createExtractors } from './index';

const logger = winston.createLogger({ transports: [new winston.transports.Console({ level: 'nope' })] });
const extractorRegistry = new ExtractorRegistry(logger, createExtractors(new FetcherMock(`${__dirname}/__fixtures__/ExtractorRegistry`)));

describe('ExtractorRegistry', () => {
  const ctx = createTestContext();

  test('returns error result from extractor', async () => {
    const urlResult = await extractorRegistry.handle(ctx, new URL('https://some-url.test'), CountryCode.de);

    expect(urlResult).toMatchSnapshot();
  });

  test('returns external URLs if enabled by config', async () => {
    const urlResult = await extractorRegistry.handle({ ...ctx, config: { ...ctx.config, includeExternalUrls: 'on' } }, new URL('https://mixdrop.ag/e/3nzwveprim63or6'), CountryCode.de);

    expect(urlResult).toMatchSnapshot();
  });

  test('does not return external URLs by default', async () => {
    const urlResult = await extractorRegistry.handle(ctx, new URL('https://mixdrop.ag/e/l7v73zqrfdj19z'), CountryCode.de);

    expect(urlResult).toStrictEqual([]);
  });

  test('returns from memory cache if possible', async () => {
    const urlResults1 = await extractorRegistry.handle(ctx, new URL('https://dropload.io/lyo2h1snpe5c.html'), CountryCode.de);
    const urlResults2 = await extractorRegistry.handle(ctx, new URL('https://dropload.io/lyo2h1snpe5c.html'), CountryCode.de);

    expect(urlResults1).not.toStrictEqual([]);
    expect(urlResults2).not.toStrictEqual([]);
  });

  test('ignores not found errors but caches them', async () => {
    const urlResults1 = await extractorRegistry.handle(ctx, new URL('https://dropload.io/asdfghijklmn.html'), CountryCode.de);
    const urlResults2 = await extractorRegistry.handle(ctx, new URL('https://dropload.io/asdfghijklmn.html'), CountryCode.de);

    expect(urlResults1).toStrictEqual([]);
    expect(urlResults2).toStrictEqual([]);
  });

  test('returns external url for error', async () => {
    const urlResults = await extractorRegistry.handle(ctx, new URL('https://dropload.io/mocked-blocked.html'), CountryCode.de);
    expect(urlResults).toMatchSnapshot();
  });

  test('returns external url for error with title', async () => {
    const urlResults = await extractorRegistry.handle(ctx, new URL('https://dropload.io/mocked-blocked-2.html'), CountryCode.de, 'a title!');
    expect(urlResults).toMatchSnapshot();
  });

  test('stats returns something', async () => {
    const stats = extractorRegistry.stats();

    expect(stats).toHaveProperty('urlResultCache');
    expect(stats.urlResultCache).toBeTruthy();
  });
});
