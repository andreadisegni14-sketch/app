// Creates an Apple Music developer token: an ES256-signed JWT.
// https://developer.apple.com/documentation/applemusicapi/generating-developer-tokens

import { createPrivateKey, sign } from 'node:crypto';

const MAX_TTL_SECONDS = 15_777_000; // Apple's limit: 6 months

const b64url = (input) => Buffer.from(input).toString('base64url');

export function createDeveloperToken({ teamId, keyId, privateKey, ttlSeconds = 12 * 3600, origins, now = Date.now() }) {
  if (!teamId || !keyId || !privateKey) throw new Error('teamId, keyId and privateKey are required');
  const iat = Math.floor(now / 1000);
  const header = { alg: 'ES256', kid: keyId };
  const payload = { iss: teamId, iat, exp: iat + Math.min(ttlSeconds, MAX_TTL_SECONDS) };
  // Restricting the token to your own origin(s) stops it being reused elsewhere.
  if (origins?.length) payload.origin = origins;

  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = sign('sha256', Buffer.from(signingInput), {
    key: createPrivateKey(privateKey),
    dsaEncoding: 'ieee-p1363', // JWS wants raw r||s, not DER
  });
  return { token: `${signingInput}.${signature.toString('base64url')}`, expiresAt: payload.exp * 1000 };
}
