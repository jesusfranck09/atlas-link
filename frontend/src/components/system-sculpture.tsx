'use client';

import { useEffect, useId, useRef } from 'react';
import type { BufferGeometry, Material, WebGLRenderTarget, WebGLRenderer } from 'three';
import s from './system-sculpture.module.css';

export type SystemSculptureVariant = 'control' | 'hospital' | 'insurer';
export type SystemSculptureProps = { variant: SystemSculptureVariant; className?: string };

/** Original vector artwork: decorative, with no metrics or business meaning. */
function VectorSculpture({ variant, id }: { variant: SystemSculptureVariant; id: string }) {
  const paint = (name: string) => `url(#${id}-${name})`;
  return <svg className={s.vector} viewBox="0 0 480 270" focusable="false" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-blue`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f3faff"/><stop offset=".24" stopColor="#b7d5ff"/><stop offset=".53" stopColor="#638fd8"/><stop offset=".72" stopColor="#edf7ff"/><stop offset="1" stopColor="#6684bf"/></linearGradient>
      <linearGradient id={`${id}-silver`} x1="0" y1="0" x2=".5" y2="1"><stop stopColor="#f7fbff"/><stop offset=".32" stopColor="#7892bd"/><stop offset=".52" stopColor="#ffffff"/><stop offset="1" stopColor="#bccbde"/></linearGradient>
      <radialGradient id={`${id}-node`} cx=".3" cy=".25"><stop stopColor="#fff"/><stop offset=".45" stopColor="#dceaff"/><stop offset="1" stopColor="#6d92cc"/></radialGradient>
      <linearGradient id={`${id}-jade`} x1="0" y1="0" x2=".85" y2="1"><stop stopColor="#e6fff6"/><stop offset=".24" stopColor="#a2d7c8"/><stop offset=".47" stopColor="#679d94"/><stop offset=".61" stopColor="#ecfff7"/><stop offset="1" stopColor="#96c6b9"/></linearGradient>
      <linearGradient id={`${id}-pearl`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff"/><stop offset=".22" stopColor="#d5e4df"/><stop offset=".48" stopColor="#9dbfb5"/><stop offset=".7" stopColor="#f8fdf7"/><stop offset="1" stopColor="#bbcfc6"/></linearGradient>
      <linearGradient id={`${id}-teal`} x1="0" y1="0" x2=".4" y2="1"><stop stopColor="#d9fff4"/><stop offset=".3" stopColor="#6ab5a7"/><stop offset=".54" stopColor="#367f78"/><stop offset=".68" stopColor="#bce8d9"/><stop offset="1" stopColor="#5d9c91"/></linearGradient>
      <linearGradient id={`${id}-copper`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff4dc"/><stop offset=".23" stopColor="#c99468"/><stop offset=".48" stopColor="#f8dfbb"/><stop offset=".6" stopColor="#a96e48"/><stop offset=".8" stopColor="#fcebd2"/><stop offset="1" stopColor="#d2a580"/></linearGradient>
      <linearGradient id={`${id}-lens`} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#fff" stopOpacity=".92"/><stop offset=".25" stopColor="#f7e1bf" stopOpacity=".47"/><stop offset=".5" stopColor="#fff" stopOpacity=".9"/><stop offset=".63" stopColor="#e1bf96" stopOpacity=".43"/><stop offset="1" stopColor="#f7eee3" stopOpacity=".6"/></linearGradient>
    </defs>
    {variant === 'control' ? <g>
      <ellipse cx="241" cy="132" rx="153" ry="68" transform="rotate(-15 241 132)" fill="none" stroke={paint('silver')} strokeWidth="3"/>
      <ellipse cx="241" cy="132" rx="105" ry="111" transform="rotate(-37 241 132)" fill="none" stroke="#b4c8e7" strokeWidth="2"/>
      <path d="M238 51 301 91 303 164 241 205 179 169 177 96Z" fill="#698bc2"/>
      <path d="M238 43 301 83 301 156 239 195 177 159 177 88Z" fill={paint('blue')} stroke="#e5f3ff" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M238 43 240 117 177 88M240 117 301 83M240 117 239 195M177 159 240 117 301 156" fill="none" stroke="#e5f6ff" strokeOpacity=".8" strokeWidth="1.5"/>
      <path d="M214 91 247 72 275 110 245 155 211 132Z" fill="#f3faff" fillOpacity=".54" stroke="#fff" strokeOpacity=".85"/>
      <path d="M92 149C134 190 308 189 381 105" fill="none" stroke={paint('silver')} strokeWidth="4"/>
      <path d="M194 222C144 176 181 51 273 29" fill="none" stroke={paint('silver')} strokeWidth="3"/>
      {[[99, 138, 12], [353, 81, 10], [284, 209, 12], [192, 45, 8]].map(([x, y, r], index) => <circle key={index} cx={x} cy={y} r={r} fill={paint('node')} stroke="#e6f2ff" strokeWidth="1.2"/>)}
      <path d="M312 44h18m-9-9v18M121 210h13m-6.5-6.5v13" stroke="#8dadd8" strokeOpacity=".6" strokeWidth="1.2"/>
    </g> : variant === 'hospital' ? <g strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M93 117C70 85 98 48 130 57L207 87C241 101 232 147 198 145L124 137C111 136 101 128 93 117Z" stroke="#8ebbb0" strokeWidth="34" transform="translate(0 8)"/>
      <path d="M93 117C70 85 98 48 130 57L207 87C241 101 232 147 198 145L124 137C111 136 101 128 93 117Z" stroke={paint('jade')} strokeWidth="33"/>
      <path d="M228 91C249 65 288 76 289 109L291 178C291 214 245 226 228 194L200 146C190 127 213 106 228 91Z" stroke="#9bb6ad" strokeWidth="37" transform="translate(0 7)"/>
      <path d="M228 91C249 65 288 76 289 109L291 178C291 214 245 226 228 194L200 146C190 127 213 106 228 91Z" stroke={paint('pearl')} strokeWidth="36"/>
      <path d="M285 98C263 82 275 48 302 47L366 56C400 60 408 99 382 120L332 153C306 169 276 146 286 124" stroke="#518e83" strokeWidth="34" transform="translate(0 6)"/>
      <path d="M285 98C263 82 275 48 302 47L366 56C400 60 408 99 382 120L332 153C306 169 276 146 286 124" stroke={paint('teal')} strokeWidth="33"/>
      <path d="M119 45C131 47 174 64 191 71M208 143C216 160 229 182 237 198M305 35 365 45" stroke="#fff" strokeOpacity=".8" strokeWidth="2.5"/>
      <path d="M202 113C204 131 222 140 233 122" stroke={paint('jade')} strokeWidth="25"/>
      <circle cx="90" cy="184" r="7" fill={paint('pearl')} stroke="#d4e8de" strokeWidth="1"/>
      <circle cx="375" cy="187" r="5" fill={paint('jade')} stroke="#c5ded2" strokeWidth="1"/>
    </g> : <g>
      {[[303, 106, 64, 85], [249, 131, 68, 89], [191, 154, 71, 91]].map(([x, y, rx, ry], index) => <g key={index} transform={`rotate(-24 ${x} ${y})`}>
        <ellipse cx={x + 5} cy={y + 4} rx={rx} ry={ry} fill="#d9b997" fillOpacity=".38" stroke={paint('copper')} strokeWidth="5"/>
        <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={paint('lens')} stroke={paint('copper')} strokeWidth="5"/>
        <ellipse cx={x} cy={y} rx={rx - 7} ry={ry - 8} fill="none" stroke="#fff" strokeOpacity=".88" strokeWidth="1.5"/>
        <ellipse cx={x} cy={y} rx={rx - 17} ry={ry - 18} fill="none" stroke="#bd956f" strokeOpacity=".26" strokeWidth="1"/>
        <path d={`M${x - rx + 15} ${y + 10}Q${x - 10} ${y - ry - 14} ${x + 43} ${y - ry + 29}`} fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="3"/>
        <rect x={x - 6} y={y - ry - 5} width="12" height="7" rx="3" fill={paint('copper')}/>
      </g>)}
      <path d="M107 191 88 205m276-169 14-13" stroke="#cfab86" strokeWidth="1.5"/>
      <circle cx="87" cy="206" r="3" fill="#e9d1b6"/>
    </g>}
  </svg>;
}

/** Decorative identity only. No values, decisions or AI capability are implied. */
export function SystemSculpture({ variant, className }: SystemSculptureProps) {
  const host = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, '');

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    const desktop = window.matchMedia('(min-width: 900px) and (pointer: fine)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrast = window.matchMedia('(forced-colors: active)');
    let disposed = false;
    let visible = false;
    let initializing = false;
    let failed = false;
    let frame = 0;
    let release: (() => void) | undefined;
    let invalidate: (() => void) | undefined;
    let pause: (() => void) | undefined;
    let observer: IntersectionObserver | undefined;
    const eligible = () => desktop.matches && !contrast.matches;

    async function initialize() {
      if (disposed || initializing || release || failed || !visible || document.hidden || !eligible()) return;
      initializing = true;
      let renderer: WebGLRenderer | undefined;
      let environment: WebGLRenderTarget | undefined;
      const geometries = new Set<BufferGeometry>();
      const materials = new Set<Material>();
      const detach: (() => void)[] = [];
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        detach.forEach(fn => fn());
        geometries.forEach(geometry => geometry.dispose());
        materials.forEach(material => material.dispose());
        environment?.dispose();
        renderer?.dispose();
        renderer?.forceContextLoss();
        renderer?.domElement.remove();
        invalidate = undefined;
        pause = undefined;
      };
      try {
        const [T, { RoomEnvironment }] = await Promise.all([import('three'), import('three/addons/environments/RoomEnvironment.js')]);
        if (disposed || !eligible() || !visible || document.hidden) return;
        renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
        const engine = renderer;
        engine.setClearColor(0xffffff, 0);
        engine.outputColorSpace = T.SRGBColorSpace;
        engine.toneMapping = T.NeutralToneMapping;
        engine.toneMappingExposure = variant === 'insurer' ? .92 : 1.04;
        engine.transmissionResolutionScale = .5;
        engine.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        engine.debug.onShaderError = () => { failed = true; container!.dataset.renderer = 'svg'; container!.dataset.graphicsError = 'shader'; };
        const canvas = engine.domElement;
        canvas.className = s.canvas;
        canvas.setAttribute('aria-hidden', 'true');
        container!.appendChild(canvas);
        const scene = new T.Scene();
        const camera = new T.OrthographicCamera(-3, 3, 1.7, -1.7, .1, 35);
        camera.position.set(variant === 'hospital' ? 1.1 : variant === 'insurer' ? 4.5 : 3.3, variant === 'control' ? 2.3 : 1.7, 7);
        camera.lookAt(0, 0, 0);

        function buildEnvironment() {
          environment?.dispose();
          const studio = new RoomEnvironment();
          // Large procedural softboxes provide readable edges without HDR files.
          for (const [x, y, z, width, height, intensity] of [[-4, 5, 5, 4, 3, 5], [4, 3, -5, 1, 5, 4]]) {
            const softbox = new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshBasicMaterial({ color: new T.Color(0xffffff).multiplyScalar(intensity), side: T.DoubleSide }));
            softbox.position.set(x, y, z);
            softbox.lookAt(0, 0, 0);
            studio.add(softbox);
          }
          const pmrem = new T.PMREMGenerator(engine);
          try { environment = pmrem.fromScene(studio, .03); scene.environment = environment.texture; }
          finally { studio.dispose(); pmrem.dispose(); }
        }
        buildEnvironment();
        scene.environmentIntensity = variant === 'insurer' ? .88 : 1.25;
        scene.add(new T.HemisphereLight(0xffffff, 0xd3dfe6, 1));
        const key = new T.DirectionalLight(0xfffbf5, variant === 'insurer' ? 1.2 : 2.2);
        key.position.set(-3, 5, 6);
        scene.add(key);
        const rim = new T.DirectionalLight(variant === 'hospital' ? 0xd6fff1 : 0xdde9ff, variant === 'insurer' ? .8 : 1.4);
        rim.position.set(4, 2, -4);
        scene.add(rim);
        const rig = new T.Group();
        scene.add(rig);
        const rememberGeometry = <G extends BufferGeometry,>(geometry: G): G => { geometries.add(geometry); return geometry; };
        const rememberMaterial = <M extends Material,>(material: M): M => { materials.add(material); return material; };
        const pearl = (color: string, metalness = .2) => rememberMaterial(new T.MeshPhysicalMaterial({ color, metalness, roughness: .22, clearcoat: 1, clearcoatRoughness: .1, envMapIntensity: 1.15 }));

        if (variant === 'control') {
          const silver = pearl('#a9c4eb', .66);
          const enamel = pearl('#dceaff', .32);
          const crystal = rememberMaterial(new T.MeshPhysicalMaterial({ color: '#98c3ff', metalness: .025, roughness: .1, clearcoat: 1, transmission: .74, thickness: .8, ior: 1.46, attenuationColor: '#598dd5', attenuationDistance: 1.8, envMapIntensity: 1.2 }));
          const shape = new T.Shape();
          for (let i = 0; i < 6; i++) { const angle = i / 6 * Math.PI * 2 + Math.PI / 6; const x = Math.cos(angle) * .87; const y = Math.sin(angle) * .87; if (!i) shape.moveTo(x, y); else shape.lineTo(x, y); }
          shape.closePath();
          const coreGeometry = rememberGeometry(new T.ExtrudeGeometry(shape, { depth: .44, bevelEnabled: true, bevelSize: .07, bevelThickness: .07, bevelSegments: 3, steps: 1 }));
          coreGeometry.center();
          const core = new T.Mesh(coreGeometry, crystal);
          core.rotation.set(.15, -.15, -.14);
          rig.add(core);
          const heart = new T.Mesh(rememberGeometry(new T.OctahedronGeometry(.51, 0)), pearl('#a9cfff', .46));
          heart.rotation.set(.2, .45, .12);
          rig.add(heart);
          const orbitGeometry = rememberGeometry(new T.TorusGeometry(1.62, .019, 8, 96));
          const nodeGeometry = rememberGeometry(new T.IcosahedronGeometry(.12, 1));
          [[.98, .1, -.28], [.12, .95, .62]].forEach(([x, y, z], index) => {
            const orbit = new T.Group();
            orbit.rotation.set(x, y, z);
            const ring = new T.Mesh(orbitGeometry, silver);
            orbit.add(ring);
            [index ? .45 : .1, index ? 3.2 : 2.3, index ? 5.2 : 4.6].forEach((angle, nodeIndex) => {
              const node = new T.Mesh(nodeGeometry, nodeIndex === 1 ? silver : enamel);
              node.position.set(Math.cos(angle) * 1.62, Math.sin(angle) * 1.62, 0);
              node.rotation.set(angle, .2, .3);
              node.scale.setScalar(nodeIndex === 1 ? .72 : 1);
              orbit.add(node);
            });
            rig.add(orbit);
          });
          const halo = new T.Mesh(rememberGeometry(new T.TorusGeometry(1.1, .009, 6, 80)), enamel);
          halo.rotation.set(.2, -.4, 0);
          rig.add(halo);
        } else if (variant === 'hospital') {
          const curve = new T.CatmullRomCurve3([
            [-.37, .69, 0], [.37, .69, 0], [.65, .43, 0], [.65, -.43, 0],
            [.37, -.69, 0], [-.37, -.69, 0], [-.65, -.43, 0], [-.65, .43, 0],
          ].map(point => new T.Vector3(...point)), true, 'centripetal');
          const geometry = rememberGeometry(new T.TubeGeometry(curve, 112, .17, 14, true));
          ['#b6d9c9', '#e6eeea', '#74b7aa'].forEach((color, index) => {
            const material = pearl(color, .14);
            material.iridescence = .12;
            material.iridescenceIOR = 1.3;
            material.iridescenceThicknessRange = [120, 240];
            const link = new T.Mesh(geometry, material);
            link.position.set((index - 1) * 1.02, index === 1 ? -.15 : .13, index === 1 ? .12 : -.08);
            link.rotation.set(index === 1 ? -.36 : .14, index === 1 ? -.82 : .58, index === 1 ? .23 : -.72);
            rig.add(link);
          });
          const satellites = rememberGeometry(new T.IcosahedronGeometry(.08, 1));
          const enamel = pearl('#dcebe2', .24);
          [[-1.85, -.78, .1], [1.77, -.72, -.3]].forEach(([x, y, z]) => { const node = new T.Mesh(satellites, enamel); node.position.set(x, y, z); rig.add(node); });
          rig.rotation.z = -.04;
        } else {
          const copper = pearl('#c69b74', .66);
          copper.roughness = .28;
          const edge = pearl('#eedbc4', .56);
          const glass = rememberMaterial(new T.MeshPhysicalMaterial({ color: '#e5cfb0', metalness: .025, roughness: .18, clearcoat: .85, clearcoatRoughness: .14, transmission: .5, thickness: .3, ior: 1.43, attenuationColor: '#d0a77d', attenuationDistance: 1.15, envMapIntensity: .85 }));
          const points = [[0, -.075], [.25, -.07], [.5, -.055], [.75, -.028], [.94, .005], [1, .035], [.98, .065], [.8, .095], [.5, .12], [.25, .135], [0, .14]].map(([radius, y]) => new T.Vector2(radius, y));
          const lensGeometry = rememberGeometry(new T.LatheGeometry(points, 72));
          const rimGeometry = rememberGeometry(new T.TorusGeometry(1.01, .045, 10, 96));
          const innerGeometry = rememberGeometry(new T.TorusGeometry(.89, .008, 6, 80));
          const mountGeometry = rememberGeometry(new T.CapsuleGeometry(.039, .1, 4, 8));
          const optics = new T.Group();
          optics.rotation.set(.05, -.27, -.3);
          [-.68, 0, .68].forEach((z, index) => {
            const layer = new T.Group();
            layer.position.set((index - 1) * .2, 0, z);
            layer.scale.setScalar(index === 1 ? 1.04 : .98);
            const lens = new T.Mesh(lensGeometry, glass);
            lens.rotation.x = Math.PI / 2;
            layer.add(lens, new T.Mesh(rimGeometry, copper), new T.Mesh(innerGeometry, edge));
            [Math.PI / 2, Math.PI * 7 / 6, Math.PI * 11 / 6].forEach(angle => {
              const mount = new T.Mesh(mountGeometry, copper);
              mount.position.set(Math.cos(angle) * 1.01, Math.sin(angle) * 1.01, .012);
              mount.rotation.z = angle;
              layer.add(mount);
            });
            optics.add(layer);
          });
          rig.add(optics);
        }

        let contextLost = false;
        let lastTime = 0;
        let settlingUntil = 0;
        let targetX = 0;
        let targetY = 0;
        let frames = 0;
        const restingZ = rig.rotation.z;
        const canDraw = () => !disposed && !cleaned && !failed && !contextLost && visible && !document.hidden && eligible();
        function requestRender() { if (!frame && canDraw()) frame = requestAnimationFrame(draw); }
        function draw(time: number) {
          frame = 0;
          if (!canDraw()) return;
          const dt = Math.min(.05, Math.max(.001, (time - lastTime) / 1000));
          lastTime = time;
          const settle = motion.matches || time >= settlingUntil;
          const factor = settle ? 1 : 1 - Math.exp(-14 * dt);
          rig.rotation.x += (targetX - rig.rotation.x) * factor;
          rig.rotation.y += (targetY - rig.rotation.y) * factor;
          try {
            engine.render(scene, camera);
            if (failed) return;
            container!.dataset.renderer = 'webgl';
            container!.dataset.frames = String(++frames);
            container!.dataset.drawCalls = String(engine.info.render.calls);
            container!.dataset.triangles = String(engine.info.render.triangles);
            container!.dataset.geometries = String(engine.info.memory.geometries);
            container!.dataset.textures = String(engine.info.memory.textures);
            container!.dataset.pixelRatio = String(engine.getPixelRatio());
          } catch { failed = true; container!.dataset.renderer = 'svg'; container!.dataset.graphicsError = 'render'; }
          const moving = Math.abs(rig.rotation.x - targetX) + Math.abs(rig.rotation.y - targetY) > .0004;
          if (moving && !settle && canDraw()) frame = requestAnimationFrame(draw);
        }
        function resize() {
          if (disposed || cleaned) return;
          const { clientWidth: width, clientHeight: height } = container!;
          if (!width || !height) return;
          const aspect = width / height;
          const extent = Math.max(variant === 'hospital' ? 2.72 : variant === 'insurer' ? 3.12 : 3.5, (variant === 'hospital' ? 4.8 : 4.15) / aspect);
          camera.left = -extent * aspect / 2;
          camera.right = extent * aspect / 2;
          camera.top = extent / 2;
          camera.bottom = -extent / 2;
          camera.updateProjectionMatrix();
          engine.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
          engine.setSize(width, height, false);
          requestRender();
        }
        function move(event: PointerEvent) {
          if (motion.matches || event.pointerType !== 'mouse' || !canDraw()) return;
          const bounds = container!.getBoundingClientRect();
          targetY = Math.max(-.19, Math.min(.19, ((event.clientX - bounds.left) / bounds.width - .5) * .38));
          targetX = Math.max(-.1, Math.min(.1, ((event.clientY - bounds.top) / bounds.height - .5) * .2));
          settlingUntil = performance.now() + 900;
          requestRender();
        }
        function resetPointer() { targetX = 0; targetY = 0; settlingUntil = performance.now() + 900; requestRender(); }
        function stop() {
          if (frame) cancelAnimationFrame(frame);
          frame = 0;
          lastTime = 0;
          targetX = targetY = 0;
          rig.rotation.set(0, 0, restingZ);
        }
        function updateMotion() { stop(); container!.dataset.motion = motion.matches ? 'reduced' : 'full'; requestRender(); }
        function loseContext(event: Event) { event.preventDefault(); contextLost = true; stop(); container!.dataset.renderer = 'svg'; }
        function restoreContext() {
          if (disposed || cleaned) return;
          contextLost = false;
          failed = false;
          try { buildEnvironment(); resize(); }
          catch { failed = true; container!.dataset.renderer = 'svg'; container!.dataset.graphicsError = 'recovery'; }
        }
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container!);
        canvas.addEventListener('pointermove', move);
        canvas.addEventListener('pointerleave', resetPointer);
        canvas.addEventListener('pointercancel', resetPointer);
        canvas.addEventListener('webglcontextlost', loseContext);
        canvas.addEventListener('webglcontextrestored', restoreContext);
        motion.addEventListener('change', updateMotion);
        detach.push(() => {
          resizeObserver.disconnect();
          canvas.removeEventListener('pointermove', move);
          canvas.removeEventListener('pointerleave', resetPointer);
          canvas.removeEventListener('pointercancel', resetPointer);
          canvas.removeEventListener('webglcontextlost', loseContext);
          canvas.removeEventListener('webglcontextrestored', restoreContext);
          motion.removeEventListener('change', updateMotion);
        });
        invalidate = requestRender;
        pause = stop;
        release = cleanup;
        container!.dataset.motion = motion.matches ? 'reduced' : 'full';
        resize();
      } catch {
        cleanup();
        failed = true;
        if (!disposed) { container!.dataset.renderer = 'svg'; container!.dataset.graphicsError = 'initialization'; }
      } finally { initializing = false; }
    }

    function reconcile() {
      if (disposed) return;
      if (!eligible()) { release?.(); release = undefined; container!.dataset.renderer = 'svg'; }
      else if (!visible || document.hidden) pause?.();
      else if (release) invalidate?.();
      else void initialize();
    }
    container.dataset.renderer = 'svg';
    desktop.addEventListener('change', reconcile);
    contrast.addEventListener('change', reconcile);
    document.addEventListener('visibilitychange', reconcile);
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); reconcile(); }, { threshold: .03 });
      observer.observe(container);
    } else { visible = true; reconcile(); }
    return () => {
      disposed = true;
      observer?.disconnect();
      desktop.removeEventListener('change', reconcile);
      contrast.removeEventListener('change', reconcile);
      document.removeEventListener('visibilitychange', reconcile);
      release?.();
    };
  }, [variant]);

  return <div ref={host} className={`${s.sculpture}${className ? ` ${className}` : ''}`} data-system-sculpture={variant} data-renderer="svg" aria-hidden="true">
    <div className={s.fallback}><VectorSculpture variant={variant} id={id}/></div>
  </div>;
}
