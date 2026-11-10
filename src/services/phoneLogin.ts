// Phone + PIN sign-in for staff and parents without email.
// Each phone number maps to one hidden sign-in address shared across schools.
export const PHONE_LOGIN_DOMAIN = "phone.ndhschoolos.app";

export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) digits = `234${digits.slice(1)}`;
  if (digits.length === 10 && !digits.startsWith("234")) digits = `234${digits}`;
  return digits;
}

export function isValidPhone(input: string): boolean {
  const d = normalizePhone(input);
  return d.length >= 10 && d.length <= 15;
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function phoneLoginEmail(phone: string): string {
  return `${normalizePhone(phone)}@${PHONE_LOGIN_DOMAIN}`;
}

export function pinPassword(pin: string): string {
  return `ndh-pin-${pin}`;
}

export function isPhoneLoginEmail(email: string | null | undefined): boolean {
  return Boolean(email?.endsWith(`@${PHONE_LOGIN_DOMAIN}`));
}

/** Turns what a person typed (email or phone) into real sign-in values. */
export function resolveSignIn(identifier: string, secret: string): { email: string; password: string } {
  const id = identifier.trim();
  if (id.includes("@")) return { email: id, password: secret };
  if (!isValidPhone(id)) throw new Error("Enter a valid email or phone number.");
  if (!isValidPin(secret.trim())) throw new Error("PIN must be exactly 4 numbers.");
  return { email: phoneLoginEmail(id), password: pinPassword(secret.trim()) };
}

// A school must not change credentials that also unlock another school.
export function canSchoolResetPin(schoolIds: string[], schoolId: string): boolean {
  return schoolIds.length > 0 && schoolIds.every((id) => id === schoolId);
}
