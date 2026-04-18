import { useState, useCallback, useEffect, useRef } from 'react';
import { BrainstormBoard, resetAnimatedConnections } from './components/BrainstormBoard';
import { InputBar } from './components/InputBar';
import { Trash2, Minus, Plus } from 'lucide-react';

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

function categorizeIdea(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('problema') || t.includes('desafio') || t.includes('dificuldade') || t.includes('causa')) return 'Problema';
  if (t.includes('solução') || t.includes('resolver') || t.includes('implementar') || t.includes('passo')) return 'Solução';
  if (t.includes('recurso') || t.includes('ferramenta') || t.includes('material')) return 'Recurso';
  if (t.includes('objetivo') || t.includes('meta') || t.includes('alcançar')) return 'Objetivo';
  if (t.includes('risco') || t.includes('ameaça') || t.includes('perigo')) return 'Risco';
  return 'Outro';
}

export default function App() {
  const activeProjectId = 'default';

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

  // ── Idea actions ──
  const addIdea = useCallback((text: string, isCentral = false) => {
    if (!text.trim()) return;
    
    // Spawning exactly in the center of the viewport (accounting for zoom and pan)
    const viewW = window.innerWidth;
    const viewH = window.innerHeight - 130; // account for headers/footers
    const cx = (viewW / 2 - panX) / zoom;
    const cy = (viewH / 2 - panY) / zoom;
    
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
  const handleAiAction = useCallback(async (ideaId: string, actionKey: string) => {
    const source = ideas.find(i => i.id === ideaId);
    if (!source) return;

    if (!aiMode) {
      alert("Habilite o Modo IA no topo para usar esta funcionalidade.");
      return;
    }

    setAiProcessingId(ideaId);

    try {
      const apiKey = import.meta.env.VITE_CHAVE_API_GEMINI;
      if (!apiKey) {
        alert("Chave VITE_CHAVE_API_GEMINI não encontrada no .env");
        setAiProcessingId(null);
        return;
      }
      
      const promptMap: Record<string, string> = {
        'root-cause': `Analise a ideia "${source.text}" e identifique 3 possíveis causas raiz ou análises de risco. Responda APENAS num formato JSON válido com uma lista de objetos, onde cada objeto tem "text" (a ideia com no máximo 10 palavras) e "category" (uma dentre as categorias exatas: Problema, Solução, Recurso, Objetivo, Risco, Outro). Exemplo de resposta: [{"text":"Causa identificada","category":"Problema"}]. Não adicione formatação markdown ou blocos de código.`,
        'next-steps': `Analise a ideia "${source.text}" e defina 3 próximos passos concretos ou soluções relacionadas. Responda APENAS num formato JSON válido com uma lista de objetos, onde cada objeto tem "text" (o próximo passo com no máximo 10 palavras) e "category" (uma dentre as categorias exatas: Problema, Solução, Recurso, Objetivo, Risco, Outro). Não adicione formatação markdown ou blocos de código.`,
        'expand': `Expanda a ideia "${source.text}" de forma criativa com 3 desdobramentos ou ramificações lógicas. Responda APENAS num formato JSON válido com uma lista de objetos, onde cada objeto tem "text" (a ramificação com no máximo 10 palavras) e "category" (uma dentre as categorias exatas: Problema, Solução, Recurso, Objetivo, Risco, Outro). Não adicione formatação markdown ou blocos de código.`
      };
      
      const prompt = promptMap[actionKey] || promptMap['expand'];

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error('Erro na resposta da API Gemini');
      }

      const data = await response.json();
      let responseText = data.candidates[0].content.parts[0].text;
      
      let results;
      try {
        results = JSON.parse(responseText);
      } catch (e) {
        // Fallback for markdown blocks that model might still return despite instructions
        responseText = responseText.replace(/\\`\\`\\`json/g, '').replace(/\\`\\`\\`/g, '').trim();
        results = JSON.parse(responseText);
      }

      if (!Array.isArray(results)) {
        throw new Error("Formato inválido retornado pela IA (esperava um array)");
      }

      const newIdeas: Idea[] = results.map((r: any, idx: number) => {
        const angle = ((2 * Math.PI) / results.length) * idx - Math.PI / 2;
        return {
          id: `${Date.now()}-ai-${idx}`,
          text: r.text || 'Ideia sem título',
          category: CATEGORIES.some(c => c.name === r.category) ? r.category : 'Outro',
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
      
    } catch (e) {
      console.error("Erro no Gemini API:", e);
      alert('Erro ao processar ação da IA. Verifique sua chave no arquivo .env e o console.');
    } finally {
      setAiProcessingId(null);
    }
  }, [ideas, aiMode, triggerFlash]);

  // ── Viewport controls ──
  const handleZoomChange = useCallback((z: number) => setZoom(z), []);
  const handlePanChange = useCallback((x: number, y: number) => { setPanX(x); setPanY(y); }, []);

  const zoomIn = () => setZoom(z => Math.min(3, z * 1.15));
  const zoomOut = () => setZoom(z => Math.max(0.2, z / 1.15));

  const clearAll = useCallback(() => {
    if (confirm('Limpar todos os balões?')) {
      setIdeas([]);
      resetAnimatedConnections();
    }
  }, []);

  // Filter by selected category
  const filteredIdeas = ideas.filter(i => {
    return !selectedCategory || i.category === selectedCategory;
  });

  return (
    <div
      className="flex flex-col"
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#080c14' }}
    >
      {/* Top Header */}
      <div
        className="flex-none flex flex-col px-12 py-8 z-10 relative"
        style={{
          background: '#0a0f19',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight">Organizador de Brainstorm Neural</h1>
          
          <div className="flex items-center gap-4">
            {/* Modo IA */}
            <div 
              className="flex items-center gap-3 px-4 py-2 rounded-full cursor-pointer transition-all"
              style={{
                 background: aiMode ? 'rgba(55,65,81,0.5)' : 'rgba(255,255,255,0.03)',
                 border: '1px solid rgba(255,255,255,0.1)'
              }}
              onClick={() => setAiMode(v => !v)}
            >
               <span className="text-sm font-medium text-slate-300">Modo IA</span>
               <div
                  className="relative w-9 h-5 rounded-full transition-all"
                  style={{ background: aiMode ? '#cbd5e1' : 'rgba(255,255,255,0.2)' }}
                >
                  <div
                    className="absolute size-4 bg-slate-900 rounded-full shadow transition-transform"
                    style={{ top: 2, left: 2, transform: aiMode ? 'translateX(16px)' : 'translateX(0)' }}
                  />
                </div>
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-3 px-2 py-1 rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
              <button onClick={zoomOut} className="p-1.5 text-slate-400 hover:text-white transition-colors" title="Diminuir Zoom"><Minus size={14} /></button>
              <span className="text-sm font-medium text-slate-300 w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={zoomIn} className="p-1.5 text-slate-400 hover:text-white transition-colors" title="Aumentar Zoom"><Plus size={14} /></button>
            </div>

            {/* Limpar Tudo */}
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Trash2 size={16} />
              Limpar Tudo
            </button>
          </div>
        </div>

        {/* Categories / Filters */}
        <div className="flex items-center gap-4">
           <button
              onClick={() => setSelectedCategory(null)}
              className="px-6 py-2.5 rounded-full text-base font-semibold transition-all"
              style={{
                background: selectedCategory === null ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)',
                color: '#f8fafc',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              Todos ({ideas.length})
           </button>
           {CATEGORIES.map(cat => {
             const count = ideas.filter(i => i.category === cat.name).length;
             const isSelected = selectedCategory === cat.name;
             return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(isSelected ? null : cat.name)}
                  className="px-6 py-2.5 rounded-full text-base font-semibold transition-all"
                  style={{
                    background: isSelected ? `${cat.color}25` : 'transparent',
                    color: isSelected ? cat.color : `${cat.color}80`,
                    border: `1px solid ${isSelected ? cat.color : `${cat.color}40`}`
                  }}
                >
                  {cat.name} ({count})
                </button>
             )
           })}
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 relative" style={{ minWidth: 0 }}>
        
        {/* Background Grid Labels */}
        <div className="absolute top-4 left-6 text-xs text-slate-600 font-medium tracking-wide z-0 pointer-events-none">Alto Impacto / Baixa Urgência</div>
        <div className="absolute top-4 right-6 text-xs text-slate-600 font-medium tracking-wide z-0 pointer-events-none">Alto Impacto / Alta Urgência</div>
        <div className="absolute bottom-4 left-6 text-xs text-slate-600 font-medium tracking-wide z-0 pointer-events-none">Baixo Impacto / Baixa Urgência</div>
        <div className="absolute bottom-4 right-6 text-xs text-slate-600 font-medium tracking-wide z-0 pointer-events-none">Baixo Impacto / Alta Urgência</div>

        {/* Board */}
        <div ref={boardRef} className="flex-1" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
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
      </div>

      {/* Bottom input bar */}
      <div
        className="flex-none px-12 py-8 z-10 relative"
        style={{
          background: 'rgba(10,15,25,0.95)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <InputBar onAddIdea={addIdea} />
      </div>
    </div>
  );
}
