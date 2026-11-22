import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { CAR_SPECS } from '../data/cars';
import { CarCustomization, CarId } from '../types/game';
import { buildSupercarModel, BuiltCarRig } from './CarBuilder';
import { createSafeWebGLRenderer, probeWebGL } from './webglSupport';

interface ShowroomCanvasProps {
  carId: CarId;
  customization: CarCustomization;
  damageBodyPct?: number;
  autoRotate?: boolean;
  cameraShiftX?: number;
  className?: string;
}

export const ShowroomCanvas: React.FC<ShowroomCanvasProps> = ({
  carId,
  customization,
  damageBodyPct = 0,
  autoRotate = true,
  cameraShiftX = 0,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const carRigRef = useRef<BuiltCarRig | null>(null);
  const carPivotRef = useRef<THREE.Group | null>(null);
  const orbitYawRef = useRef(0.65);
  const orbitPitchRef = useRef(0.22);
  const draggingRef = useRef(false);
  const lastPtrRef = useRef({ x: 0, y: 0 });
  const autoRotateRef = useRef(autoRotate);
  const shiftXRef = useRef(cameraShiftX);

  const [useFallback2D, setUseFallback2D] = useState(false);

  autoRotateRef.current = autoRotate;
  shiftXRef.current = cameraShiftX;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const probe = probeWebGL();
    if (!probe.supported) {
      setUseFallback2D(true);
      return;
    }

    const renderer = createSafeWebGLRenderer(true, probe.isSoftwareGl);
    if (!renderer) {
      setUseFallback2D(true);
      return;
    }

    setUseFallback2D(false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(probe.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !probe.isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, Math.max(1, container.clientHeight));

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setUseFallback2D(true);
    };
    const onContextRestored = () => {
      setUseFallback2D(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090b10);
    scene.fog = new THREE.FogExp2(0x090b10, 0.032);
    sceneRef.current = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(
      40,
      Math.max(0.5, container.clientWidth / Math.max(1, container.clientHeight)),
      0.1,
      100
    );

    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.75);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1e0, 2.2);
    keyLight.position.set(5, 8, 6);
    if (!probe.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -5;
      keyLight.shadow.camera.right = 5;
      keyLight.shadow.camera.top = 5;
      keyLight.shadow.camera.bottom = -5;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    rimLight.position.set(-6, 4, -6);
    scene.add(rimLight);

    if (!probe.isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softbox = new THREE.RectAreaLight(0xffffff, 4.5, 6, 2.2);
      softbox.position.set(0, 4.8, 0);
      softbox.lookAt(0, 0, 0);
      scene.add(softbox);
    }

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({
        color: 0x0c0f17,
        roughness: 0.25,
        metalness: 0.65,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    const turntable = new THREE.Mesh(
      new THREE.CylinderGeometry(3.25, 3.35, 0.06, 48),
      new THREE.MeshStandardMaterial({
        color: 0x161b26,
        roughness: 0.22,
        metalness: 0.78,
      })
    );
    turntable.position.y = -0.03;
    turntable.receiveShadow = true;
    scene.add(turntable);

    const ringGlow = new THREE.Mesh(
      new THREE.RingGeometry(3.22, 3.3, 64),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })
    );
    ringGlow.rotation.x = -Math.PI / 2;
    ringGlow.position.y = 0.005;
    scene.add(ringGlow);

    const carPivot = new THREE.Group();
    scene.add(carPivot);
    carPivotRef.current = carPivot;

    if (!probe.isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : 0;
        if (sync && state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);

      if (autoRotateRef.current && !draggingRef.current) {
        orbitYawRef.current += dt * 0.28;
      }

      const aspect = camera.aspect || 1;
      const radius = aspect > 2.8 ? 4.9 : 5.9;
      const yaw = orbitYawRef.current;
      const pitch = orbitPitchRef.current;
      const targetX = shiftXRef.current;

      camera.position.set(
        targetX + Math.sin(yaw) * Math.cos(pitch) * radius,
        0.95 + Math.sin(pitch) * radius * 0.75,
        Math.cos(yaw) * Math.cos(pitch) * radius
      );
      camera.lookAt(targetX, 0.62, 0);

      renderer.render(scene, camera);
      if (probe.isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };
    tick();

    const handleResize = () => {
      if (disposed || !container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => handleResize())
        : null;
    resizeObserver?.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      renderer.dispose();
    };
  }, []);

  // Rebuild 3D car mesh when carId / customization / damage changes
  useEffect(() => {
    const pivot = carPivotRef.current;
    if (!pivot || useFallback2D) return;

    while (pivot.children.length > 0) {
      const child = pivot.children[0];
      pivot.remove(child);
      child.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material?.dispose();
        }
      });
    }

    const rig = buildSupercarModel(carId, customization, { isPlayer: true });
    rig.headlightMat.emissiveIntensity = 1.9;
    rig.taillightMat.emissiveIntensity = 1.8;
    const dmgMat = rig.damageOverlayMesh.material as THREE.MeshBasicMaterial;
    dmgMat.opacity = Math.min(0.85, (damageBodyPct / 100) * 0.85);

    pivot.add(rig.root);
    carRigRef.current = rig;
  }, [carId, customization, damageBodyPct, useFallback2D]);

  // 2D Studio Canvas Fallback when WebGL is disabled in the browser
  useEffect(() => {
    if (!useFallback2D) return;
    const canvas = fallbackCanvasRef.current;
    if (!canvas) return;
    let frameId = 0;
    let disposed = false;

    const draw = () => {
      if (disposed) return;
      const parent = canvas.parentElement;
      if (parent) {
        if (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight) {
          canvas.width = Math.max(300, parent.clientWidth);
          canvas.height = Math.max(200, parent.clientHeight);
        }
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      if (autoRotateRef.current && !draggingRef.current) {
        orbitYawRef.current += 0.012;
      }

      const cx = w * (shiftXRef.current < 0 ? 0.64 : 0.5);
      const cy = h * 0.56;
      const scale = Math.min(w * 0.52, h * 1.15) * 0.0023;

      // Showroom studio backdrop
      const bgGrad = ctx.createRadialGradient(cx, cy - 40, 20, cx, cy, Math.max(w, h) * 0.7);
      bgGrad.addColorStop(0, '#172033');
      bgGrad.addColorStop(0.55, '#0b0f19');
      bgGrad.addColorStop(1, '#090b10');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Turntable disc + amber glow ring
      ctx.save();
      ctx.translate(cx, cy + 56 * scale);
      ctx.scale(1, 0.28);
      if (customization.underglowEnabled) {
        ctx.shadowColor = customization.underglowColor;
        ctx.shadowBlur = 35;
      }
      ctx.fillStyle = '#151b28';
      ctx.beginPath();
      ctx.arc(0, 0, 240 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();

      // Car silhouette oriented smoothly around turntable
      const dir = Math.cos(orbitYawRef.current) >= 0 ? 1 : -1;
      const spec = CAR_SPECS[carId];
      ctx.save();
      ctx.translate(cx, cy + 16 * scale);
      ctx.scale(scale * dir, scale);

      // Shadow under chassis
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.ellipse(0, 38, 195, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body paint
      const bodyGrad = ctx.createLinearGradient(0, -65, 0, 35);
      bodyGrad.addColorStop(0, customization.paintFinish === 'chrome' ? '#ffffff' : customization.paintColor);
      bodyGrad.addColorStop(0.5, customization.paintColor);
      bodyGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = bodyGrad;

      ctx.beginPath();
      ctx.moveTo(-185, 22);
      ctx.lineTo(-175, -24);
      ctx.lineTo(-92, -30);
      ctx.lineTo(-32, -68);
      ctx.lineTo(54, -64);
      ctx.lineTo(132, -22);
      ctx.lineTo(188, 8);
      ctx.lineTo(182, 26);
      ctx.closePath();
      ctx.fill();

      // Cabin Glass
      ctx.fillStyle = `rgba(12, 18, 32, ${customization.windowTint})`;
      ctx.beginPath();
      ctx.moveTo(-78, -28);
      ctx.lineTo(-28, -60);
      ctx.lineTo(48, -58);
      ctx.lineTo(106, -24);
      ctx.closePath();
      ctx.fill();

      // Spoiler
      if (customization.spoilerStyle !== 'none') {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-176, -42, 28, 8);
        ctx.fillRect(-168, -34, 6, 12);
      }

      // Wheels + Brake Calipers
      [-115, 118].forEach((wx) => {
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.arc(wx, 24, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = customization.rimColor;
        ctx.beginPath();
        ctx.arc(wx, 24, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = customization.caliperColor;
        ctx.fillRect(wx - 12, 18, 9, 12);
      });

      // Headlight & Taillight glow
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(168, -6, 16, 7);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-182, -16, 14, 7);

      // Damage scratches if damaged
      if (damageBodyPct > 5) {
        ctx.strokeStyle = 'rgba(226,232,240,0.65)';
        ctx.lineWidth = 2;
        for (let i = 0; i < Math.min(14, Math.ceil(damageBodyPct / 7)); i++) {
          ctx.beginPath();
          ctx.moveTo(-100 + i * 18, -12 + (i % 3) * 10);
          ctx.lineTo(-82 + i * 18, -6 + (i % 3) * 10);
          ctx.stroke();
        }
      }
      ctx.restore();

      // Spec label
      ctx.fillStyle = 'rgba(148,163,184,0.75)';
      ctx.font = '600 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${spec.brand} ${spec.name} · 2D Studio Preview`, cx, h - 18);

      frameId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
    };
  }, [useFallback2D, carId, customization, damageBodyPct]);

  return (
    <div
      className={`w-full h-full relative cursor-grab active:cursor-grabbing touch-pan-y ${className}`}
      onPointerDown={(e) => {
        draggingRef.current = true;
        lastPtrRef.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        if (!draggingRef.current) return;
        const dx = e.clientX - lastPtrRef.current.x;
        const dy = e.clientY - lastPtrRef.current.y;
        lastPtrRef.current = { x: e.clientX, y: e.clientY };
        orbitYawRef.current -= dx * 0.008;
        orbitPitchRef.current = THREE.MathUtils.clamp(
          orbitPitchRef.current + dy * 0.005,
          0.06,
          0.58
        );
      }}
      onPointerUp={() => {
        draggingRef.current = false;
      }}
      onPointerLeave={() => {
        draggingRef.current = false;
      }}
    >
      {useFallback2D ? (
        <canvas ref={fallbackCanvasRef} className="w-full h-full block" />
      ) : (
        <div ref={mountRef} className="w-full h-full" />
      )}
    </div>
  );
};
