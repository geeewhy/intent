//devex-ui/src/components/DocsFooter.tsx
import { Copyright } from 'lucide-react';

export const DocsFooter = () => {
    return (
        <footer className="h-12 px-6 flex items-center justify-between border-t border-slate-800 bg-slate-950 text-slate-500 text-sm">
            <div className="flex items-center gap-1">
                <Copyright className="w-4 h-4" />
                <span>2025 <a href="https://heart.dev">DevHeart Technologies Inc</a></span>
            </div>
            <div className="font-mono text-xs text-yellow-400">made with &lt;3</div>
        </footer>
    );
};
