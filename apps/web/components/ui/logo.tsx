export function LogoIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="hsl(199 89% 30%)" />
      <path
        d="M14 22c0-5.5 4.5-9 9.5-9 4.5 0 8 2.6 9 6.5.3 1.2-.6 2.5-1.9 2.5H16c-1.1 0-2-.9-2-2z"
        fill="white"
      />
      <path
        d="M31 22h6.5c1 0 1.5 1.2.8 1.9l-4.3 4.3c-.6.6-1.6.4-1.9-.4L31 22z"
        fill="hsl(25 95% 53%)"
      />
      <circle cx="20" cy="19" r="1.4" fill="hsl(199 89% 30%)" />
      <path
        d="M16 24c0 6 4.5 11 10 11s9-4 9-8"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function LogoWithText({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoIcon />
      <div>
        <p className="font-bold text-lg leading-none text-foreground">Il Tucano</p>
        <p className="text-xs text-muted-foreground leading-none mt-0.5">Formazione Sicurezza</p>
      </div>
    </div>
  );
}
