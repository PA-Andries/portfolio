// WebGL backdrop — photorealistic rotating Earth, driven by section scroll.
// Replaces the previous island fly-through scene.
//
// Architecture:
//   - Single Earth sphere at origin, camera fixed at (0, 0, CAMERA_Z)
//   - 4 glowing markers at lat/lng of Caen, Brest, Gdańsk, Paris (one per portfolio section)
//   - Earth Y-rotation lerps toward the active section's marker longitude — so scrolling
//     into "about" rotates Caen face-camera, "projets" rotates Brest, etc.
//   - In "contact" section: free continuous spin (no marker focused)
//   - Cloud layer on a slightly bigger sphere with independent slow drift
//   - Atmosphere fresnel rim glow + starfield skybox
//
// Active section comes via window event `pa:section-change` dispatched from portfolio.ts.

import * as THREE from "three";

// ============ MARKERS ============

interface Marker {
  section: string;
  label: string;       // city name shown in the HUD label
  sublabel: string;    // small caption underneath
  lat: number;
  lng: number;
  rotY: number;        // Earth.rotation.y target that brings this marker face-camera
  mesh?: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  halo?: THREE.Sprite;
}

// IMPORTANT: marker positions are NOT real geography — they're spread around the globe
// for dramatic rotation between sections. The city names in the labels are real (matching
// Pierre-Antoine's actual trajectory), but the dots sit wherever creates the most cinematic
// spin. Latitudes vary too so the camera path isn't a flat equatorial slide.
const MARKERS: Marker[] = [
  { section: "about",    label: "CAEN",   sublabel: "ORIGINES · NORMANDIE", lat:  49, lng:    0, rotY: 0 },
  { section: "projets",  label: "BREST",  sublabel: "IMT ATLANTIQUE",       lat: -25, lng:   90, rotY: 0 },
  { section: "parcours", label: "GDAŃSK", sublabel: "ERASMUS · POLAND",     lat:  40, lng:  180, rotY: 0 },
];

// Per-section rotation targets. The whole sequence is MONOTONIC east-bound so that
// scrolling down always rotates the Earth in the same direction (no back-and-forth).
// Sections without markers (home/extra/contact) still have targets so rotation
// stays continuous through them.
const SECTION_ROT_TARGETS: Record<string, number> = {
  home: -(3 * Math.PI) / 4, // mid-Atlantic, no marker
  about: -Math.PI / 2,       // Caen face-camera
  projets: 0,                // Brest face-camera
  parcours: Math.PI / 2,     // Gdańsk face-camera
  extra: Math.PI,            // no marker, continued east transit
  contact: (3 * Math.PI) / 2, // no marker, full revolution wrap
};
const SECTION_ORDER = ["home", "about", "projets", "parcours", "extra", "contact"];

// rotY target = λ − π/2. Derived from: for a point originally at (sin(φ)cos(λ), cos(φ), sin(φ)sin(λ)),
// rotating Earth by θ around Y maps z → sin(φ)·sin(λ−θ). Set sin(λ−θ)=1 ⇒ θ = λ − π/2.
MARKERS.forEach((m) => {
  m.rotY = (m.lng * Math.PI) / 180 - Math.PI / 2;
});

// ============ CONFIG ============

const CAMERA_FOV = 45;
const CAMERA_Z = 3.2;
const ROT_LERP = 0.18; // smooths target jitter; target is now scroll-derived per frame
const CLOUD_AUTO_ROT = 0.00018; // small wind drift relative to earth
const EARTH_AXIAL_TILT = (23.4 * Math.PI) / 180;

// ============ HELPERS ============

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const lambda = (lng * Math.PI) / 180;
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(lambda),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(lambda)
  );
}

// Pick the equivalent angle to `target` that's closest to `from` modulo 2π.
// Stops the globe from spinning the long way when section jumps.
function shortestPathTarget(from: number, target: number): number {
  let delta = target - from;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return from + delta;
}

