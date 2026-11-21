import * as THREE from 'three';
import { WeatherType } from '../types/game';
import { getSmokeSpriteTexture } from './ProceduralTextures';

interface ParticleSlot {
  active: boolean;
  age: number;
  maxAge: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  scale: number;
  growth: number;
  color: THREE.Color;
}

/**
 * Pooled particle & skid-mark manager to guarantee zero GC spikes during 60fps racing.
 */
export class ParticleSystem {
  public group = new THREE.Group();
  private smokePool: ParticleSlot[] = [];
  private smokeMesh: THREE.InstancedMesh;
  private smokeCapacity = 160;
  private smokeCursor = 0;

  private sparkPool: ParticleSlot[] = [];
  private sparkMesh: THREE.InstancedMesh;
  private sparkCapacity = 90;
  private sparkCursor = 0;

  private skidMesh: THREE.InstancedMesh;
  private skidCapacity = 220;
  private skidCursor = 0;

  private weatherPoints: THREE.Points | null = null;
  private weatherType: WeatherType = 'clear';
  private weatherPositions: Float32Array | null = null;

  private dummy = new THREE.Object3D();

  constructor(weather: WeatherType, particleBudget = 1.0) {
    this.weatherType = weather;
    this.smokeCapacity = Math.max(40, Math.floor(160 * particleBudget));
    this.sparkCapacity = Math.max(30, Math.floor(90 * particleBudget));
    this.skidCapacity = Math.max(60, Math.floor(220 * particleBudget));

    // 1. Pooled Smoke (tire smoke & damaged hood smoke)
    const smokeGeo = new THREE.PlaneGeometry(1, 1);
    const smokeMat = new THREE.MeshBasicMaterial({
      map: getSmokeSpriteTexture(),
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.smokeMesh = new THREE.InstancedMesh(smokeGeo, smokeMat, this.smokeCapacity);
    this.smokeMesh.frustumCulled = false;
    for (let i = 0; i < this.smokeCapacity; i++) {
      this.smokePool.push({
        active: false,
        age: 0,
        maxAge: 1,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        scale: 0,
        growth: 1,
        color: new THREE.Color(0xe2e8f0),
      });
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.smokeMesh.setMatrixAt(i, this.dummy.matrix);
      this.smokeMesh.setColorAt(i, new THREE.Color(0xe2e8f0));
    }
    this.group.add(this.smokeMesh);

    // 2. Pooled Collision Sparks
    const sparkGeo = new THREE.BoxGeometry(0.08, 0.08, 0.38);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    this.sparkMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, this.sparkCapacity);
    this.sparkMesh.frustumCulled = false;
    for (let i = 0; i < this.sparkCapacity; i++) {
      this.sparkPool.push({
        active: false,
        age: 0,
        maxAge: 0.45,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        scale: 0,
        growth: 0,
        color: new THREE.Color(0xfbbf24),
      });
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.sparkMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.group.add(this.sparkMesh);

    // 3. Pooled Skid Marks
    const skidGeo = new THREE.PlaneGeometry(0.32, 0.95);
    skidGeo.rotateX(-Math.PI / 2);
    const skidMat = new THREE.MeshBasicMaterial({
      color: 0x09090b,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    this.skidMesh = new THREE.InstancedMesh(skidGeo, skidMat, this.skidCapacity);
    this.skidMesh.frustumCulled = false;
    for (let i = 0; i < this.skidCapacity; i++) {
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.skidMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.group.add(this.skidMesh);

    // 4. Weather Particles (Rain / Snow)
    if (weather === 'rain' || weather === 'snow') {
      const count = Math.floor((weather === 'rain' ? 750 : 650) * particleBudget);
      this.weatherPositions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        this.weatherPositions[i * 3] = (Math.random() - 0.5) * 90;
        this.weatherPositions[i * 3 + 1] = Math.random() * 35;
        this.weatherPositions[i * 3 + 2] = (Math.random() - 0.5) * 90;
      }
      const wGeo = new THREE.BufferGeometry();
      wGeo.setAttribute('position', new THREE.BufferAttribute(this.weatherPositions, 3));
      const wMat = new THREE.PointsMaterial({
        color: weather === 'rain' ? 0xbae6fd : 0xf8fafc,
        size: weather === 'rain' ? 0.24 : 0.36,
        transparent: true,
        opacity: weather === 'rain' ? 0.55 : 0.85,
      });
      this.weatherPoints = new THREE.Points(wGeo, wMat);
      this.weatherPoints.frustumCulled = false;
      this.group.add(this.weatherPoints);
    }
  }

  public spawnSmoke(x: number, y: number, z: number, dark = false, size = 0.7): void {
    const slot = this.smokePool[this.smokeCursor];
    this.smokeCursor = (this.smokeCursor + 1) % this.smokeCapacity;
    slot.active = true;
    slot.age = 0;
    slot.maxAge = dark ? 1.15 : 0.75;
    slot.pos.set(x, y, z);
    slot.vel.set((Math.random() - 0.5) * 1.4, 1.4 + Math.random() * 1.2, (Math.random() - 0.5) * 1.4);
    slot.scale = size;
    slot.growth = 2.4;
    slot.color.setHex(dark ? 0x334155 : 0xe2e8f0);
  }

  public spawnSparkBurst(x: number, y: number, z: number, count = 14): void {
    for (let i = 0; i < count; i++) {
      const slot = this.sparkPool[this.sparkCursor];
      this.sparkCursor = (this.sparkCursor + 1) % this.sparkCapacity;
      slot.active = true;
      slot.age = 0;
      slot.maxAge = 0.25 + Math.random() * 0.25;
      slot.pos.set(x, y, z);
      slot.vel.set(
        (Math.random() - 0.5) * 16,
        3 + Math.random() * 9,
        (Math.random() - 0.5) * 16
      );
      slot.scale = 1;
    }
  }

  public spawnSkidMark(x: number, y: number, z: number, yaw: number): void {
    this.dummy.position.set(x, y + 0.045, z);
    this.dummy.rotation.set(0, yaw, 0);
    this.dummy.scale.set(1, 1, 1);
    this.dummy.updateMatrix();
    this.skidMesh.setMatrixAt(this.skidCursor, this.dummy.matrix);
    this.skidCursor = (this.skidCursor + 1) % this.skidCapacity;
    this.skidMesh.instanceMatrix.needsUpdate = true;
  }

  public update(dt: number, cameraPos: THREE.Vector3, playerPos: THREE.Vector3): void {
    // Update smoke
    let smokeDirty = false;
    for (let i = 0; i < this.smokeCapacity; i++) {
      const s = this.smokePool[i];
      if (!s.active) continue;
      smokeDirty = true;
      s.age += dt;
      if (s.age >= s.maxAge) {
        s.active = false;
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.smokeMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      s.pos.addScaledVector(s.vel, dt);
      const t = s.age / s.maxAge;
      const curScale = s.scale * (1 + t * s.growth) * (1 - t * 0.45);
      this.dummy.position.copy(s.pos);
      this.dummy.lookAt(cameraPos);
      this.dummy.scale.set(curScale, curScale, curScale);
      this.dummy.updateMatrix();
      this.smokeMesh.setMatrixAt(i, this.dummy.matrix);
      this.smokeMesh.setColorAt(i, s.color);
    }
    if (smokeDirty) {
      this.smokeMesh.instanceMatrix.needsUpdate = true;
      if (this.smokeMesh.instanceColor) this.smokeMesh.instanceColor.needsUpdate = true;
    }

    // Update sparks
    let sparkDirty = false;
    for (let i = 0; i < this.sparkCapacity; i++) {
      const sp = this.sparkPool[i];
      if (!sp.active) continue;
      sparkDirty = true;
      sp.age += dt;
      if (sp.age >= sp.maxAge) {
        sp.active = false;
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.sparkMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      sp.vel.y -= 24 * dt;
      sp.pos.addScaledVector(sp.vel, dt);
      const fade = 1 - sp.age / sp.maxAge;
      this.dummy.position.copy(sp.pos);
      this.dummy.lookAt(
        sp.pos.x + sp.vel.x,
        sp.pos.y + sp.vel.y,
        sp.pos.z + sp.vel.z
      );
      this.dummy.scale.set(fade, fade, fade);
      this.dummy.updateMatrix();
      this.sparkMesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (sparkDirty) {
      this.sparkMesh.instanceMatrix.needsUpdate = true;
    }

    // Update weather volume centered on player
    if (this.weatherPoints && this.weatherPositions) {
      const fallSpeed = this.weatherType === 'rain' ? 38 : 6.5;
      const driftX = this.weatherType === 'rain' ? -4 : 2.5;
      const count = this.weatherPositions.length / 3;
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        this.weatherPositions[idx] += driftX * dt;
        this.weatherPositions[idx + 1] -= fallSpeed * dt;

        // Wrap around player box
        if (this.weatherPositions[idx + 1] < -2) {
          this.weatherPositions[idx] = playerPos.x + (Math.random() - 0.5) * 90;
          this.weatherPositions[idx + 1] = playerPos.y + 24 + Math.random() * 14;
          this.weatherPositions[idx + 2] = playerPos.z + (Math.random() - 0.5) * 90;
        }
      }
      (this.weatherPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  }
}
