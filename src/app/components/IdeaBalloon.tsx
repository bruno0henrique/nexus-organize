import { useRef, useState, useEffect } from 'react';
import {
  Trash2,
  Brain,
  Search,
  ArrowRight,
  Lightbulb,
  Sparkles,
  Loader2,
  Link2,
  Star,
  MoreHorizontal
} from 'lucide-react';
import { Idea } from '../App';

interface IdeaBalloonProps {
  idea: Idea;
  balloonW: number;
  categories: Array<{ name: string; color: string; bgColor: string }>;
  onUpdatePosition: (id: string, position: { x: number; y: number }) => void;
  onUpdateCategory: (id: string, category: string) => void;
  onToggleCentral: (id: string) => void;
  onUpdateScale: (id: string, scale: number) => void;
  onDelete: (id: string) => void;
  isConnecting: boolean;
  connectingFromAny: boolean;
  onStartConnecting: (id: string) => void;
  onFinishConnecting: (id: string) => void;
  onAiAction: (ideaId: string, action: string) => void;
  isAiProcessing: boolean;
}

const AI_ACTIONS = [
  { key: 'root-cause', label: 'Encontrar Causa Raiz', icon: Search, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  { key: 'next-steps', label: 'Próximos Passos', icon: ArrowRight, color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  { key: 'expand', label: 'Expandir Ideia', icon: Lightbulb, color: '#a855f7', bg: 'rgba(168,85,247,0.15)' }
];

export function IdeaBalloon({
  idea,
  balloonW,
  categories,
  onUpdatePosition,
  onUpdateCategory,
  onToggleCentral,
  onDelete,
  isConnecting,
  connectingFromAny,
  onStartConnecting,
  onFinishConnecting,
  onAiAction,
  isAiProcessing
}: IdeaBalloonProps) {
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showCatMenu, setShowCatMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const category = categories.find(c => c.name === idea.category);
  const color = category?.color || '#6b7280';

  // ── Custom drag (not react-dnd, so it works inside the scaled canvas) ──
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = (e.clientX - dragStart.current.mx);
      const dy = (e.clientY - dragStart.current.my);
      // We move by dx/dy in screen space but positions are in world space,
      // so the BrainstormBoard passes zoom. We emit world-space positions
      // by reading the closest ancestor's scale. For simplicity we read
      // the CSS transform from the parent container.
      const parent = ref.current?.offsetParent as HTMLElement | null;
      let scale = 1;
      if (parent) {
        const m = new DOMMatrix(window.getComputedStyle(parent).transform);
        scale = m.a || 1;
      }
      onUpdatePosition(idea.id, {
        x: dragStart.current.px + dx / scale,
        y: dragStart.current.py + dy / scale
      });
    };

    const onUp = () => {
      if (!dragStart.current) return;
      dragStart.current = null;
      setIsDragging(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [idea.id, onUpdatePosition]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start drag when clicking buttons
    if ((e.target as HTMLElement).closest('button')) return;
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: idea.position.x, py: idea.position.y };
  };

  const handleBalloonClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    // If something is connecting and it's not us, finish the connection
    if (connectingFromAny && !isConnecting) {
      onFinishConnecting(idea.id);
    }
  };

  return (
    <div
      ref={ref}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowAiMenu(false); setShowCatMenu(false); }}
      onMouseDown={handleMouseDown}
      onClick={handleBalloonClick}
      className="absolute group"
      style={{
        left: idea.position.x,
        top: idea.position.y,
        width: balloonW,
        cursor: isDragging ? 'grabbing' : connectingFromAny && !isConnecting ? 'crosshair' : 'grab',
        zIndex: isDragging ? 1000 : showAiMenu || showCatMenu ? 500 : isConnecting ? 300 : 1,
        userSelect: 'none',
        opacity: isDragging ? 0.85 : 1
      }}
    >
      {/* AI processing ring */}
      {isAiProcessing && (
        <div
          className="absolute rounded-2xl"
          style={{
            inset: -3,
            background: `conic-gradient(from 0deg, ${color}, #a855f7, #06b6d4, ${color})`,
            animation: 'spin 1.8s linear infinite',
            borderRadius: 20,
            zIndex: -1
          }}
        />
      )}

      {/* Card */}
      <div
        className="relative rounded-2xl overflow-visible transition-all duration-200"
        style={{
          background: 'linear-gradient(145deg, #131d2e, #0d1520)',
          border: `2px solid ${isConnecting ? '#a855f7' : color}`,
          boxShadow: isConnecting
            ? `0 0 0 3px rgba(168,85,247,0.3), 0 0 20px ${color}30`
            : idea.isCentral
            ? `0 0 30px ${color}50, 0 4px 24px rgba(0,0,0,0.5)`
            : isHovered
            ? `0 0 16px ${color}25, 0 4px 20px rgba(0,0,0,0.4)`
            : `0 0 10px ${color}15, 0 2px 12px rgba(0,0,0,0.3)`,
          transform: isDragging ? 'scale(1.03) rotate(0.5deg)' : 'scale(1)',
        }}
      >
        {/* Category label */}
        <div
          className="absolute flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold tracking-wide"
          style={{
            top: -14,
            left: 16,
            background: color,
            color: 'white',
            boxShadow: `0 2px 8px ${color}60`
          }}
        >
          {idea.category}
        </div>

        {/* Central star badge */}
        {idea.isCentral && (
          <div
            className="absolute flex items-center justify-center rounded-full"
            style={{
              top: -14,
              right: 16,
              width: 28,
              height: 28,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              boxShadow: '0 2px 8px rgba(245,158,11,0.5)'
            }}
          >
            <Star size={14} fill="white" className="text-white" />
          </div>
        )}

        {/* Connection count badge */}
        {idea.connections.length > 0 && (
          <div
            className="absolute flex items-center justify-center rounded-full text-xs font-bold"
            style={{
              bottom: -13,
              right: 16,
              width: 26,
              height: 26,
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: 'white',
              boxShadow: '0 2px 8px rgba(124,58,237,0.5)',
              border: '2px solid #131d2e'
            }}
          >
            {idea.connections.length}
          </div>
        )}

        {/* Content */}
        <div className="px-8 pt-10 pb-6">
          <p
            className="text-[22px] leading-relaxed font-semibold"
            style={{
              color: '#e2e8f0',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6
            }}
          >
            {idea.text}
          </p>

          {idea.aiGenerated && (
            <div className="flex items-center gap-2 mt-4">
              <Sparkles size={16} style={{ color: '#a855f7' }} />
              <span className="text-[13px] font-bold" style={{ color: '#a855f7' }}>GERADO POR IA</span>
            </div>
          )}
        </div>

        {/* Action toolbar */}
        <div
          className="flex items-center gap-3 px-6 pb-6 transition-all duration-150"
          style={{ opacity: isHovered || isConnecting ? 1 : 0 }}
        >
          {/* Connect port */}
          <button
            onClick={e => {
              e.stopPropagation();
              if (isConnecting) onFinishConnecting(idea.id);
              else onStartConnecting(idea.id);
            }}
            className="flex items-center justify-center rounded-xl transition-all"
            style={{
              width: 44,
              height: 44,
              background: isConnecting ? '#7c3aed' : 'rgba(255,255,255,0.05)',
              color: isConnecting ? 'white' : '#64748b',
              border: isConnecting ? '1px solid #9333ea' : '1px solid rgba(255,255,255,0.08)'
            }}
            title={isConnecting ? 'Cancelar conexão' : 'Conectar a outro balão'}
          >
            <Link2 size={22} />
          </button>

          {/* Star toggle */}
          <button
            onClick={e => { e.stopPropagation(); onToggleCentral(idea.id); }}
            className="flex items-center justify-center rounded-xl transition-all"
            style={{
              width: 44,
              height: 44,
              background: idea.isCentral ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
              color: idea.isCentral ? '#f59e0b' : '#64748b',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
            title="Central"
          >
            <Star size={22} fill={idea.isCentral ? 'currentColor' : 'none'} />
          </button>

          {/* AI actions */}
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setShowAiMenu(v => !v); setShowCatMenu(false); }}
              disabled={isAiProcessing}
              className="flex items-center justify-center rounded-xl transition-all"
              style={{
                width: 44,
                height: 44,
                background: showAiMenu ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)',
                color: isAiProcessing ? '#7c3aed' : showAiMenu ? '#c4b5fd' : '#64748b',
                border: showAiMenu ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.08)'
              }}
              title="Ações de IA"
            >
              {isAiProcessing ? <Loader2 size={22} className="animate-spin" /> : <Brain size={22} />}
            </button>

            {showAiMenu && !isAiProcessing && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAiMenu(false)} />
                <div
                  className="absolute z-50 rounded-2xl overflow-hidden shadow-2xl"
                  style={{
                    bottom: '100%',
                    left: 0,
                    marginBottom: 8,
                    minWidth: 260,
                    background: 'linear-gradient(145deg, #141e30, #0d1520)',
                    border: '1px solid rgba(139,92,246,0.3)',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)'
                  }}
                >
                  <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg,#7c3aed,#2563eb)' }}>
                      <Brain size={16} className="text-white" />
                    </div>
                    <span className="text-xs font-bold tracking-widest" style={{ color: '#94a3b8' }}>AÇÕES DE IA</span>
                  </div>
                  {AI_ACTIONS.map(act => {
                    const Icon = act.icon;
                    return (
                      <button
                        key={act.key}
                        onClick={e => { e.stopPropagation(); setShowAiMenu(false); onAiAction(idea.id, act.key); }}
                        className="w-full flex items-center gap-4 px-4 py-3 text-left transition-all"
                        style={{ color: '#cbd5e1' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: 36, height: 36, background: act.bg }}>
                          <Icon size={18} style={{ color: act.color }} />
                        </div>
                        <span className="text-sm font-medium">{act.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Category change */}
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setShowCatMenu(v => !v); setShowAiMenu(false); }}
              className="flex items-center justify-center rounded-xl transition-all"
              style={{
                width: 44,
                height: 44,
                background: 'rgba(255,255,255,0.05)',
                color: '#64748b',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
              title="Mudar categoria"
            >
              <MoreHorizontal size={22} />
            </button>

            {showCatMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCatMenu(false)} />
                <div
                  className="absolute z-50 rounded-2xl overflow-hidden shadow-2xl"
                  style={{
                    bottom: '100%',
                    left: 0,
                    marginBottom: 8,
                    minWidth: 200,
                    background: 'linear-gradient(145deg, #141e30, #0d1520)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.6)'
                  }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <span className="text-[11px] font-bold tracking-widest" style={{ color: '#64748b' }}>CATEGORIA</span>
                  </div>
                  {categories.map(cat => (
                    <button
                      key={cat.name}
                      onClick={e => { e.stopPropagation(); onUpdateCategory(idea.id, cat.name); setShowCatMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                      style={{ color: '#94a3b8' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="size-3 rounded-full shrink-0" style={{ background: cat.color }} />
                      <span className="text-sm font-medium">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Delete */}
          <button
            onClick={e => { e.stopPropagation(); onDelete(idea.id); }}
            className="ml-auto flex items-center justify-center rounded-xl transition-all"
            style={{
              width: 44,
              height: 44,
              background: 'rgba(255,255,255,0.05)',
              color: '#64748b',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
            title="Excluir"
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
          >
            <Trash2 size={22} />
          </button>
        </div>
      </div>

      {/* Connection mode: glow ring */}
      {isConnecting && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow: `0 0 0 3px rgba(168,85,247,0.8), 0 0 24px rgba(168,85,247,0.4)`,
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />
      )}
    </div>
  );
}
