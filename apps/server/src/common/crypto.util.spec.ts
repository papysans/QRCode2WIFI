import { decryptSecret, encryptSecret } from './crypto.util';

describe('crypto.util', () => {
  it('加密后可解密还原明文', () => {
    const plain = 'coffee2024!@#';
    const enc = encryptSecret(plain);
    expect(enc).not.toContain(plain);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it('每次加密 iv 不同，密文不同', () => {
    const a = encryptSecret('same');
    const b = encryptSecret('same');
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe('same');
    expect(decryptSecret(b)).toBe('same');
  });
});
