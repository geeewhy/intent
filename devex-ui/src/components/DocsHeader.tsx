//devex-ui/src/components/DocsHeader.tsx
import { Logo } from './Logo';
import { Link } from 'react-router-dom';
import { Github } from 'lucide-react';

interface DocsHeaderProps {
    section?: string;
}

export const DocsHeader = ({ section }: DocsHeaderProps) => {
    return (
        <header className="h-16 flex items-center px-6 gap-3 border-b border-slate-800">
            {/* Left: Logo + Title */}
            <div className="flex items-center gap-1">
                <Link
                    to="/"
                    className="flex items-center gap-3 text-xl font-semibold text-slate-100 hover:text-blue-400"
                >
                    <Logo />
                    <span>Intent</span>
                </Link>
                {section && (
                    <span className="text-xl font-semibold text-slate-400">| {section}</span>
                )}
            </div>

            {/* Right: GitHub link */}
            <div className="flex-1 flex justify-end items-center gap-2">
                <a
                    href="https://github.com/geeewhy/intent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-medium"
                >
                    <Github className="w-5 h-5" />
                    <span className="text-sm">Source Code</span>
                </a>
            </div>
        </header>
    );
};
