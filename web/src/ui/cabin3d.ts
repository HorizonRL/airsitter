import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { AircraftModel, CabinSection } from '../aircraft/aircraft'
import { Seat, SeatMap } from '../aircraft/seatMap'
import { EARTH_RADIUS_KM, deg, rad } from '../geo/geo'
import { skyColors, smooth } from './windowView'

/**
 * A walk-in 3-D cabin built from the seat map: every row, seat and window is placed at its real
 * position, so the view from a seat shows the actual window alignment, the bins, the seats ahead
 * and the wing outside. World frame: metres, +z towards the tail, −x is the left side, y is up (floor = 0).
 */

const IN = 0.0254
const EYE_Y = 1.12
const WIN_Y = 1.08
const AISLE_IN = 19

export interface CabinScene {
  sunElevation: number
  /** Sun azimuth relative to the nose, degrees; + = right side. */
  sunRelative: number
  water: boolean
  altitudeFt: number
  seed: number
}

const seatUnitIn = (s: CabinSection) => s.seatWidthIn + 2.5
function rowWidthIn(s: CabinSection) {
  let w = 0
  for (const c of s.layout) w += c === '-' ? AISLE_IN : seatUnitIn(s)
  return w
}

/** Lateral centre (metres) of every seat letter in a section. */
function seatXs(s: CabinSection): Map<string, number> {
  const out = new Map<string, number>()
  let x = -rowWidthIn(s) / 2
  for (const c of s.layout) {
    if (c === '-') { x += AISLE_IN; continue }
    out.set(c, (x + seatUnitIn(s) / 2) * IN)
    x += seatUnitIn(s)
  }
  return out
}

export function cabinHalfWidth(ac: AircraftModel) {
  return (Math.max(...ac.sections.map(rowWidthIn)) / 2 + 3) * IN
}

