import type * as CesiumNS from 'cesium'
import { Side } from '../aircraft/seatMap'
import { RouteSample } from '../flight/analyzer'
import { destination } from '../geo/geo'

/**
 * A Google-Earth-style globe (CesiumJS) with real satellite imagery and real sun lighting for the
 * moment in the flight, seen from the aircraft's position and altitude, looking out of the chosen side.
 * Cesium is loaded on demand so the rest of the app stays light.
 */

type Cesium = typeof CesiumNS
let cesiumPromise: Promise<Cesium> | null = null

function loadCesium(): Promise<Cesium> {
  if (!cesiumPromise) {
    ;(window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = new URL('cesium/', document.baseURI).href
    cesiumPromise = Promise.all([import('cesium'), import('cesium/Build/Cesium/Widgets/widgets.css')]).then(([c]) => c)
    cesiumPromise.catch(() => { cesiumPromise = null })
  }
  return cesiumPromise
}

const GOOGLE_KEY = 'airsitter.googleMapsKey'
export const getGoogleKey = () => localStorage.getItem(GOOGLE_KEY) ?? ''
export const setGoogleKey = (k: string) => (k ? localStorage.setItem(GOOGLE_KEY, k) : localStorage.removeItem(GOOGLE_KEY))

export interface EarthPose { sample: RouteSample; side: Side; yaw: number; pitch: number }

export class EarthView {
  private constructor(private C: Cesium, private viewer: CesiumNS.Viewer) {}
  private google: CesiumNS.Cesium3DTileset | null = null

  static async create(host: HTMLElement): Promise<EarthView> {
    const C = await loadCesium()
    const viewer = new C.Viewer(host, {
      baseLayer: false,
      baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false, navigationHelpButton: false,
      animation: false, timeline: false, fullscreenButton: false, infoBox: false, selectionIndicator: false,
      requestRenderMode: true, maximumRenderTimeChange: Infinity,
    })
    const imagery = await C.ArcGisMapServerImageryProvider.fromUrl(
      'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
    )
    viewer.imageryLayers.addImageryProvider(imagery)
    const scene = viewer.scene
    scene.globe.enableLighting = true
    scene.globe.dynamicAtmosphereLighting = true
    scene.globe.dynamicAtmosphereLightingFromSun = true
    scene.globe.showGroundAtmosphere = true
    scene.globe.maximumScreenSpaceError = 1.5
    scene.fog.enabled = true
    scene.fog.density = 1.2e-4
    if (scene.skyAtmosphere) scene.skyAtmosphere.show = true
    if (scene.sun) scene.sun.show = true
    scene.screenSpaceCameraController.enableInputs = false
    ;(viewer.camera.frustum as CesiumNS.PerspectiveFrustum).fov = C.Math.toRadians(68)
    viewer.clock.shouldAnimate = false
    return new EarthView(C, viewer)
  }

  update({ sample, side, yaw, pitch }: EarthPose) {
    const C = this.C
    const look = sample.heading + (side === 'LEFT' ? -90 : 90) + yaw
    this.viewer.clock.currentTime = C.JulianDate.fromDate(new Date(sample.time))
    this.viewer.camera.setView({
      destination: C.Cartesian3.fromDegrees(sample.pos.lon, sample.pos.lat, Math.max(150, sample.altitudeFt * 0.3048)),
      orientation: { heading: C.Math.toRadians(look), pitch: C.Math.toRadians(-7 + pitch), roll: 0 },
    })
    this.viewer.scene.requestRender()
  }

  /** Adds Google Photorealistic 3D Tiles (needs the user's own Google Maps Platform key). */
  async enableGoogleTiles(key: string) {
    const C = this.C
    if (this.google) { this.viewer.scene.primitives.remove(this.google); this.google = null }
    if (!key) { this.viewer.scene.globe.show = true; this.viewer.scene.requestRender(); return }
    const tileset = await C.createGooglePhotorealistic3DTileset({ key, onlyUsingWithGoogleGeocoder: true })
    this.google = this.viewer.scene.primitives.add(tileset)
    this.viewer.scene.globe.show = false
    this.viewer.scene.requestRender()
  }

  destroy() {
    if (!this.viewer.isDestroyed()) this.viewer.destroy()
  }
}

/** Deep link that opens the same view in Google Earth on the web. */
export function googleEarthUrl(sample: RouteSample, side: Side): string {
  const heading = (sample.heading + (side === 'LEFT' ? -90 : 90) + 360) % 360
  const alt = Math.max(150, sample.altitudeFt * 0.3048)
  const groundKm = 60
  const target = destination(sample.pos, heading, groundKm)
  const range = Math.round(Math.hypot(groundKm * 1000, alt))
  const tilt = (Math.atan2(groundKm * 1000, alt) * 180) / Math.PI
  return `https://earth.google.com/web/@${target.lat.toFixed(5)},${target.lon.toFixed(5)},0a,${range}d,60y,${heading.toFixed(1)}h,${tilt.toFixed(1)}t,0r`
}
