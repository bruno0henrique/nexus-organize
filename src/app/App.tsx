import { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { BrainstormBoard, resetAnimatedConnections } from './components/BrainstormBoard';
import { InputBar } from './components/InputBar';
import { CategoryFilter } from './components/CategoryFilter';
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

  if (lowerText.includes('problema') || lowerText.includes('desafio') || lowerText.includes('dificuldade') || lowerText.includes('causa')) {
    return 'Problema';
  }
  if (lowerText.includes('solução') || lowerText.includes('resolver') || lowerText.includes('implementar') || lowerText.includes('passo')) {
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

// ─── AI Creation Engine ────────────────────────────────────────────────
// Simulated AI responses per action type
const AI_RESPONSES: Record<string, (text: string) => Array<{ text: string; category: string }>> = {
  'root-cause': (text: string) => {
    const base = text.toLowerCase();
    const responses: Array<{ text: string; category: string }> = [];

    if (base.includes('venda') || base.includes('receita') || base.includes('lucro')) {
      responses.push(
        { text: `Causa raiz: Falta de segmentação adequada do público-alvo para "${text}"`, category: 'Problema' },
        { text: `Análise: Processo de conversão com muitos pontos de atrito`, category: 'Problema' },
        { text: `Investigar: Métricas de funil indicam abandono na etapa de decisão`, category: 'Risco' }
      );
    } else if (base.includes('equipe') || base.includes('time') || base.includes('pessoa')) {
      responses.push(
        { text: `Causa raiz: Falta de alinhamento entre expectativas e capacidades da equipe`, category: 'Problema' },
        { text: `Análise: Processos de comunicação ineficientes gerando retrabalho`, category: 'Problema' },
        { text: `Investigar: Sobrecarga de demandas sem priorização clara`, category: 'Risco' }
      );
    } else if (base.includes('tecnolog') || base.includes('sistema') || base.includes('software')) {
      responses.push(
        { text: `Causa raiz: Débito técnico acumulado comprometendo a estabilidade`, category: 'Problema' },
        { text: `Análise: Falta de testes automatizados gerando regressões`, category: 'Problema' },
        { text: `Investigar: Arquitetura monolítica limitando a escalabilidade`, category: 'Risco' }
      );
    } else {
      responses.push(
        { text: `Causa raiz identificada: Falta de dados quantitativos sobre "${text}"`, category: 'Problema' },
        { text: `Análise profunda: Ausência de métricas claras para medir o progresso`, category: 'Problema' },
        { text: `Investigar: Possível desalinhamento entre stakeholders sobre o tema`, category: 'Risco' }
      );
    }

    return responses;
  },

  'next-steps': (text: string) => {
    const base = text.toLowerCase();
    const responses: Array<{ text: string; category: string }> = [];

    if (base.includes('problema') || base.includes('causa') || base.includes('desafio')) {
      responses.push(
        { text: `Passo 1: Mapear todos os stakeholders impactados por "${text}"`, category: 'Solução' },
        { text: `Passo 2: Definir KPIs mensuráveis para acompanhar a resolução`, category: 'Objetivo' },
        { text: `Passo 3: Criar um plano de ação com marcos semanais`, category: 'Solução' }
      );
    } else if (base.includes('objetivo') || base.includes('meta')) {
      responses.push(
        { text: `Passo 1: Quebrar o objetivo em micro-entregas quinzenais`, category: 'Solução' },
        { text: `Passo 2: Alocar recursos dedicados e definir responsáveis`, category: 'Recurso' },
        { text: `Passo 3: Implementar revisões semanais de progresso`, category: 'Solução' }
      );
    } else {
      responses.push(
        { text: `Passo 1: Validar a viabilidade de "${text}" com dados reais`, category: 'Solução' },
        { text: `Passo 2: Criar protótipo ou MVP para teste rápido`, category: 'Solução' },
        { text: `Passo 3: Coletar feedback e iterar sobre os resultados`, category: 'Objetivo' }
      );
    }

    return responses;
  },

  'expand': (text: string) => {
    const base = text.toLowerCase();
    const responses: Array<{ text: string; category: string }> = [];

    if (base.includes('produto') || base.includes('feature') || base.includes('funcionalidade')) {
      responses.push(
        { text: `Expandindo "${text}": Considerar uma versão mobile-first`, category: 'Solução' },
        { text: `Ramificação: Integração com APIs de terceiros para enriquecer dados`, category: 'Recurso' },
        { text: `Oportunidade: Criar um modelo freemium para aquisição orgânica`, category: 'Objetivo' }
      );
    } else if (base.includes('mercado') || base.includes('cliente') || base.includes('usuário')) {
      responses.push(
        { text: `Expandindo "${text}": Segmentar por comportamento, não só demografia`, category: 'Solução' },
        { text: `Ramificação: Criar programa de embaixadores e referência`, category: 'Objetivo' },
        { text: `Oportunidade: Explorar mercados adjacentes com potencial sinérgico`, category: 'Recurso' }
      );
    } else {
      responses.push(
        { text: `Expandindo "${text}": Analisar o tema sob óptica de diferentes áreas`, category: 'Solução' },
        { text: `Ramificação: Conectar com tendências de mercado atuais`, category: 'Recurso' },
        { text: `Oportunidade: Transformar em um diferencial competitivo mensurável`, category: 'Objetivo' }
      );
    }

    return responses;
  }
};

function generateAIResponse(
  ideaText: string,
  actionKey: string
): Array<{ text: string; category: string }> {
  const handler = AI_RESPONSES[actionKey];
  if (!handler) return [];
  return handler(ideaText);
}

// ─── Main App ──────────────────────────────────────────────────────────
export default function App() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [aiMode, setAiMode] = useState(false);
  const [connectionFlash, setConnectionFlash] = useState<{ from: string; to: string } | null>(null);
  const [aiProcessingId, setAiProcessingId] = useState<string | null>(null);

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

  const triggerConnectionFlash = useCallback((fromId: string, toId: string) => {
    setConnectionFlash({ from: fromId, to: toId });
    setTimeout(() => setConnectionFlash(null), 500);
  }, []);

  const toggleConnection = useCallback((fromId: string, toId: string) => {
    setIdeas(prev => prev.map(idea => {
      if (idea.id === fromId) {
        const hasConnection = idea.connections.includes(toId);
        if (!hasConnection) {
          // Trigger flash effect
          triggerConnectionFlash(fromId, toId);
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
  }, [triggerConnectionFlash]);

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

  // ─── AI Action Handler (Motor de Criação) ───────────────────────────
  const handleAiAction = useCallback(
    (ideaId: string, actionKey: string) => {
      const sourceIdea = ideas.find(i => i.id === ideaId);
      if (!sourceIdea) return;

      setAiProcessingId(ideaId);

      // Simulate AI processing delay (1.5 – 3s)
      const delay = 1500 + Math.random() * 1500;

      setTimeout(() => {
        const aiResults = generateAIResponse(sourceIdea.text, actionKey);
        const newIdeas: Idea[] = [];
        const angleStep = (2 * Math.PI) / aiResults.length;
        const radius = 280;

        aiResults.forEach((result, idx) => {
          const angle = angleStep * idx - Math.PI / 2; // Start from top
          const newIdea: Idea = {
            id: `${Date.now()}-ai-${idx}`,
            text: result.text,
            category: result.category,
            position: {
              x: sourceIdea.position.x + Math.cos(angle) * radius,
              y: sourceIdea.position.y + Math.sin(angle) * radius
            },
            connections: [],
            isCentral: false,
            scale: 0.9,
            aiGenerated: true
          };
          newIdeas.push(newIdea);
        });

        // Add new ideas and connect them, firing synapse animations sequentially
        setIdeas(prev => {
          const updated = [...prev];
          const sourceIndex = updated.findIndex(i => i.id === ideaId);

          if (sourceIndex === -1) return prev;

          newIdeas.forEach(newIdea => {
            updated.push(newIdea);
            // Add connection from source to new idea
            updated[sourceIndex] = {
              ...updated[sourceIndex],
              connections: [...updated[sourceIndex].connections, newIdea.id]
            };
          });

          return updated;
        });

        // Fire synapse animations sequentially for each new connection
        newIdeas.forEach((newIdea, idx) => {
          setTimeout(() => {
            triggerConnectionFlash(ideaId, newIdea.id);
          }, idx * 400);
        });

        setAiProcessingId(null);
      }, delay);
    },
    [ideas, triggerConnectionFlash]
  );

  const clearAll = useCallback(() => {
    if (confirm('Tem certeza que deseja limpar todas as ideias?')) {
      setIdeas([]);
      resetAnimatedConnections();
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
            onAiAction={handleAiAction}
            aiProcessingId={aiProcessingId}
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
            <span>Use o 🧠 para ações de IA</span>
            <span>•</span>
            <span>Total: {ideas.length}</span>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
