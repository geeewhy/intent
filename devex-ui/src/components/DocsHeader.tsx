import { Logo } from './Logo';

export const DocsHeader = () => {
  return (
    <header className="h-16 flex items-center px-6 gap-3">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <Logo />
        <span className="text-xl font-semibold text-slate-100">Intent | Documentation</span>
      </div>
      
      {/* Spacer */}
      <div className="flex-1" />
    </header>
  );
};