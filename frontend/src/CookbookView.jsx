import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';
import cookbookMarkdown from './assets/Cookbook.md?raw';

// --- Utilities ---

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function stripLinks(text) {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
}

function extractText(children) {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (children != null && typeof children === 'object' && children.props) {
    return extractText(children.props.children);
  }
  return '';
}

// --- Markdown parser ---

function parseBlocks(md) {
  const lines = md.split('\n');
  const blocks = [];
  let section = null, subsection = null;
  let recipeRaw = null, recipeClean = null;
  let contentLines = [];

  const flush = () => {
    if (recipeRaw !== null) {
      blocks.push({
        type: 'recipe',
        section,
        subsection,
        title: recipeRaw,
        titleClean: recipeClean,
        id: slugify(recipeClean),
        content: contentLines.join('\n').trim(),
      });
      contentLines = [];
      recipeRaw = null;
      recipeClean = null;
    }
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush();
      const clean = stripLinks(line.slice(3).trim());
      section = clean;
      subsection = null;
      blocks.push({ type: 'section', title: clean, id: slugify(clean) });
    } else if (line.startsWith('### ')) {
      flush();
      const clean = stripLinks(line.slice(4).trim());
      subsection = clean;
      blocks.push({ type: 'subsection', title: clean, id: slugify(clean), section });
    } else if (line.startsWith('#### ')) {
      flush();
      const raw = line.slice(5).trim();
      recipeRaw = raw;
      recipeClean = stripLinks(raw);
    } else if (recipeRaw !== null) {
      contentLines.push(line);
    }
  }
  flush();
  return blocks;
}

function buildToc(blocks) {
  const toc = [];
  let currentSection = null, currentSubsection = null;
  for (const b of blocks) {
    if (b.type === 'section') {
      currentSection = { ...b, children: [] };
      currentSubsection = null;
      toc.push(currentSection);
    } else if (b.type === 'subsection') {
      currentSubsection = { ...b, children: [] };
      currentSection?.children.push(currentSubsection);
    } else if (b.type === 'recipe') {
      (currentSubsection ?? currentSection)?.children.push(b);
    }
  }
  return toc;
}

function recipeMatches(recipe, q) {
  return (
    recipe.titleClean.toLowerCase().includes(q) ||
    recipe.content.toLowerCase().includes(q)
  );
}

function nodeHasMatches(node, q) {
  if (!q) return true;
  if (node.type === 'recipe') return recipeMatches(node, q);
  return node.children?.some(c => nodeHasMatches(c, q)) ?? false;
}

function buildFilteredMarkdown(blocks, q) {
  const matches = blocks.filter(b => b.type === 'recipe' && recipeMatches(b, q));
  if (!matches.length) return '';
  const parts = [];
  let lastSection = null, lastSubsection = null;
  for (const r of matches) {
    if (r.section !== lastSection) {
      parts.push(`\n## ${r.section}\n`);
      lastSection = r.section;
      lastSubsection = null;
    }
    if (r.subsection && r.subsection !== lastSubsection) {
      parts.push(`\n### ${r.subsection}\n`);
      lastSubsection = r.subsection;
    }
    parts.push(`\n#### ${r.title}\n\n${r.content}`);
  }
  return parts.join('\n');
}

// --- TOC node ---

function TocNode({ node, query }) {
  if (!nodeHasMatches(node, query)) return null;

  const handleClick = (e) => {
    e.preventDefault();
    const el = document.getElementById(node.id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (node.type === 'recipe') {
    return (
      <a href={`#${node.id}`} onClick={handleClick} className="toc-recipe-link d-block">
        {node.titleClean}
      </a>
    );
  }

  if (node.type === 'section') {
    return (
      <div className="toc-section">
        <a href={`#${node.id}`} onClick={handleClick} className="toc-section-link">
          {node.title}
        </a>
        <div className="toc-children">
          {node.children.map(c => <TocNode key={c.id} node={c} query={query} />)}
        </div>
      </div>
    );
  }

  if (node.type === 'subsection') {
    return (
      <div className="toc-subsection">
        <a href={`#${node.id}`} onClick={handleClick} className="toc-subsection-link">
          {node.title}
        </a>
        <div className="toc-children">
          {node.children.map(c => <TocNode key={c.id} node={c} query={query} />)}
        </div>
      </div>
    );
  }

  return null;
}

// --- Markdown heading/table renderers ---

const mdComponents = {
  h2: ({ children }) => (
    <h2 id={slugify(extractText(children))} className="cookbook-h2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 id={slugify(extractText(children))} className="cookbook-h3">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 id={slugify(extractText(children))} className="cookbook-h4">{children}</h4>
  ),
  table: ({ node, ...props }) => (
    <Table
      responsive size="sm" className="text-white mb-4"
      style={{ background: 'transparent', '--bs-table-bg': 'transparent', '--bs-table-color': 'white' }}
      {...props}
    />
  ),
  td: ({ node, ...props }) => (
    <td style={{ background: 'transparent', color: 'white', padding: '0px' }} {...props} />
  ),
  th: ({ node, ...props }) => (
    <th style={{ background: 'transparent', color: 'white', padding: '0px' }} {...props} />
  ),
};

// --- Main component ---

export default function CookbookView() {
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();

  const blocks = useMemo(() => parseBlocks(cookbookMarkdown), []);
  const toc = useMemo(() => buildToc(blocks), [blocks]);

  const content = useMemo(
    () => (q ? buildFilteredMarkdown(blocks, q) : cookbookMarkdown),
    [blocks, q]
  );

  const matchCount = useMemo(
    () => (q ? blocks.filter(b => b.type === 'recipe' && recipeMatches(b, q)).length : null),
    [blocks, q]
  );

  const searchBar = (
    <>
      <Form.Control
        type="text"
        placeholder="Search recipes..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ fontSize: '0.85rem' }}
      />
      {q && (
        <small className="text-muted d-block mt-1">
          {matchCount === 0
            ? 'No matches'
            : `${matchCount} recipe${matchCount !== 1 ? 's' : ''} found`}
        </small>
      )}
    </>
  );

  return (
    <div className="cookbook-layout">
      {/* Sidebar — desktop only */}
      <div className="cookbook-sidebar-col d-none d-lg-flex">
        <Card className="cookbook-sidebar-card">
          <Card.Header>Recipes</Card.Header>
          <Card.Body className="p-2">
            <div className="mb-2">{searchBar}</div>
            <div className="toc-tree">
              {toc.map(section => (
                <TocNode key={section.id} node={section} query={q} />
              ))}
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Content column */}
      <div className="cookbook-content-col">
        {/* Mobile search bar */}
        <div className="d-lg-none mb-3">{searchBar}</div>

        <Card className="cookbook-content-card">
          <Card.Header as="h5">
            My Cookbook
          </Card.Header>
          <Card.Body>
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {content}
              </ReactMarkdown>
            ) : (
              <p className="text-center text-muted mt-3">No recipes match your search.</p>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
