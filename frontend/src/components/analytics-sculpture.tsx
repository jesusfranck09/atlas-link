'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { BufferGeometry, Material, Mesh, MeshPhysicalMaterial, Texture, WebGLRenderer, WebGLRenderTarget } from 'three';
import s from './analytics-sculpture.module.css';

export type SculptureValue = { label: string; value: number; color: string };
export type AnalyticsSculptureProps = {
  values: SculptureValue[];
  variant?: 'ring' | 'pie' | 'bars';
  compact?: boolean;
  /** Dashboard density; independent of the landing's existing compact framing. */
  density?: 'regular' | 'compact';
  /** Opt-in optical finish; standard keeps existing public-page art direction. */
  finish?: 'standard' | 'glass';
  minimal?: boolean;
  caption?: string;
};

type Runtime = { select: (index: number) => void };
type Piece = { mesh: Mesh<BufferGeometry, MeshPhysicalMaterial>; index: number; x: number; y: number; z: number; angle: number };

const number = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 6 });
const percentage = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });
const shortNumber = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 });
const palette = ['#7358ca', '#a895e1', '#d4c9ef'];
const positive = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
const printable = (value: number) => Number.isFinite(value) ? number.format(value) : '—';
const colorFor = (color: string, index: number) => /^#[0-9a-f]{6}$/i.test(color) ? color : palette[index % palette.length];

