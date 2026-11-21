import * as THREE from 'three';

export interface WebGLProbeResult {
  supported: boolean;
  isSoftwareGl: boolean;
}

export function probeWebGL(): WebGLProbeResult {
  if (typeof document === 'undefined') {
    return { supported: false, isSoftwareGl: true };
  }
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false }) as WebGLRenderingContext | null);
    if (!gl) {
      return { supported: false, isSoftwareGl: true };
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render|Disabled/i.test(gpu);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

export function createSafeWebGLRenderer(
  antialias: boolean,
  isSoftwareGl: boolean
): THREE.WebGLRenderer | null {
  const attempts: THREE.WebGLRendererParameters[] = [
    {
      antialias: antialias && !isSoftwareGl,
      powerPreference: isSoftwareGl ? 'default' : 'high-performance',
      failIfMajorPerformanceCaveat: false,
    },
    {
      antialias: false,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false,
    },
  ];

  for (const opts of attempts) {
    try {
      return new THREE.WebGLRenderer(opts);
    } catch {
      // Try next fallback configuration
    }
  }
  return null;
}
