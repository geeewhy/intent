// devex-ui/src/pages/DocsPage.tsx
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DocsHeader } from '@/components/DocsHeader';
import { DocsSidebar } from '@/components/DocsSidebar';

import welcome from '$docs/basics/introduction.md?raw';
import projectStructure from '$docs/basics/project-structure.md?raw';
import quickstart from '$docs/basics/quickstart.md?raw';

import archOverview from '$docs/architecture/architecture-overview.md?raw';
import cqrs from '$docs/architecture/cqrs-projections.md?raw';
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

const docsMap: Record<string, string> = {
  welcome,
  'project-structure': projectStructure,
  quickstart,
  'architecture-overview': archOverview,
  'cqrs-projections': cqrs,
  'domain-modeling': domain,
  'temporal-workflows': temporal,
  'multi-tenancy': tenancy,
  'observability': observability,
  testing,
  'devx-ui': devxUi,
  'cli-tools': cli,
  reflections,
  'note-cqrs-projections': noteCQRS,
  'note-domain-modeling': noteDomain,
  'note-event-sourcing': noteES,
  'note-multi-tenancy': noteTenancy,
  'note-observability': noteObs,
  'note-temporal-workflows': noteTemporal,
  'note-testing-strategies': noteTesting,
};

export default function DocsPage() {
  const { view = 'welcome' } = useParams();
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    if (!docsMap[view]) {
      setContent(`# 404\nPage \`${view}\` not found.`);
    } else {
      setContent(docsMap[view]);
    }
  }, [view]);

  return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <DocsHeader />
        <div className="flex flex-1">
          <DocsSidebar activeView={view} />
          <main className="flex-1 p-6 overflow-auto prose prose-invert max-w-4xl">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href = '', children, ...props }) => {
                    // match *.md or *.md#fragment
                    const match = href.match(/^([^#]+)\.md(#.*)?$/);
                    const slug = match?.[1];
                    const fragment = match?.[2] || '';

                    // Rewrite internal .md links
                    if (slug) {
                      return (
                          <a href={`/docs/${slug}${fragment}`} {...props} className="text-blue-400 hover:underline">
                            {children}
                          </a>
                      );
                    }

                    // fallback: external or already-routed
                    return (
                        <a href={href} {...props} className="text-blue-400 hover:underline" target="_blank" rel="noreferrer">
                          {children}
                        </a>
                    );
                  }
                }}
            >
              {content || 'Loading...'}
            </ReactMarkdown>
          </main>
        </div>
      </div>
  );
}
