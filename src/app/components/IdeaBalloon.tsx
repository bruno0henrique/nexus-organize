import { useRef, useState } from 'react';
import { useDrag } from 'react-dnd';
import {
  Trash2,
  Link2,
  MoreVertical,
  Star,
  ZoomIn,
  ZoomOut,
  Brain,
  Search,
  ArrowRight,
  Lightbulb,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Idea } from '../App';

interface IdeaBalloonProps {
  idea: Idea;
  categories: Array<{ name: string; color: string; bgColor: string }>;
  onUpdatePosition: (id: string, position: { x: number; y: number }) => void;
  onUpdateCategory: (id: string, category: string) => void;
  onToggleCentral: (id: string) => void;
  onUpdateScale: (id: string, scale: number) => void;
  onDelete: (id: string) => void;
  isConnecting: boolean;
  onStartConnecting: (id: string) => void;
  onFinishConnecting: (id: string) => void;
  onAiAction: (ideaId: string, action: string) => void;
  isAiProcessing: boolean;
}

const AI_ACTIONS = [
  {
    key: 'root-cause',
    label: 'Encontrar Causa Raiz',
    icon: Search,
    description: 'Analisa a fundo e identifica a causa raiz',
    gradient: 'from-red-500 to-orange-500'
  },
  {
    key: 'next-steps',
    label: 'Próximos Passos',
    icon: ArrowRight,
    description: 'Sugere ações concretas para avançar',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    key: 'expand',
    label: 'Expandir Ideia',
    icon: Lightbulb,
    description: 'Desdobra e aprofunda o conceito',
    gradient: 'from-purple-500 to-pink-500'
  }
];

