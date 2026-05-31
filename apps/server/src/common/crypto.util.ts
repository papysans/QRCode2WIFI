import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto';

/**
 * WiFi 密码加密：AES-256-GCM。
 * 密文格式：iv(hex):authTag(hex):ciphertext(hex)
 */
const ALGO = 'aes-256-gcm';

function key(): Buffer {
  const hex =
    process.env.WIFI_ENC_KEY ||
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  return Buffer.from(hex, 'hex');
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(':');
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return dec.toString('utf8');
}
