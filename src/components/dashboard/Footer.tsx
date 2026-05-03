export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground md:flex-row md:px-6">
        <p>AgilizaProf © 2026</p>
        <nav className="flex items-center gap-4">
          <a href="#" className="transition-colors hover:text-foreground">Suporte</a>
          <span aria-hidden>|</span>
          <a href="#" className="transition-colors hover:text-foreground">Privacidade</a>
          <span aria-hidden>|</span>
          <a href="#" className="transition-colors hover:text-foreground">Termos</a>
        </nav>
      </div>
    </footer>
  );
}