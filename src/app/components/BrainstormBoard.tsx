import { useRef, useEffect, useState, useCallback } from 'react';
import { IdeaBalloon } from './IdeaBalloon';
import { Idea } from '../App';

interface BrainstormBoardProps {
  ideas: Idea[];
  categories: Array<{ name: string; color: string; bgColor: string }>;
  onUpdatePosition: (id: string, position: { x: number; y: number }) => void;
  onUpdateCategory: (id: string, category: string) => void;
  onDeleteIdea: (id: string) => void;
  onToggleCentral: (id: string) => void;
  onUpdateScale: (id: string, scale: number) => void;
  connectingFrom: string | null;
  connectingLine: { x1: number; y1: number; x2: number; y2: number } | null;
  onStartConnecting: (id: string) => void;
  onFinishConnecting: (id: string) => void;
  connectionFlash: { from: string; to: string } | null;
  onAiAction: (ideaId: string, action: string) => void;
  aiProcessingId: string | null;
  // Exposed so App can drive zoom/pan
  zoom: number;
  panX: number;
  panY: number;
  onZoomChange: (z: number) => void;
  onPanChange: (x: number, y: number) => void;
}

let animatedConnections = new Set<string>();
export function resetAnimatedConnections() {
  animatedConnections = new Set<string>();
}

// Fixed balloon dimensions (no dynamic scaling per balloon anymore — cleaner)
const BALLOON_W = 220;
const BALLOON_H = 90; // minimum height; text will grow it

