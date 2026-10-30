const NIK_PATTERN = /\b\d{16}\b/g;
const PHONE_PATTERN = /\b08\d{8,12}\b/g;
const PHONE_INTL_PATTERN = /\+62\d{8,12}\b/g;

export const MASK = '••••';

export function maskPII(text: string): string {
  return text
    .replace(NIK_PATTERN, MASK)
    .replace(PHONE_INTL_PATTERN, MASK)
    .replace(PHONE_PATTERN, MASK);
}

export function containsPII(text: string): boolean {
  return maskPII(text) !== text;
}