export function IdeaBalloon({
  idea,
  categories,
  onUpdatePosition,
  onUpdateCategory,
  onToggleCentral,
  onUpdateScale,
  onDelete,
  isConnecting,
  onStartConnecting,
  onFinishConnecting,
  onAiAction,
  isAiProcessing
}: IdeaBalloonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [isDraggingConnection, setIsDraggingConnection] = useState(false);
  const balloonRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'IDEA',
    item: { id: idea.id, position: idea.position },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    end: (item, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (delta) {
        const newPosition = {
          x: Math.max(0, item.position.x + delta.x),
          y: Math.max(0, item.position.y + delta.y)
        };
        onUpdatePosition(item.id, newPosition);
      }
    }
  });

  drag(balloonRef);

  const category = categories.find(c => c.name === idea.category);
  const borderColor = category?.color || '#6b7280';

  const handleBorderMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingConnection(true);
    onStartConnecting(idea.id);
  };

  const handleBorderMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDraggingConnection) {
      setIsDraggingConnection(false);
    }
    onFinishConnecting(idea.id);
  };

  const handleConnect = () => {
    if (isConnecting) {
      onFinishConnecting(idea.id);
    } else {
      onStartConnecting(idea.id);
    }
  };

  const handleAiAction = (actionKey: string) => {
    setShowAiMenu(false);
    onAiAction(idea.id, actionKey);
  };

  const balloonWidth = 200 * (idea.scale || 1);
  const balloonHeight = 80 * (idea.scale || 1);

  return (
    <div
      ref={balloonRef}
      className="absolute cursor-move group"
      style={{
        left: idea.position.x,
        top: idea.position.y,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : showAiMenu ? 500 : idea.isCentral ? 100 : 1,
        width: balloonWidth,
        minHeight: balloonHeight
      }}
      onMouseUp={handleBorderMouseUp}
    >
      {/* AI Processing ring animation */}
      {isAiProcessing && (
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            border: `3px solid transparent`,
            background: `linear-gradient(#1e293b, #1e293b) padding-box, 
                         conic-gradient(from 0deg, ${borderColor}, #a855f7, #06b6d4, ${borderColor}) border-box`,
            animation: 'spin 2s linear infinite',
            transform: 'scale(1.05)',
            zIndex: -1
          }}
        />
      )}

      {/* Outer glow for central ideas */}
      {idea.isCentral && (
        <div
          className="absolute inset-0 rounded-2xl blur-xl opacity-50"
          style={{
            backgroundColor: borderColor,
            transform: 'scale(1.1)'
          }}
        />
      )}

      {/* Draggable border for connections */}
      <div
        ref={borderRef}
        onMouseDown={handleBorderMouseDown}
        className="absolute inset-0 rounded-2xl cursor-crosshair hover:ring-4 hover:ring-purple-500/50 transition-all"
        style={{
          border: `${idea.isCentral ? '4px' : '3px'} solid ${borderColor}`,
          boxShadow: `0 0 ${idea.isCentral ? '20px' : '10px'} ${borderColor}40`
        }}
        title="Arraste da borda para conectar"
      />

      <div
        className="relative px-4 py-3 rounded-2xl transition-all duration-200"
        style={{
          backgroundColor: '#1e293b',
          transform: isDragging ? 'scale(1.05)' : 'scale(1)',
          margin: idea.isCentral ? '4px' : '3px'
        }}
      >
        {/* Category Badge */}
        <div
          className="absolute -top-2 -left-2 px-2 py-0.5 rounded-full text-xs font-semibold text-white shadow-md"
          style={{ backgroundColor: borderColor }}
        >
          {idea.category}
        </div>

        {/* Central Star */}
        {idea.isCentral && (
          <div className="absolute -top-3 -right-3 size-8 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-lg">
            <Star size={16} fill="currentColor" />
          </div>
        )}

        {/* Connection Count Badge */}
        {idea.connections.length > 0 && (
          <div className="absolute -bottom-2 -right-2 size-7 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md ring-2 ring-purple-400">
            {idea.connections.length}
          </div>
        )}

        {/* Text Content */}
        <p
          className="text-sm text-slate-100 pt-2 leading-relaxed"
          style={{
            fontSize: `${0.875 * (idea.scale || 1)}rem`
          }}
        >
          {idea.text}
        </p>

        {/* AI Source Badge */}
        {idea.aiGenerated && (
          <div className="flex items-center gap-1 mt-1.5">
            <Sparkles size={10} className="text-purple-400" />
            <span className="text-[10px] text-purple-400 font-medium">
              Gerado pela IA
            </span>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Connect Button */}
          <button
            onClick={handleConnect}
            className={`p-1.5 rounded-lg transition-colors ${
              isConnecting
                ? 'bg-purple-600 text-white'
                : 'hover:bg-slate-700 text-slate-400'
            }`}
            title={
              isConnecting
                ? 'Clique em outro balão para conectar'
                : 'Conectar com outro balão'
            }
          >
            <Link2 size={14} />
          </button>

          {/* Central Toggle */}
          <button
            onClick={() => onToggleCentral(idea.id)}
            className={`p-1.5 rounded-lg transition-colors ${
              idea.isCentral
                ? 'bg-amber-600 text-white'
                : 'hover:bg-slate-700 text-slate-400'
            }`}
            title="Marcar como central"
          >
            <Star size={14} fill={idea.isCentral ? 'currentColor' : 'none'} />
          </button>

          {/* Scale Controls */}
          <button
            onClick={() => onUpdateScale(idea.id, (idea.scale || 1) - 0.2)}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
            title="Diminuir"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => onUpdateScale(idea.id, (idea.scale || 1) + 0.2)}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
            title="Aumentar"
          >
            <ZoomIn size={14} />
          </button>

          {/* AI Actions Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowAiMenu(!showAiMenu);
                setShowMenu(false);
              }}
              disabled={isAiProcessing}
              className={`p-1.5 rounded-lg transition-all ${
                showAiMenu
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg shadow-purple-500/30'
                  : isAiProcessing
                  ? 'bg-purple-900/50 text-purple-300 cursor-wait'
                  : 'hover:bg-purple-900/50 text-purple-400 hover:text-purple-300'
              }`}
              title="Ações de IA"
            >
              {isAiProcessing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Brain size={14} />
              )}
            </button>

            {/* AI Actions Menu */}
            {showAiMenu && !isAiProcessing && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowAiMenu(false)}
                />
                <div className="absolute left-0 bottom-full mb-2 z-20 min-w-[220px]">
                  <div
                    className="rounded-xl shadow-2xl border border-slate-600/50 overflow-hidden"
                    style={{
                      background:
                        'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                      backdropFilter: 'blur(20px)'
                    }}
                  >
                    {/* Header */}
                    <div className="px-3 py-2.5 border-b border-slate-700/50">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-gradient-to-r from-purple-600 to-cyan-600">
                          <Brain size={12} className="text-white" />
                        </div>
                        <span className="text-xs font-bold text-slate-200 tracking-wide">
                          AÇÕES DE IA
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-1.5">
                      {AI_ACTIONS.map(action => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={action.key}
                            onClick={() => handleAiAction(action.key)}
                            className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-slate-700/50 transition-all group/action flex items-start gap-3"
                          >
                            <div
                              className={`p-1.5 rounded-lg bg-gradient-to-r ${action.gradient} mt-0.5 opacity-80 group-hover/action:opacity-100 transition-opacity shrink-0`}
                            >
                              <Icon size={13} className="text-white" />
                            </div>
                            <div>
                              <div className="text-slate-200 font-medium text-xs">
                                {action.label}
                              </div>
                              <div className="text-slate-500 text-[10px] mt-0.5 leading-tight">
                                {action.description}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Category Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowMenu(!showMenu);
                setShowAiMenu(false);
              }}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
              title="Mais opções"
            >
              <MoreVertical size={14} />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute left-0 bottom-full mb-2 bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-2 z-20 min-w-[150px]">
                  <div className="text-xs font-semibold text-slate-400 mb-2 px-2">
                    Mudar categoria:
                  </div>
                  {categories.map(cat => (
                    <button
                      key={cat.name}
                      onClick={() => {
                        onUpdateCategory(idea.id, cat.name);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-slate-700 transition-colors flex items-center gap-2 text-slate-200"
                    >
                      <div
                        className="size-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Delete */}
          <button
            onClick={() => onDelete(idea.id)}
            className="ml-auto p-1.5 hover:bg-red-900/50 rounded-lg transition-colors text-red-400"
            title="Deletar"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Connecting Indicator */}
        {isConnecting && (
          <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg animate-pulse whitespace-nowrap">
            Clique em outro balão
          </div>
        )}

        {/* Dragging Connection Indicator */}
        {isDraggingConnection && (
          <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg animate-pulse whitespace-nowrap">
            Solte em outro balão
          </div>
        )}
      </div>
    </div>
  );
}