function roundedRect<T extends THREE.Path>(path: T, cx: number, cy: number, w: number, h: number, r: number) {
  const x = cx - w / 2, y = cy - h / 2
  r = Math.min(r, w / 2, h / 2)
  path.moveTo(x + r, y)
  path.lineTo(x + w - r, y); path.quadraticCurveTo(x + w, y, x + w, y + r)
  path.lineTo(x + w, y + h - r); path.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  path.lineTo(x + r, y + h); path.quadraticCurveTo(x, y + h, x, y + h - r)
  path.lineTo(x, y + r); path.quadraticCurveTo(x, y, x + r, y)
  return path
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`

const SKY_FRAG = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform vec3 uSunDir, uZenith, uHorizon, uAway, uGlow;
uniform float uDip, uAlt, uDaylight, uGolden, uWater, uSeed, uSunVis, uGlowStrength;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float hash3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return v;
}

void main() {
  vec3 d = normalize(vDir);
  float el = asin(clamp(d.y, -1.0, 1.0));
  float horizon = -uDip;
  float sunDot = dot(d, uSunDir);
  vec2 dh = normalize(d.xz + 1e-5);
  vec2 sh = normalize(uSunDir.xz + 1e-5);
  float toward = clamp((dot(dh, sh) + 1.0) * 0.5, 0.0, 1.0);
  vec3 hz = mix(uAway, uHorizon, 0.3 + 0.7 * toward * toward);
  vec3 col;

  if (el > horizon) {
    float t = clamp((el - horizon) / 1.1, 0.0, 1.0);
    col = mix(hz, uZenith, pow(t, 0.55));
    float g = pow(max(sunDot, 0.0), 6.0) * 0.45 + pow(max(sunDot, 0.0), 80.0) * 0.9;
    col += uGlow * g * uGlowStrength;
    col = mix(col, vec3(1.0, 0.98, 0.93), smoothstep(0.99986, 0.99993, sunDot) * uSunVis);
    if (uDaylight < 0.35) {
      vec3 q = floor(d * 380.0);
      float s = step(0.9982, hash3(q)) * (1.0 - uDaylight / 0.35) * smoothstep(horizon, horizon + 0.15, el);
      col += vec3(s * (0.5 + 0.5 * hash3(q + 3.0)));
    }
  } else {
    float dy = max(-d.y, 0.0025);
    vec2 p = d.xz / dy * uAlt;
    float dist = length(p);
    vec3 g;
    if (uWater > 0.5) {
      vec3 deep = mix(vec3(0.01, 0.015, 0.03), vec3(0.06, 0.19, 0.31), uDaylight);
      vec3 farc = mix(vec3(0.02, 0.03, 0.06), mix(vec3(0.42, 0.55, 0.68), vec3(0.85, 0.6, 0.45), uGolden), uDaylight);
      g = mix(deep, farc, smoothstep(0.0, 1.0, 1.0 - dy * 4.0));
      g *= 0.92 + 0.16 * fbm(p / 900.0);
      vec3 r = vec3(d.x, -d.y, d.z);
      float rd = max(dot(r, uSunDir), 0.0);
      float glitter = (pow(rd, 900.0) * 4.0 + pow(rd, 60.0) * 0.5) * (0.6 + 0.8 * noise(p / 40.0));
      g += mix(vec3(1.0), vec3(1.0, 0.72, 0.45), uGolden) * glitter * uSunVis;
    } else {
      float n = fbm(p / 5200.0);
      float n2 = fbm(p / 1100.0 + 9.0);
      vec3 a = vec3(0.27, 0.34, 0.19), b = vec3(0.47, 0.42, 0.29), c = vec3(0.18, 0.25, 0.14);
      g = mix(mix(a, b, smoothstep(0.35, 0.7, n)), c, smoothstep(0.4, 0.8, n2) * 0.7);
      g = mix(g, g * vec3(1.15, 0.9, 0.75), uGolden * 0.6);
      g *= uDaylight * 0.95 + 0.03;
      if (uDaylight < 0.6) {
        float city = smoothstep(0.58, 0.72, fbm(p / 26000.0 + 3.0));
        float lights = step(0.86, hash(floor(p / 260.0))) * city;
        g += vec3(1.0, 0.72, 0.38) * lights * (1.0 - uDaylight / 0.6) * 1.4;
      }
    }
    float cl = fbm(p / 9000.0 + uSeed);
    float cover = smoothstep(0.56, 0.78, cl);
    vec3 cloudCol = mix(vec3(0.05, 0.055, 0.07), mix(vec3(0.97), vec3(1.0, 0.8, 0.64), uGolden), uDaylight);
    g = mix(g, cloudCol, cover * 0.9);
    float haze = 1.0 - exp(-dist / 140000.0);
    col = mix(g, hz, clamp(haze, 0.0, 1.0) * 0.92);
  }
  gl_FragColor = vec4(col, 1.0);
}`

type Lerpable = [number, number, number, number]
const v3 = (c: Lerpable) => new THREE.Vector3(c[0] / 255, c[1] / 255, c[2] / 255)

export class Cabin360 {
  readonly renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(72, 1, 0.02, 60000)
  private cabin = new THREE.Group()
  private sky: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
  private sun = new THREE.DirectionalLight(0xffffff, 0)
  private ambient = new THREE.HemisphereLight(0xfff4e6, 0x30302c, 1)
  private cove: THREE.MeshBasicMaterial[] = []
  private navLights: THREE.Mesh[] = []
  private yaw = 0
  private pitch = -0.05
  private dirty = true
  private raf = 0
  private ro: ResizeObserver
  private builtFor: SeatMap | null = null
  private disposed = false

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    host.appendChild(this.renderer.domElement)
    this.camera.rotation.order = 'YXZ'
    // Soft, studio-like interior light for the cabin materials.
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environmentIntensity = 0.55
    pmrem.dispose()

    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(30000, 64, 32),
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false,
        uniforms: {
          uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uZenith: { value: new THREE.Vector3() },
          uHorizon: { value: new THREE.Vector3() }, uAway: { value: new THREE.Vector3() }, uGlow: { value: new THREE.Vector3() },
          uDip: { value: 0.05 }, uAlt: { value: 11000 }, uDaylight: { value: 1 }, uGolden: { value: 0 },
          uWater: { value: 0 }, uSeed: { value: 0 }, uSunVis: { value: 1 }, uGlowStrength: { value: 1 },
        },
      }),
    )
    this.sky.renderOrder = -1
    this.sky.frustumCulled = false
    this.scene.add(this.sky, this.cabin, this.sun, this.sun.target, this.ambient)

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(host)
    this.resize()
    this.attachControls()
    const loop = () => {
      if (this.disposed) return
      this.raf = requestAnimationFrame(loop)
      if (!this.dirty) return
      this.dirty = false
      this.sky.position.copy(this.camera.position)
      this.renderer.render(this.scene, this.camera)
    }
    loop()
  }

  private resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.dirty = true
  }

  private attachControls() {
    const el = this.renderer.domElement
    let drag: { x: number; y: number; yaw: number; pitch: number } | null = null
    el.style.cursor = 'grab'
    el.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, yaw: this.yaw, pitch: this.pitch }
      el.setPointerCapture(e.pointerId)
      el.style.cursor = 'grabbing'
    })
    el.addEventListener('pointermove', (e) => {
      if (!drag) return
      const k = (this.camera.fov * Math.PI / 180) / el.clientHeight
      this.yaw = drag.yaw + (e.clientX - drag.x) * k
      this.pitch = Math.max(-1.35, Math.min(1.35, drag.pitch + (e.clientY - drag.y) * k))
      this.applyView()
    })
    const end = () => { drag = null; el.style.cursor = 'grab' }
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
    el.addEventListener('wheel', (e) => {
      // Pinch (reported as ctrl+wheel) or Ctrl/Cmd+scroll zooms; plain scrolling keeps scrolling the page.
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      this.camera.fov = Math.max(30, Math.min(100, this.camera.fov + e.deltaY * 0.04))
      this.camera.updateProjectionMatrix()
      this.dirty = true
    }, { passive: false })
  }

  private applyView() {
    this.camera.rotation.set(this.pitch, this.yaw, 0)
    this.dirty = true
  }

  /** Looks straight at the window on the seat's side. */
  lookAtWindow(side: 'LEFT' | 'RIGHT') {
    this.yaw = side === 'LEFT' ? Math.PI / 2 : -Math.PI / 2
    this.pitch = -0.12
    this.applyView()
  }

  setSeat(sm: SeatMap, seat: Seat) {
    if (this.builtFor !== sm) this.build(sm)
    const xs = seatXs(seat.row.section)
    const lean = seat.kind === 'WINDOW' ? (seat.side === 'LEFT' ? 0.05 : -0.05) : 0
    this.camera.position.set((xs.get(seat.letter) ?? 0) + lean, EYE_Y, seat.row.eyeIn * IN)
    this.dirty = true
  }

  setScene(s: CabinScene) {
    const u = this.sky.material.uniforms
    const el = s.sunElevation
    const e = rad(el), th = rad(s.sunRelative)
    const dir = new THREE.Vector3(Math.sin(th) * Math.cos(e), Math.sin(e), -Math.cos(th) * Math.cos(e))
    const altKm = s.altitudeFt * 0.0003048
    const dip = Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altKm))
    const daylight = smooth(-8, 6, el)
    const golden = smooth(12, 2, el) * smooth(-5, 1, el)
    const [top, hzc] = skyColors(el)
    u.uSunDir.value.copy(dir)
    u.uZenith.value.copy(v3(top))
    u.uHorizon.value.copy(v3(hzc))
    u.uAway.value.copy(el > -7 && el < 4 ? new THREE.Vector3(0.66, 0.52, 0.6) : v3(top).lerp(v3(hzc), 0.6))
    u.uGlow.value.copy(el < 8 ? new THREE.Vector3(1, 0.62, 0.36) : new THREE.Vector3(1, 0.95, 0.85))
    u.uGlowStrength.value = smooth(-10, -1, el)
    u.uSunVis.value = el > -deg(dip) - 1 ? 1 : 0
    u.uDip.value = dip
    u.uAlt.value = Math.max(300, s.altitudeFt * 0.3048)
    u.uDaylight.value = daylight
    u.uGolden.value = golden
    u.uWater.value = s.water ? 1 : 0
    u.uSeed.value = (s.seed % 97) * 0.37

    // Sunlight through the windows and on the wing, warm when low.
    this.sun.position.copy(dir.clone().multiplyScalar(100).add(this.camera.position))
    this.sun.target.position.copy(this.camera.position)
    this.sun.color.set(golden > 0.3 ? 0xffc89a : 0xfff6ea)
    this.sun.intensity = el > -1 ? 1.5 * smooth(-1, 8, el) : 0
    this.ambient.intensity = 0.25 + 0.6 * daylight
    this.scene.environmentIntensity = 0.25 + 0.4 * daylight
    this.ambient.color.set(daylight > 0.4 ? 0xfff4e6 : 0x9aa6d8)
    const coveGlow = 0.35 + 0.65 * (1 - daylight)
    this.cove.forEach((m) => m.color.setRGB(1 * coveGlow, 0.86 * coveGlow, 0.7 * coveGlow))
    this.navLights.forEach((m) => { (m.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.45 * (1 - daylight) })
    this.dirty = true
  }

  private build(sm: SeatMap) {
    this.builtFor = sm
    this.cabin.traverse((o) => {
      const m = o as THREE.Mesh
      m.geometry?.dispose()
      const mat = m.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose()
    })
    this.cabin.clear()
    this.cove = []
    this.navLights = []

    const ac = sm.aircraft
    const L = sm.cabinLengthIn * IN
    const halfW = cabinHalfWidth(ac)
    const wide = ac.widebody
    const wallTop = wide ? 1.62 : 1.55
    const ceilH = wide ? 2.55 : 2.2

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe9e5de, roughness: 0.92, side: THREE.DoubleSide })
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xd8d3ca, roughness: 0.8, side: THREE.DoubleSide })
    const binMat = new THREE.MeshStandardMaterial({ color: 0xf1efea, roughness: 0.75 })
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x3b3e46, roughness: 1 })
    const aisleMat = new THREE.MeshStandardMaterial({ color: 0x2b2d33, roughness: 1 })

    // Floor and aisle runners.
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, L), floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.set(0, 0, L / 2)
    this.cabin.add(floor)
    const ref = ac.sections[ac.sections.length - 1]
    let ax = -rowWidthIn(ref) / 2
    for (const c of ref.layout) {
      if (c === '-') {
        const runner = new THREE.Mesh(new THREE.PlaneGeometry(AISLE_IN * IN * 0.8, L), aisleMat)
        runner.rotation.x = -Math.PI / 2
        runner.position.set((ax + AISLE_IN / 2) * IN, 0.002, L / 2)
        this.cabin.add(runner)
        ax += AISLE_IN
      } else ax += seatUnitIn(ref)
    }

    // Side walls with real window cut-outs and a deep reveal.
    const winW = ac.windowWidthIn * IN, winH = ac.windowHeightIn * IN
    const r = Math.min(winW, winH) * 0.46
    for (const sign of [-1, 1]) {
      const sx = (z: number) => (sign > 0 ? -z : z)
      const wall = new THREE.Shape()
      wall.moveTo(sx(0), 0.12); wall.lineTo(sx(L), 0.12); wall.lineTo(sx(L), wallTop); wall.lineTo(sx(0), wallTop); wall.closePath()
      for (const c of sm.windows) wall.holes.push(roundedRect(new THREE.Path(), sx(c * IN), WIN_Y, winW, winH, r))
      const g = new THREE.Group()
      g.rotation.y = sign > 0 ? Math.PI / 2 : -Math.PI / 2
      g.position.x = sign * halfW
      g.add(new THREE.Mesh(new THREE.ShapeGeometry(wall, 16), wallMat))
      for (const c of sm.windows) {
        const ring = roundedRect(new THREE.Shape(), sx(c * IN), WIN_Y, winW + 0.05, winH + 0.05, r + 0.025)
        ring.holes.push(roundedRect(new THREE.Path(), sx(c * IN), WIN_Y, winW, winH, r))
        const reveal = new THREE.Mesh(new THREE.ExtrudeGeometry(ring, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 18 }), trimMat)
        g.add(reveal)
        // pulled-down window shade
        const shade = new THREE.Mesh(new THREE.PlaneGeometry(winW * 0.98, winH * 0.12), new THREE.MeshStandardMaterial({ color: 0xefede8, roughness: 0.9, side: THREE.DoubleSide }))
        shade.position.set(sx(c * IN), WIN_Y + winH * 0.42, 0.07)
        g.add(shade)
      }
      // dado panel below the windows
      const dado = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.12), trimMat)
      dado.position.set(sx(L / 2), 0.06, -0.04)
      g.add(dado)
      this.cabin.add(g)
    }

    // Ceiling arc.
    const cy = (ceilH * ceilH - halfW * halfW - wallTop * wallTop) / (2 * (ceilH - wallTop))
    const R = ceilH - cy
    const phi0 = Math.asin(Math.min(1, halfW / R))
    const segs = 24
    const pos: number[] = []
    for (let i = 0; i < segs; i++) {
      const a0 = -phi0 + (2 * phi0 * i) / segs, a1 = -phi0 + (2 * phi0 * (i + 1)) / segs
      const p0 = [R * Math.sin(a0), cy + R * Math.cos(a0)], p1 = [R * Math.sin(a1), cy + R * Math.cos(a1)]
      pos.push(p0[0], p0[1], 0, p1[0], p1[1], 0, p1[0], p1[1], L, p0[0], p0[1], 0, p1[0], p1[1], L, p0[0], p0[1], L)
    }
    const ceilGeo = new THREE.BufferGeometry()
    ceilGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    ceilGeo.computeVertexNormals()
    this.cabin.add(new THREE.Mesh(ceilGeo, new THREE.MeshStandardMaterial({ color: 0xf3f1ec, roughness: 0.9, side: THREE.DoubleSide })))

    // Overhead bins with a warm light cove underneath.
    const binDepth = wide ? 0.62 : 0.56
    for (const sign of [-1, 1]) {
      const bin = new THREE.Mesh(new THREE.BoxGeometry(binDepth, 0.42, L - 0.6), binMat)
      bin.position.set(sign * (halfW - binDepth / 2 + 0.02), wallTop + 0.2, L / 2)
      this.cabin.add(bin)
      const lip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, L - 0.6), new THREE.MeshStandardMaterial({ color: 0xc9c4ba, roughness: 0.6 }))
      lip.position.set(sign * (halfW - binDepth + 0.03), wallTop + 0.0, L / 2)
      this.cabin.add(lip)
      const coveMat = new THREE.MeshBasicMaterial({ color: 0xffdcb4 })
      this.cove.push(coveMat)
      const cove = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, L - 0.8), coveMat)
      cove.position.set(sign * (halfW - binDepth + 0.05), wallTop - 0.012, L / 2)
      this.cabin.add(cove)
    }
    if (wide) {
      const center = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.36, L - 1.2), binMat)
      center.position.set(0, 1.98, L / 2)
      this.cabin.add(center)
    }
    // Ceiling light strip.
    const stripMat = new THREE.MeshBasicMaterial({ color: 0xfff1de })
    this.cove.push(stripMat)
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, L - 1), stripMat)
    strip.position.set(0, ceilH - 0.02, L / 2)
    this.cabin.add(strip)

    // Front and rear bulkheads.
    for (const z of [0.02, L - 0.02]) {
      const bh = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, ceilH), trimMat)
      bh.position.set(0, ceilH / 2, z)
      this.cabin.add(bh)
    }

    this.buildSeats(sm)
    this.buildWings(sm, halfW)
    this.dirty = true
  }

  private buildSeats(sm: SeatMap) {
    const seats = sm.rows.flatMap((row) => sm.seatsOf(row))
    const n = seats.length
    const box = new RoundedBoxGeometry(1, 1, 1, 3, 0.18)
    const flat = new THREE.BoxGeometry(1, 1, 1)
    const cushion = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ roughness: 0.85 }), n)
    const back = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ roughness: 0.85 }), n)
    const head = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.9 }), n)
    const screen = new THREE.InstancedMesh(flat, new THREE.MeshStandardMaterial({ color: 0x0b0c0f, roughness: 0.3, emissive: 0x1a2533, emissiveIntensity: 0.8 }), n)
    const arm = new THREE.InstancedMesh(flat, new THREE.MeshStandardMaterial({ color: 0x55585f, roughness: 0.6 }), n)
    const colors: Record<string, number> = { ECONOMY: 0x2f3440, PREMIUM: 0x3a3f4a, BUSINESS: 0x4b4540, FIRST: 0x5b4a39 }
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3()
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.14)
    const ident = new THREE.Quaternion()
    const xsCache = new Map<CabinSection, Map<string, number>>()
    seats.forEach((seat, i) => {
      const sec = seat.row.section
      let xs = xsCache.get(sec)
      if (!xs) { xs = seatXs(sec); xsCache.set(sec, xs) }
      const x = xs.get(seat.letter) ?? 0
      const w = sec.seatWidthIn * IN
      const big = sec.cabinClass === 'BUSINESS' || sec.cabinClass === 'FIRST'
      const backZ = (seat.row.frontIn + seat.row.pitchIn) * IN - 0.06
      const col = new THREE.Color(colors[sec.cabinClass])
      // cushion
      m.compose(p.set(x, 0.42, backZ - 0.26), ident, s.set(w, 0.12, 0.5)); cushion.setMatrixAt(i, m); cushion.setColorAt(i, col)
      // backrest (slightly reclined)
      const bh = big ? 0.82 : 0.7
      q.copy(tilt)
      m.compose(p.set(x, 0.48 + bh / 2, backZ + 0.02), q, s.set(w, bh, 0.09)); back.setMatrixAt(i, m); back.setColorAt(i, col)
      // headrest cover
      m.compose(p.set(x, 0.48 + bh - 0.1, backZ + 0.035), q, s.set(w * 0.82, 0.2, 0.095)); head.setMatrixAt(i, m)
      // seat-back screen faces aft
      m.compose(p.set(x, 0.48 + bh * 0.62, backZ + 0.075), q, s.set(Math.min(w * 0.6, 0.3), 0.17, 0.012)); screen.setMatrixAt(i, m)
      // armrest
      m.compose(p.set(x - w / 2 - 0.02, 0.62, backZ - 0.22), ident, s.set(0.045, 0.05, 0.42)); arm.setMatrixAt(i, m)
    })
    for (const im of [cushion, back, head, screen, arm]) {
      im.instanceMatrix.needsUpdate = true
      if (im.instanceColor) im.instanceColor.needsUpdate = true
      this.cabin.add(im)
    }
  }

  private buildWings(sm: SeatMap, halfW: number) {
    const ac = sm.aircraft
    const high = ac.wing === 'HIGH'
    const semi = (ac.widebody ? 1150 : ac.propeller ? 480 : 560) * IN
    const rootLE = sm.wingStartIn * IN, rootTE = sm.wingEndIn * IN
    const chord = rootTE - rootLE
    const sweep = ac.propeller ? 0.05 : 0.5
    const rootY = EYE_Y - (high ? -70 : ac.widebody ? 95 : 65) * IN
    const dihedral = high ? -0.01 : 0.06
    const tipLE = rootLE + sweep * semi
    const tipTE = tipLE + chord * 0.3
    const tipY = rootY + semi * dihedral
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xaeb4bd, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide })
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x26292f, roughness: 0.5 })
    const nacMat = new THREE.MeshStandardMaterial({ color: 0xe4e6ea, roughness: 0.35, metalness: 0.4 })


    for (const sign of [-1, 1]) {
      const root = halfW + 0.2
      const tRoot = high ? 0.35 : 0.55, tTip = 0.12
      const v = (x: number, y: number, z: number) => [sign * x, y, z]
      const P = [
        v(root, rootY + tRoot / 2, rootLE), v(root, rootY + tRoot / 2, rootTE), v(root + semi, tipY + tTip / 2, tipTE), v(root + semi, tipY + tTip / 2, tipLE),
        v(root, rootY - tRoot / 2, rootLE), v(root, rootY - tRoot / 2, rootTE), v(root + semi, tipY - tTip / 2, tipTE), v(root + semi, tipY - tTip / 2, tipLE),
      ]
      const faces = [[0, 1, 2, 3], [7, 6, 5, 4], [0, 3, 7, 4], [1, 5, 6, 2], [3, 2, 6, 7], [0, 4, 5, 1]]
      const arr: number[] = []
      for (const [a, b, c, d] of faces) arr.push(...P[a], ...P[b], ...P[c], ...P[a], ...P[c], ...P[d])
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
      g.computeVertexNormals()
      this.cabin.add(new THREE.Mesh(g, wingMat))


      // winglet
      if (!ac.propeller) {
        const wl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, chord * 0.22), wingMat)
        wl.position.set(sign * (root + semi), tipY + 1.1, tipTE - chord * 0.13)
        wl.rotation.z = -sign * 0.25
        this.cabin.add(wl)
      }
      // navigation light: red on the left wing, green on the right
      const navCol = sign < 0 ? 0xff3b30 : 0x34c759
      const nav = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshBasicMaterial({ color: navCol, transparent: true, opacity: 1 }))
      nav.position.set(sign * (root + semi + 0.05), tipY, tipTE - chord * 0.18)
      this.navLights.push(nav)
      this.cabin.add(nav)

      // engines
      const lats = ac.engines === 4 ? [semi * 0.33, semi * 0.62] : [ac.propeller ? semi * 0.28 : semi * 0.33]
      const nacLen = (ac.widebody ? 190 : ac.propeller ? 150 : 140) * IN
      const dia = (ac.widebody ? 125 : ac.propeller ? 45 : 75) * IN
      for (const lat of lats) {
        const le = rootLE + sweep * lat
        const front = le - nacLen * (ac.propeller ? 0.3 : 0.55)
        const yAt = rootY + lat * dihedral
        const y = high ? yAt + dia * 0.55 : yAt - dia * 0.62
        const x = sign * (root + lat)
        const nac = new THREE.Mesh(new THREE.CylinderGeometry(dia / 2, dia * 0.38, nacLen, 32, 1, false), nacMat)
        nac.rotation.x = Math.PI / 2
        nac.position.set(x, y, front + nacLen / 2)
        this.cabin.add(nac)
        const inlet = new THREE.Mesh(new THREE.CircleGeometry(dia * 0.44, 32), darkMat)
        inlet.position.set(x, y, front - 0.002)
        inlet.rotation.y = Math.PI
        this.cabin.add(inlet)
        const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.12, Math.abs(yAt - y), nacLen * 0.6), wingMat)
        pylon.position.set(x, (yAt + y) / 2, front + nacLen * 0.5)
        this.cabin.add(pylon)
        if (ac.propeller) {
          const disc = new THREE.Mesh(new THREE.CircleGeometry(dia * 1.9, 40), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.12, side: THREE.DoubleSide }))
          disc.position.set(x, y, front - 0.15)
          this.cabin.add(disc)
        }
      }
    }
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