/** An SVG is present before JavaScript, during loading, and after graphics failure. */
function SculptureFallback({ values, variant, selected, id, glass }: { values: SculptureValue[]; variant: NonNullable<AnalyticsSculptureProps['variant']>; selected: number; id: string; glass: boolean }) {
  const total = values.reduce((sum, item) => sum + positive(item.value), 0);
  const max = Math.max(...values.map(item => positive(item.value)), 0) || 1;
  const sectors = values.flatMap((item, index) => {
    if (!positive(item.value) || !total) return [];
    const span = positive(item.value) / total * Math.PI * 2;
    const start = -.65 + values.slice(0, index).reduce((sum, value) => sum + positive(value.value), 0) / total * Math.PI * 2;
    const angle = start + span / 2;
    const r = 157;
    const arc = (a: number) => `${Math.cos(a) * r} ${Math.sin(a) * r}`;
    // Two arcs also describe a single-category, complete disk without SVG's
    // coincident start/end-point ambiguity. Whole disks keep a continuous rim;
    // partial sectors close at the origin.
    const fullCircle = span >= Math.PI * 2 - 1e-8;
    const path = `${fullCircle ? 'M' : 'M0 0L'}${arc(start)}A${r} ${r} 0 0 1 ${arc(angle)}A${r} ${r} 0 0 1 ${arc(start + span)}Z`;
    const separation = index === selected ? 16 : 3;
    return [{ index, path, x: Math.cos(angle) * separation, y: Math.sin(angle) * separation - (index === selected ? 8 : 0), color: colorFor(item.color, index) }];
  });
  return <svg className={s.fallbackSvg} viewBox="0 0 560 340" aria-hidden="true">
    <defs>
      <radialGradient id={`${id}-shadow`}><stop stopColor="#4d416c" stopOpacity=".17"/><stop offset="1" stopColor="#4d416c" stopOpacity="0"/></radialGradient>
      <linearGradient id={`${id}-glass-sheen`} x1="0" y1="0" x2=".75" y2="1"><stop stopColor="#ffffff" stopOpacity=".7"/><stop offset=".35" stopColor="#ffffff" stopOpacity=".06"/><stop offset=".6" stopColor="#ffffff" stopOpacity=".36"/><stop offset="1" stopColor="#ffffff" stopOpacity="0"/></linearGradient>
      {values.map((item, index) => <linearGradient id={`${id}-color-${index}`} key={index} x1="0" y1="0" x2=".7" y2="1"><stop stopColor={colorFor(item.color, index)} stopOpacity={glass ? '.38' : '.62'}/><stop offset={glass ? '.28' : '.5'} stopColor={colorFor(item.color, index)} stopOpacity={glass ? '.84' : '1'}/>{glass && <stop offset=".64" stopColor={colorFor(item.color, index)} stopOpacity=".56"/>}<stop offset="1" stopColor={colorFor(item.color, index)}/></linearGradient>)}
    </defs>
    <ellipse cx="280" cy="276" rx="208" ry="36" fill={`url(#${id}-shadow)`}/>
    {variant === 'ring' ? <g transform="translate(280 158) scale(1 .66)">
      <circle cy="34" r="116" fill="none" stroke="#dad7e5" strokeWidth="59"/>
      {!total && <circle r="116" fill="none" stroke="#e7e4ef" strokeWidth="59"/>}
      {values.map((item, index) => {
        const fraction = total ? positive(item.value) / total : 0;
        const start = total ? values.slice(0, index).reduce((sum, item) => sum + positive(item.value), 0) / total : 0;
        const length = Math.PI * 232 * fraction;
        return fraction ? <g key={index} transform={index === selected ? 'translate(0 -8)' : undefined}>
          <circle cy="25" r="116" fill="none" stroke={colorFor(item.color, index)} strokeWidth="59" strokeDasharray={`${Math.max(.01, length - Math.min(5, length * .14))} ${Math.PI * 232}`} strokeDashoffset={-start * Math.PI * 232} transform="rotate(-35)"/>
          <circle r="116" fill="none" stroke={`url(#${id}-color-${index})`} strokeWidth="59" strokeDasharray={`${Math.max(.01, length - Math.min(5, length * .14))} ${Math.PI * 232}`} strokeDashoffset={-start * Math.PI * 232} transform="rotate(-35)"/>
        </g> : null;
      })}
    </g> : variant === 'pie' ? <g transform="translate(280 153) scale(1 .67)">
      {!total && <ellipse cy="18" rx="157" ry="157" fill="#e8e3f1"/>}
      {sectors.map(sector => <g key={`edge-${sector.index}`} transform={`translate(${sector.x} ${sector.y + 33})`}><path d={sector.path} fill={sector.color}/><path d={sector.path} fill="#34244e" opacity={glass ? '.12' : '.2'}/>{glass && <path d={sector.path} fill="none" stroke="#ffffff" strokeOpacity=".65" strokeWidth="1.2"/>}</g>)}
      {sectors.map(sector => <g key={`face-${sector.index}`} transform={`translate(${sector.x} ${sector.y})`}><path d={sector.path} fill={`url(#${id}-color-${sector.index})`} stroke="#ffffff" strokeOpacity={glass ? '.9' : '.55'} strokeWidth={glass ? '1.8' : '1.1'} strokeLinejoin="round"/>{glass && <path d={sector.path} fill={`url(#${id}-glass-sheen)`}/>}</g>)}
    </g> : <g>
      {[0, 1, 2, 3].map(tick => <path key={tick} d={`M80 ${254 - tick * 60}H480`} stroke="#e8e5f0" strokeDasharray="3 7"/>)}
      {values.map((item, index) => {
        const cell = 360 / Math.max(values.length, 1);
        const x = 100 + index * cell;
        const width = Math.min(64, cell * .58);
        const height = positive(item.value) / max * 190;
        return height > 0 ? <g key={index} transform={index === selected ? 'translate(0 -5)' : undefined}>
          <path d={`M${x + width} ${250 - height}l22 -13v${height}l-22 13Z`} fill={colorFor(item.color, index)}/>
          <path d={`M${x} ${250 - height}l22 -13h${width}l-22 13Z`} fill={colorFor(item.color, index)} fillOpacity=".55"/>
          <rect x={x} y={250 - height} width={width} height={height} rx="5" fill={`url(#${id}-color-${index})`}/>
          {glass && <rect x={x} y={250 - height} width={width} height={height} rx="5" fill={`url(#${id}-glass-sheen)`} stroke="#ffffff" strokeOpacity=".8"/>}
        </g> : null;
      })}
    </g>}
  </svg>;
}

