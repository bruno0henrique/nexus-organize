import { useRef, useEffect } from 'react';
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
  onStartConnecting: (id: string) => void;
  onFinishConnecting: (id: string) => void;
  zoom: number;
  connectionFlash: { from: string; to: string } | null;
}

export function BrainstormBoard({
  ideas,
  categories,
  onUpdatePosition,
  onUpdateCategory,
  onDeleteIdea,
  onToggleCentral,
  onUpdateScale,
  connectingFrom,
  onStartConnecting,
  onFinishConnecting,
  zoom,
  connectionFlash
}: BrainstormBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || '#6b7280';
  };

  const drawConnections = () => {
    const connections: JSX.Element[] = [];

    ideas.forEach(idea => {
      idea.connections.forEach(connectedId => {
        const connectedIdea = ideas.find(i => i.id === connectedId);
        if (!connectedIdea) return;

        const key = `${idea.id}-${connectedId}`;
        const color = getCategoryColor(idea.category);

        // Calculate center points with scale
        const balloonWidth = 200 * (idea.scale || 1);
        const balloonHeight = 80 * (idea.scale || 1);
        const connectedBalloonWidth = 200 * (connectedIdea.scale || 1);
        const connectedBalloonHeight = 80 * (connectedIdea.scale || 1);

        const x1 = idea.position.x + balloonWidth / 2;
        const y1 = idea.position.y + balloonHeight / 2;
        const x2 = connectedIdea.position.x + connectedBalloonWidth / 2;
        const y2 = connectedIdea.position.y + connectedBalloonHeight / 2;

        // Calculate control points for smooth curve (neural-like)
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const curvature = distance * 0.3;

        // Perpendicular offset for organic curve
        const cx1 = x1 + dx * 0.3 + dy * curvature / distance;
        const cy1 = y1 + dy * 0.3 - dx * curvature / distance;
        const cx2 = x1 + dx * 0.7 - dy * curvature / distance;
        const cy2 = y1 + dy * 0.7 + dx * curvature / distance;

        const path = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

        // Check if this connection is flashing
        const isFlashing = connectionFlash?.from === idea.id && connectionFlash?.to === connectedId;

        connections.push(
          <g key={key}>
            {/* Glow effect */}
            <path
              d={path}
              stroke={color}
              strokeWidth="6"
              fill="none"
              opacity="0.2"
              filter="url(#glow)"
            />
            {/* Main path */}
            <path
              d={path}
              stroke={color}
              strokeWidth="2"
              fill="none"
              opacity={isFlashing ? "1" : "0.6"}
              strokeDasharray={isFlashing ? "0" : "8,4"}
              className={isFlashing ? "animate-pulse" : ""}
            />
            {/* Flash effect */}
            {isFlashing && (
              <circle
                cx={(x1 + x2) / 2}
                cy={(y1 + y2) / 2}
                r="8"
                fill={color}
                opacity="0.8"
                className="animate-ping"
              />
            )}
          </g>
        );
      });
    });

    return connections;
  };

  // Wheel zoom handler
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        onUpdatePosition('zoom', { x: Math.max(0.5, Math.min(2, zoom + delta)), y: 0 });
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [zoom, onUpdatePosition]);

  return (
    <div ref={containerRef} className="relative size-full overflow-auto bg-slate-950">
      {/* Neural Grid Background */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          radial-gradient(circle, #1e293b 1px, transparent 1px),
          linear-gradient(to right, #0f172a 1px, transparent 1px),
          linear-gradient(to bottom, #0f172a 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px, 50px 50px, 50px 50px',
        backgroundPosition: '0 0, 0 0, 0 0'
      }} />

      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-radial from-purple-900/10 via-transparent to-transparent" />

      {/* Quadrant Labels */}
      <div className="absolute top-4 left-4 text-sm font-semibold text-slate-600">
        Alto Impacto / Baixa Urgência
      </div>
      <div className="absolute top-4 right-4 text-sm font-semibold text-slate-600">
        Alto Impacto / Alta Urgência
      </div>
      <div className="absolute bottom-4 left-4 text-sm font-semibold text-slate-600">
        Baixo Impacto / Baixa Urgência
      </div>
      <div className="absolute bottom-4 right-4 text-sm font-semibold text-slate-600">
        Baixo Impacto / Alta Urgência
      </div>

      {/* Connections SVG Layer */}
      <svg
        ref={svgRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${zoom})`,
          transformOrigin: 'center center'
        }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {drawConnections()}
      </svg>

      {/* Ideas Layer */}
      <div
        className="relative size-full"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease-out'
        }}
      >
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
            onStartConnecting={onStartConnecting}
            onFinishConnecting={onFinishConnecting}
          />
        ))}
      </div>

      {/* Empty State */}
      {ideas.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🧠</div>
            <h2 className="text-xl font-semibold text-slate-300 mb-2">
              Comece seu brainstorm neural
            </h2>
            <p className="text-slate-500">
              Adicione ideias no campo abaixo para começar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
