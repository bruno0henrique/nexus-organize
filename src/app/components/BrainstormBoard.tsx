import { useRef, useEffect, useState } from 'react';
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
  onAiAction: (ideaId: string, action: string) => void;
  aiProcessingId: string | null;
}

// Track which connections have already been animated so the synapse fires only once
let animatedConnections = new Set<string>();

export function resetAnimatedConnections() {
  animatedConnections = new Set<string>();
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
  connectionFlash,
  onAiAction,
  aiProcessingId
}: BrainstormBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [synapseAnimations, setSynapseAnimations] = useState<
    Array<{ id: string; pathD: string; color: string; startTime: number }>
  >([]);

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || '#6b7280';
  };

  // Fire synapse animation when a new connection flash happens
  useEffect(() => {
    if (!connectionFlash) return;

    const fromIdea = ideas.find(i => i.id === connectionFlash.from);
    const toIdea = ideas.find(i => i.id === connectionFlash.to);
    if (!fromIdea || !toIdea) return;

    const connKey = `${connectionFlash.from}-${connectionFlash.to}`;
    if (animatedConnections.has(connKey)) return;
    animatedConnections.add(connKey);

    const color = getCategoryColor(fromIdea.category);

    const balloonWidth = 200 * (fromIdea.scale || 1);
    const balloonHeight = 80 * (fromIdea.scale || 1);
    const connectedBalloonWidth = 200 * (toIdea.scale || 1);
    const connectedBalloonHeight = 80 * (toIdea.scale || 1);

    const x1 = fromIdea.position.x + balloonWidth / 2;
    const y1 = fromIdea.position.y + balloonHeight / 2;
    const x2 = toIdea.position.x + connectedBalloonWidth / 2;
    const y2 = toIdea.position.y + connectedBalloonHeight / 2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const curvature = distance * 0.3;

    const cx1 = x1 + dx * 0.3 + (dy * curvature) / distance;
    const cy1 = y1 + dy * 0.3 - (dx * curvature) / distance;
    const cx2 = x1 + dx * 0.7 - (dy * curvature) / distance;
    const cy2 = y1 + dy * 0.7 + (dx * curvature) / distance;

    const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

    const animId = `synapse-${Date.now()}-${Math.random()}`;
    setSynapseAnimations(prev => [
      ...prev,
      { id: animId, pathD, color, startTime: Date.now() }
    ]);

    // Remove after animation completes
    setTimeout(() => {
      setSynapseAnimations(prev => prev.filter(a => a.id !== animId));
    }, 1800);
  }, [connectionFlash]);

  const drawConnections = () => {
    const connections: JSX.Element[] = [];
    const uniqueAnimId = Date.now();

    ideas.forEach(idea => {
      idea.connections.forEach((connectedId, connIdx) => {
        const connectedIdea = ideas.find(i => i.id === connectedId);
        if (!connectedIdea) return;

        const key = `${idea.id}-${connectedId}`;
        const color = getCategoryColor(idea.category);
        const gradientId = `gradient-${idea.id}-${connectedId}-${uniqueAnimId}`;
        const flowId = `flow-${idea.id}-${connectedId}`;

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
        const cx1 = x1 + dx * 0.3 + (dy * curvature) / distance;
        const cy1 = y1 + dy * 0.3 - (dx * curvature) / distance;
        const cx2 = x1 + dx * 0.7 - (dy * curvature) / distance;
        const cy2 = y1 + dy * 0.7 + (dx * curvature) / distance;

        const path = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

        // Check if this connection is flashing (newly created)
        const isFlashing =
          connectionFlash?.from === idea.id &&
          connectionFlash?.to === connectedId;

        // Stagger the ambient pulse so connections don't all pulse in sync
        const animDelay = (connIdx * 1.7 + ideas.indexOf(idea) * 0.9) % 5;

        connections.push(
          <g key={key}>
            {/* Ambient glow layer */}
            <path
              d={path}
              stroke={color}
              strokeWidth="8"
              fill="none"
              opacity="0.08"
              filter="url(#glow)"
            />

            {/* Main connection line */}
            <path
              d={path}
              stroke={color}
              strokeWidth={isFlashing ? '3' : '2'}
              fill="none"
              opacity={isFlashing ? '0.9' : '0.45'}
              strokeLinecap="round"
            />

            {/* Animated flowing particle - always running subtle pulse along path */}
            <circle r="3" fill={color} opacity="0.7">
              <animateMotion
                dur={`${3 + animDelay * 0.5}s`}
                repeatCount="indefinite"
                path={path}
                begin={`${animDelay}s`}
              />
              <animate
                attributeName="opacity"
                values="0.2;0.8;0.2"
                dur={`${3 + animDelay * 0.5}s`}
                repeatCount="indefinite"
                begin={`${animDelay}s`}
              />
              <animate
                attributeName="r"
                values="2;4;2"
                dur={`${3 + animDelay * 0.5}s`}
                repeatCount="indefinite"
                begin={`${animDelay}s`}
              />
            </circle>

            {/* Second smaller particle with offset for depth */}
            <circle r="2" fill="white" opacity="0.3">
              <animateMotion
                dur={`${4 + animDelay * 0.3}s`}
                repeatCount="indefinite"
                path={path}
                begin={`${animDelay + 1.5}s`}
              />
              <animate
                attributeName="opacity"
                values="0.1;0.5;0.1"
                dur={`${4 + animDelay * 0.3}s`}
                repeatCount="indefinite"
                begin={`${animDelay + 1.5}s`}
              />
            </circle>

            {/* Node endpoints glow */}
            <circle
              cx={x1}
              cy={y1}
              r="4"
              fill={color}
              opacity="0.3"
            >
              <animate
                attributeName="opacity"
                values="0.15;0.4;0.15"
                dur="3s"
                repeatCount="indefinite"
                begin={`${animDelay}s`}
              />
            </circle>
            <circle
              cx={x2}
              cy={y2}
              r="4"
              fill={color}
              opacity="0.3"
            >
              <animate
                attributeName="opacity"
                values="0.15;0.4;0.15"
                dur="3s"
                repeatCount="indefinite"
                begin={`${animDelay + 1.5}s`}
              />
            </circle>
          </g>
        );
      });
    });

    return connections;
  };

  // Draw burst synapse animations (fired on new connections)
  const drawSynapseAnimations = () => {
    return synapseAnimations.map(anim => {
      const elapsed = Date.now() - anim.startTime;
      return (
        <g key={anim.id}>
          {/* Bright leading particle */}
          <circle r="6" fill="white" opacity="0.95" filter="url(#synapse-glow)">
            <animateMotion
              dur="0.8s"
              repeatCount="1"
              fill="freeze"
              path={anim.pathD}
            />
            <animate
              attributeName="r"
              values="3;8;4"
              dur="0.8s"
              repeatCount="1"
              fill="freeze"
            />
            <animate
              attributeName="opacity"
              values="1;0.9;0"
              dur="0.8s"
              repeatCount="1"
              fill="freeze"
            />
          </circle>

          {/* Colored core particle */}
          <circle r="4" fill={anim.color} opacity="1" filter="url(#synapse-glow)">
            <animateMotion
              dur="0.8s"
              repeatCount="1"
              fill="freeze"
              path={anim.pathD}
            />
            <animate
              attributeName="opacity"
              values="1;0.8;0"
              dur="0.8s"
              repeatCount="1"
              fill="freeze"
            />
          </circle>

          {/* Trailing comet tail - slightly delayed */}
          <circle r="3" fill={anim.color} opacity="0.6">
            <animateMotion
              dur="0.95s"
              repeatCount="1"
              fill="freeze"
              path={anim.pathD}
              begin="0.08s"
            />
            <animate
              attributeName="opacity"
              values="0.6;0.3;0"
              dur="0.95s"
              repeatCount="1"
              fill="freeze"
            />
            <animate
              attributeName="r"
              values="3;5;2"
              dur="0.95s"
              repeatCount="1"
              fill="freeze"
            />
          </circle>

          {/* Second trail */}
          <circle r="2" fill={anim.color} opacity="0.3">
            <animateMotion
              dur="1.1s"
              repeatCount="1"
              fill="freeze"
              path={anim.pathD}
              begin="0.15s"
            />
            <animate
              attributeName="opacity"
              values="0.4;0.15;0"
              dur="1.1s"
              repeatCount="1"
              fill="freeze"
            />
          </circle>

          {/* Flash the entire connection path */}
          <path
            d={anim.pathD}
            stroke={anim.color}
            strokeWidth="4"
            fill="none"
            filter="url(#synapse-glow)"
          >
            <animate
              attributeName="opacity"
              values="0;0.8;0.6;0"
              dur="1.2s"
              repeatCount="1"
              fill="freeze"
            />
            <animate
              attributeName="stroke-width"
              values="2;6;2"
              dur="1.2s"
              repeatCount="1"
              fill="freeze"
            />
          </path>

          {/* White flash overlay */}
          <path
            d={anim.pathD}
            stroke="white"
            strokeWidth="2"
            fill="none"
          >
            <animate
              attributeName="opacity"
              values="0;0.5;0"
              dur="0.6s"
              repeatCount="1"
              fill="freeze"
            />
          </path>
        </g>
      );
    });
  };

  // Wheel zoom handler
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        onUpdatePosition('zoom', {
          x: Math.max(0.5, Math.min(2, zoom + delta)),
          y: 0
        });
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
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle, #1e293b 1px, transparent 1px),
            linear-gradient(to right, #0f172a 1px, transparent 1px),
            linear-gradient(to bottom, #0f172a 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px, 50px 50px, 50px 50px',
          backgroundPosition: '0 0, 0 0, 0 0'
        }}
      />

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
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="synapse-glow">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {drawConnections()}
        {drawSynapseAnimations()}
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
            onAiAction={onAiAction}
            isAiProcessing={aiProcessingId === idea.id}
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
