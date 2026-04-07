"use client";

interface RateLimitOverlayProps {
  contact: { email?: string; linkedin?: string };
}

export function RateLimitOverlay({ contact }: RateLimitOverlayProps) {
  return (
    <div className="nv-rate-limit-overlay">
      <div className="nv-rate-limit-card">
        <h3>You&apos;ve used your free questions for today</h3>
        <p>This feature uses AI tokens — usage is limited for guests.</p>
        <div className="nv-rate-limit-contact">
          {contact.email && (
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
          )}
          {contact.linkedin && (
            <a href={contact.linkedin} target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
