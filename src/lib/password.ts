const PBKDF2_ITERATIONS = 210_000;
const HASH_LENGTH = 32;
const SALT_LENGTH = 16;
const PBKDF2_ALGO = 'pbkdf2-sha256';
const HASH_SEPARATOR = '$';

type PasswordHashParts = {
  iterations: number;
  salt: Uint8Array;
  hash: Uint8Array;
};

export function getPasswordAlgorithm() {
  return PBKDF2_ALGO;
}

export async function hashPassword(password: string) {
  const normalizedPassword = password.trim();
  if (!normalizedPassword) {
    throw new Error('비밀번호를 입력해 주세요.');
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const hash = await derivePbkdf2Hash(normalizedPassword, salt, PBKDF2_ITERATIONS);
  return serializePasswordHash({
    iterations: PBKDF2_ITERATIONS,
    salt,
    hash,
  });
}

export async function verifyPassword(password: string, passwordHash: string) {
  const normalizedPassword = password.trim();
  if (!normalizedPassword || !passwordHash.trim()) {
    return false;
  }

  const parsed = parsePasswordHash(passwordHash);
  if (!parsed) {
    return false;
  }

  const derivedHash = await derivePbkdf2Hash(normalizedPassword, parsed.salt, parsed.iterations);
  return timingSafeEqual(derivedHash, parsed.hash);
}

function serializePasswordHash(parts: PasswordHashParts) {
  return [
    PBKDF2_ALGO,
    String(parts.iterations),
    toBase64(parts.salt),
    toBase64(parts.hash),
  ].join(HASH_SEPARATOR);
}

function parsePasswordHash(value: string): PasswordHashParts | null {
  const [algo, iterationsText, saltBase64, hashBase64] = value.split(HASH_SEPARATOR);
  if (algo !== PBKDF2_ALGO) return null;

  const iterations = Number(iterationsText);
  if (!Number.isInteger(iterations) || iterations <= 0) return null;

  const salt = fromBase64(saltBase64);
  const hash = fromBase64(hashBase64);
  if (!salt || !hash) return null;

  return { iterations, salt, hash };
}

async function derivePbkdf2Hash(password: string, salt: Uint8Array, iterations: number) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations,
    },
    keyMaterial,
    HASH_LENGTH * 8,
  );

  return new Uint8Array(derivedBits);
}

function toBase64(value: Uint8Array) {
  let binary = '';
  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string) {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }

  return diff === 0;
}