export function BrainstormBoard({
  ideas,
  categories,
  onUpdatePosition,
  onUpdateCategory,
  onDeleteIdea,
  onToggleCentral,
  onUpdateScale,
  connectingFrom,
  connectingLine,
  onStartConnecting,
  onFinishConnecting,
  connectionFlash,
  onAiAction,
  aiProcessingId,
  zoom,
  panX,
  panY,
  onZoomChange,
  onPanChange
}: BrainstormBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });

  const [synapseAnimations, setSynapseAnimations] = useState<
    Array<{ id: string; pathD: string; color: string }>
  >([]);

  const getCategoryColor = (name: string) =>
    categories.find(c => c.name === name)?.color || '#6b7280';

  // ── Synapse burst effect ───────────────────────────────────────────
  useEffect(() => {
    if (!connectionFlash) return;
    const fromIdea = ideas.find(i => i.id === connectionFlash.from);
    const toIdea = ideas.find(i => i.id === connectionFlash.to);
    if (!fromIdea || !toIdea) return;

    const key = `${connectionFlash.from}-${connectionFlash.to}`;
    if (animatedConnections.has(key)) return;
    animatedConnections.add(key);

    const x1 = fromIdea.position.x + BALLOON_W / 2;
    const y1 = fromIdea.position.y + BALLOON_H / 2;
    const x2 = toIdea.position.x + BALLOON_W / 2;
    const y2 = toIdea.position.y + BALLOON_H / 2;
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const curv = dist * 0.25;
    const cx1 = x1 + dx * 0.3 + (dy * curv) / dist;
    const cy1 = y1 + dy * 0.3 - (dx * curv) / dist;
    const cx2 = x1 + dx * 0.7 - (dy * curv) / dist;
    const cy2 = y1 + dy * 0.7 + (dx * curv) / dist;

    const color = getCategoryColor(fromIdea.category);
    const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    const animId = `syn-${Date.now()}-${Math.random()}`;

    setSynapseAnimations(prev => [...prev, { id: animId, pathD, color }]);
    setTimeout(() => setSynapseAnimations(prev => prev.filter(a => a.id !== animId)), 1600);
  }, [connectionFlash]);

  // ── Pan with middle-mouse or space+drag ────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom toward cursor
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const factor = e.deltaY < 0 ? 1.08 : 0.93;
        const newZoom = Math.min(3, Math.max(0.2, zoom * factor));
        const ratio = newZoom / zoom;
        const newPanX = mx - ratio * (mx - panX);
        const newPanY = my - ratio * (my - panY);
        onZoomChange(newZoom);
        onPanChange(newPanX, newPanY);
      } else {
        // Pan
        onPanChange(panX - e.deltaX, panY - e.deltaY);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1 || e.button === 2) {
        isPanning.current = true;
        lastPan.current = { x: e.clientX, y: e.clientY };
        el.style.cursor = 'grabbing';
        e.preventDefault();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning.current) return;
      const dx = e.clientX - lastPan.current.x;
      const dy = e.clientY - lastPan.current.y;
      lastPan.current = { x: e.clientX, y: e.clientY };
      onPanChange(panX + dx, panY + dy);
    };

    const onMouseUp = () => {
      isPanning.current = false;
      el.style.cursor = 'default';
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('contextmenu', e => e.preventDefault());

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [zoom, panX, panY, onZoomChange, onPanChange]);

  // ── Draw connections ───────────────────────────────────────────────
  const drawConnections = () => {
    const els: JSX.Element[] = [];

    ideas.forEach((idea, iIdx) => {
      idea.connections.forEach((connId, cIdx) => {
        const conn = ideas.find(i => i.id === connId);
        if (!conn) return;

        const key = `${idea.id}-${connId}`;
        const color = getCategoryColor(idea.category);

        const x1 = idea.position.x + BALLOON_W / 2;
        const y1 = idea.position.y + BALLOON_H / 2;
        const x2 = conn.position.x + BALLOON_W / 2;
        const y2 = conn.position.y + BALLOON_H / 2;
        const dx = x2 - x1, dy = y2 - y1;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) return;
        const curv = dist * 0.25;
        const cx1 = x1 + dx * 0.3 + (dy * curv) / dist;
        const cy1 = y1 + dy * 0.3 - (dx * curv) / dist;
        const cx2 = x1 + dx * 0.7 - (dy * curv) / dist;
        const cy2 = y1 + dy * 0.7 + (dx * curv) / dist;
        const path = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

        const delay = (iIdx * 2.1 + cIdx * 1.3) % 6;
        const dur = 3 + (iIdx + cIdx) % 3;

        els.push(
          <g key={key}>
            {/* Wide soft glow */}
            <path d={path} stroke={color} strokeWidth="10" fill="none" opacity="0.05" filter="url(#glow)" />
            {/* Main line */}
            <path
              d={path}
              stroke={color}
              strokeWidth="1.5"
              fill="none"
              opacity="0.5"
              strokeLinecap="round"
              strokeDasharray="6 3"
            />
            {/* Bright core */}
            <path d={path} stroke={color} strokeWidth="0.5" fill="none" opacity="0.8" strokeLinecap="round" />
            {/* Flowing particle */}
            <circle r="2.5" fill={color}>
              <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={path} begin={`${delay}s`} />
              <animate attributeName="opacity" values="0;0.9;0" dur={`${dur}s`} repeatCount="indefinite" begin={`${delay}s`} />
              <animate attributeName="r" values="1.5;3.5;1.5" dur={`${dur}s`} repeatCount="indefinite" begin={`${delay}s`} />
            </circle>
            {/* Small trailing particle */}
            <circle r="1.5" fill="white" opacity="0">
              <animateMotion dur={`${dur + 0.8}s`} repeatCount="indefinite" path={path} begin={`${delay + 0.4}s`} />
              <animate attributeName="opacity" values="0;0.4;0" dur={`${dur + 0.8}s`} repeatCount="indefinite" begin={`${delay + 0.4}s`} />
            </circle>
          </g>
        );
      });
    });

    return els;
  };

  const drawSynapses = () =>
    synapseAnimations.map(anim => (
      <g key={anim.id}>
        <path d={anim.pathD} stroke={anim.color} strokeWidth="5" fill="none" filter="url(#synapse-glow)" opacity="0">
          <animate attributeName="opacity" values="0;0.9;0.5;0" dur="1.4s" repeatCount="1" fill="freeze" />
          <animate attributeName="stroke-width" values="2;7;2" dur="1.4s" repeatCount="1" fill="freeze" />
        </path>
        <path d={anim.pathD} stroke="white" strokeWidth="2" fill="none" opacity="0">
          <animate attributeName="opacity" values="0;0.6;0" dur="0.7s" repeatCount="1" fill="freeze" />
        </path>
        <circle r="5" fill="white" filter="url(#synapse-glow)" opacity="0.9">
          <animateMotion dur="0.75s" repeatCount="1" fill="freeze" path={anim.pathD} />
          <animate attributeName="opacity" values="0.9;0.5;0" dur="0.75s" repeatCount="1" fill="freeze" />
          <animate attributeName="r" values="3;7;3" dur="0.75s" repeatCount="1" fill="freeze" />
        </circle>
        <circle r="4" fill={anim.color} filter="url(#synapse-glow)">
          <animateMotion dur="0.75s" repeatCount="1" fill="freeze" path={anim.pathD} />
          <animate attributeName="opacity" values="1;0.6;0" dur="0.75s" repeatCount="1" fill="freeze" />
        </circle>
        <circle r="2.5" fill={anim.color} opacity="0.5">
          <animateMotion dur="1s" repeatCount="1" fill="freeze" path={anim.pathD} begin="0.1s" />
          <animate attributeName="opacity" values="0.5;0.2;0" dur="1s" repeatCount="1" fill="freeze" begin="0.1s" />
        </circle>
      </g>
    ));

  // Grid dots offset by pan
  const gridDotX = ((panX % 40) + 40) % 40;
  const gridDotY = ((panY % 40) + 40) % 40;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{ flex: 1, background: '#080c14', cursor: 'default' }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(99,102,241,0.25) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          backgroundPosition: `${gridDotX}px ${gridDotY}px`
        }}
      />
      {/* Radial ambient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,102,241,0.04) 0%, transparent 70%)'
        }}
      />

      {/* Transformable world */}
      <div
        className="absolute inset-0"
        style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: '0 0' }}
      >
        {/* SVG connections layer */}
        <svg
          ref={svgRef}
          className="absolute pointer-events-none"
          style={{ left: 0, top: 0, width: '9999px', height: '9999px', overflow: 'visible' }}
        >
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="synapse-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {drawConnections()}
          {drawSynapses()}

          {/* Live connecting preview line */}
          {connectingLine && (
            <line
              x1={connectingLine.x1} y1={connectingLine.y1}
              x2={connectingLine.x2} y2={connectingLine.y2}
              stroke="#8b5cf6" strokeWidth="2" strokeDasharray="6 4"
              opacity="0.7" filter="url(#glow)"
            />
          )}
        </svg>

        {/* Ideas */}
        {ideas.map(idea => (
          <IdeaBalloon
            key={idea.id}
            idea={idea}
            categories={categories}
            onUpdatePosition={onUpdatePosition}
            onUpdateCategory={onUpdateCategory}
            onToggleCentral={onToggleCentral}
            onUpdateScale={onUpdateScale}
            onDelete={onDeleteIdea}
            isConnecting={connectingFrom === idea.id}
            connectingFromAny={connectingFrom !== null}
            onStartConnecting={onStartConnecting}
            onFinishConnecting={onFinishConnecting}
            onAiAction={onAiAction}
            isAiProcessing={aiProcessingId === idea.id}
            balloonW={BALLOON_W}
          />
        ))}
      </div>

      {/* Empty state */}
      {ideas.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-7xl mb-5 select-none" style={{ filter: 'drop-shadow(0 0 24px rgba(139,92,246,0.4))' }}>🧠</div>
            <h2 className="text-lg font-semibold mb-1.5" style={{ color: '#94a3b8' }}>
              Workspace em branco
            </h2>
            <p className="text-sm" style={{ color: '#475569' }}>
              Digite uma ideia abaixo e pressione Enter
            </p>
          </div>
        </div>
      )}

      {/* Connecting hint overlay */}
      {connectingFrom && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium pointer-events-none"
          style={{
            background: 'rgba(139,92,246,0.15)',
            border: '1px solid rgba(139,92,246,0.4)',
            color: '#c4b5fd',
            backdropFilter: 'blur(12px)'
          }}
        >
          <span className="animate-pulse text-purple-400">●</span>
          Clique em outro balão para conectar · ESC para cancelar
        </div>
      )}
    </div>
  );
}
