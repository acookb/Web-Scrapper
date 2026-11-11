import { lookup as dnsLookup } from 'dns';
import type { LookupAllOptions } from 'dns';
import type { LookupFunction } from 'net';
import ipaddr from 'ipaddr.js';
import { PermanentScrapeError } from '../../domain/errors/permanent-scrape-error';

export const BLOCKED_DESTINATION_CODE = 'ERR_BLOCKED_DESTINATION';

export class BlockedDestinationError extends PermanentScrapeError {
  readonly code = BLOCKED_DESTINATION_CODE;

  constructor(host: string, address: string) {
    super(`Destination ${host} (${address}) is not a public address`);
  }
}

/** Only globally routable addresses may be scraped (no loopback, LAN, metadata endpoints...). */
export function isPublicAddress(address: string): boolean {
  return (
    ipaddr.isValid(address) && ipaddr.process(address).range() === 'unicast'
  );
}

/**
 * Hosts given as IP literals never go through DNS, so they are checked
 * before every request (including each redirect hop).
 */
export function assertPublicIpLiteral(url: URL): void {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (ipaddr.isValid(host) && !isPublicAddress(host)) {
    throw new BlockedDestinationError(url.hostname, host);
  }
}

/**
 * DNS lookup used for outgoing connections. Validating the resolved address
 * at connection time also defeats DNS rebinding.
 */
export const publicOnlyLookup: LookupFunction = (
  hostname,
  options,
  callback,
) => {
  const lookupOptions: LookupAllOptions = { ...options, all: true };

  dnsLookup(hostname, lookupOptions, (error, addresses) => {
    if (error) {
      callback(error, '', 0);
      return;
    }

    const blocked = addresses.find(({ address }) => !isPublicAddress(address));
    if (blocked) {
      callback(new BlockedDestinationError(hostname, blocked.address), '', 0);
      return;
    }

    if (options.all) {
      callback(null, addresses);
    } else {
      callback(null, addresses[0].address, addresses[0].family);
    }
  });
};