// Procedural radial-gradient halo for marker sprites — saves one image round-trip.
function makeHaloTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(140, 245, 255, 1)");
  g.addColorStop(0.35, "rgba(0, 212, 255, 0.45)");
  g.addColorStop(1, "rgba(0, 212, 255, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ============ EARTH SHADER (day/night blend + ocean specular) ============

const EARTH_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const EARTH_FRAG = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D bumpMap;
  uniform float bumpScale;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 nrmBase = normalize(vWorldNormal);

    // Bump-map perturbation (Mikkelsen technique — derives tangent space from screen-space
    // derivatives, no need for explicit tangent attribute). Subtle by design — bumpScale
    // is small so we get a hint of mountain shading at the terminator without making the
    // surface look "lumpy" at backdrop distance.
    float h = texture2D(bumpMap, vUv).r;
    float dHdx = dFdx(h);
    float dHdy = dFdy(h);
    vec3 dpdx = dFdx(vWorldPos);
    vec3 dpdy = dFdy(vWorldPos);
    vec3 R1 = cross(dpdy, nrmBase);
    vec3 R2 = cross(nrmBase, dpdx);
    float fDet = dot(dpdx, R1);
    vec3 vGrad = (R1 * dHdx + R2 * dHdy) / max(abs(fDet), 0.0001);
    vec3 nrm = normalize(nrmBase - bumpScale * vGrad);

    float sd = dot(nrm, sunDirection);
    float lambert = max(0.0, sd);
    float nightFactor = smoothstep(0.0, 0.25, -sd);

    vec3 dayCol = texture2D(dayMap, vUv).rgb;
    vec3 nightCol = texture2D(nightMap, vUv).rgb;

    // Subtle terminator warmth so sunset edge isn't a hard cutoff.
    float terminator = 1.0 - abs(sd);
    terminator = pow(max(0.0, terminator), 4.0);

    // Cheap ocean specular: highlight on dark-luminance pixels of day map.
    vec3 reflectDir = reflect(-sunDirection, nrm);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float spec = pow(max(0.0, dot(reflectDir, viewDir)), 30.0);
    float oceanMask = 1.0 - smoothstep(0.06, 0.28, dot(dayCol, vec3(0.299, 0.587, 0.114)));

    // Ambient kept generous (0.22) so the night-side silhouette of continents reads
    // faintly behind city lights — pure dark ambient = featureless black hemisphere.
    // Direct diffuse boosted past 1.0 so the sunlit side reads bright, not muddy.
    vec3 col = dayCol * (lambert * 1.25 + 0.22);
    col += nightCol * nightFactor * 2.5;
    col += vec3(1.0, 0.55, 0.25) * terminator * 0.08;
    col += vec3(0.6, 0.75, 1.0) * spec * oceanMask * 0.6;

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ============ ATMOSPHERE SHADER (fresnel rim glow) ============

const ATMOSPHERE_VERT = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const ATMOSPHERE_FRAG = /* glsl */ `
  uniform vec3 glowColor;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 viewDir = normalize(cameraPosition - vPosW);
    float rim = pow(1.0 - abs(dot(vNormalW, viewDir)), 2.2);
    gl_FragColor = vec4(glowColor, rim * 0.85);
  }
`;

// ============ BACKDROP ============

interface BackdropContext {
  cleanup: () => void;
}

async function initBackdrop(canvas: HTMLCanvasElement): Promise<BackdropContext | null> {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    canvas.style.display = "none";
    canvas.dataset.fallback = "reduced-motion";
    return null;
  }

  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
  if (!gl) {
    canvas.style.display = "none";
    canvas.dataset.fallback = "no-webgl";
    return null;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);

  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 0, CAMERA_Z);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // ===== Texture loading (parallel) =====
  const loader = new THREE.TextureLoader();
  let dayTex: THREE.Texture, cloudTex: THREE.Texture, nightTex: THREE.Texture, starsTex: THREE.Texture, bumpTex: THREE.Texture;
  try {
    [dayTex, cloudTex, nightTex, starsTex, bumpTex] = await Promise.all([
      loader.loadAsync("/backdrop/earth_day2.jpg"),
      loader.loadAsync("/backdrop/earth_clouds2.jpg"),
      loader.loadAsync("/backdrop/earth_night2.jpg"),
      loader.loadAsync("/backdrop/stars2.jpg"),
      loader.loadAsync("/backdrop/earth_normal2.jpg"),
    ]);
  } catch (err) {
    console.warn("Backdrop: texture load failed", err);
    canvas.style.display = "none";
    canvas.dataset.fallback = "texture-error";
    return null;
  }
  dayTex.colorSpace = THREE.SRGBColorSpace;
  dayTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  cloudTex.colorSpace = THREE.SRGBColorSpace;
  nightTex.colorSpace = THREE.SRGBColorSpace;
  starsTex.colorSpace = THREE.SRGBColorSpace;
  // Bump map is a height field, NOT sRGB color data — keep it in linear space.
  bumpTex.colorSpace = THREE.NoColorSpace;
  bumpTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // ===== Earth group (axial tilt) =====
  const earthGroup = new THREE.Group();
  earthGroup.rotation.z = EARTH_AXIAL_TILT;
  scene.add(earthGroup);

  // ===== Earth sphere — custom ShaderMaterial with day/night blend + ocean specular =====
  // Sun direction in WORLD space (side-on, slight up). Side-on positioning is what makes
  // the day/night terminator visible from the camera — front-lit positions wash out the
  // night side entirely. With camera at +Z and sun mostly +X, the right half of Earth
  // is day-lit, left half shows city lights, center sits at a soft golden-hour terminator.
  const sunDirection = new THREE.Vector3(4, 1, 1).normalize();
  const earthMat = new THREE.ShaderMaterial({
    vertexShader: EARTH_VERT,
    fragmentShader: EARTH_FRAG,
    uniforms: {
      dayMap: { value: dayTex },
      nightMap: { value: nightTex },
      bumpMap: { value: bumpTex },
      bumpScale: { value: 0.025 }, // subtle — too high makes the surface look fizzy
      sunDirection: { value: sunDirection },
    },
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), earthMat);
  earthGroup.add(earth);

  // ===== Cloud layer (alphaMap = same JPG luminance) =====
  const cloudMat = new THREE.MeshLambertMaterial({
    map: cloudTex,
    alphaMap: cloudTex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.008, 64, 64), cloudMat);
  earth.add(clouds);

  // ===== Atmosphere fresnel halo =====
  const atmosphereMat = new THREE.ShaderMaterial({
    vertexShader: ATMOSPHERE_VERT,
    fragmentShader: ATMOSPHERE_FRAG,
    uniforms: { glowColor: { value: new THREE.Color(0x4a8cff) } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.05, 48, 48), atmosphereMat);
  earthGroup.add(atmosphere);

  // ===== Starfield skybox =====
  const stars = new THREE.Mesh(
    new THREE.SphereGeometry(60, 32, 32),
    new THREE.MeshBasicMaterial({ map: starsTex, side: THREE.BackSide })
  );
  scene.add(stars);

  // ===== Markers (4 cities, children of earth so they rotate with it) =====
  const haloTex = makeHaloTexture();
  MARKERS.forEach((m) => {
    const pos = latLngToVec3(m.lat, m.lng, 1.013);
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.014, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00d4ff })
    );
    dot.position.copy(pos);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.5,
      })
    );
    halo.scale.set(0.085, 0.085, 1);
    dot.add(halo);
    earth.add(dot);
    m.mesh = dot;
    m.halo = halo;
  });

  // ===== Lighting =====
  // Match the DirectionalLight position to the Earth shader's sunDirection (* 5 for distance).
  // The cloud layer uses MeshLambertMaterial which reads from this light.
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.copy(sunDirection).multiplyScalar(5);
  scene.add(sun);
  const ambient = new THREE.AmbientLight(0xffffff, 0.07);
  scene.add(ambient);

  // ===== City-name HTML labels (positioned via projection in tick loop) =====
  const labelEls = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLElement>("[data-label-section]").forEach((el) => {
    const sec = el.dataset.labelSection;
    if (sec) labelEls.set(sec, el);
  });
  const labelTmpVec = new THREE.Vector3();

  // ===== Scroll-driven rotation =====
  // Cache section vertical centers (recomputed on resize). Layout reads are expensive
  // to do every frame; here we read once and reuse across frames.
  let sectionCenters: { sec: string; center: number }[] = [];
  const refreshSectionCenters = () => {
    sectionCenters = [];
    for (const sec of SECTION_ORDER) {
      const el = document.getElementById(sec);
      if (!el) continue;
      sectionCenters.push({ sec, center: el.offsetTop + el.offsetHeight / 2 });
    }
  };
  refreshSectionCenters();

  // Compute the rotation target for the current scroll position by smoothly interpolating
  // between consecutive section centers using a smoothstep ease (so the rotation accelerates
  // away from a section center and decelerates into the next, never snaps).
  function computeTargetRotY(): number {
    if (sectionCenters.length === 0) return SECTION_ROT_TARGETS.home;
    const vc = window.scrollY + window.innerHeight / 2;
    if (vc <= sectionCenters[0].center) return SECTION_ROT_TARGETS[sectionCenters[0].sec];
    for (let i = 1; i < sectionCenters.length; i++) {
      const a = sectionCenters[i - 1];
      const b = sectionCenters[i];
      if (vc < b.center) {
        const tRaw = (vc - a.center) / (b.center - a.center);
        const t = Math.max(0, Math.min(1, tRaw));
        const tEased = t * t * (3 - 2 * t); // smoothstep
        const fromR = SECTION_ROT_TARGETS[a.sec];
        const toR = SECTION_ROT_TARGETS[b.sec];
        return fromR + (toR - fromR) * tEased;
      }
    }
    return SECTION_ROT_TARGETS[sectionCenters[sectionCenters.length - 1].sec];
  }

  let currentRotY = computeTargetRotY();
  let activeSection = "home";
  let activeMarker: Marker | null = null;

  // applySection still drives label visibility & marker highlight — but NOT rotation
  // anymore (that's the scroll's job now).
  const applySection = (section: string) => {
    activeSection = section;
    const m = MARKERS.find((x) => x.section === section);
    activeMarker = m ?? null;
    MARKERS.forEach((mk) => {
      const isActive = mk === activeMarker;
      if (mk.mesh) mk.mesh.material.color.setHex(isActive ? 0x9efeff : 0x00d4ff);
      if (mk.halo) (mk.halo.material as THREE.SpriteMaterial).opacity = isActive ? 1.0 : 0.4;
    });
  };

  const onSectionChange = (e: Event) => {
    const detail = (e as CustomEvent<{ section: string }>).detail;
    if (detail?.section) applySection(detail.section);
  };
  window.addEventListener("pa:section-change", onSectionChange);

  // Initial sync: if portfolio.ts has already marked an active button, pick it up.
  const initialBtn = document.querySelector<HTMLElement>("[data-section-target].active");
  const initialSection = initialBtn?.dataset.sectionTarget || "home";
  applySection(initialSection);

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    refreshSectionCenters();
  }
  window.addEventListener("resize", onResize, { passive: true });

  // Dev-only inspection hook (no perf cost, harmless in prod).
  (window as unknown as Record<string, unknown>).__backdrop = {
    earth,
    clouds,
    atmosphere,
    markers: MARKERS,
    applySection,
    getRotY: () => currentRotY,
    getTargetRotY: () => computeTargetRotY(),
    getActiveSection: () => activeSection,
    renderOnce: () => renderer.render(scene, camera),
    setRotY: (v: number) => { currentRotY = v; earth.rotation.y = v; renderer.render(scene, camera); },
    tickOnce: () => tick(),
    computeTarget: () => computeTargetRotY(),
  };

  // ===== Render loop =====
  let rafId = 0;
  let frame = 0;
  function tick() {
    frame += 1;

    // Rotation target is recomputed from scroll position every frame — so the Earth
    // is always moving (continuously) as the user scrolls, not just on section snaps.
    const targetRotY = computeTargetRotY();
    currentRotY += (targetRotY - currentRotY) * ROT_LERP;
    earth.rotation.y = currentRotY;

    // Cloud drift (relative to earth — slight "wind").
    clouds.rotation.y += CLOUD_AUTO_ROT;

    // Active marker halo pulse.
    if (activeMarker?.halo) {
      const s = 0.085 * (1 + 0.22 * Math.sin(frame * 0.08));
      activeMarker.halo.scale.set(s, s, 1);
    }

    renderer.render(scene, camera);

    // Position the HUD label for the active marker. Must happen AFTER render
    // so getWorldPosition reflects this frame's earth.rotation.y.
    if (activeMarker?.mesh) {
      activeMarker.mesh.getWorldPosition(labelTmpVec);
      // World-space z > 0 means the marker is on the camera-facing hemisphere.
      // Sub-zero = marker has rotated around to the dark/back side; hide the label.
      const facingCamera = labelTmpVec.z > 0.05;
      labelTmpVec.project(camera);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const sx = (labelTmpVec.x * 0.5 + 0.5) * w;
      const sy = (-labelTmpVec.y * 0.5 + 0.5) * h;
      const label = labelEls.get(activeMarker.section);
      if (label) {
        label.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(14px, -50%)`;
        label.classList.toggle("active", facingCamera);
      }
    }
    // Hide any non-active labels.
    labelEls.forEach((el, sec) => {
      if (sec !== activeMarker?.section) el.classList.remove("active");
    });

    rafId = requestAnimationFrame(tick);
  }
  tick();

  return {
    cleanup() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pa:section-change", onSectionChange);
      earth.geometry.dispose();
      earthMat.dispose();
      clouds.geometry.dispose();
      cloudMat.dispose();
      atmosphere.geometry.dispose();
      atmosphereMat.dispose();
      stars.geometry.dispose();
      (stars.material as THREE.MeshBasicMaterial).dispose();
      dayTex.dispose();
      cloudTex.dispose();
      nightTex.dispose();
      starsTex.dispose();
      bumpTex.dispose();
      haloTex.dispose();
      MARKERS.forEach((m) => {
        m.mesh?.geometry.dispose();
        m.mesh?.material.dispose();
        m.halo?.material.dispose();
      });
      renderer.dispose();
    },
  };
}

function boot() {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-backdrop-canvas]");
  if (!canvas) return;
  void initBackdrop(canvas);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
