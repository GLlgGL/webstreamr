import winston from 'winston';
import { createTestContext } from '../test';
import { CountryCode } from '../types';
import { FetcherMock } from '../utils';
import { ExtractorRegistry } from './ExtractorRegistry';
import { Streamtape } from './Streamtape';

const logger = winston.createLogger({ transports: [new winston.transports.Console({ level: 'nope' })] });
const extractorRegistry = new ExtractorRegistry(logger, [new Streamtape(new FetcherMock(`${__dirname}/__fixtures__/Streamtape`))]);

const ctx = createTestContext({ mediaFlowProxyUrl: 'https://mediaflow.test.org', mediaFlowProxyPassword: 'test' });

describe('Streamtape', () => {
  test('streamtape.com /e', async () => {
    expect(await extractorRegistry.handle(ctx, new URL('https://streamtape.com/e/84Kb3mkoYAiokmW'), CountryCode.es)).toMatchSnapshot();
  });
});
