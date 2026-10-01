import * as THREE from 'three'

/** Photo-cutout zebra standing idle: a static body layer, an independently
 *  pivoting tail layer (cut from the same photo) for real wag motion, and a
 *  faded mirrored reflection. No procedural geometry or external 3D asset —
 *  the real photo reads far better than hand-built boxes ever would here. */

export interface ZebraRig {
  root: THREE.Group
  body: THREE.Mesh
  tailPivot: THREE.Group
  shadow: THREE.Mesh
}

function makeShadowTexture(): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(0,0,0,0.45)')
  gradient.addColorStop(0.7, 'rgba(0,0,0,0.18)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

export interface ZebraTextures {
  body: THREE.Texture
  tail: THREE.Texture
  full: THREE.Texture
}

// Tail attachment point in the SOURCE PHOTO's pixel coordinates (where the
// hair strand meets the rump) — must match the centerline used to cut
// zebra-tail.png/zebra-body.png (see scratchpad/split_tail3.py).
const SOURCE_SIZE = { width: 943, height: 984 }
const TAIL_ATTACH_PX = { x: 85, y: 268 }

export function buildZebra(textures: ZebraTextures): ZebraRig {
  for (const t of [textures.body, textures.tail, textures.full]) {
    t.colorSpace = THREE.SRGBColorSpace
  }

  const aspect = SOURCE_SIZE.width / SOURCE_SIZE.height
  const height = 1.7
  const width = height * aspect

  const root = new THREE.Group()

  // --- body (static) ---
  const bodyGeo = new THREE.PlaneGeometry(width, height)
  const bodyMat = new THREE.MeshBasicMaterial({
    map: textures.body,
    transparent: true,
    alphaTest: 0.08,
    side: THREE.DoubleSide,
  })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.y = height / 2
  root.add(body)

  // --- tail (independently animated) ---
  const pivotLocalX = -width / 2 + (TAIL_ATTACH_PX.x / SOURCE_SIZE.width) * width
  const pivotLocalY = height / 2 - (TAIL_ATTACH_PX.y / SOURCE_SIZE.height) * height

  const tailPivot = new THREE.Group()
  tailPivot.position.set(pivotLocalX, height / 2 + pivotLocalY, 0.01)
  root.add(tailPivot)

  const tailGeo = new THREE.PlaneGeometry(width, height)
  const tailMat = new THREE.MeshBasicMaterial({
    map: textures.tail,
    transparent: true,
    alphaTest: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const tailMesh = new THREE.Mesh(tailGeo, tailMat)
  tailMesh.position.set(-pivotLocalX, -pivotLocalY, 0)
  tailPivot.add(tailMesh)

  // --- soft contact shadow ---
  const shadowTex = makeShadowTexture()
  const shadowGeo = new THREE.PlaneGeometry(width * 0.85, height * 0.3)
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
  })
  const shadow = new THREE.Mesh(shadowGeo, shadowMat)
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.015
  root.add(shadow)

  // --- faded mirrored reflection on the "ground" ---
  const reflGeo = new THREE.PlaneGeometry(width, height)
  const reflMat = new THREE.MeshBasicMaterial({
    map: textures.full,
    transparent: true,
    alphaTest: 0.08,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const reflection = new THREE.Mesh(reflGeo, reflMat)
  reflection.scale.y = -1
  reflection.position.y = -height / 2 - 0.02
  root.add(reflection)

  return { root, body, tailPivot, shadow }
}

/** Advances the idle pose for one frame. `t` is seconds elapsed. */
export function animateZebra(rig: ZebraRig, t: number): void {
  // Breathing: barely-there scale pulse so the body doesn't read as a dead
  // cutout, without distorting the stripe pattern noticeably.
  const breathe = 1 + Math.sin(t * 1.1) * 0.012
  rig.body.scale.set(breathe, 1 / breathe, 1)

  // Tiny idle weight-shift.
  rig.body.rotation.z = Math.sin(t * 0.55) * 0.012

  // Tail swish: a lazy, content wag — not a running gait.
  rig.tailPivot.rotation.z = Math.sin(t * 1.7) * 0.22 + Math.sin(t * 0.33) * 0.05
}
