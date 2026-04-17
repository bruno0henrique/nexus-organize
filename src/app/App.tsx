import { useState, useCallback, useEffect, useRef } from 'react';
import { BrainstormBoard, resetAnimatedConnections } from './components/BrainstormBoard';
import { InputBar } from './components/InputBar';
import { Sidebar, Project } from './components/Sidebar';
import { Trash2 } from 'lucide-react';

export interface Idea {
  id: string;
  text: string;
  category: string;
  position: { x: number; y: number };
  connections: string[];
  isCentral: boolean;
  scale: number;
  aiGenerated?: boolean;
  projectId: string;
}

const CATEGORIES = [
  { name: 'Problema', color: '#ef4444', bgColor: '#fee2e2' },
  { name: 'Solução', color: '#10b981', bgColor: '#d1fae5' },
  { name: 'Recurso', color: '#3b82f6', bgColor: '#dbeafe' },
  { name: 'Objetivo', color: '#f59e0b', bgColor: '#fef3c7' },
  { name: 'Risco', color: '#8b5cf6', bgColor: '#ede9fe' },
  { name: 'Outro', color: '#6b7280', bgColor: '#f3f4f6' }
];

const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#06b6d4',
  '#10b981', '#f59e0b', '#ef4444', '#3b82f6'
];

function categorizeIdea(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('problema') || t.includes('desafio') || t.includes('dificuldade') || t.includes('causa')) return 'Problema';
  if (t.includes('solução') || t.includes('resolver') || t.includes('implementar') || t.includes('passo')) return 'Solução';
  if (t.includes('recurso') || t.includes('ferramenta') || t.includes('material')) return 'Recurso';
  if (t.includes('objetivo') || t.includes('meta') || t.includes('alcançar')) return 'Objetivo';
  if (t.includes('risco') || t.includes('ameaça') || t.includes('perigo')) return 'Risco';
  return 'Outro';
}

// ─── AI Engine ─────────────────────────────────────────────────────
const AI_RESPONSES: Record<string, (text: string) => Array<{ text: string; category: string }>> = {
  'root-cause': text => {
    const t = text.toLowerCase();
    if (t.includes('venda') || t.includes('receita') || t.includes('lucro'))
      return [
        { text: `Causa raiz: Segmentação inadequada do público-alvo`, category: 'Problema' },
        { text: `Análise: Processo de conversão com pontos de atrito`, category: 'Problema' },
        { text: `Risco: Abandono no funil de decisão`, category: 'Risco' }
      ];
    if (t.includes('equipe') || t.includes('time') || t.includes('pessoa'))
      return [
        { text: `Causa raiz: Desalinhamento entre expectativas e capacidades`, category: 'Problema' },
        { text: `Análise: Comunicação ineficiente gerando retrabalho`, category: 'Problema' },
        { text: `Risco: Sobrecarga sem priorização clara`, category: 'Risco' }
      ];
    if (t.includes('tecnolog') || t.includes('sistema') || t.includes('software'))
      return [
        { text: `Causa raiz: Débito técnico comprometendo estabilidade`, category: 'Problema' },
        { text: `Análise: Ausência de testes automatizados`, category: 'Problema' },
        { text: `Risco: Arquitetura limitando escalabilidade`, category: 'Risco' }
      ];
    return [
      { text: `Causa raiz: Falta de dados quantitativos sobre o tema`, category: 'Problema' },
      { text: `Análise: Ausência de métricas claras de progresso`, category: 'Problema' },
      { text: `Risco: Desalinhamento entre stakeholders`, category: 'Risco' }
    ];
  },
  'next-steps': text => {
    const t = text.toLowerCase();
    if (t.includes('problema') || t.includes('causa') || t.includes('desafio'))
      return [
        { text: `Passo 1: Mapear stakeholders impactados`, category: 'Solução' },
        { text: `Passo 2: Definir KPIs mensuráveis de resolução`, category: 'Objetivo' },
        { text: `Passo 3: Criar plano de ação com marcos semanais`, category: 'Solução' }
      ];
    if (t.includes('objetivo') || t.includes('meta'))
      return [
        { text: `Passo 1: Quebrar objetivo em micro-entregas`, category: 'Solução' },
        { text: `Passo 2: Alocar recursos e definir responsáveis`, category: 'Recurso' },
        { text: `Passo 3: Revisões semanais de progresso`, category: 'Solução' }
      ];
    return [
      { text: `Passo 1: Validar viabilidade com dados reais`, category: 'Solução' },
      { text: `Passo 2: Criar MVP para teste rápido`, category: 'Solução' },
      { text: `Passo 3: Coletar feedback e iterar`, category: 'Objetivo' }
    ];
  },
  'expand': text => {
    const t = text.toLowerCase();
    if (t.includes('produto') || t.includes('feature'))
      return [
        { text: `Expansão: Versão mobile-first do conceito`, category: 'Solução' },
        { text: `Ramificação: Integração com APIs de terceiros`, category: 'Recurso' },
        { text: `Oportunidade: Modelo freemium para aquisição`, category: 'Objetivo' }
      ];
    if (t.includes('mercado') || t.includes('cliente'))
      return [
        { text: `Expansão: Segmentar por comportamento`, category: 'Solução' },
        { text: `Ramificação: Programa de embaixadores`, category: 'Objetivo' },
        { text: `Oportunidade: Mercados adjacentes sinérgicos`, category: 'Recurso' }
      ];
    return [
      { text: `Expansão: Perspectivas de diferentes áreas`, category: 'Solução' },
      { text: `Ramificação: Conexão com tendências de mercado`, category: 'Recurso' },
      { text: `Oportunidade: Diferencial competitivo mensurável`, category: 'Objetivo' }
    ];
  }
};

