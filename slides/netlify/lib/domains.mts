// Optional sign-in restriction. ALLOWED_EMAIL_DOMAINS is a comma-separated list of email
// domains (for example "example.com,example.org"). Unset or empty means anyone Identity
// lets in may edit. Domains must match exactly: "example.com" does not allow "sub.example.com".

export function allowedDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? '')
    .split(',')
    .map(domain => domain.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean)
}

/** True when no restriction is set, or the email's domain is on the list. */
export function isAllowedEmail(email: string | undefined): boolean {
  const domains = allowedDomains()
  if (!domains.length)
    return true
  const domain = email?.slice(email.lastIndexOf('@') + 1).toLowerCase()
  return !!email && email.includes('@') && !!domain && domains.includes(domain)
}
