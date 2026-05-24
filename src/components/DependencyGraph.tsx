import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./DependencyGraph.module.css";

type NodeType = "skill" | "project" | "meta";

interface RawNode {
  id: string;
  type: NodeType;
}

interface SimNode extends RawNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  fx?: number;
  fy?: number;
}

interface Edge {
  s: string;
  t: string;
}

const NODES: RawNode[] = [
  { id: "react", type: "skill" },
  { id: "typescript", type: "skill" },
  { id: "module-federation", type: "skill" },
  { id: "node", type: "skill" },
  { id: "system-design", type: "skill" },
  { id: "design-systems", type: "skill" },
  { id: "growalfred", type: "project" },
  { id: "bundle-reduction", type: "project" },
  { id: "smart-suggest", type: "project" },
  { id: "report-builder", type: "project" },
  { id: "inbox-labels", type: "project" },
  { id: "component-library", type: "project" },
  { id: "growfin", type: "meta" },
  { id: "years-coding", type: "meta" },
];

const EDGES: Edge[] = [
  { s: "react", t: "typescript" },
  { s: "typescript", t: "module-federation" },
  { s: "react", t: "component-library" },
  { s: "design-systems", t: "component-library" },
  { s: "typescript", t: "component-library" },
  { s: "node", t: "growalfred" },
  { s: "typescript", t: "growalfred" },
  { s: "system-design", t: "growalfred" },
  { s: "react", t: "smart-suggest" },
  { s: "typescript", t: "smart-suggest" },
  { s: "react", t: "report-builder" },
  { s: "typescript", t: "report-builder" },
  { s: "node", t: "inbox-labels" },
  { s: "system-design", t: "inbox-labels" },
  { s: "module-federation", t: "bundle-reduction" },
  { s: "react", t: "bundle-reduction" },
  { s: "growfin", t: "smart-suggest" },
  { s: "growfin", t: "report-builder" },
  { s: "growfin", t: "inbox-labels" },
  { s: "growfin", t: "bundle-reduction" },
  { s: "growfin", t: "module-federation" },
  { s: "years-coding", t: "growfin" },
];

const W = 800;
const H = 500;
const RADIUS: Record<NodeType, number> = {
  skill: 14,
  project: 22,
  meta: 16,
};

function initNodes(): SimNode[] {
  return NODES.map((n, i) => {
    const angle = (i / NODES.length) * Math.PI * 2;
    const ring = n.type === "project" ? 140 : n.type === "skill" ? 220 : 90;
    return {
      ...n,
      x: W / 2 + Math.cos(angle) * ring,
      y: H / 2 + Math.sin(angle) * ring,
      vx: 0,
      vy: 0,
      r: RADIUS[n.type],
    };
  });
}

function step(nodes: SimNode[], edges: Edge[]) {
  const cx = W / 2;
  const cy = H / 2;
  const REPEL = 4500;
  const SPRING = 0.012;
  const REST = 95;
  const CENTER = 0.004;
  const DAMP = 0.82;

  const byId = new Map(nodes.map((n) => [n.id, n]));

  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    if (a.fx !== undefined && a.fy !== undefined) {
      a.x = a.fx;
      a.y = a.fy;
      a.vx = 0;
      a.vy = 0;
      continue;
    }
    let fx = 0;
    let fy = 0;

    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const b = nodes[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d2 = dx * dx + dy * dy + 0.1;
      const d = Math.sqrt(d2);
      const f = REPEL / d2;
      fx += (dx / d) * f;
      fy += (dy / d) * f;
    }

    fx += (cx - a.x) * CENTER;
    fy += (cy - a.y) * CENTER;

    a.vx = (a.vx + fx) * DAMP;
    a.vy = (a.vy + fy) * DAMP;
  }

  for (const e of edges) {
    const a = byId.get(e.s);
    const b = byId.get(e.t);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
    const f = (d - REST) * SPRING;
    const ux = dx / d;
    const uy = dy / d;
    if (a.fx === undefined) {
      a.vx += ux * f;
      a.vy += uy * f;
    }
    if (b.fx === undefined) {
      b.vx -= ux * f;
      b.vy -= uy * f;
    }
  }

  for (const n of nodes) {
    if (n.fx !== undefined) continue;
    n.x += n.vx;
    n.y += n.vy;
    n.x = Math.max(n.r + 12, Math.min(W - n.r - 12, n.x));
    // leave room below for the label (about r + 18 of vertical space)
    n.y = Math.max(n.r + 12, Math.min(H - n.r - 26, n.y));
  }
}

