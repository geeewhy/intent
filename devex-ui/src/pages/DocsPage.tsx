// devex-ui/src/pages/DocsPage.tsx
import { useLocation } from 'react-router-dom';
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
import {DocsFooter} from "@/components/DocsFooter.tsx";

const docsMap: Record<string, string> = {
  'basics/introduction': welcome,
  'basics/project-structure': projectStructure,
  'basics/quickstart': quickstart,
  'architecture/architecture-overview': archOverview,
  'architecture/cqrs-projections': cqrs,
  'architecture/domain-modeling': domain,
  'architecture/temporal-workflows': temporal,
  'architecture/multi-tenancy-details': tenancy,
  'architecture/observability-details': observability,
  'architecture/testing-strategies': testing,
  'devx/devx-ui': devxUi,
  'devx/cli-tools': cli,
  'reflections/index': reflections,
  'reflections/note-cqrs-projections': noteCQRS,
  'reflections/note-domain-modeling': noteDomain,
  'reflections/note-event-sourcing': noteES,
  'reflections/note-multi-tenancy': noteTenancy,
  'reflections/note-observability': noteObs,
  'reflections/note-temporal-workflows': noteTemporal,
  'reflections/note-testing-strategies': noteTesting,
};

export default function DocsPage() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\/docs\//, '') || 'basics/introduction';
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    if (!docsMap[slug]) {
      setContent(`# 404\nPage \`${slug}\` not found.`);
    } else {
      setContent(docsMap[slug]);
    }
  }, [slug]);

  return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <DocsHeader section="Documentation" />
        <div className="flex flex-1">
          <DocsSidebar activeView={slug} />
          <main className="flex-1 p-6 overflow-auto prose prose-invert max-w-4xl">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href = '', children, ...props }) => {
                    const match = href.match(/^([^#]+)\.md(#.*)?$/);
                    const link = match?.[1];
                    const fragment = match?.[2] || '';

                    if (!link) {
                      return (
                          <a href={href} {...props} className="text-blue-400 hover:underline" target="_blank" rel="noreferrer">
                            {children}
                          </a>
                      );
                    }

                    // Base: current doc's path minus filename
                    const basePath = slug.split('/').slice(0, -1).join('/'); // e.g. architecture
                    const resolvedPath = `${basePath}/${link}`.replace(/\/+/, '/');

                    return (
                        <a href={`/docs/${resolvedPath}${fragment}`} {...props} className="text-blue-400 hover:underline">
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
        <DocsFooter/>
      </div>
  );
}
