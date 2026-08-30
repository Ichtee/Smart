import { Logo } from "./logo";

const footerLinks = [
  { label: "Điều khoản", href: "#" },
  { label: "Quyền riêng tư", href: "#" },
  { label: "Liên hệ", href: "#" },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
        <div className="flex items-center gap-4">
          <Logo size="sm" />
          <span className="text-sm text-muted-foreground">
            © 2026 Smart. Thiết kế cho thể thao.
          </span>
        </div>

        <div className="flex items-center gap-6">
          {footerLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
