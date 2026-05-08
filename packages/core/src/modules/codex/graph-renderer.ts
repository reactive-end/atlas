// Codex Graph Renderer — Generates interactive HTML graph visualization
// Self-contained HTML with embedded D3.js for dependency exploration

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DependencyGraph } from '@/modules/codex/types'

const FILE_TYPE_COLORS: Record<string, string> = {
  component: '#61dafb',
  service: '#f0db4f',
  hook: '#a855f7',
  util: '#22c55e',
  type: '#94a3b8',
  config: '#fb923c',
  test: '#6b7280',
  route: '#ef4444',
  module: '#3b82f6',
}

function buildGraphHtml(graph: DependencyGraph, repoRoot: string): string {
  const nodesJson = JSON.stringify(graph.nodes.map(n => ({
    id: n.id,
    label: n.label,
    type: n.type,
    group: n.group,
    exports: n.exports,
    color: FILE_TYPE_COLORS[n.type] ?? '#3b82f6',
  })))

  const edgesJson = JSON.stringify(graph.edges.map(e => ({
    source: e.source,
    target: e.target,
    imports: e.imports,
  })))

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Atlas Codex — ${repoRoot}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0f172a;color:#e2e8f0;font-family:'Inter',system-ui,sans-serif;overflow:hidden}
#app{display:flex;height:100vh}
#graph{flex:1;position:relative}
svg{width:100%;height:100%}
#panel{width:320px;background:#1e293b;border-left:1px solid #334155;padding:20px;overflow-y:auto;display:none}
#panel.open{display:block}
#panel h2{font-size:16px;color:#60a5fa;margin-bottom:8px}
#panel .path{font-size:12px;color:#94a3b8;word-break:break-all;margin-bottom:12px}
#panel .section{margin-bottom:16px}
#panel .section-title{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:6px}
#panel .tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;margin:2px}
#panel .export{background:#1e3a5f;color:#60a5fa}
#panel .import{background:#3b1e3f;color:#a855f7}
#search{position:absolute;top:16px;left:16px;z-index:10;display:flex;gap:8px;align-items:center}
#search input{background:#1e293b;border:1px solid #334155;color:#e2e8f0;padding:8px 14px;border-radius:8px;width:260px;font-size:14px;outline:none}
#search input:focus{border-color:#3b82f6}
#legend{position:absolute;bottom:16px;left:16px;z-index:10;background:#1e293b;border:1px solid #334155;border-radius:8px;padding:12px 16px;display:flex;gap:12px;flex-wrap:wrap}
.legend-item{display:flex;align-items:center;gap:6px;font-size:12px}
.legend-dot{width:10px;height:10px;border-radius:50%}
#stats{position:absolute;top:16px;right:336px;z-index:10;background:#1e293b;border:1px solid #334155;border-radius:8px;padding:8px 14px;font-size:12px;color:#94a3b8}
.link{stroke:#334155;stroke-opacity:0.6;stroke-width:1;fill:none}
.link.highlighted{stroke:#60a5fa;stroke-opacity:1;stroke-width:2}
.node circle{stroke:#0f172a;stroke-width:2;cursor:pointer;transition:r 0.2s}
.node circle:hover{r:10}
.node text{font-size:10px;fill:#94a3b8;pointer-events:none}
.node.highlighted circle{stroke:#fff;stroke-width:3}
.node.dimmed{opacity:0.15}
.link.dimmed{opacity:0.05}
</style>
</head>
<body>
<div id="app">
<div id="graph">
  <div id="search"><input type="text" placeholder="Search files, exports..." id="searchInput"></div>
  <svg id="svg"></svg>
  <div id="legend"></div>
  <div id="stats"></div>
</div>
<div id="panel">
  <h2 id="panelTitle"></h2>
  <div class="path" id="panelPath"></div>
  <div class="section" id="panelType"><span class="section-title">Type</span><div id="panelTypeValue"></div></div>
  <div class="section" id="panelExports"><span class="section-title">Exports</span><div id="panelExportsValue"></div></div>
  <div class="section" id="panelImports"><span class="section-title">Imported by</span><div id="panelImportsValue"></div></div>
  <div class="section" id="panelDeps"><span class="section-title">Depends on</span><div id="panelDepsValue"></div></div>
</div>
</div>
<script>
// D3.js v7 minimal force-graph (inline to avoid CDN dependency)
// Using a minimal SVG force simulation implementation
const nodes = ${nodesJson};
const links = ${edgesJson};

const svg = document.getElementById('svg');
const width = svg.clientWidth;
const height = svg.clientHeight;
const ns = 'http://www.w3.org/2000/svg';

// Stats
document.getElementById('stats').textContent = nodes.length + ' files · ' + links.length + ' connections';

// Legend
const legendEl = document.getElementById('legend');
const types = [...new Set(nodes.map(n => n.type))];
types.forEach(t => {
  const item = document.createElement('div');
  item.className = 'legend-item';
  item.innerHTML = '<div class="legend-dot" style="background:' + (${JSON.stringify(FILE_TYPE_COLORS)}[t]||'#3b82f6') + '"></div>' + t;
  legendEl.appendChild(item);
});

// Force simulation
const nodeMap = new Map();
nodes.forEach((n, i) => {
  n.x = width/2 + (Math.random()-0.5)*400;
  n.y = height/2 + (Math.random()-0.5)*400;
  n.vx = 0; n.vy = 0;
  n.index = i;
  nodeMap.set(n.id, n);
});

const validLinks = links.filter(l => nodeMap.has(l.source) && nodeMap.has(l.target))
  .map(l => ({...l, sourceNode: nodeMap.get(l.source), targetNode: nodeMap.get(l.target)}));

// SVG elements
const linkGroup = document.createElementNS(ns, 'g');
const nodeGroup = document.createElementNS(ns, 'g');
svg.appendChild(linkGroup);
svg.appendChild(nodeGroup);

const linkEls = validLinks.map(l => {
  const line = document.createElementNS(ns, 'line');
  line.setAttribute('class', 'link');
  line.dataset.source = l.source;
  line.dataset.target = l.target;
  linkGroup.appendChild(line);
  return {el: line, link: l};
});

const nodeEls = nodes.map(n => {
  const g = document.createElementNS(ns, 'g');
  g.setAttribute('class', 'node');
  g.dataset.id = n.id;
  const circle = document.createElementNS(ns, 'circle');
  circle.setAttribute('r', String(Math.max(5, Math.min(12, (n.exports.length||1)*2))));
  circle.setAttribute('fill', n.color);
  const text = document.createElementNS(ns, 'text');
  text.setAttribute('dx', '14');
  text.setAttribute('dy', '4');
  text.textContent = n.label;
  g.appendChild(circle);
  g.appendChild(text);
  nodeGroup.appendChild(g);
  return {el: g, node: n};
});

// Simple force simulation
function simulate() {
  const alpha = 0.3;
  const repulsion = -120;
  const linkDist = 80;
  const centerForce = 0.01;

  // Center force
  nodes.forEach(n => {
    n.vx += (width/2 - n.x) * centerForce;
    n.vy += (height/2 - n.y) * centerForce;
  });

  // Repulsion
  for(let i=0;i<nodes.length;i++){
    for(let j=i+1;j<nodes.length;j++){
      let dx = nodes[j].x - nodes[i].x;
      let dy = nodes[j].y - nodes[i].y;
      let d2 = dx*dx + dy*dy;
      if(d2 < 1) d2 = 1;
      const f = repulsion / d2;
      const fx = dx * f;
      const fy = dy * f;
      nodes[i].vx -= fx; nodes[i].vy -= fy;
      nodes[j].vx += fx; nodes[j].vy += fy;
    }
  }

  // Link attraction
  validLinks.forEach(l => {
    const s = l.sourceNode, t = l.targetNode;
    let dx = t.x - s.x, dy = t.y - s.y;
    const d = Math.sqrt(dx*dx+dy*dy) || 1;
    const f = (d - linkDist) * 0.005;
    const fx = (dx/d)*f, fy = (dy/d)*f;
    s.vx += fx; s.vy += fy;
    t.vx -= fx; t.vy -= fy;
  });

  // Apply velocity
  nodes.forEach(n => {
    n.vx *= 0.6; n.vy *= 0.6;
    n.x += n.vx * alpha;
    n.y += n.vy * alpha;
    n.x = Math.max(20, Math.min(width-20, n.x));
    n.y = Math.max(20, Math.min(height-20, n.y));
  });

  // Update positions
  linkEls.forEach(({el, link}) => {
    el.setAttribute('x1', String(link.sourceNode.x));
    el.setAttribute('y1', String(link.sourceNode.y));
    el.setAttribute('x2', String(link.targetNode.x));
    el.setAttribute('y2', String(link.targetNode.y));
  });
  nodeEls.forEach(({el, node}) => {
    el.setAttribute('transform', 'translate('+node.x+','+node.y+')');
  });
}

// Run simulation
let ticks = 0;
function tick() {
  simulate();
  ticks++;
  if(ticks < 300) requestAnimationFrame(tick);
}
tick();

// Interaction: highlight on hover
let selectedNode = null;
nodeEls.forEach(({el, node}) => {
  el.addEventListener('mouseenter', () => {
    if(selectedNode) return;
    highlightNode(node.id);
  });
  el.addEventListener('mouseleave', () => {
    if(selectedNode) return;
    clearHighlight();
  });
  el.addEventListener('click', () => {
    selectedNode = selectedNode === node.id ? null : node.id;
    if(selectedNode) {
      highlightNode(node.id);
      showPanel(node);
    } else {
      clearHighlight();
      document.getElementById('panel').classList.remove('open');
    }
  });
});

function highlightNode(nodeId) {
  const connected = new Set([nodeId]);
  validLinks.forEach(l => {
    if(l.source === nodeId) connected.add(l.target);
    if(l.target === nodeId) connected.add(l.source);
  });
  nodeEls.forEach(({el, node}) => {
    el.classList.toggle('highlighted', node.id === nodeId);
    el.classList.toggle('dimmed', !connected.has(node.id));
  });
  linkEls.forEach(({el, link}) => {
    const isConn = link.source === nodeId || link.target === nodeId;
    el.classList.toggle('highlighted', isConn);
    el.classList.toggle('dimmed', !isConn);
  });
}

function clearHighlight() {
  nodeEls.forEach(({el}) => { el.classList.remove('highlighted','dimmed'); });
  linkEls.forEach(({el}) => { el.classList.remove('highlighted','dimmed'); });
}

function showPanel(node) {
  const panel = document.getElementById('panel');
  panel.classList.add('open');
  document.getElementById('panelTitle').textContent = node.label;
  document.getElementById('panelPath').textContent = node.id;
  document.getElementById('panelTypeValue').innerHTML = '<span class="tag" style="background:'+node.color+'22;color:'+node.color+'">'+node.type+'</span>';
  document.getElementById('panelExportsValue').innerHTML = node.exports.map(e => '<span class="tag export">'+e+'</span>').join('') || '<span style="color:#64748b">none</span>';
  const importedBy = validLinks.filter(l => l.target === node.id).map(l => '<span class="tag import">'+nodeMap.get(l.source).label+'</span>');
  document.getElementById('panelImportsValue').innerHTML = importedBy.join('') || '<span style="color:#64748b">none</span>';
  const deps = validLinks.filter(l => l.source === node.id).map(l => '<span class="tag import">'+nodeMap.get(l.target).label+'</span>');
  document.getElementById('panelDepsValue').innerHTML = deps.join('') || '<span style="color:#64748b">none</span>';
}

// Search
document.getElementById('searchInput').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  if(!q) { clearHighlight(); selectedNode = null; return; }
  const matching = new Set();
  nodes.forEach(n => {
    if(n.id.toLowerCase().includes(q) || n.label.toLowerCase().includes(q) || n.exports.some(ex => ex.toLowerCase().includes(q))) {
      matching.add(n.id);
    }
  });
  if(matching.size === 0) { clearHighlight(); return; }
  // Also include connected nodes
  const expanded = new Set(matching);
  validLinks.forEach(l => {
    if(matching.has(l.source)) expanded.add(l.target);
    if(matching.has(l.target)) expanded.add(l.source);
  });
  nodeEls.forEach(({el, node}) => {
    el.classList.toggle('highlighted', matching.has(node.id));
    el.classList.toggle('dimmed', !expanded.has(node.id));
  });
  linkEls.forEach(({el, link}) => {
    const isConn = matching.has(link.source) || matching.has(link.target);
    el.classList.toggle('highlighted', isConn);
    el.classList.toggle('dimmed', !isConn);
  });
});

// Drag
let dragNode = null;
svg.addEventListener('mousedown', (e) => {
  const g = e.target.closest('.node');
  if(!g) return;
  const id = g.dataset.id;
  dragNode = nodeMap.get(id);
});
svg.addEventListener('mousemove', (e) => {
  if(!dragNode) return;
  const rect = svg.getBoundingClientRect();
  dragNode.x = e.clientX - rect.left;
  dragNode.y = e.clientY - rect.top;
  dragNode.vx = 0; dragNode.vy = 0;
  linkEls.forEach(({el, link}) => {
    el.setAttribute('x1', String(link.sourceNode.x));
    el.setAttribute('y1', String(link.sourceNode.y));
    el.setAttribute('x2', String(link.targetNode.x));
    el.setAttribute('y2', String(link.targetNode.y));
  });
  nodeEls.forEach(({el, node}) => {
    el.setAttribute('transform', 'translate('+node.x+','+node.y+')');
  });
});
svg.addEventListener('mouseup', () => { dragNode = null; });
</script>
</body>
</html>`
}

export function writeGraphHtml(
  repoRoot: string,
  graph: DependencyGraph,
): void {
  const html = buildGraphHtml(graph, repoRoot)
  const outputPath = join(repoRoot, '.atlas', 'graph.html')
  writeFileSync(outputPath, html, 'utf-8')
}
