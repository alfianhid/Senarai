import { describe, expect, it } from 'vitest';
import { containsPII, MASK, maskPII } from '@/lib/mask/pii';

describe('PII masking (T19)', () => {
  it('masks a 16-digit NIK', () => {
    expect(maskPII('NIK 3174092508910003 terdaftar')).toBe(`NIK ${MASK} terdaftar`);
  });

  it('masks a local phone number', () => {
    expect(maskPII('hubungi 081234567890 sekarang')).toBe(`hubungi ${MASK} sekarang`);
  });

  it('masks an international phone number', () => {
    expect(maskPII('wa +6281234567890 ya')).toBe(`wa ${MASK} ya`);
  });

  it('leaves ordinary numbers alone', () => {
    const text = 'PO 2291 berisi 20 ton, denda Rp45.000.000';
    expect(maskPII(text)).toBe(text);
  });

  it('is idempotent', () => {
    const once = maskPII('NIK 3174092508910003 dan 081234567890');
    expect(maskPII(once)).toBe(once);
  });

  it('reports whether a body contained personal data', () => {
    expect(containsPII('NIK 3174092508910003')).toBe(true);
    expect(containsPII('tidak ada data pribadi')).toBe(false);
  });
});
