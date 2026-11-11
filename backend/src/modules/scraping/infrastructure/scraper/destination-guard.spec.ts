import type { LookupAddress } from 'dns';
import {
  BlockedDestinationError,
  assertPublicIpLiteral,
  isPublicAddress,
  publicOnlyLookup,
} from './destination-guard';

function lookup(
  hostname: string,
  all: boolean,
): Promise<string | LookupAddress[]> {
  return new Promise((resolve, reject) => {
    publicOnlyLookup(hostname, { all }, (error, address) => {
      if (error) {
        reject(error);
      } else {
        resolve(address);
      }
    });
  });
}

describe('destination guard', () => {
  it.each([
    ['8.8.8.8', true],
    ['2606:4700::1111', true],
    ['127.0.0.1', false],
    ['10.1.2.3', false],
    ['172.16.0.1', false],
    ['192.168.1.1', false],
    ['169.254.169.254', false],
    ['100.64.0.1', false],
    ['0.0.0.0', false],
    ['::1', false],
    ['fd00::1', false],
    ['fe80::1', false],
    ['::ffff:127.0.0.1', false],
    ['not-an-ip', false],
  ])('isPublicAddress(%p) is %p', (address, expected) => {
    expect(isPublicAddress(address)).toBe(expected);
  });

  it('rejects private IP literals, including bracketed IPv6', () => {
    expect(() => assertPublicIpLiteral(new URL('http://[::1]:3000/'))).toThrow(
      BlockedDestinationError,
    );
    expect(() =>
      assertPublicIpLiteral(new URL('http://192.168.0.10/')),
    ).toThrow(BlockedDestinationError);
  });

  it('lets public IP literals and hostnames through to DNS', () => {
    expect(() =>
      assertPublicIpLiteral(new URL('http://8.8.8.8/')),
    ).not.toThrow();
    expect(() =>
      assertPublicIpLiteral(new URL('https://example.com/')),
    ).not.toThrow();
  });

  it.each([true, false])(
    'blocks hostnames that resolve to private addresses (all=%p)',
    async (all) => {
      await expect(lookup('localhost', all)).rejects.toBeInstanceOf(
        BlockedDestinationError,
      );
    },
  );
});
