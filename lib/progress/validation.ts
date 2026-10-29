export const CONSENT_VERSION = '2026-10-29-v1';
export const ORGANIZATION_KINDS = ['business', 'sole_trader', 'association', 'nonprofit', 'other'] as const;
export type OrganizationKind = typeof ORGANIZATION_KINDS[number];
export type ProfileInput = { displayName: string; organizationName: string; organizationKind: OrganizationKind; emailUpdates: boolean; smsUpdates: boolean; phone: string | null };
export type RegistrationInput = ProfileInput & { email: string; password: string; privacyAccepted: true };

export class ValidationError extends Error {}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ValidationError('Ugyldig skjema. Prøv igjen.');
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new ValidationError(`${label} må fylles ut og være kortere enn ${max + 1} tegn.`);
  return value.trim();
}
function choice(value: unknown): boolean {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') throw new ValidationError('Varselsvalgene må være gyldige avkrysninger.');
  return value;
}
export function parseProfile(value: unknown): ProfileInput {
  const input = object(value);
  const displayName = text(input.displayName, 'Navn', 120);
  const organizationName = text(input.organizationName, 'Navn på virksomheten eller organisasjonen', 160);
  if (!ORGANIZATION_KINDS.includes(input.organizationKind as OrganizationKind)) throw new ValidationError('Velg type virksomhet eller organisasjon.');
  const emailUpdates = choice(input.emailUpdates);
  const smsUpdates = choice(input.smsUpdates);
  let phone: string | null = null;
  if (smsUpdates) {
    const candidate = typeof input.phone === 'string' ? input.phone.replace(/[\s()-]/g, '') : '';
    if (!/^\+[1-9][0-9]{7,14}$/.test(candidate)) throw new ValidationError('Skriv telefonnummer med landskode, for eksempel +47 987 65 432.');
    phone = candidate;
  }
  return { displayName, organizationName, organizationKind: input.organizationKind as OrganizationKind, emailUpdates, smsUpdates, phone };
}
export function parseRegistration(value: unknown): RegistrationInput {
  const input = object(value);
  const profile = parseProfile(input);
  const email = text(input.email, 'E-post', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('Skriv en gyldig e-postadresse.');
  if (typeof input.password !== 'string' || input.password.length < 12 || input.password.length > 128) throw new ValidationError('Bruk et passord med mellom 12 og 128 tegn.');
  if (input.privacyAccepted !== true) throw new ValidationError('Bekreft at du har lest personvernerklæringen.');
  return { ...profile, email, password: input.password, privacyAccepted: true };
}
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return false;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}
export function profileToRecord(profile: ProfileInput) {
  return { display_name: profile.displayName, organization_name: profile.organizationName, organization_kind: profile.organizationKind, email_updates: profile.emailUpdates, sms_updates: profile.smsUpdates, phone_e164: profile.phone, consent_version: CONSENT_VERSION };
}