export default function DependencyGraph() {
  const [nodes, setNodes] = useState<SimNode[]>(() => {
    const init = initNodes();
    for (let i = 0; i < 240; i++) step(init, EDGES);
    return init;
  });
  const [hovered, setHovered] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const reducedMotion = useRef(
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const n of NODES) map.set(n.id, new Set());
    for (const e of EDGES) {
      map.get(e.s)?.add(e.t);
      map.get(e.t)?.add(e.s);
    }
    return map;
  }, []);

  useEffect(() => {
    if (!dragging || reducedMotion.current) return;
    const loop = () => {
      setNodes((prev) => {
        const next = prev.map((n) => ({ ...n }));
        for (let i = 0; i < 3; i++) step(next, EDGES);
        return next;
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [dragging]);

  const toSvgCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * W,
      y: ((clientY - rect.top) / rect.height) * H,
    };
  };

  const onPointerDown = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(id);
    const { x, y } = toSvgCoords(e.clientX, e.clientY);
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, fx: x, fy: y } : n))
    );
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const { x, y } = toSvgCoords(e.clientX, e.clientY);
    setNodes((prev) =>
      prev.map((n) => (n.id === dragging ? { ...n, fx: x, fy: y } : n))
    );
  };

  const onPointerUp = () => {
    if (!dragging) return;
    setNodes((prev) =>
      prev.map((n) =>
        n.id === dragging ? { ...n, fx: undefined, fy: undefined } : n
      )
    );
    setDragging(null);
  };

  const isRelated = (id: string) =>
    hovered ? hovered === id || neighbors.get(hovered)?.has(id) : true;

  const isEdgeActive = (e: Edge) =>
    hovered ? e.s === hovered || e.t === hovered : false;

  return (
    <div className={styles.wrap}>
      <svg
        ref={svgRef}
        className={styles.canvas}
        viewBox={`0 0 ${W} ${H}`}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          setHovered(null);
          onPointerUp();
        }}
        role="img"
        aria-label="dependency graph of skills, projects, and context"
      >
        <g>
          {EDGES.map((e, i) => {
            const a = nodes.find((n) => n.id === e.s);
            const b = nodes.find((n) => n.id === e.t);
            if (!a || !b) return null;
            const active = isEdgeActive(e);
            const dim = hovered && !active;
            return (
              <line
                key={i}
                className={`${styles.edge} ${active ? styles.edgeActive : ""} ${
                  dim ? styles.edgeDim : ""
                }`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
              />
            );
          })}
        </g>

        <g>
          {nodes.map((n) => {
            const active = hovered === n.id;
            const dim = hovered && !isRelated(n.id);
            return (
              <g
                key={n.id}
                className={`${styles.node} ${styles[n.type]} ${
                  active ? styles.active : ""
                } ${dim ? styles.nodeDim : ""}`}
                transform={`translate(${n.x} ${n.y})`}
                onPointerEnter={() => setHovered(n.id)}
                onPointerLeave={() => setHovered(null)}
                onPointerDown={onPointerDown(n.id)}
              >
                <circle className={styles.nodeCircle} r={n.r} />
                <text className={styles.label} y={n.r + 16}>
                  {n.id}
                  <tspan className={styles.labelExt}>.ts</tspan>
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className={styles.legend}>
        <span className={`${styles.legendItem} ${styles.skill}`}>
          <span className={styles.legendDot} /> skill
        </span>
        <span className={`${styles.legendItem} ${styles.project}`}>
          <span className={styles.legendDot} /> project
        </span>
        <span className={`${styles.legendItem} ${styles.meta}`}>
          <span className={styles.legendDot} /> meta
        </span>
      </div>

      <div className={styles.hint}>
        hover · <kbd>drag</kbd> to pull
      </div>
    </div>
  );
}
