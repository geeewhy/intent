import {useLocation} from 'react-router-dom';
import {useEffect, useRef, useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {DocsHeader} from '@/components/DocsHeader';
import {DocsSidebar} from '@/components/DocsSidebar';
import {DocsFooter} from '@/components/DocsFooter';

// ── Markdown imports ────────────────────────────────────────────────
import welcome from '$docs/basics/introduction.md?raw';
import projectStructure from '$docs/basics/project-structure.md?raw';
import quickstart from '$docs/basics/quickstart.md?raw';

import archOverview from '$docs/architecture/architecture-overview.md?raw';
import cqrs from '$docs/architecture/cqrs-projections.md?raw';
import eventSourcing from '$docs/architecture/event-sourcing.md?raw';
import domain from '$docs/architecture/domain-modeling.md?raw';
import temporal from '$docs/architecture/temporal-workflows.md?raw';
import tenancy from '$docs/architecture/multi-tenancy-details.md?raw';
import observability from '$docs/architecture/observability-details.md?raw';
import testing from '$docs/architecture/testing-strategies.md?raw';

import devxUi from '$docs/devx/devx-ui.md?raw';
import cli from '$docs/devx/cli-tools.md?raw';

import reflections from '$docs/reflections/index.md?raw';
import noteCQRS from '$docs/reflections/note-cqrs-projections.md?raw';
import noteDomain from '$docs/reflections/note-domain-modeling.md?raw';
import noteES from '$docs/reflections/note-event-sourcing.md?raw';
import noteTenancy from '$docs/reflections/note-multi-tenancy.md?raw';
import noteObs from '$docs/reflections/note-observability.md?raw';
import noteTemporal from '$docs/reflections/note-temporal-workflows.md?raw';
import noteTesting from '$docs/reflections/note-testing-strategies.md?raw';
import eventSourcingTake from '$docs/reflections/event-sourcing-take.md?raw';

// ── Prism highlight setup ───────────────────────────────────────────
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';

// ── Docs lookup table ───────────────────────────────────────────────
const docsMap: Record<string, string> = {
    /* basics */
    'basics/introduction': welcome,
    'basics/project-structure': projectStructure,
    'basics/quickstart': quickstart,
    /* architecture */
    'architecture/architecture-overview': archOverview,
    'architecture/event-sourcing': eventSourcing,
    'architecture/cqrs-projections': cqrs,
    'architecture/domain-modeling': domain,
    'architecture/temporal-workflows': temporal,
    'architecture/multi-tenancy-details': tenancy,
    'architecture/observability-details': observability,
    'architecture/testing-strategies': testing,
    /* dev-experience */
    'devx/devx-ui': devxUi,
    'devx/cli-tools': cli,
    /* reflections */
    'reflections/index': reflections,
    'reflections/note-cqrs-projections': noteCQRS,
    'reflections/note-domain-modeling': noteDomain,
    'reflections/note-event-sourcing': noteES,
    'reflections/note-multi-tenancy': noteTenancy,
    'reflections/note-observability': noteObs,
    'reflections/note-temporal-workflows': noteTemporal,
    'reflections/note-testing-strategies': noteTesting,
    'reflections/event-sourcing-take': eventSourcingTake,
};

// ── Client-only Mermaid renderer ────────────────────────────────────
const Mermaid = ({chart}: { chart: string }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;
        let cancelled = false;

        (async () => {
            const mermaid = (await import('mermaid')).default;
            mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'loose',
                theme: 'dark',
            });
            const {svg} = await mermaid.render(`m-${Date.now()}`, chart.trim());

            if (!cancelled && ref.current) ref.current.innerHTML = svg;
        })();

        return () => {
            cancelled = true;
        };
    }, [chart]);

    return <div ref={ref}/>;
};

// ── Docs page component ─────────────────────────────────────────────
export default function DocsPage() {
    const location = useLocation();
    const slug =
        location.pathname.replace(/^\/docs\//, '') || 'basics/introduction';

    const [content, setContent] = useState<string>(
        docsMap[slug] ?? `# 404\nPage \`${slug}\` not found.`
    );

    // update markdown when slug changes
    useEffect(() => {
        setContent(docsMap[slug] ?? `# 404\nPage \`${slug}\` not found.`);
    }, [slug]);

    // Prism after every markdown render
    useEffect(() => {
        setTimeout(() => Prism.highlightAll(), 0);
    }, [content]);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            <DocsHeader section="Documentation"/>
            <div className="flex flex-1">
                <DocsSidebar activeView={slug}/>
                <main className="flex-1 p-6 overflow-auto prose prose-invert max-w-4xl">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            code({node, children, ...props}) {
                                // ⚠️  no `className` prop in v9+.  Extract from AST instead.
                                const classList = Array.isArray(
                                    (node as any).properties?.className
                                )
                                    ? (node as any).properties.className.join(' ')
                                    : '';

                                const match = /language-(\w+)/.exec(classList);
                                const language = match?.[1];
                                const code = String(children).replace(/\n$/, '');

                                if (language === 'mermaid') return <Mermaid chart={code}/>;

                                if (language) {
                                    return (
                                        <pre className={`language-${language} line-numbers`}>
                      <code
                          className={`language-${language}`}
                          {...props} // ← has no className now
                      >
                        {code}
                      </code>
                    </pre>
                                    );
                                }

                                return (
                                    <code {...props /* no className in props */}>{children}</code>
                                );
                            },

                            a({href = '', children, ...props}) {
                                const md = href.match(/^([^#]+)\.md(#.*)?$/);
                                const link = md?.[1];
                                const fragment = md?.[2] || '';

                                if (!link) {
                                    return (
                                        <a
                                            href={href}
                                            {...props}
                                            className="text-blue-400 hover:underline"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {children}
                                        </a>
                                    );
                                }

                                const basePath = slug.split('/').slice(0, -1).join('/');
                                const resolved = `${basePath}/${link}`.replace(/\/+/, '/');

                                return (
                                    <a
                                        href={`/docs/${resolved}${fragment}`}
                                        {...props}
                                        className="text-blue-400 hover:underline"
                                    >
                                        {children}
                                    </a>
                                );
                            },
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                </main>
            </div>
            <DocsFooter/>
        </div>
    );
}
