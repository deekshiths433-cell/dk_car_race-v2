import * as THREE from 'three';
import { BiomeType, LevelConfig } from '../types/game';
import {
  getAsphaltRoughnessTexture,
  getAsphaltTexture,
  getCheckeredLineTexture,
  getCurbTexture,
  getFinishBannerTexture,
} from './ProceduralTextures';

export interface TrackSample {
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  t: number;
  distance: number;
}

export interface TrackObstacle {
  position: THREE.Vector3;
  radius: number;
  hit: boolean;
  mesh: THREE.Object3D;
}

export interface CheckpointGate {
  index: number;
  t: number;
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  ringMesh: THREE.Mesh;
}

export interface GeneratedTrack {
  group: THREE.Group;
  curve: THREE.CatmullRomCurve3;
  samples: TrackSample[];
  totalLength: number;
  roadWidth: number;
  checkpoints: CheckpointGate[];
  obstacles: TrackObstacle[];
  minimapPoints: { x: number; z: number }[];
  minimapBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  getNearestSample: (pos: THREE.Vector3, hintIndex?: number) => { sample: TrackSample; index: number; lateralOffset: number; distSq: number };
}

// Deterministic seeded PRNG
function createRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildRibbonGeometry(
  samples: TrackSample[],
  halfWidthInner: number,
  halfWidthOuter: number,
  yOffset: number,
  uvScaleZ: number
): THREE.BufferGeometry {
  const count = samples.length;
  const positions = new Float32Array(count * 2 * 3);
  const uvs = new Float32Array(count * 2 * 2);
  const indices: number[] = [];

  for (let i = 0; i < count; i++) {
    const s = samples[i];
    const pL = s.point.clone().addScaledVector(s.right, halfWidthInner);
    const pR = s.point.clone().addScaledVector(s.right, halfWidthOuter);
    pL.y += yOffset;
    pR.y += yOffset;

    const vi = i * 6;
    positions[vi] = pL.x;
    positions[vi + 1] = pL.y;
    positions[vi + 2] = pL.z;
    positions[vi + 3] = pR.x;
    positions[vi + 4] = pR.y;
    positions[vi + 5] = pR.z;

    const ui = i * 4;
    const vCoord = (s.distance / uvScaleZ);
    uvs[ui] = 0;
    uvs[ui + 1] = vCoord;
    uvs[ui + 2] = 1;
    uvs[ui + 3] = vCoord;

    if (i < count - 1) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function getBiomeGroundColor(biome: BiomeType): number {
  switch (biome) {
    case 'desert':
      return 0xb47b48;
    case 'mountain':
      return 0x3b4d3b;
    case 'coastal':
      return 0xc2b280;
    case 'snow':
      return 0xdce6f2;
    case 'night_neon':
      return 0x0b0e18;
    case 'city':
    default:
      return 0x26312a;
  }
}

export function generateProceduralTrack(
  level: LevelConfig,
  propBudgetMultiplier = 1.0,
  maxAniso = 8
): GeneratedTrack {
  const rng = createRng(level.seed);
  const group = new THREE.Group();
  const roadWidth = 15.5;
  const halfRoad = roadWidth * 0.5;

  // 1. Control points for closed organic racing circuit
  const controlCount = 16;
  const baseRadius = level.trackLengthMeters / (Math.PI * 2);
  const controlPoints: THREE.Vector3[] = [];
  const phaseA = rng() * Math.PI * 2;
  const phaseB = rng() * Math.PI * 2;

  for (let i = 0; i < controlCount; i++) {
    const angle = (i / controlCount) * Math.PI * 2;
    // Keep start straight smooth around angle ~ 0
    const straightMask = Math.min(1, Math.abs(Math.sin(angle * 0.5)) * 2.2);
    const wave =
      Math.sin(angle * 3 + phaseA) * 0.24 * level.trackCurviness +
      Math.cos(angle * 5 + phaseB) * 0.14 * level.trackCurviness;
    const r = baseRadius * (1 + wave * straightMask);
    const elev =
      level.biome === 'mountain'
        ? Math.sin(angle * 2 + phaseA) * 7.5 * straightMask
        : level.biome === 'coastal' || level.biome === 'desert'
          ? Math.sin(angle * 3) * 2.2 * straightMask
          : 0;

    controlPoints.push(
      new THREE.Vector3(Math.cos(angle) * r, Math.max(0, elev), Math.sin(angle) * r)
    );
  }

  const curve = new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', 0.5);
  const totalLength = curve.getLength();
  const sampleCount = 360;
  const samples: TrackSample[] = [];
  const up = new THREE.Vector3(0, 1, 0);

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i <= sampleCount; i++) {
    const t = i / sampleCount;
    const point = curve.getPointAt(t % 1);
    const tangent = curve.getTangentAt(t % 1).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
    samples.push({
      point,
      tangent,
      right,
      t,
      distance: t * totalLength,
    });
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.z < minZ) minZ = point.z;
    if (point.z > maxZ) maxZ = point.z;
  }

  // 2. Ground terrain extending far to horizon (prevents floating box void)
  const terrainSize = Math.max(2400, totalLength * 1.4);
  const terrainMat = new THREE.MeshStandardMaterial({
    color: getBiomeGroundColor(level.biome),
    roughness: level.biome === 'snow' ? 0.65 : 0.92,
    metalness: 0.04,
  });
  const terrain = new THREE.Mesh(
    new THREE.PlaneGeometry(terrainSize, terrainSize),
    terrainMat
  );
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.15;
  terrain.receiveShadow = true;
  group.add(terrain);

  // Coastal ocean water plane on one side
  if (level.biome === 'coastal') {
    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(terrainSize, terrainSize * 0.55),
      new THREE.MeshPhysicalMaterial({
        color: 0x0369a1,
        roughness: 0.14,
        metalness: 0.35,
        clearcoat: 0.9,
      })
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(terrainSize * 0.25, -0.04, 0);
    group.add(ocean);
  }

  // 3. Asphalt Road Ribbon
  const isWet = level.weather === 'rain' || level.biome === 'night_neon';
  const asphaltTex = getAsphaltTexture(isWet, maxAniso);
  const asphaltRough = getAsphaltRoughnessTexture(isWet);
  const roadMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughnessMap: asphaltRough,
    roughness: isWet ? 0.32 : 0.85,
    metalness: isWet ? 0.22 : 0.05,
  });
  const roadGeo = buildRibbonGeometry(samples, -halfRoad, halfRoad, 0.03, 14);
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  group.add(roadMesh);

  // 4. FIA Curbs on both sides
  const curbMat = new THREE.MeshStandardMaterial({
    map: getCurbTexture(),
    roughness: 0.72,
  });
  const leftCurb = new THREE.Mesh(
    buildRibbonGeometry(samples, -halfRoad - 1.1, -halfRoad, 0.05, 8),
    curbMat
  );
  const rightCurb = new THREE.Mesh(
    buildRibbonGeometry(samples, halfRoad, halfRoad + 1.1, 0.05, 8),
    curbMat
  );
  leftCurb.receiveShadow = true;
  rightCurb.receiveShadow = true;
  group.add(leftCurb, rightCurb);

  // 5. Outer Barrier Rails (subtle low metallic crash barriers)
  const railMat = new THREE.MeshStandardMaterial({
    color: level.biome === 'night_neon' ? 0x1e293b : 0x94a3b8,
    metalness: 0.65,
    roughness: 0.35,
  });
  const leftRail = new THREE.Mesh(
    buildRibbonGeometry(samples, -halfRoad - 1.85, -halfRoad - 1.55, 0.55, 10),
    railMat
  );
  const rightRail = new THREE.Mesh(
    buildRibbonGeometry(samples, halfRoad + 1.55, halfRoad + 1.85, 0.55, 10),
    railMat
  );
  group.add(leftRail, rightRail);

  // 6. Start / Finish Line & Overhead Truss Gantry
  const startSample = samples[0];
  const finishLine = new THREE.Mesh(
    new THREE.PlaneGeometry(roadWidth, 3.8),
    new THREE.MeshStandardMaterial({
      map: getCheckeredLineTexture(),
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  finishLine.rotation.x = -Math.PI / 2;
  const startYaw = Math.atan2(startSample.tangent.x, startSample.tangent.z);
  finishLine.rotation.z = -startYaw;
  finishLine.position.copy(startSample.point).add(new THREE.Vector3(0, 0.06, 0));
  group.add(finishLine);

  const gantryGroup = new THREE.Group();
  gantryGroup.position.copy(startSample.point);
  gantryGroup.rotation.y = startYaw;
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
  [-halfRoad - 1.4, halfRoad + 1.4].forEach((px) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.75, 7.5, 0.75), pillarMat);
    pillar.position.set(px, 3.75, 0);
    pillar.castShadow = true;
    gantryGroup.add(pillar);
  });
  const banner = new THREE.Mesh(
    new THREE.BoxGeometry(roadWidth + 3.2, 2.1, 0.55),
    new THREE.MeshStandardMaterial({
      map: getFinishBannerTexture(),
      emissive: 0x111111,
      roughness: 0.35,
    })
  );
  banner.position.set(0, 6.8, 0);
  gantryGroup.add(banner);
  group.add(gantryGroup);

  // 7. Checkpoint Gates (4 evenly spaced around track)
  const checkpoints: CheckpointGate[] = [];
  const cpTs = [0.2, 0.4, 0.6, 0.8];
  cpTs.forEach((t, idx) => {
    const sIdx = Math.floor(t * sampleCount);
    const s = samples[sIdx];
    const gate = new THREE.Mesh(
      new THREE.TorusGeometry(halfRoad * 0.88, 0.16, 8, 28, Math.PI),
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 1.4,
        transparent: true,
        opacity: 0.75,
      })
    );
    gate.position.copy(s.point).add(new THREE.Vector3(0, 0.1, 0));
    gate.rotation.y = Math.atan2(s.tangent.x, s.tangent.z);
    group.add(gate);
    checkpoints.push({
      index: idx,
      t,
      position: s.point.clone(),
      tangent: s.tangent.clone(),
      ringMesh: gate,
    });
  });

  // 8. Dynamic Obstacles (cones / construction barriers) scaling with level difficulty
  const obstacles: TrackObstacle[] = [];
  const coneGeo = new THREE.ConeGeometry(0.45, 1.05, 10);
  const coneMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0x7c2d12,
    emissiveIntensity: 0.3,
    roughness: 0.45,
  });
  for (let i = 0; i < level.obstacleCount; i++) {
    // Never place obstacles right on the start grid
    const t = 0.08 + ((i + 0.5) / level.obstacleCount) * 0.86;
    const s = samples[Math.floor(t * sampleCount)];
    const sideOffset = (rng() > 0.5 ? 1 : -1) * (1.8 + rng() * (halfRoad - 3.2));
    const pos = s.point.clone().addScaledVector(s.right, sideOffset);
    pos.y += 0.52;
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.copy(pos);
    cone.castShadow = true;
    group.add(cone);
    obstacles.push({ position: pos, radius: 0.85, hit: false, mesh: cone });
  }

  // 9. Instanced Environment Scenery (buildings, trees, canyons, streetlights, crowds)
  populateBiomeProps(group, level, samples, halfRoad, rng, propBudgetMultiplier);

  // Minimap point array
  const minimapPoints: { x: number; z: number }[] = [];
  for (let i = 0; i < sampleCount; i += 3) {
    minimapPoints.push({ x: samples[i].point.x, z: samples[i].point.z });
  }

  const getNearestSample = (pos: THREE.Vector3, hintIndex?: number) => {
    let bestIdx = 0;
    let bestDistSq = Infinity;

    if (hintIndex !== undefined) {
      const windowRadius = 26;
      for (let offset = -windowRadius; offset <= windowRadius; offset++) {
        const idx = (hintIndex + offset + sampleCount) % sampleCount;
        const dx = pos.x - samples[idx].point.x;
        const dz = pos.z - samples[idx].point.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = idx;
        }
      }
      if (bestDistSq < 1200) {
        const sample = samples[bestIdx];
        const dx = pos.x - sample.point.x;
        const dz = pos.z - sample.point.z;
        const lateralOffset = dx * sample.right.x + dz * sample.right.z;
        return { sample, index: bestIdx, lateralOffset, distSq: bestDistSq };
      }
    }

    for (let i = 0; i < sampleCount; i++) {
      const dx = pos.x - samples[i].point.x;
      const dz = pos.z - samples[i].point.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIdx = i;
      }
    }
    const sample = samples[bestIdx];
    const dx = pos.x - sample.point.x;
    const dz = pos.z - sample.point.z;
    const lateralOffset = dx * sample.right.x + dz * sample.right.z;
    return { sample, index: bestIdx, lateralOffset, distSq: bestDistSq };
  };

  return {
    group,
    curve,
    samples,
    totalLength,
    roadWidth,
    checkpoints,
    obstacles,
    minimapPoints,
    minimapBounds: { minX, maxX, minZ, maxZ },
    getNearestSample,
  };
}