export default function App() {
  // ── Projects ──
  const [projects, setProjects] = useState<Project[]>([
    { id: 'default', name: 'Meu Projeto', color: '#6366f1', createdAt: Date.now() }
  ]);
  const [activeProjectId, setActiveProjectId] = useState<string>('default');

  // ── Ideas ──
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // ── Connection ──
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [connectingLine, setConnectingLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [connectionFlash, setConnectionFlash] = useState<{ from: string; to: string } | null>(null);

  // ── AI ──
  const [aiMode, setAiMode] = useState(false);
  const [aiProcessingId, setAiProcessingId] = useState<string | null>(null);

  // ── Viewport ──
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  const boardRef = useRef<HTMLDivElement>(null);

  // ESC cancels connecting
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConnectingFrom(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Track mouse for live connection line
  useEffect(() => {
    if (!connectingFrom) { setConnectingLine(null); return; }
    const fromIdea = ideas.find(i => i.id === connectingFrom);
    if (!fromIdea) return;

    const onMove = (e: MouseEvent) => {
      const board = boardRef.current;
      if (!board) return;
      const rect = board.getBoundingClientRect();
      // Mouse in world space
      const mx = (e.clientX - rect.left - panX) / zoom;
      const my = (e.clientY - rect.top - panY) / zoom;
      setConnectingLine({
        x1: fromIdea.position.x + 110,
        y1: fromIdea.position.y + 45,
        x2: mx,
        y2: my
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [connectingFrom, ideas, panX, panY, zoom]);

  // ── Project actions ──
  const addProject = useCallback((name: string) => {
    const color = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
    const p: Project = { id: Date.now().toString(), name, color, createdAt: Date.now() };
    setProjects(prev => [...prev, p]);
    setActiveProjectId(p.id);
  }, []);

  const deleteProject = useCallback((id: string) => {
    if (projects.length === 1) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    setIdeas(prev => prev.filter(i => i.projectId !== id));
    if (activeProjectId === id) {
      setActiveProjectId(projects.find(p => p.id !== id)?.id || 'default');
    }
  }, [projects, activeProjectId]);

  // ── Idea actions ──
  const addIdea = useCallback((text: string, isCentral = false) => {
    if (!text.trim()) return;
    
    // Fallbacks if not computed
    let cx = 600, cy = 400;
    
    // Spawning exactly in the center of the viewport (accounting for zoom and pan)
    // 320 is sidebar width, 72 is top bar height
    const viewW = window.innerWidth - 320;
    const viewH = window.innerHeight - 72;
    cx = (viewW / 2 - panX) / zoom;
    cy = (viewH / 2 - panY) / zoom;
    
    const spread = 200;
    const newIdea: Idea = {
      id: Date.now().toString(),
      text,
      category: categorizeIdea(text),
      position: {
        x: cx - 180 + (Math.random() - 0.5) * spread,
        y: cy - 70 + (Math.random() - 0.5) * spread
      },
      connections: [],
      isCentral,
      scale: 1,
      projectId: activeProjectId
    };
    setIdeas(prev => [...prev, newIdea]);
  }, [activeProjectId, panX, panY, zoom]);

  const updateIdeaPosition = useCallback((id: string, position: { x: number; y: number }) => {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, position } : i));
  }, []);

  const updateIdeaCategory = useCallback((id: string, category: string) => {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, category } : i));
  }, []);

  const deleteIdea = useCallback((id: string) => {
    setIdeas(prev => prev.filter(i => i.id !== id).map(i => ({
      ...i,
      connections: i.connections.filter(c => c !== id)
    })));
  }, []);

  const toggleCentral = useCallback((id: string) => {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, isCentral: !i.isCentral } : i));
  }, []);

  const updateIdeaScale = useCallback((id: string, scale: number) => {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, scale: Math.max(0.5, Math.min(2.5, scale)) } : i));
  }, []);

  const triggerFlash = useCallback((fromId: string, toId: string) => {
    setConnectionFlash({ from: fromId, to: toId });
    setTimeout(() => setConnectionFlash(null), 400);
  }, []);

  const toggleConnection = useCallback((fromId: string, toId: string) => {
    setIdeas(prev => prev.map(idea => {
      if (idea.id !== fromId) return idea;
      const has = idea.connections.includes(toId);
      if (!has) triggerFlash(fromId, toId);
      return { ...idea, connections: has ? idea.connections.filter(c => c !== toId) : [...idea.connections, toId] };
    }));
  }, [triggerFlash]);

  const startConnecting = useCallback((id: string) => {
    setConnectingFrom(id);
  }, []);

  const finishConnecting = useCallback((toId: string) => {
    if (connectingFrom && connectingFrom !== toId) {
      toggleConnection(connectingFrom, toId);
    }
    setConnectingFrom(null);
    setConnectingLine(null);
  }, [connectingFrom, toggleConnection]);

  // ── AI Action ──
  const handleAiAction = useCallback((ideaId: string, actionKey: string) => {
    const source = ideas.find(i => i.id === ideaId);
    if (!source) return;

    setAiProcessingId(ideaId);
    const delay = 1500 + Math.random() * 1200;

    setTimeout(() => {
      const handler = AI_RESPONSES[actionKey];
      if (!handler) { setAiProcessingId(null); return; }
      const results = handler(source.text);

      const newIdeas: Idea[] = results.map((r, idx) => {
        const angle = ((2 * Math.PI) / results.length) * idx - Math.PI / 2;
        return {
          id: `${Date.now()}-ai-${idx}`,
          text: r.text,
          category: r.category,
          position: {
            x: source.position.x + Math.cos(angle) * 300,
            y: source.position.y + Math.sin(angle) * 280
          },
          connections: [],
          isCentral: false,
          scale: 1,
          aiGenerated: true,
          projectId: activeProjectId
        };
      });

      setIdeas(prev => {
        const updated = [...prev];
        const srcIdx = updated.findIndex(i => i.id === ideaId);
        if (srcIdx === -1) return prev;
        newIdeas.forEach(ni => {
          updated.push(ni);
          updated[srcIdx] = { ...updated[srcIdx], connections: [...updated[srcIdx].connections, ni.id] };
        });
        return updated;
      });

      newIdeas.forEach((ni, idx) => {
        setTimeout(() => triggerFlash(ideaId, ni.id), idx * 350);
      });
      setAiProcessingId(null);
    }, delay);
  }, [ideas, activeProjectId, triggerFlash]);

  // ── Viewport controls ──
  const handleZoomChange = useCallback((z: number) => setZoom(z), []);
  const handlePanChange = useCallback((x: number, y: number) => { setPanX(x); setPanY(y); }, []);

  const zoomIn = () => setZoom(z => Math.min(3, z * 1.15));
  const zoomOut = () => setZoom(z => Math.max(0.2, z / 1.15));
  const resetView = () => { setZoom(1); setPanX(0); setPanY(0); };

  const fitView = () => {
    const visible = filteredIdeas;
    if (!visible.length) return;
    const board = boardRef.current;
    if (!board) return;
    const { width: bw, height: bh } = board.getBoundingClientRect();
    const minX = Math.min(...visible.map(i => i.position.x));
    const maxX = Math.max(...visible.map(i => i.position.x + 220));
    const minY = Math.min(...visible.map(i => i.position.y));
    const maxY = Math.max(...visible.map(i => i.position.y + 90));
    const w = maxX - minX + 100;
    const h = maxY - minY + 100;
    const newZoom = Math.min(2, Math.min(bw / w, bh / h));
    const newPanX = (bw - w * newZoom) / 2 - (minX - 50) * newZoom;
    const newPanY = (bh - h * newZoom) / 2 - (minY - 50) * newZoom;
    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
  };

  const clearAll = useCallback(() => {
    if (confirm('Limpar todos os balões do projeto atual?')) {
      setIdeas(prev => prev.filter(i => i.projectId !== activeProjectId));
      resetAnimatedConnections();
    }
  }, [activeProjectId]);

  // Filter by active project AND selected category
  const filteredIdeas = ideas.filter(i => {
    const inProject = i.projectId === activeProjectId;
    const inCategory = !selectedCategory || i.category === selectedCategory;
    return inProject && inCategory;
  });

  const projectIdeas = ideas.filter(i => i.projectId === activeProjectId);

  return (
    <div
      className="flex"
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#080c14' }}
    >
      {/* Sidebar */}
      <Sidebar
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onAddProject={addProject}
        onDeleteProject={deleteProject}
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        ideaCount={projectIdeas.length}
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetView={resetView}
        onFitView={fitView}
        aiMode={aiMode}
        onToggleAiMode={() => setAiMode(v => !v)}
      />

      {/* Main area */}
      <div className="flex flex-col flex-1" style={{ minWidth: 0 }}>
        {/* Top bar */}
        <div
          className="flex-none flex items-center justify-between px-8 py-4 z-10 relative"
          style={{
            background: 'rgba(8,12,20,0.8)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(12px)',
            height: 72
          }}
        >
          <div className="flex items-center gap-4">
            <span
              className="text-lg font-semibold"
              style={{ color: projects.find(p => p.id === activeProjectId)?.color || '#6366f1' }}
            >
              {projects.find(p => p.id === activeProjectId)?.name || 'Projeto'}
            </span>
            <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b' }}>
              {projectIdeas.length} balões
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium" style={{ color: '#475569' }}>
              Scroll → pan · Ctrl+Scroll → zoom · Clique na borda → conectar
            </span>
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all font-medium"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
            >
              <Trash2 size={16} />
              Limpar Workspace
            </button>
          </div>
        </div>

        {/* Board */}
        <div ref={boardRef} className="flex-1" style={{ position: 'relative', overflow: 'hidden' }}>
          <BrainstormBoard
            ideas={filteredIdeas}
            categories={CATEGORIES}
            onUpdatePosition={updateIdeaPosition}
            onUpdateCategory={updateIdeaCategory}
            onDeleteIdea={deleteIdea}
            onToggleCentral={toggleCentral}
            onUpdateScale={updateIdeaScale}
            connectingFrom={connectingFrom}
            connectingLine={connectingLine}
            onStartConnecting={startConnecting}
            onFinishConnecting={finishConnecting}
            connectionFlash={connectionFlash}
            onAiAction={handleAiAction}
            aiProcessingId={aiProcessingId}
            zoom={zoom}
            panX={panX}
            panY={panY}
            onZoomChange={handleZoomChange}
            onPanChange={handlePanChange}
          />
        </div>

        {/* Bottom input bar */}
        <div
          className="flex-none px-5 py-3"
          style={{
            background: 'rgba(8,12,20,0.9)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <InputBar onAddIdea={addIdea} />
        </div>
      </div>
    </div>
  );
}
