import { jwtVerify, SignJWT } from 'jose';

/**
 * Issues a JWT token with the given payload.
 * Uses Web Crypto API with HS256 (HMAC-SHA256).
 * Sets expiration to 1 hour from now.
 *
 * @param payload - The payload to include in the JWT
 * @param secret - The secret key for signing
 * @returns The signed JWT string
 */
export async function issueJWT(payload: Record<string, unknown>, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secretKey);

  return jwt;
}

/**
 * Verifies a JWT token and returns the payload.
 * Returns null if the token is invalid or expired.
 *
 * @param token - The JWT token to verify
 * @param secret - The secret key for verification
 * @returns The payload if valid, null otherwise
 */
export async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(secret);

    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Refreshes a JWT token by verifying it and issuing a new one.
 * Returns null if the old token is invalid or expired.
 *
 * @param token - The old JWT token to refresh
 * @param secret - The secret key for verification and signing
 * @returns A new JWT token if the old one is valid, null otherwise
 */
export async function refreshJWT(token: string, secret: string): Promise<string | null> {
  const payload = await verifyJWT(token, secret);

  if (!payload) {
    return null;
  }

  // Remove JWT-specific claims before reissuing
  const { iat, exp, nbf, ...userPayload } = payload;

  return issueJWT(userPayload, secret);
}