function populateBiomeProps(
  group: THREE.Group,
  level: LevelConfig,
  samples: TrackSample[],
  halfRoad: number,
  rng: () => number,
  budgetMult: number
): void {
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  // Streetlights along track for city / night_neon / coastal
  if (level.biome === 'city' || level.biome === 'night_neon' || level.biome === 'coastal') {
    const lampCount = Math.floor(44 * budgetMult);
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 6.5, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.35 });
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampCount);

    const bulbGeo = new THREE.BoxGeometry(0.9, 0.2, 0.35);
    const bulbMat = new THREE.MeshBasicMaterial({
      color: level.biome === 'night_neon' ? 0x38bdf8 : 0xfef3c7,
    });
    const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, lampCount);

    for (let i = 0; i < lampCount; i++) {
      const s = samples[Math.floor((i / lampCount) * (samples.length - 1))];
      const side = i % 2 === 0 ? -1 : 1;
      const pos = s.point.clone().addScaledVector(s.right, side * (halfRoad + 2.4));
      dummy.position.set(pos.x, pos.y + 3.25, pos.z);
      dummy.rotation.set(0, Math.atan2(s.tangent.x, s.tangent.z), 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);

      const bulbPos = s.point.clone().addScaledVector(s.right, side * (halfRoad + 1.8));
      dummy.position.set(bulbPos.x, bulbPos.y + 6.4, bulbPos.z);
      dummy.updateMatrix();
      bulbs.setMatrixAt(i, dummy.matrix);
    }
    poles.computeBoundingSphere();
    bulbs.computeBoundingSphere();
    group.add(poles, bulbs);
  }

  // City / Night Neon Skyscrapers + Grandstands & Crowds
  if (level.biome === 'city' || level.biome === 'night_neon') {
    const bCount = Math.floor(110 * budgetMult);
    const bGeo = new THREE.BoxGeometry(1, 1, 1);
    const bMat = new THREE.MeshStandardMaterial({
      color: level.biome === 'night_neon' ? 0x111827 : 0x475569,
      roughness: 0.45,
      metalness: 0.55,
      emissive: level.biome === 'night_neon' ? 0x0f172a : 0x000000,
    });
    const buildings = new THREE.InstancedMesh(bGeo, bMat, bCount);

    const neonCount = Math.floor(60 * budgetMult);
    const neonGeo = new THREE.BoxGeometry(1, 0.35, 1);
    const neonMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const neonStrips = new THREE.InstancedMesh(neonGeo, neonMat, neonCount);

    for (let i = 0; i < bCount; i++) {
      const s = samples[Math.floor(rng() * (samples.length - 1))];
      const side = rng() > 0.5 ? 1 : -1;
      const dist = halfRoad + 14 + rng() * 58;
      const pos = s.point.clone().addScaledVector(s.right, side * dist);
      const w = 8 + rng() * 12;
      const d = 8 + rng() * 12;
      const h = 16 + rng() * 52;
      dummy.position.set(pos.x, h * 0.5 - 0.15, pos.z);
      dummy.rotation.set(0, Math.atan2(s.tangent.x, s.tangent.z), 0);
      dummy.scale.set(w, h, d);
      dummy.updateMatrix();
      buildings.setMatrixAt(i, dummy.matrix);

      if (level.biome === 'night_neon') {
        color.setHSL(0.58 + rng() * 0.14, 0.45, 0.16 + rng() * 0.12);
      } else {
        color.setHSL(0.6, 0.12, 0.32 + rng() * 0.25);
      }
      buildings.setColorAt(i, color);

      if (i < neonCount) {
        dummy.position.set(pos.x, h * (0.55 + rng() * 0.35), pos.z);
        dummy.scale.set(w + 0.3, 1, d + 0.3);
        dummy.updateMatrix();
        neonStrips.setMatrixAt(i, dummy.matrix);
        const hue = rng() > 0.5 ? 0.52 : rng() > 0.5 ? 0.08 : 0.85;
        color.setHSL(hue, 0.95, 0.58);
        neonStrips.setColorAt(i, color);
      }
    }
    buildings.computeBoundingSphere();
    neonStrips.computeBoundingSphere();
    group.add(buildings);
    if (level.biome === 'night_neon') group.add(neonStrips);

    // Crowds near start/finish grandstand
    const crowdCount = Math.floor(140 * budgetMult);
    const crowdGeo = new THREE.BoxGeometry(0.42, 1.35, 0.32);
    const crowdMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
    const crowd = new THREE.InstancedMesh(crowdGeo, crowdMat, crowdCount);
    const startS = samples[0];
    for (let i = 0; i < crowdCount; i++) {
      const row = Math.floor(i / 35);
      const col = (i % 35) - 17;
      const p = startS.point
        .clone()
        .addScaledVector(startS.right, -(halfRoad + 6 + row * 1.1))
        .addScaledVector(startS.tangent, col * 1.1);
      dummy.position.set(p.x, 1.2 + row * 0.75, p.z);
      dummy.rotation.set(0, Math.atan2(startS.right.x, startS.right.z), 0);
      dummy.scale.set(1, 0.88 + rng() * 0.24, 1);
      dummy.updateMatrix();
      crowd.setMatrixAt(i, dummy.matrix);
      color.setHSL(rng(), 0.75, 0.55);
      crowd.setColorAt(i, color);
    }
    crowd.computeBoundingSphere();
    group.add(crowd);
  }

  // Trees (Mountain, Snow, Coastal palms, City parks)
  if (level.biome === 'mountain' || level.biome === 'snow' || level.biome === 'coastal') {
    const treeCount = Math.floor(180 * budgetMult);
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.35, 3.2, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x452b18, roughness: 0.9 });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);

    const crownGeo =
      level.biome === 'coastal'
        ? new THREE.DodecahedronGeometry(1.8, 0)
        : new THREE.ConeGeometry(1.8, 5.2, 7);
    const crownMat = new THREE.MeshStandardMaterial({
      color: level.biome === 'snow' ? 0xcbd5e1 : level.biome === 'coastal' ? 0x16a34a : 0x15803d,
      roughness: 0.8,
    });
    const crowns = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);

    for (let i = 0; i < treeCount; i++) {
      const s = samples[Math.floor(rng() * (samples.length - 1))];
      const side = level.biome === 'coastal' ? -1 : rng() > 0.5 ? 1 : -1;
      const dist = halfRoad + 7 + rng() * 54;
      const pos = s.point.clone().addScaledVector(s.right, side * dist);
      const scale = 0.85 + rng() * 0.55;

      dummy.position.set(pos.x, pos.y + 1.5 * scale, pos.z);
      dummy.rotation.set(0, rng() * Math.PI, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);

      dummy.position.set(pos.x, pos.y + (level.biome === 'coastal' ? 4.1 : 4.3) * scale, pos.z);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      crowns.setMatrixAt(i, dummy.matrix);

      if (level.biome === 'snow') {
        color.setHSL(0.56, 0.25, 0.72 + rng() * 0.18);
      } else {
        color.setHSL(0.32 + (rng() - 0.5) * 0.06, 0.65, 0.28 + rng() * 0.14);
      }
      crowns.setColorAt(i, color);
    }
    trunks.computeBoundingSphere();
    crowns.computeBoundingSphere();
    group.add(trunks, crowns);
  }

  // Desert Sandstone Mesas / Rocks / Mountain Peaks
  if (level.biome === 'desert' || level.biome === 'mountain') {
    const rockCount = Math.floor(75 * budgetMult);
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: level.biome === 'desert' ? 0xb45309 : 0x64748b,
      roughness: 0.9,
      flatShading: true,
    });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);

    for (let i = 0; i < rockCount; i++) {
      const s = samples[Math.floor(rng() * (samples.length - 1))];
      const side = rng() > 0.5 ? 1 : -1;
      const dist = halfRoad + 16 + rng() * 75;
      const pos = s.point.clone().addScaledVector(s.right, side * dist);
      const sx = 4 + rng() * 14;
      const sy = level.biome === 'mountain' ? 8 + rng() * 28 : 4 + rng() * 18;
      const sz = 4 + rng() * 14;

      dummy.position.set(pos.x, sy * 0.38 - 0.5, pos.z);
      dummy.rotation.set(0, rng() * Math.PI, 0);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);

      color.setHSL(level.biome === 'desert' ? 0.07 : 0.6, level.biome === 'desert' ? 0.55 : 0.1, 0.35 + rng() * 0.2);
      rocks.setColorAt(i, color);
    }
    rocks.computeBoundingSphere();
    group.add(rocks);
  }
}
