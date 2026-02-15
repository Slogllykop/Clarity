/**
 * Extract display name from domain (removes TLD, keeps subdomain + domain)
 * Examples:
 * - id.atlassian.com -> id.atlassian
 * - youtube.com -> youtube
 * - mail.google.com -> mail.google
 * - github.com -> github
 */
export function getDomainDisplayName(domain: string): string {
  if (domain === "Others") return domain;

  // Remove www. prefix if present
  const cleaned = domain.replace(/^www\./, "");

  // Split by dots
  const parts = cleaned.split(".");

  // If only one part or domain is already simple, return as is
  if (parts.length <= 1) return cleaned;

  // Remove the TLD (last part)
  parts.pop();

  // If there's still more than one part (subdomain exists), keep all
  // Otherwise just return the domain without TLD
  return parts.join(".");
}
