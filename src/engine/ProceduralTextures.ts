import * as THREE from 'three';

const textureCache = new Map<string, THREE.Texture>();

function getOrCreate(key: string, builder: () => THREE.Texture): THREE.Texture {
  const existing = textureCache.get(key);
  if (existing) return existing;
  const tex = builder();
  textureCache.set(key, tex);
  return tex;
}

export function getAsphaltTexture(wet: boolean, maxAniso = 8): THREE.CanvasTexture {
  const key = `asphalt_${wet ? 'wet' : 'dry'}`;
  return getOrCreate(key, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = wet ? '#161a22' : '#242830';
    ctx.fillRect(0, 0, 512, 512);

    // Aggregate speckle
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const v = wet ? 18 + Math.random() * 26 : 32 + Math.random() * 34;
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Subtle tire wear tracks along lanes
    ctx.fillStyle = wet ? 'rgba(8, 10, 14, 0.35)' : 'rgba(15, 18, 24, 0.24)';
    ctx.fillRect(95, 0, 62, 512);
    ctx.fillRect(355, 0, 62, 512);

    // Edge solid white lines
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(20, 0, 10, 512);
    ctx.fillRect(482, 0, 10, 512);

    // Center dashed line
    ctx.fillStyle = '#facc15';
    for (let y = 16; y < 512; y += 64) {
      ctx.fillRect(252, y, 8, 34);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = maxAniso;
    return tex;
  }) as THREE.CanvasTexture;
}

export function getAsphaltRoughnessTexture(wet: boolean): THREE.CanvasTexture {
  const key = `asphalt_rough_${wet ? 'wet' : 'dry'}`;
  return getOrCreate(key, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = wet ? '#707070' : '#d6d6d6';
    ctx.fillRect(0, 0, 256, 256);

    if (wet) {
      // Smooth mirror-like puddle patches
      for (let i = 0; i < 18; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const r = 18 + Math.random() * 44;
        const grad = ctx.createRadialGradient(x, y, 2, x, y, r);
        grad.addColorStop(0, '#181818');
        grad.addColorStop(1, 'rgba(112,112,112,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }) as THREE.CanvasTexture;
}

export function getCurbTexture(): THREE.CanvasTexture {
  return getOrCreate('curb_red_white', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#dc2626' : '#f8fafc';
      ctx.fillRect(0, i * 64, 128, 64);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }) as THREE.CanvasTexture;
}

export function getCarbonFiberTexture(): THREE.CanvasTexture {
  return getOrCreate('carbon_fiber', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#111318';
    ctx.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 8) {
      for (let x = 0; x < 64; x += 8) {
        ctx.fillStyle = (x + y) % 16 === 0 ? '#1e222b' : '#151820';
        ctx.fillRect(x, y, 4, 4);
        ctx.fillStyle = '#0c0e12';
        ctx.fillRect(x + 4, y + 4, 4, 4);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
  }) as THREE.CanvasTexture;
}

export function getTireTreadTexture(isSlick: boolean): THREE.CanvasTexture {
  const key = `tire_tread_${isSlick ? 'slick' : 'grooved'}`;
  return getOrCreate(key, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#17191e';
    ctx.fillRect(0, 0, 256, 256);

    if (!isSlick) {
      ctx.strokeStyle = '#090a0d';
      ctx.lineWidth = 6;
      for (let y = 0; y < 256; y += 24) {
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(116, y + 12);
        ctx.moveTo(236, y);
        ctx.lineTo(140, y + 12);
        ctx.stroke();
      }
      ctx.fillStyle = '#0a0b0e';
      ctx.fillRect(118, 0, 6, 256);
      ctx.fillRect(132, 0, 6, 256);
    } else {
      // Subtle rubber grain
      ctx.fillStyle = '#1e2026';
      for (let i = 0; i < 600; i++) {
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 3);
    return tex;
  }) as THREE.CanvasTexture;
}

export function getTireSidewallTexture(label = 'DK SPORT P-ZERO'): THREE.CanvasTexture {
  const key = `sidewall_${label}`;
  return getOrCreate(key, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#16181d';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#262932';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(256, 256, 210, 0, Math.PI * 2);
    ctx.stroke();

    // Sidewall lettering around arc
    ctx.save();
    ctx.translate(256, 256);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = `  ${label}  ·  305/30 ZR20  ·  `;
    const full = text + text;
    for (let i = 0; i < full.length; i++) {
      const angle = (i / full.length) * Math.PI * 2;
      ctx.save();
      ctx.rotate(angle);
      ctx.fillText(full[i], 0, -212);
      ctx.restore();
    }
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }) as THREE.CanvasTexture;
}

export function getFinishBannerTexture(): THREE.CanvasTexture {
  return getOrCreate('finish_banner', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Checkered border top & bottom
    const sq = 32;
    for (let x = 0; x < 1024; x += sq) {
      for (let y = 0; y < 64; y += sq) {
        ctx.fillStyle = ((x + y) / sq) % 2 === 0 ? '#f8fafc' : '#0f172a';
        ctx.fillRect(x, y, sq, sq);
        ctx.fillRect(x, y + 192, sq, sq);
      }
    }

    ctx.fillStyle = '#090b10';
    ctx.fillRect(0, 64, 1024, 128);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 58px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DK CAR RACE  ·  START / FINISH', 512, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }) as THREE.CanvasTexture;
}

export function getCheckeredLineTexture(): THREE.CanvasTexture {
  return getOrCreate('checkered_line', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const sq = 32;
    for (let x = 0; x < 512; x += sq) {
      for (let y = 0; y < 128; y += sq) {
        ctx.fillStyle = ((x + y) / sq) % 2 === 0 ? '#ffffff' : '#111827';
        ctx.fillRect(x, y, sq, sq);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }) as THREE.CanvasTexture;
}

export function getContactShadowTexture(): THREE.CanvasTexture {
  return getOrCreate('contact_shadow', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(128, 128, 24, 128, 128, 124);
    grad.addColorStop(0, 'rgba(0,0,0,0.75)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.4)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }) as THREE.CanvasTexture;
}

export function getSmokeSpriteTexture(): THREE.CanvasTexture {
  return getOrCreate('smoke_sprite', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.45, 'rgba(226,232,240,0.45)');
    grad.addColorStop(1, 'rgba(226,232,240,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }) as THREE.CanvasTexture;
}

export function getDamageScratchesTexture(): THREE.CanvasTexture {
  return getOrCreate('damage_scratches', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.85)';
    for (let i = 0; i < 42; i++) {
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 64, y + (Math.random() - 0.5) * 18);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }) as THREE.CanvasTexture;
}

export function getDashboardTexture(): THREE.CanvasTexture {
  return getOrCreate('car_dashboard', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 256, 128);

    // Dual illuminated gauges
    [76, 180].forEach((cx, i) => {
      ctx.strokeStyle = i === 0 ? '#06b6d4' : '#f59e0b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, 64, 42, Math.PI * 0.75, Math.PI * 2.25);
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(i === 0 ? 'RPM' : 'KM/H', cx, 70);
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }) as THREE.CanvasTexture;
}
