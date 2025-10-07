import winston from 'winston';
import { createTestContext } from '../test';
import { FetcherMock } from '../utils';
import { DoodStream } from './DoodStream';
import { ExtractorRegistry } from './ExtractorRegistry';

const logger = winston.createLogger({ transports: [new winston.transports.Console({ level: 'nope' })] });
const extractorRegistry = new ExtractorRegistry(logger, [new DoodStream(new FetcherMock(`${__dirname}/__fixtures__/DoodStream`))]);

const ctx = createTestContext();

describe('DoodStream', () => {
  test('dood.to', async () => {
    expect(await extractorRegistry.handle(ctx, new URL('http://dood.to/e/sk1m9eumzyjj'))).toMatchSnapshot();
  });

  test('missing pass_md5 -> not found', async () => {
    expect(await extractorRegistry.handle(ctx, new URL('https://dood.to/e/gy8l8mb2i311'))).toMatchSnapshot();
  });

  test('can guess height from title', async () => {
    expect(await extractorRegistry.handle(ctx, new URL('https://do7go.com/e/dfx8me4un4ul'))).toMatchSnapshot();
  });

  test('cloudflare storage', async () => {
    expect(await extractorRegistry.handle(ctx, new URL('https://doodstream.com/e/wfpwtsgyr1xi'))).toMatchSnapshot();
  });
});
