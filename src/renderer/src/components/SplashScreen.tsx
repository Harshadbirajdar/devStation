import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import zebraBodyImg from '../assets/zebra-body.png'
import zebraFullImg from '../assets/zebra.png'
import zebraTailImg from '../assets/zebra-tail.png'
import { animateZebra, buildZebra, type ZebraRig } from '../lib/zebraModel'

interface Props {
  fadingOut: boolean
}

function makeDustMotes(count: number): THREE.Points {
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 3.2
    positions[i * 3 + 1] = Math.random() * 1.8
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2
    seeds[i] = Math.random() * Math.PI * 2
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1))

  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255,244,214,0.9)')
  gradient.addColorStop(1, 'rgba(255,244,214,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const dotTexture = new THREE.CanvasTexture(canvas)

  const mat = new THREE.PointsMaterial({
    size: 0.045,
    map: dotTexture,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  })
  return new THREE.Points(geo, mat)
}

export default function SplashScreen({ fadingOut }: Props): JSX.Element {
  const mountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let cancelled = false

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x14161f)
    scene.fog = new THREE.Fog(0x14161f, 6, 13)

    const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 50)
    const cameraBaseZ = 6.2

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const ambient = new THREE.AmbientLight(0x8890b0, 0.65)
    scene.add(ambient)
    const key = new THREE.DirectionalLight(0xffffff, 1.4)
    key.position.set(3, 5, 4)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x5b5ff2, 0.8)
    rim.position.set(-4, 2, -3)
    scene.add(rim)

    const groundGeo = new THREE.PlaneGeometry(40, 20)
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1b1d29, roughness: 1 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    scene.add(ground)

    const dust = makeDustMotes(70)
    scene.add(dust)

    let rig: ZebraRig | null = null
    const loader = new THREE.TextureLoader()
    Promise.all([
      new Promise<THREE.Texture>((res) => loader.load(zebraBodyImg, res)),
      new Promise<THREE.Texture>((res) => loader.load(zebraTailImg, res)),
      new Promise<THREE.Texture>((res) => loader.load(zebraFullImg, res)),
    ]).then(([body, tail, full]) => {
      if (cancelled) {
        body.dispose()
        tail.dispose()
        full.dispose()
        return
      }
      rig = buildZebra({ body, tail, full })
      scene.add(rig.root)
    })

    let frameId = 0
    const clock = new THREE.Clock()

    const onResize = (): void => {
      if (!mount) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

    const tick = (): void => {
      clock.getDelta()
      const t = clock.elapsedTime

      // Slow cinematic drift rather than a hard loop — the splash is only
      // on screen briefly, so a gentle arc reads better than a full orbit.
      camera.position.set(Math.sin(t * 0.25) * 0.9, 1.6 + Math.sin(t * 0.18) * 0.08, cameraBaseZ)
      camera.lookAt(0, 0.75, 0)

      if (rig) {
        animateZebra(rig, t)
      }

      const dustPos = dust.geometry.getAttribute('position') as THREE.BufferAttribute
      const seeds = dust.geometry.getAttribute('seed') as THREE.BufferAttribute
      for (let i = 0; i < dustPos.count; i++) {
        const seed = seeds.getX(i)
        const y = dustPos.getY(i) + 0.0025
        dustPos.setY(i, y > 1.9 ? 0 : y)
        dustPos.setX(i, dustPos.getX(i) + Math.sin(t * 0.6 + seed) * 0.0007)
      }
      dustPos.needsUpdate = true

      renderer.render(scene, camera)
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry.dispose()
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach((m) => {
            const map = (m as THREE.MeshStandardMaterial | THREE.PointsMaterial).map
            map?.dispose()
            m.dispose()
          })
        }
      })
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div className={`splash-screen ${fadingOut ? 'fading' : ''}`}>
      <div ref={mountRef} className="splash-canvas-mount" />
      <div className="splash-caption">
        <span className="splash-brand">Dev Station</span>
        <span className="splash-tagline">warming up your workspace…</span>
      </div>
    </div>
  )
}