/**
 * Presentation-only geometry. Values remain owned by the caller; selection never
 * writes business state. Three.js and its procedural studio load on intersection.
 */
export function AnalyticsSculpture({ values, variant = 'ring', compact = false, density = 'regular', finish = 'standard', minimal = false, caption }: AnalyticsSculptureProps) {
  const glass = finish === 'glass';
  const id = useId().replace(/:/g, '');
  const host = useRef<HTMLDivElement>(null);
  const center = useRef<HTMLDivElement>(null);
  const runtime = useRef<Runtime | null>(null);
  const selection = useRef(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [selected, setSelected] = useState(0);
  const [rendererState, setRendererState] = useState<'loading' | 'webgl' | 'fallback'>('loading');
  const active = Math.min(selected, Math.max(0, values.length - 1));
  const item = values[active];
  const total = values.reduce((sum, value) => sum + positive(value.value), 0);
  const hasNegatives = values.some(value => value.value < 0);
  // A caller may construct a fresh array on every render. Rebuild only for data changes.
  const dataKey = JSON.stringify(values.map((value, index) => ({ ...value, value: positive(value.value), color: colorFor(value.color, index) })));

  useEffect(() => {
    selection.current = active;
    runtime.current?.select(active);
  }, [active]);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    const data: SculptureValue[] = JSON.parse(dataKey);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let initializing = false;
    let visible = false;
    let frame = 0;
    let release: (() => void) | undefined;
    let invalidate: (() => void) | undefined;
    let observer: IntersectionObserver | undefined;

    async function initialize() {
      if (initializing || disposed) return;
      initializing = true;
      let renderer: WebGLRenderer | undefined;
      let environment: WebGLRenderTarget | undefined;
      const geometries = new Set<BufferGeometry>();
      const materials = new Set<Material>();
      const textures = new Set<Texture>();
      try {
        const [THREE, { RoomEnvironment }, { mergeVertices }] = await Promise.all([import('three'), import('three/addons/environments/RoomEnvironment.js'), import('three/addons/utils/BufferGeometryUtils.js')]);
        if (disposed) return;
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
        const engine = renderer;
        engine.setClearColor(0xffffff, 0);
        engine.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        // Three's single shared transmission buffer is half resolution. There
        // is no postprocessing chain or per-segment background capture.
        if (glass) engine.transmissionResolutionScale = .5;
        engine.outputColorSpace = THREE.SRGBColorSpace;
        engine.toneMapping = THREE.NeutralToneMapping;
        engine.toneMappingExposure = glass ? .92 : .86;
        engine.shadowMap.enabled = true;
        engine.shadowMap.type = THREE.PCFShadowMap;
        const canvas = engine.domElement;
        canvas.setAttribute('aria-hidden', 'true');
        canvas.className = s.canvas;
        container!.appendChild(canvas);
        container!.dataset.motion = motion.matches ? 'reduced' : 'full';

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, .1, 80);
        const circular = variant !== 'bars';
        camera.position.set(circular ? 4.5 : 5.2, circular ? 7.6 : 4.8, 10);
        camera.lookAt(0, circular ? .25 : 1.15, 0);
        function buildEnvironment() {
          environment?.dispose();
          const studio = new RoomEnvironment();
          if (variant === 'pie' || glass) {
            // Procedural softboxes baked at initialization/context recovery.
            // No downloaded HDR, second renderer or idle loop.
            for (const [x, y, z, width, height, intensity] of (glass ? [[-3, 7, -5, 5.5, 1.1, 8], [5, 6, -4, .85, 5.5, 7], [0, 5, -7, 6, 1.2, 4]] : [[-4, 8, 3, 5, 2, 5], [5, 6, -4, 1, 5, 3]])) {
              const softbox = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(intensity), side: THREE.DoubleSide }));
              softbox.position.set(x, y, z);
              softbox.lookAt(0, 0, 0);
              studio.add(softbox);
            }
          }
          const pmrem = new THREE.PMREMGenerator(engine);
          try { environment = pmrem.fromScene(studio, glass ? .015 : .035); scene.environment = environment.texture; }
          finally { studio.dispose(); pmrem.dispose(); }
        }
        buildEnvironment();
        scene.environmentIntensity = glass ? 1.15 : .85;
        scene.add(new THREE.HemisphereLight(0xf5f1ff, 0xdcdce9, .4));
        const key = new THREE.DirectionalLight(0xfffaf5, glass ? 1.05 : 1.6);
        key.position.set(-3, 8, 5);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = -5;
        key.shadow.camera.right = 5;
        key.shadow.camera.top = 5;
        key.shadow.camera.bottom = -5;
        key.shadow.normalBias = .025;
        key.shadow.bias = -.0004;
        key.shadow.radius = 4;
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xe8ebff, 1.1);
        rim.position.set(4, 5, -6);
        scene.add(rim);

        const chart = new THREE.Group();
        scene.add(chart);
        const pieces: Piece[] = [];
        const positiveTotal = data.reduce((sum, value) => sum + value.value, 0);
        const maximum = Math.max(...data.map(value => value.value), 0) || 1;

        const rememberGeometry = <T extends BufferGeometry,>(geometry: T): T => { geometries.add(geometry); return geometry; };
        const rememberMaterial = <T extends Material,>(material: T): T => { materials.add(material); return material; };
        const surface = (color: string) => {
          const material = rememberMaterial(new THREE.MeshPhysicalMaterial(glass ? {
            color, metalness: .015, roughness: .1, clearcoat: 1, clearcoatRoughness: .075,
            transmission: .8, thickness: .55, ior: 1.46, attenuationColor: color,
            attenuationDistance: .9, envMapIntensity: 1.15, specularIntensity: 1,
          } : { color, metalness: variant === 'pie' ? .22 : .12, roughness: variant === 'pie' ? .27 : .3, clearcoat: variant === 'pie' ? .85 : .45, clearcoatRoughness: variant === 'pie' ? .18 : .22, envMapIntensity: .95 }));
          if (glass) {
            // A subtle procedural optical normal models the softened upper
            // face of molded glass. Angular shares and silhouettes stay exact;
            // only reflection/refraction directions vary across the cap.
            // Chunks verified against the installed Three r186 implementation.
            material.onBeforeCompile = shader => {
              shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGlassCurve;\nvarying float vGlassCap;');
              shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlassCurve = normalMatrix * vec3(position.x * 0.12, 0.0, position.z * 0.12);\nvGlassCap = smoothstep(0.82, 0.995, normal.y);');
              shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vGlassCurve;\nvarying float vGlassCap;');
              shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(normal + vGlassCurve * vGlassCap);\nnonPerturbedNormal = normal;');
            };
            material.customProgramCacheKey = () => 'atlas-glass-cap-v1';
          }
          return material;
        };

        // Rounded annular sectors retain a flat top and an unmistakable extruded edge.
        let cursor = -.65;
        data.forEach((value, index) => {
          if (value.value <= 0) return;
          let geometry: BufferGeometry;
          let x = 0, y = .095, angle = 0;
          let z = 0;
          if (variant === 'ring') {
            const span = value.value / positiveTotal * Math.PI * 2;
            const gap = Math.min(.028, span * .07);
            const start = cursor + gap;
            const end = cursor + span - gap;
            const shape = new THREE.Shape();
            shape.moveTo(Math.cos(start) * 2, Math.sin(start) * 2);
            shape.absarc(0, 0, 2, start, end, false);
            shape.lineTo(Math.cos(end) * 1.13, Math.sin(end) * 1.13);
            shape.absarc(0, 0, 1.13, end, start, true);
            shape.closePath();
            geometry = new THREE.ExtrudeGeometry(shape, { depth: .43, bevelEnabled: true, bevelSegments: 5, steps: 1, bevelSize: Math.min(.075, span * .12), bevelThickness: .065, curveSegments: 64 });
            geometry.rotateX(-Math.PI / 2);
            angle = cursor + span / 2;
            cursor += span;
          } else if (variant === 'pie') {
            const span = value.value / positiveTotal * Math.PI * 2;
            const shape = new THREE.Shape();
            const fullCircle = span >= Math.PI * 2 - 1e-8;
            if (fullCircle) shape.moveTo(Math.cos(cursor) * 2.05, Math.sin(cursor) * 2.05);
            else {
              shape.moveTo(0, 0);
              shape.lineTo(Math.cos(cursor) * 2.05, Math.sin(cursor) * 2.05);
            }
            shape.absarc(0, 0, 2.05, cursor, cursor + span, false);
            if (!fullCircle) shape.lineTo(0, 0);
            shape.closePath();
            const bevel = Math.min(glass ? .085 : .06, span * .08);
            geometry = new THREE.ExtrudeGeometry(shape, { depth: .47, bevelEnabled: true, bevelSegments: glass ? 7 : 5, steps: 1, bevelSize: bevel, bevelOffset: -bevel, bevelThickness: glass ? .08 : .055, curveSegments: 72 });
            geometry.rotateX(-Math.PI / 2);
            angle = cursor + span / 2;
            // Equal radial separation is a presentation detail; the exact
            // angular share remains value / total, including a one-value pie.
            x = Math.cos(angle) * .035;
            z = -Math.sin(angle) * .035;
            cursor += span;
          } else {
            const step = Math.min(1.18, 4.5 / Math.max(data.length, 1));
            const width = step * .65;
            const height = value.value / maximum * 2.85;
            const bevel = Math.min(.055, height * .18, width * .1);
            const shape = new THREE.Shape();
            shape.moveTo(-width / 2 + bevel, bevel);
            shape.lineTo(width / 2 - bevel, bevel);
            shape.lineTo(width / 2 - bevel, Math.max(bevel, height - bevel));
            shape.lineTo(-width / 2 + bevel, Math.max(bevel, height - bevel));
            shape.closePath();
            geometry = new THREE.ExtrudeGeometry(shape, { depth: .63, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: bevel, bevelThickness: bevel, curveSegments: 4 });
            geometry.translate(0, 0, -.315);
            x = (index - (data.length - 1) / 2) * step;
            y = .08;
          }
          // Untextured geometry can weld coincident vertices across UV seams.
          // Recomputed normals make the bevel continuous instead of faceted.
          geometry.deleteAttribute('uv');
          geometry.deleteAttribute('normal');
          const smoothGeometry = mergeVertices(geometry, .0001);
          smoothGeometry.computeVertexNormals();
          geometry.dispose();
          const mesh = new THREE.Mesh(rememberGeometry(smoothGeometry), surface(value.color));
          mesh.position.set(x, y, z);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData.index = index;
          chart.add(mesh);
          pieces.push({ mesh, index, x, y, z, angle });
        });

        if (circular && !positiveTotal) {
          const mesh = new THREE.Mesh(rememberGeometry(variant === 'ring' ? new THREE.TorusGeometry(1.57, .43, 16, 80) : new THREE.CylinderGeometry(2.05, 2.05, .47, 96)), surface('#e6e1ef'));
          if (variant === 'ring') mesh.rotation.x = Math.PI / 2;
          mesh.position.y = variant === 'pie' ? .33 : .48;
          chart.add(mesh);
        }

        // A transparent receiver preserves the surrounding product surface.
        const floor = new THREE.Mesh(rememberGeometry(new THREE.PlaneGeometry(15, 15)), rememberMaterial(new THREE.ShadowMaterial({ color: 0x716184, opacity: glass ? .075 : .16 })));
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);
        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = shadowCanvas.height = 128;
        const context = shadowCanvas.getContext('2d');
        if (context) {
          const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 62);
          gradient.addColorStop(0, 'rgba(85,67,120,.15)');
          gradient.addColorStop(.55, 'rgba(85,67,120,.065)');
          gradient.addColorStop(1, 'rgba(85,67,120,0)');
          context.fillStyle = gradient;
          context.fillRect(0, 0, 128, 128);
          const texture = new THREE.CanvasTexture(shadowCanvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          textures.add(texture);
          const contact = new THREE.Mesh(rememberGeometry(new THREE.PlaneGeometry(circular ? 5.7 : 6.5, 4.5)), rememberMaterial(new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })));
          contact.rotation.x = -Math.PI / 2;
          contact.position.y = .006;
          scene.add(contact);
        }

        if (variant === 'bars') {
          // Four baseline guides, not invented numerical ticks or trends.
          const guideMaterial = rememberMaterial(new THREE.LineBasicMaterial({ color: 0xe5e2ed, transparent: true, opacity: .85 }));
          for (let tick = 0; tick < 4; tick++) {
            const geometry = rememberGeometry(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.7, .02, .7 - tick * .6), new THREE.Vector3(2.7, .02, .7 - tick * .6)]));
            scene.add(new THREE.Line(geometry, guideMaterial));
          }
        }

        let contextLost = false;
        let failed = false;
        let currentSelection = selection.current;
        let lastTime = 0;
        let targetRotation = 0;
        let hovered = -1;
        let width = 1;
        let height = 1;
        let frames = 0;
        let announcedReady = false;
        const projected = new THREE.Vector3();
        const pointer = new THREE.Vector2();
        const raycaster = new THREE.Raycaster();
        const selectable = pieces.map(piece => piece.mesh);

        function draw(time: number) {
          frame = 0;
          if (disposed || !visible || document.hidden || contextLost || failed) return;
          const dt = Math.min(.05, Math.max(.001, (time - lastTime) / 1000));
          lastTime = time;
          const factor = motion.matches ? 1 : 1 - Math.exp(-18 * dt);
          let unsettled = false;
          for (const piece of pieces) {
            const selectedPiece = piece.index === (hovered >= 0 ? hovered : currentSelection);
            const lift = selectedPiece ? (variant === 'pie' ? .17 : variant === 'ring' ? .15 : .09) : 0;
            const distance = selectedPiece ? (variant === 'pie' ? .18 : variant === 'ring' ? .07 : 0) : 0;
            const desiredX = piece.x + Math.cos(piece.angle) * distance;
            const desiredZ = piece.z - Math.sin(piece.angle) * distance;
            const desiredY = piece.y + lift;
            piece.mesh.position.x += (desiredX - piece.mesh.position.x) * factor;
            piece.mesh.position.y += (desiredY - piece.mesh.position.y) * factor;
            piece.mesh.position.z += (desiredZ - piece.mesh.position.z) * factor;
            if (Math.abs(piece.mesh.position.x - desiredX) + Math.abs(piece.mesh.position.y - desiredY) + Math.abs(piece.mesh.position.z - desiredZ) > .0008) unsettled = true;
          }
          chart.rotation.y += (targetRotation - chart.rotation.y) * factor;
          if (Math.abs(targetRotation - chart.rotation.y) > .0005) unsettled = true;
          try {
            engine.render(scene, camera);
            frames++;
            container!.dataset.frames = String(frames);
            container!.dataset.drawCalls = String(engine.info.render.calls);
            container!.dataset.triangles = String(engine.info.render.triangles);
            container!.dataset.geometries = String(engine.info.memory.geometries);
            container!.dataset.textures = String(engine.info.memory.textures);
            container!.dataset.pixelRatio = String(engine.getPixelRatio());
            container!.dataset.transmissionScale = glass ? String(engine.transmissionResolutionScale) : '0';
            if (center.current && variant === 'ring') {
              projected.set(0, .64, 0).project(camera);
              center.current.style.left = `${(projected.x + 1) / 2 * width}px`;
              center.current.style.top = `${(-projected.y + 1) / 2 * height}px`;
            }
            if (!announcedReady) { announcedReady = true; setRendererState('webgl'); }
          } catch {
            failed = true;
            setRendererState('fallback');
          }
          if (unsettled && !motion.matches && !failed) frame = requestAnimationFrame(draw);
        }

        function requestRender() {
          if (!frame && !disposed && visible && !document.hidden && !contextLost && !failed) frame = requestAnimationFrame(draw);
        }
        invalidate = requestRender;
        function resize() {
          if (disposed) return;
          width = container!.clientWidth;
          height = container!.clientHeight;
          if (width <= 0 || height <= 0) return;
          const aspect = width / height;
          const extent = Math.max(circular ? 3.65 : 4.65, (circular ? 5.05 : 6.2) / aspect);
          camera.left = -extent * aspect / 2;
          camera.right = extent * aspect / 2;
          camera.top = extent / 2;
          camera.bottom = -extent / 2;
          camera.updateProjectionMatrix();
          engine.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
          engine.setSize(width, height, false);
          requestRender();
        }
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container!);

        function hitAt(event: PointerEvent) {
          const rect = canvas.getBoundingClientRect();
          pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
          raycaster.setFromCamera(pointer, camera);
          return raycaster.intersectObjects(selectable, false)[0];
        }
        function choose(event: PointerEvent) {
          const hit = hitAt(event);
          if (hit) setSelected(hit.object.userData.index as number);
        }
        function move(event: PointerEvent) {
          if (motion.matches || event.pointerType !== 'mouse') return;
          const rect = canvas.getBoundingClientRect();
          targetRotation = Math.max(-.065, Math.min(.065, (event.clientX - rect.left) / rect.width * .13 - .065));
          if (variant === 'pie') hovered = (hitAt(event)?.object.userData.index as number | undefined) ?? -1;
          requestRender();
        }
        function resetPointer() { targetRotation = 0; hovered = -1; requestRender(); }
        function updateMotion() { container!.dataset.motion = motion.matches ? 'reduced' : 'full'; targetRotation = 0; hovered = -1; requestRender(); }
        function loseContext(event: Event) {
          event.preventDefault();
          contextLost = true;
          announcedReady = false;
          if (frame) cancelAnimationFrame(frame);
          frame = 0;
          setRendererState('fallback');
        }
        function restoreContext() {
          contextLost = false; failed = false; lastTime = 0;
          try {
            // Render-target pixels are lost with the context. Rebuild the
            // studio reflections, not just the geometry/material programs.
            buildEnvironment();
            resize();
          } catch { failed = true; setRendererState('fallback'); }
        }
        canvas.addEventListener('pointerup', choose);
        canvas.addEventListener('pointermove', move);
        canvas.addEventListener('pointerleave', resetPointer);
        canvas.addEventListener('pointercancel', resetPointer);
        canvas.addEventListener('webglcontextlost', loseContext);
        canvas.addEventListener('webglcontextrestored', restoreContext);
        motion.addEventListener('change', updateMotion);
        runtime.current = { select(index) { currentSelection = index; requestRender(); } };

        // No opening animation: the first useful frame is already fully composed.
        for (const piece of pieces) if (piece.index === currentSelection) {
          piece.mesh.position.y += variant === 'pie' ? .17 : variant === 'ring' ? .15 : .09;
          if (circular) { const distance = variant === 'pie' ? .18 : .07; piece.mesh.position.x += Math.cos(piece.angle) * distance; piece.mesh.position.z -= Math.sin(piece.angle) * distance; }
        }
        resize();
        release = () => {
          resizeObserver.disconnect();
          motion.removeEventListener('change', updateMotion);
          canvas.removeEventListener('pointerup', choose);
          canvas.removeEventListener('pointermove', move);
          canvas.removeEventListener('pointerleave', resetPointer);
          canvas.removeEventListener('pointercancel', resetPointer);
          canvas.removeEventListener('webglcontextlost', loseContext);
          canvas.removeEventListener('webglcontextrestored', restoreContext);
          for (const geometry of geometries) geometry.dispose();
          for (const material of materials) material.dispose();
          for (const texture of textures) texture.dispose();
          key.shadow.map?.dispose();
          environment?.dispose();
          engine.dispose();
          engine.forceContextLoss();
          canvas.remove();
        };
      } catch {
        for (const geometry of geometries) geometry.dispose();
        for (const material of materials) material.dispose();
        for (const texture of textures) texture.dispose();
        environment?.dispose();
        renderer?.dispose();
        renderer?.domElement.remove();
        if (!disposed) setRendererState('fallback');
      }
    }

    function visibility() {
      if (document.hidden) { if (frame) cancelAnimationFrame(frame); frame = 0; }
      else invalidate?.();
    }
    document.addEventListener('visibilitychange', visibility);
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        visible = entries.some(entry => entry.isIntersecting);
        if (visible) { void initialize(); invalidate?.(); }
        else { if (frame) cancelAnimationFrame(frame); frame = 0; }
      }, { threshold: .02 });
      observer.observe(container);
    } else { visible = true; void initialize(); }
    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      runtime.current = null;
      release?.();
    };
  }, [dataKey, variant, glass]);

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % values.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + values.length) % values.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = values.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    buttons.current[next]?.focus();
  }

  return <figure className={`${s.sculpture} ${compact ? s.compact : ''} ${minimal ? s.minimal : ''}`} data-analytics-sculpture={variant} data-density={density} data-finish={finish} data-renderer={rendererState} aria-label={caption || 'Distribución de valores'}>
    {variant === 'pie' && !minimal && <div className={s.pieSummary}><div><span>Total representado</span><strong title={printable(total)}>{total >= 10000 ? shortNumber.format(total) : printable(total)}</strong></div><span>Explora cada segmento <span aria-hidden="true">↗</span></span></div>}
    <div className={s.stage}>
      <div className={s.fallback} data-visible={rendererState !== 'webgl'}><SculptureFallback values={values} variant={variant} selected={active} id={id} glass={glass}/></div>
      <div className={s.host} ref={host} data-sculpture-host data-visible={rendererState === 'webgl'}/>
      {variant === 'ring' && <div className={s.center} ref={center} aria-hidden="true"><span>Total</span><strong title={printable(total)}>{total >= 10000 ? shortNumber.format(total) : printable(total)}</strong></div>}
      <div className={s.stageMeta} aria-hidden="true"><span className={s.metaDot}/>{variant === 'bars' ? 'Comparativa' : 'Distribución'}<span>·</span><span>{values.length} categorías</span></div>
    </div>
    <div className={minimal ? s.srOnly : s.selection} aria-live="polite" aria-atomic="true">
      {item ? <><span className={s.selectedDot} style={{ background: colorFor(item.color, active) }}/><span className={s.selectedLabel}>{item.label}</span><strong>{printable(item.value)}</strong>{total > 0 && <span className={s.percentage}>{percentage.format(positive(item.value) / total * 100)}<small>%</small></span>}</> : <span>Sin datos disponibles</span>}
    </div>
    <div className={s.legend} role="group" aria-label="Explorar categorías del gráfico">
      {values.map((value, index) => <button type="button" key={`${index}-${value.label}`} ref={element => { buttons.current[index] = element; }} className={s.legendItem} aria-pressed={index === active} onClick={() => setSelected(index)} onKeyDown={event => navigate(event, index)} style={{ '--sculpture-color': colorFor(value.color, index) } as CSSProperties}>
        <span className={s.legendDot}/><span className={s.legendLabel}>{value.label}</span><strong>{printable(value.value)}</strong>
      </button>)}
    </div>
    {caption && <figcaption className={minimal ? s.srOnly : s.caption}>{caption}</figcaption>}
    {hasNegatives && <p className={s.caption}>El volumen representa los valores positivos. Los valores negativos se conservan en la leyenda.</p>}
    <table className={s.srOnly}><caption>{caption || 'Valores del gráfico'}</caption><thead><tr><th scope="col">Categoría</th><th scope="col">Valor</th></tr></thead><tbody>{values.map((value, index) => <tr key={index}><th scope="row">{value.label}</th><td>{printable(value.value)}</td></tr>)}</tbody></table>
  </figure>;
}
