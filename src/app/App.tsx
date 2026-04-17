import { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { BrainstormBoard } from './components/BrainstormBoard';
import { InputBar } from './components/InputBar';
import { CategoryFilter } from './components/CategoryFilter';
import { Plus, Trash2 } from 'lucide-react';

export interface Idea {
  id: string;
  text: string;
  category: string;
  position: { x: number; y: number };
  connections: string[];
  isCentral: boolean;
  scale: number;
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
  const lowerText = text.toLowerCase();

  if (lowerText.includes('problema') || lowerText.includes('desafio') || lowerText.includes('dificuldade')) {
    return 'Problema';
  }
  if (lowerText.includes('solução') || lowerText.includes('resolver') || lowerText.includes('implementar')) {
    return 'Solução';
  }
  if (lowerText.includes('recurso') || lowerText.includes('ferramenta') || lowerText.includes('material')) {
    return 'Recurso';
  }
  if (lowerText.includes('objetivo') || lowerText.includes('meta') || lowerText.includes('alcançar')) {
    return 'Objetivo';
  }
  if (lowerText.includes('risco') || lowerText.includes('ameaça') || lowerText.includes('perigo')) {
    return 'Risco';
  }

  return 'Outro';
}

export default function App() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [aiMode, setAiMode] = useState(false);
  const [connectionFlash, setConnectionFlash] = useState<{ from: string; to: string } | null>(null);

  const addIdea = useCallback((text: string, isCentral: boolean = false) => {
    if (!text.trim()) return;

    const category = categorizeIdea(text);
    const newIdea: Idea = {
      id: Date.now().toString(),
      text,
      category,
      position: {
        x: Math.random() * 600 + 300,
        y: Math.random() * 400 + 200
      },
      connections: [],
      isCentral,
      scale: isCentral ? 1.5 : 1
    };

    setIdeas(prev => [...prev, newIdea]);
  }, []);

  const updateIdeaPosition = useCallback((id: string, position: { x: number; y: number }) => {
    setIdeas(prev => prev.map(idea =>
      idea.id === id ? { ...idea, position } : idea
    ));
  }, []);

  const updateIdeaCategory = useCallback((id: string, category: string) => {
    setIdeas(prev => prev.map(idea =>
      idea.id === id ? { ...idea, category } : idea
    ));
  }, []);

  const deleteIdea = useCallback((id: string) => {
    setIdeas(prev => prev.filter(idea => idea.id !== id));
  }, []);

  const toggleConnection = useCallback((fromId: string, toId: string) => {
    setIdeas(prev => prev.map(idea => {
      if (idea.id === fromId) {
        const hasConnection = idea.connections.includes(toId);
        if (!hasConnection) {
          // Trigger flash effect
          setConnectionFlash({ from: fromId, to: toId });
          setTimeout(() => setConnectionFlash(null), 500);
        }
        return {
          ...idea,
          connections: hasConnection
            ? idea.connections.filter(c => c !== toId)
            : [...idea.connections, toId]
        };
      }
      return idea;
    }));
  }, []);

  const startConnecting = useCallback((id: string) => {
    setConnectingFrom(id);
  }, []);

  const finishConnecting = useCallback((toId: string) => {
    if (connectingFrom && connectingFrom !== toId) {
      toggleConnection(connectingFrom, toId);
    }
    setConnectingFrom(null);
  }, [connectingFrom, toggleConnection]);

  const toggleCentral = useCallback((id: string) => {
    setIdeas(prev => prev.map(idea =>
      idea.id === id ? { ...idea, isCentral: !idea.isCentral, scale: !idea.isCentral ? 1.5 : 1 } : idea
    ));
  }, []);

  const updateIdeaScale = useCallback((id: string, scale: number) => {
    setIdeas(prev => prev.map(idea =>
      idea.id === id ? { ...idea, scale: Math.max(0.5, Math.min(2.5, scale)) } : idea
    ));
  }, []);

  const autoConnectWithAI = useCallback(() => {
    // AI simulation: connect ideas of same category or related keywords
    const newIdeas = [...ideas];

    newIdeas.forEach((idea, idx) => {
      newIdeas.forEach((otherIdea, otherIdx) => {
        if (idx !== otherIdx && !idea.connections.includes(otherIdea.id)) {
          // Connect if same category or keywords match
          const sameCategory = idea.category === otherIdea.category;
          const hasCommonWords = idea.text.toLowerCase().split(' ').some(word =>
            word.length > 4 && otherIdea.text.toLowerCase().includes(word)
          );

          if (sameCategory || hasCommonWords) {
            if (Math.random() > 0.5) { // Some randomness
              idea.connections.push(otherIdea.id);
            }
          }
        }
      });
    });

    setIdeas(newIdeas);
  }, [ideas]);

  const clearAll = useCallback(() => {
    if (confirm('Tem certeza que deseja limpar todas as ideias?')) {
      setIdeas([]);
    }
  }, []);

  const filteredIdeas = selectedCategory
    ? ideas.filter(idea => idea.category === selectedCategory)
    : ideas;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="size-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Header */}
        <div className="flex-none px-6 py-4 bg-slate-900/50 border-b border-slate-700/50 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-100">
              Organizador de Brainstorm Neural
            </h1>

            <div className="flex items-center gap-3">
              {/* AI Toggle */}
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <span className="text-xs font-medium text-slate-300">Modo IA</span>
                <button
                  onClick={() => {
                    setAiMode(!aiMode);
                    if (!aiMode) autoConnectWithAI();
                  }}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    aiMode ? 'bg-purple-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 size-5 bg-white rounded-full transition-transform ${
                      aiMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <button
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                  className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
                >
                  -
                </button>
                <span className="text-xs font-medium text-slate-300 min-w-[3rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                  className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
                >
                  +
                </button>
              </div>

              <button
                onClick={clearAll}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-950/50 rounded-lg transition-colors border border-red-900/50"
              >
                <Trash2 size={16} />
                Limpar Tudo
              </button>
            </div>
          </div>

          <CategoryFilter
            categories={CATEGORIES}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            ideas={ideas}
          />
        </div>

        {/* Board */}
        <div className="flex-1 overflow-hidden">
          <BrainstormBoard
            ideas={filteredIdeas}
            categories={CATEGORIES}
            onUpdatePosition={updateIdeaPosition}
            onUpdateCategory={updateIdeaCategory}
            onDeleteIdea={deleteIdea}
            onToggleCentral={toggleCentral}
            onUpdateScale={updateIdeaScale}
            connectingFrom={connectingFrom}
            onStartConnecting={startConnecting}
            onFinishConnecting={finishConnecting}
            zoom={zoom}
            connectionFlash={connectionFlash}
          />
        </div>

        {/* Bottom Input Bar */}
        <div className="flex-none px-6 py-4 bg-slate-900/50 border-t border-slate-700/50 backdrop-blur-sm">
          <InputBar onAddIdea={addIdea} />
          <div className="flex items-center gap-4 text-xs text-slate-500 mt-3">
            <span className="font-semibold">Dica:</span>
            <span>Arraste os balões</span>
            <span>•</span>
            <span>Arraste da borda para conectar</span>
            <span>•</span>
            <span>Scroll do mouse para zoom</span>
            <span>•</span>
            <span>Total: {ideas.length}</span>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
