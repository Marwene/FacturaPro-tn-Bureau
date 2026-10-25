import type { SVGProps } from "react";

function IllusEmptyDocs(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="20" y="15" width="80" height="90" rx="8" className="fill-muted/50 stroke-border" strokeWidth="1.5" />
      <rect x="30" y="30" width="60" height="6" rx="3" className="fill-muted-foreground/20" />
      <rect x="30" y="44" width="40" height="6" rx="3" className="fill-muted-foreground/15" />
      <rect x="30" y="58" width="50" height="6" rx="3" className="fill-muted-foreground/15" />
      <rect x="30" y="72" width="35" height="6" rx="3" className="fill-muted-foreground/15" />
      <circle cx="60" cy="95" r="12" className="fill-muted stroke-border" strokeWidth="1.5" />
      <path d="M55 95h10M60 90v10" className="stroke-muted-foreground/40" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IllusEmptyInvoice(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="20" y="10" width="80" height="100" rx="8" className="fill-muted/50 stroke-border" strokeWidth="1.5" />
      <rect x="30" y="25" width="60" height="4" rx="2" className="fill-muted-foreground/20" />
      <rect x="30" y="35" width="30" height="4" rx="2" className="fill-muted-foreground/15" />
      <line x1="30" y1="50" x2="90" y2="50" className="stroke-border" strokeWidth="1" strokeDasharray="4 2" />
      <rect x="30" y="58" width="50" height="4" rx="2" className="fill-muted-foreground/20" />
      <rect x="30" y="66" width="40" height="4" rx="2" className="fill-muted-foreground/15" />
      <line x1="30" y1="80" x2="90" y2="80" className="stroke-border" strokeWidth="1" strokeDasharray="4 2" />
      <rect x="30" y="88" width="35" height="4" rx="2" className="fill-muted-foreground/20" />
      <rect x="70" y="88" width="20" height="4" rx="2" className="fill-muted-foreground/15" />
    </svg>
  );
}

function IllusEmptyBox(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="25" y="35" width="70" height="55" rx="6" className="fill-muted/50 stroke-border" strokeWidth="1.5" />
      <path d="M25 55h70" className="stroke-border" strokeWidth="1.5" />
      <rect x="40" y="20" width="40" height="20" rx="4" className="fill-background stroke-border" strokeWidth="1.5" />
      <rect x="48" y="28" width="24" height="4" rx="2" className="fill-muted-foreground/20" />
      <rect x="42" y="62" width="36" height="4" rx="2" className="fill-muted-foreground/20" />
      <rect x="42" y="72" width="25" height="4" rx="2" className="fill-muted-foreground/15" />
      <rect x="68" y="14" width="16" height="6" rx="2" className="fill-muted-foreground/20" />
    </svg>
  );
}

export { IllusEmptyDocs, IllusEmptyInvoice, IllusEmptyBox };
