import * as THREE from 'three';
import { CAR_SPECS } from '../data/cars';
import {
  CarBodyStyle,
  CarCustomization,
  CarId,
  PaintFinish,
  RimStyle,
} from '../types/game';
import {
  getCarbonFiberTexture,
  getContactShadowTexture,
  getDamageScratchesTexture,
  getDashboardTexture,
  getTireSidewallTexture,
  getTireTreadTexture,
} from './ProceduralTextures';

export interface BuiltCarRig {
  root: THREE.Group;
  bodyPaintMat: THREE.MeshPhysicalMaterial;
  glassMat: THREE.MeshPhysicalMaterial;
  headlightMat: THREE.MeshStandardMaterial;
  taillightMat: THREE.MeshStandardMaterial;
  leftIndicatorMat: THREE.MeshStandardMaterial;
  rightIndicatorMat: THREE.MeshStandardMaterial;
  underglowMat: THREE.MeshBasicMaterial;
  underglowLight: THREE.PointLight | null;
  headlightSpotLeft: THREE.SpotLight | null;
  headlightSpotRight: THREE.SpotLight | null;
  beamConeLeft: THREE.Mesh;
  beamConeRight: THREE.Mesh;
  nitroFlameLeft: THREE.Mesh;
  nitroFlameRight: THREE.Mesh;
  steeringWheel: THREE.Group;
  leftWiper: THREE.Mesh;
  rightWiper: THREE.Mesh;
  frontSteerPivots: [THREE.Group, THREE.Group];
  wheelSpinGroups: THREE.Group[];
  damageOverlayMesh: THREE.Mesh;
  hoodSmokeOrigin: THREE.Object3D;
  exhaustOrigins: [THREE.Object3D, THREE.Object3D];
  cockpitCameraAnchor: THREE.Object3D;
  hoodCameraAnchor: THREE.Object3D;
  rearMirrorAnchor: THREE.Object3D;
  ghostMaterials?: { material: THREE.Material; baseOpacity: number }[];
}

function createPaintMaterial(colorHex: string, finish: PaintFinish): THREE.MeshPhysicalMaterial {
  const color = new THREE.Color(colorHex);
  switch (finish) {
    case 'matte':
      return new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.25,
        roughness: 0.58,
        clearcoat: 0.12,
        clearcoatRoughness: 0.6,
      });
    case 'chrome':
      return new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.98,
        roughness: 0.06,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04,
      });
    case 'gloss':
      return new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.18,
        roughness: 0.14,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
      });
    case 'metallic':
    default:
      return new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.72,
        roughness: 0.22,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
      });
  }
}

function buildRimSpokes(
  rimStyle: RimStyle,
  rimRadius: number,
  rimMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  const spokeCount =
    rimStyle === 'multi_mesh'
      ? 10
      : rimStyle === 'turbine'
        ? 8
        : rimStyle === 'carbon_aero'
          ? 5
          : rimStyle === 'deep_dish'
            ? 6
            : 5;

  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2;
    if (rimStyle === 'y_spoke') {
      [-0.14, 0.14].forEach((offset) => {
        const spoke = new THREE.Mesh(
          new THREE.BoxGeometry(0.025, rimRadius * 0.88, 0.032),
          rimMat
        );
        spoke.position.set(
          Math.cos(angle + offset * 0.5) * rimRadius * 0.48,
          Math.sin(angle + offset * 0.5) * rimRadius * 0.48,
          0.02
        );
        spoke.rotation.z = angle + offset - Math.PI / 2;
        g.add(spoke);
      });
    } else if (rimStyle === 'turbine') {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, rimRadius * 0.86, 0.022),
        rimMat
      );
      blade.position.set(
        Math.cos(angle) * rimRadius * 0.48,
        Math.sin(angle) * rimRadius * 0.48,
        0.02
      );
      blade.rotation.z = angle - Math.PI / 2 + 0.28;
      blade.rotation.y = 0.2;
      g.add(blade);
    } else if (rimStyle === 'carbon_aero') {
      const fan = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, rimRadius * 0.9, 0.018),
        rimMat
      );
      fan.position.set(
        Math.cos(angle) * rimRadius * 0.48,
        Math.sin(angle) * rimRadius * 0.48,
        0.025
      );
      fan.rotation.z = angle - Math.PI / 2 + 0.15;
      g.add(fan);
    } else {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.024, rimRadius * 0.9, 0.028),
        rimMat
      );
      spoke.position.set(
        Math.cos(angle) * rimRadius * 0.48,
        Math.sin(angle) * rimRadius * 0.48,
        rimStyle === 'deep_dish' ? -0.02 : 0.02
      );
      spoke.rotation.z = angle - Math.PI / 2;
      g.add(spoke);
    }
  }
  return g;
}

function buildWheelAssembly(
  radius: number,
  width: number,
  isLeft: boolean,
  customization: CarCustomization
): { pivot: THREE.Group; spinGroup: THREE.Group } {
  const pivot = new THREE.Group();
  const spinGroup = new THREE.Group();
  pivot.add(spinGroup);

  const isSlick = customization.tireStyle === 'racing_slick';
  const treadTex = getTireTreadTexture(isSlick);
  const sidewallLabel =
    customization.tireStyle === 'racing_slick'
      ? 'PIRELLI P-ZERO'
      : customization.tireStyle === 'semi_slick'
        ? 'MICHELIN CUP 2'
        : 'DK SPORT GT';
  const sidewallTex = getTireSidewallTexture(sidewallLabel);

  const treadMat = new THREE.MeshStandardMaterial({
    map: treadTex,
    roughness: 0.78,
    metalness: 0.05,
  });
  const sidewallMat = new THREE.MeshStandardMaterial({
    map: sidewallTex,
    roughness: 0.72,
    metalness: 0.04,
  });

  // Tire cylinder rotated so axis lies on X
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 26, 1, false);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMesh = new THREE.Mesh(tireGeo, [treadMat, sidewallMat, sidewallMat]);
  tireMesh.castShadow = true;
  spinGroup.add(tireMesh);

  // Outer rim barrel
  const rimRadius = radius * 0.72;
  const rimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(customization.rimColor),
    metalness: 0.88,
    roughness: 0.2,
  });
  const rimBarrelGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, width * 0.92, 22, 1, true);
  rimBarrelGeo.rotateZ(Math.PI / 2);
  const rimBarrel = new THREE.Mesh(rimBarrelGeo, rimMat);
  spinGroup.add(rimBarrel);

  // Spokes facing outward
  const spokes = buildRimSpokes(customization.rimStyle, rimRadius, rimMat);
  spokes.rotation.y = isLeft ? -Math.PI / 2 : Math.PI / 2;
  spokes.position.x = isLeft ? -width * 0.42 : width * 0.42;
  spinGroup.add(spokes);

  // Center lock / hub cap
  const hubGeo = new THREE.CylinderGeometry(0.055, 0.065, width * 0.96, 14);
  hubGeo.rotateZ(Math.PI / 2);
  const hubMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.7,
    roughness: 0.3,
  });
  spinGroup.add(new THREE.Mesh(hubGeo, hubMat));

  // Slotted brake disc
  const rotorGeo = new THREE.CylinderGeometry(rimRadius * 0.82, rimRadius * 0.82, 0.025, 20);
  rotorGeo.rotateZ(Math.PI / 2);
  const rotorMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.9,
    roughness: 0.28,
  });
  const rotor = new THREE.Mesh(rotorGeo, rotorMat);
  rotor.position.x = isLeft ? -0.02 : 0.02;
  spinGroup.add(rotor);

  // Stationary painted brake caliper (attached to pivot, not spinGroup!)
  const caliperGeo = new THREE.BoxGeometry(0.08, 0.14, 0.1);
  const caliperMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(customization.caliperColor),
    metalness: 0.45,
    roughness: 0.3,
  });
  const caliper = new THREE.Mesh(caliperGeo, caliperMat);
  caliper.position.set(isLeft ? -0.02 : 0.02, 0.03, -rimRadius * 0.56);
  pivot.add(caliper);

  return { pivot, spinGroup };
}

function createSculptedChassisGeometry(
  bodyStyle: CarBodyStyle,
  length: number,
  width: number,
  height: number
): THREE.ExtrudeGeometry {
  // Side profile in XY (X = Z along car length from rear -L/2 to front +L/2, Y = height from ground)
  const halfL = length * 0.5;
  const shape = new THREE.Shape();

  switch (bodyStyle) {
    case 'coupe': // BMW M4 Competition: upright grille nose, muscular long hood, defined decklid
      shape.moveTo(-halfL, 0.24);
      shape.lineTo(-halfL + 0.08, height * 0.66);
      shape.lineTo(-halfL * 0.62, height * 0.7);
      shape.lineTo(-halfL * 0.34, height * 1.0);
      shape.lineTo(halfL * 0.12, height * 0.98);
      shape.lineTo(halfL * 0.42, height * 0.64);
      shape.lineTo(halfL, 0.42);
      shape.lineTo(halfL - 0.05, 0.18);
      shape.lineTo(-halfL + 0.08, 0.18);
      break;

    case 'jdm': // Nissan GT-R Nismo: boxy aggressive JDM coupe with tall sculpted trunk
      shape.moveTo(-halfL, 0.24);
      shape.lineTo(-halfL + 0.07, height * 0.68);
      shape.lineTo(-halfL * 0.58, height * 0.72);
      shape.lineTo(-halfL * 0.26, height * 1.01);
      shape.lineTo(halfL * 0.18, height * 0.99);
      shape.lineTo(halfL * 0.48, height * 0.62);
      shape.lineTo(halfL, 0.38);
      shape.lineTo(halfL - 0.06, 0.17);
      shape.lineTo(-halfL + 0.08, 0.17);
      break;

    case 'muscle': // Corvette Z06: sharp American mid-engine wedge with sculpted nose
      shape.moveTo(-halfL, 0.23);
      shape.lineTo(-halfL + 0.1, height * 0.66);
      shape.lineTo(-halfL * 0.48, height * 0.69);
      shape.lineTo(-halfL * 0.18, height * 0.99);
      shape.lineTo(halfL * 0.18, height * 0.95);
      shape.lineTo(halfL * 0.54, height * 0.55);
      shape.lineTo(halfL, 0.28);
      shape.lineTo(halfL - 0.08, 0.17);
      shape.lineTo(-halfL + 0.09, 0.17);
      break;

    case 'rear_engine': // Porsche 911 GT3: iconic fastback teardrop flyline
      shape.moveTo(-halfL, 0.24);
      shape.lineTo(-halfL + 0.14, height * 0.64);
      shape.bezierCurveTo(-halfL * 0.4, height * 0.95, -halfL * 0.05, height * 1.03, halfL * 0.16, height * 0.94);
      shape.lineTo(halfL * 0.58, height * 0.56);
      shape.bezierCurveTo(halfL * 0.85, height * 0.48, halfL * 0.98, height * 0.38, halfL, 0.24);
      shape.lineTo(-halfL + 0.1, 0.17);
      break;

    case 'ev_hyper': // Lotus Evija: ultra-low hourglass teardrop EV hypercar
      shape.moveTo(-halfL, 0.24);
      shape.lineTo(-halfL + 0.12, height * 0.62);
      shape.bezierCurveTo(-halfL * 0.45, height * 0.66, -halfL * 0.22, height * 1.02, 0.04, height * 0.98);
      shape.bezierCurveTo(halfL * 0.3, height * 0.94, halfL * 0.56, height * 0.52, halfL, 0.24);
      shape.lineTo(halfL - 0.08, 0.16);
      shape.lineTo(-halfL + 0.1, 0.16);
      break;

    case 'gt_front': // AMG GT Black Series: extreme cab-backward long hood proportions
      shape.moveTo(-halfL, 0.24);
      shape.lineTo(-halfL + 0.1, height * 0.65);
      shape.lineTo(-halfL * 0.66, height * 0.72);
      shape.bezierCurveTo(-halfL * 0.46, height * 1.02, -halfL * 0.08, height * 0.98, halfL * 0.08, height * 0.64);
      shape.lineTo(halfL * 0.72, height * 0.52);
      shape.lineTo(halfL, 0.32);
      shape.lineTo(halfL - 0.06, 0.17);
      shape.lineTo(-halfL + 0.08, 0.17);
      break;

    case 'mid_v10': // Audi R8 V10: balanced low roof with crisp side-blade beltline
      shape.moveTo(-halfL, 0.24);
      shape.lineTo(-halfL + 0.1, height * 0.64);
      shape.lineTo(-halfL * 0.48, height * 0.74);
      shape.bezierCurveTo(-halfL * 0.24, height * 1.02, halfL * 0.12, height * 1.0, halfL * 0.36, height * 0.62);
      shape.lineTo(halfL, 0.3);
      shape.lineTo(halfL - 0.08, 0.17);
      shape.lineTo(-halfL + 0.08, 0.17);
      break;

    case 'track_aero': // McLaren 720S: teardrop cockpit, deep dihedral shoulder cut
    case 'lemans': // Ford GT: flying buttress silhouette with razor nose
      shape.moveTo(-halfL, 0.23);
      shape.lineTo(-halfL + 0.12, height * 0.6);
      shape.lineTo(-halfL * 0.44, height * 0.66);
      shape.bezierCurveTo(-halfL * 0.2, height * 1.04, halfL * 0.16, height * 0.99, halfL * 0.42, height * 0.56);
      shape.lineTo(halfL, 0.26);
      shape.lineTo(halfL - 0.09, 0.16);
      shape.lineTo(-halfL + 0.09, 0.16);
      break;

    case 'valkyrie': // Aston Martin Valkyrie: extreme F1 underfloor Venturi & bubble canopy
      shape.moveTo(-halfL, 0.28);
      shape.lineTo(-halfL + 0.14, height * 0.56);
      shape.lineTo(-halfL * 0.38, height * 0.64);
      shape.bezierCurveTo(-halfL * 0.16, height * 1.04, halfL * 0.18, height * 1.02, halfL * 0.46, height * 0.48);
      shape.lineTo(halfL, 0.24);
      shape.lineTo(halfL - 0.12, 0.17);
      shape.lineTo(-halfL + 0.14, 0.22);
      break;

    case 'bugatti': // Bugatti Chiron Pur Sport: sculpted C-line grand tourer hypercar
      shape.moveTo(-halfL, 0.24);
      shape.lineTo(-halfL + 0.1, height * 0.68);
      shape.bezierCurveTo(-halfL * 0.4, height * 0.8, -halfL * 0.22, height * 1.02, 0.0, height * 1.0);
      shape.bezierCurveTo(halfL * 0.28, height * 0.98, halfL * 0.56, height * 0.62, halfL, 0.32);
      shape.lineTo(halfL - 0.06, 0.17);
      shape.lineTo(-halfL + 0.08, 0.17);
      break;

    case 'wedge_v12': // Lamborghini Aventador SVJ: razor angular stealth wedge
    case 'dk_proto': // DK Apex Hyper-X: extreme Le Mans prototype wedge
    case 'jesko': // Koenigsegg Jesko: wrap-around fighter canopy & split aero tail
      shape.moveTo(-halfL, 0.22);
      shape.lineTo(-halfL + 0.12, height * 0.64);
      shape.lineTo(-halfL * 0.36, height * 0.74);
      shape.lineTo(-halfL * 0.08, height);
      shape.lineTo(halfL * 0.24, height * 0.96);
      shape.lineTo(halfL * 0.64, height * 0.52);
      shape.lineTo(halfL, 0.25);
      shape.lineTo(halfL - 0.1, 0.16);
      shape.lineTo(-halfL + 0.1, 0.16);
      break;

    case 'pagani': // Pagani Huayra: flowing sculpted Italian teardrop & raised tail
    case 'mid_v8': // Ferrari F8 Tributo
    default:
      shape.moveTo(-halfL, 0.24);
      shape.lineTo(-halfL + 0.1, height * 0.64);
      shape.lineTo(-halfL * 0.42, height * 0.7);
      shape.bezierCurveTo(-halfL * 0.18, height * 1.02, halfL * 0.14, height * 1.0, halfL * 0.36, height * 0.62);
      shape.lineTo(halfL, 0.28);
      shape.lineTo(halfL - 0.08, 0.17);
      shape.lineTo(-halfL + 0.1, 0.17);
      break;
  }
  shape.closePath();

  const bodyW = width * 0.86;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: bodyW,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.055,
    bevelSegments: 3,
    steps: 1,
  });

  // Rotate so side profile length runs along +Z (front is +Z, rear is -Z) and width along X
  geo.translate(0, 0, -bodyW / 2);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export function buildSupercarModel(
  carId: CarId,
  customization: CarCustomization,
  options: { enableSpotLights?: boolean; isPlayer?: boolean; isGhost?: boolean; useLod?: boolean } = {}
): BuiltCarRig {
  const spec = CAR_SPECS[carId];
  const { length, width, height } = spec.silhouette;
  const root = new THREE.Group();
  const detailGroup = new THREE.Group();

  const isWide = customization.bodyKit === 'track_wide';
  const isSport = customization.bodyKit === 'sport' || isWide;
  const bodyWidth = isWide ? width * 1.08 : width;

  const bodyPaintMat = createPaintMaterial(customization.paintColor, customization.paintFinish);
  const carbonMat = new THREE.MeshStandardMaterial({
    map: getCarbonFiberTexture(),
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.25,
  });
  const trimDarkMat = new THREE.MeshStandardMaterial({
    color: 0x0f1218,
    roughness: 0.55,
    metalness: 0.25,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.15,
    metalness: 0.95,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b1220,
    metalness: 0.1,
    roughness: 0.06,
    clearcoat: 1.0,
    transparent: true,
    opacity: customization.windowTint,
    depthWrite: false,
  });

  // 1. Contact shadow beneath car (omitted for ghost car)
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(bodyWidth * 1.32, length * 1.18),
    new THREE.MeshBasicMaterial({
      map: getContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.02;
  if (options.isGhost) {
    shadowPlane.visible = false;
  } else {
    root.add(shadowPlane);
  }

  // 2. Main sculpted primary silhouette body
  const chassisGeo = createSculptedChassisGeometry(spec.bodyStyle, length, bodyWidth, height);
  const chassisMesh = new THREE.Mesh(chassisGeo, bodyPaintMat);
  chassisMesh.castShadow = !options.useLod;
  chassisMesh.receiveShadow = true;
  detailGroup.add(chassisMesh);

  // 3. Flared wheel arches / fenders (gives wide muscular stance)
  const wheelZFront = spec.stats.wheelbase * 0.5;
  const wheelZRear = -spec.stats.wheelbase * 0.5;
  const wheelX = bodyWidth * 0.44;
  const archR = spec.stats.wheelRadius * 1.16;

  [wheelZFront, wheelZRear].forEach((wz) => {
    [-wheelX, wheelX].forEach((wx) => {
      const arch = new THREE.Mesh(
        new THREE.CylinderGeometry(archR, archR * 1.06, isWide ? 0.26 : 0.18, 16, 1, false, 0, Math.PI),
        bodyPaintMat
      );
      arch.rotation.z = Math.PI / 2;
      arch.rotation.y = Math.PI / 2;
      arch.position.set(wx * 0.95, spec.stats.wheelRadius + 0.04, wz);
      arch.castShadow = !options.useLod;
      detailGroup.add(arch);
    });
  });

  // 4. Lower carbon aero splitter, side skirts & rear diffuser
  const splitterDepth = isSport ? 0.42 : 0.28;
  const frontSplitter = new THREE.Mesh(
    new THREE.BoxGeometry(bodyWidth * 0.96, 0.05, splitterDepth),
    carbonMat
  );
  frontSplitter.position.set(0, 0.15, length * 0.5 - splitterDepth * 0.35);
  frontSplitter.castShadow = !options.useLod;
  detailGroup.add(frontSplitter);

  [-1, 1].forEach((side) => {
    const skirt = new THREE.Mesh(
      new THREE.BoxGeometry(isSport ? 0.14 : 0.09, 0.06, spec.stats.wheelbase * 0.78),
      carbonMat
    );
    skirt.position.set(side * (bodyWidth * 0.47), 0.16, 0);
    detailGroup.add(skirt);

    // Signature side aero blade on mid-engine supercars (Audi R8, Evija, Jesko)
    if (spec.bodyStyle === 'mid_v10' || spec.bodyStyle === 'ev_hyper' || spec.bodyStyle === 'track_aero') {
      const sideBlade = new THREE.Mesh(new THREE.BoxGeometry(0.05, height * 0.34, 0.44), carbonMat);
      sideBlade.position.set(side * (bodyWidth * 0.445), height * 0.48, -0.35);
      detailGroup.add(sideBlade);
    }
  });

  const rearDiffuser = new THREE.Mesh(
    new THREE.BoxGeometry(bodyWidth * 0.84, 0.14, 0.32),
    carbonMat
  );
  rearDiffuser.position.set(0, 0.18, -length * 0.47);
  detailGroup.add(rearDiffuser);

  // Diffuser fins
  for (let i = -2; i <= 2; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.13, 0.34), carbonMat);
    fin.position.set(i * 0.22, 0.17, -length * 0.48);
    detailGroup.add(fin);
  }

  // 5. Cabin Glass Canopy + Interior (seats, dashboard, steering wheel)
  const canopyGroup = new THREE.Group();
  const cabinW = bodyWidth * 0.72;
  const cabinL = length * 0.44;
  const canopyGeo = new THREE.BoxGeometry(cabinW, height * 0.38, cabinL);
  const canopyMesh = new THREE.Mesh(canopyGeo, glassMat);
  canopyMesh.position.set(0, height * 0.83, spec.silhouette.cabinOffsetZ);
  canopyMesh.renderOrder = 4;
  canopyGroup.add(canopyMesh);

  // Windshield slanted plane
  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(cabinW * 0.96, 0.02, cabinL * 0.58),
    glassMat
  );
  windshield.position.set(0, height * 0.82, spec.silhouette.cabinOffsetZ + cabinL * 0.42);
  windshield.rotation.x = 0.46;
  windshield.renderOrder = 5;
  canopyGroup.add(windshield);
  detailGroup.add(canopyGroup);

  // Interior bucket seats
  [-0.28, 0.28].forEach((sx) => {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.52, 0.38), trimDarkMat);
    seat.position.set(sx, 0.54, spec.silhouette.cabinOffsetZ - 0.15);
    seat.rotation.x = -0.18;
    detailGroup.add(seat);
  });

  // Illuminated Dashboard
  const dash = new THREE.Mesh(
    new THREE.BoxGeometry(cabinW * 0.88, 0.16, 0.28),
    trimDarkMat
  );
  dash.position.set(0, 0.68, spec.silhouette.cabinOffsetZ + cabinL * 0.35);
  detailGroup.add(dash);

  const gaugeScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.14),
    new THREE.MeshBasicMaterial({ map: getDashboardTexture() })
  );
  gaugeScreen.position.set(-0.28, 0.72, spec.silhouette.cabinOffsetZ + cabinL * 0.2);
  gaugeScreen.rotation.y = Math.PI;
  detailGroup.add(gaugeScreen);

  // Rotating Steering Wheel
  const steeringWheel = new THREE.Group();
  steeringWheel.position.set(-0.28, 0.72, spec.silhouette.cabinOffsetZ + cabinL * 0.14);
  steeringWheel.rotation.x = -0.25;
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 8, 20), trimDarkMat);
  const wheelSpoke = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.028, 0.018), carbonMat);
  steeringWheel.add(wheelRim, wheelSpoke);
  detailGroup.add(steeringWheel);

  // Working Windshield Wipers
  const leftWiper = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.014, 0.02), trimDarkMat);
  leftWiper.position.set(-0.26, height * 0.68, spec.silhouette.cabinOffsetZ + cabinL * 0.58);
  const rightWiper = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.014, 0.02), trimDarkMat);
  rightWiper.position.set(0.18, height * 0.68, spec.silhouette.cabinOffsetZ + cabinL * 0.58);
  detailGroup.add(leftWiper, rightWiper);

  // 6. Signature Front Grille & Brand Emblem Badge
  const grilleW = spec.bodyStyle === 'bugatti' ? 0.52 : spec.bodyStyle === 'coupe' ? 0.72 : bodyWidth * 0.64;
  const grilleH = spec.bodyStyle === 'bugatti' ? 0.3 : 0.2;
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(grilleW, grilleH, 0.08),
    trimDarkMat
  );
  grille.position.set(0, 0.28, length * 0.49);
  detailGroup.add(grille);

  // Metallic crest badge on nose
  const badge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.018, 16),
    new THREE.MeshStandardMaterial({
      color:
        spec.bodyStyle === 'wedge_v12' || spec.bodyStyle === 'mid_v8' || spec.bodyStyle === 'ev_hyper'
          ? 0xfacc15
          : 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.15,
    })
  );
  badge.rotation.x = Math.PI / 2 - 0.3;
  badge.position.set(0, 0.46, length * 0.46);
  detailGroup.add(badge);

  // 7. Side Mirrors
  [-1, 1].forEach((side) => {
    const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.05), carbonMat);
    mirrorArm.position.set(side * (bodyWidth * 0.47), height * 0.68, spec.silhouette.cabinOffsetZ + 0.32);
    const mirrorCap = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.075, 0.11), bodyPaintMat);
    mirrorCap.position.set(side * (bodyWidth * 0.53), height * 0.7, spec.silhouette.cabinOffsetZ + 0.3);
    detailGroup.add(mirrorArm, mirrorCap);
  });

  // 8. Headlights, Taillights, Indicators & Exhausts
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 1.6,
    roughness: 0.1,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.5,
    roughness: 0.18,
  });
  const leftIndicatorMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.05,
  });
  const rightIndicatorMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.05,
  });

  [-1, 1].forEach((side) => {
    // Headlights
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.1), headlightMat);
    hl.position.set(side * (bodyWidth * 0.34), 0.38, length * 0.46);
    hl.rotation.y = side * -0.18;
    detailGroup.add(hl);

    // Taillights
    const tlWidth = spec.bodyStyle === 'jdm' || spec.bodyStyle === 'bugatti' ? 0.4 : 0.34;
    const tl = new THREE.Mesh(new THREE.BoxGeometry(tlWidth, 0.075, 0.08), taillightMat);
    tl.position.set(side * (bodyWidth * 0.32), spec.silhouette.rearDeckHeight * 0.78, -length * 0.49);
    detailGroup.add(tl);

    // Indicators (front & rear corners)
    const indMat = side < 0 ? leftIndicatorMat : rightIndicatorMat;
    const indFront = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.08), indMat);
    indFront.position.set(side * (bodyWidth * 0.42), 0.34, length * 0.45);
    const indRear = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.08), indMat);
    indRear.position.set(side * (bodyWidth * 0.4), spec.silhouette.rearDeckHeight * 0.72, -length * 0.495);
    detailGroup.add(indFront, indRear);
  });

  // Exhaust tips / EV Venturi turbines + Nitro / Aero Boost cones
  const isElectric = spec.engineType === 'electric';
  const exhaustMat = isElectric
    ? new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      })
    : chromeMat;

  const flameMat = new THREE.MeshBasicMaterial({
    color: isElectric ? 0x67e8f9 : 0x38bdf8,
    transparent: true,
    opacity: 0.85,
  });

  if (isElectric) {
    // Twin glowing EV aero Venturi tunnels (no combustion exhaust pipes)
    [-0.36, 0.36].forEach((vx) => {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.14), exhaustMat);
      vent.position.set(vx, 0.3, -length * 0.49);
      detailGroup.add(vent);
    });
  } else if (spec.bodyStyle === 'pagani') {
    // Iconic Pagani quad center exhaust cluster
    const offsets = [
      [-0.08, 0.42],
      [0.08, 0.42],
      [-0.08, 0.32],
      [0.08, 0.32],
    ];
    offsets.forEach(([ox, oy]) => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.14, 12), exhaustMat);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(ox, oy, -length * 0.5);
      detailGroup.add(tip);
    });
  } else if (
    spec.bodyStyle === 'coupe' ||
    spec.bodyStyle === 'jdm' ||
    spec.bodyStyle === 'muscle' ||
    spec.bodyStyle === 'gt_front'
  ) {
    // Quad outer exhausts
    [-0.56, -0.44, 0.44, 0.56].forEach((ox) => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.15, 12), exhaustMat);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(ox, 0.22, -length * 0.5);
      detailGroup.add(tip);
    });
  } else {
    // Twin center/high performance exhausts
    const exY = spec.bodyStyle === 'track_aero' || spec.bodyStyle === 'lemans' ? 0.42 : 0.24;
    const exLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.16, 14), exhaustMat);
    exLeft.rotation.x = Math.PI / 2;
    exLeft.position.set(-0.22, exY, -length * 0.5);
    const exRight = exLeft.clone();
    exRight.position.x = 0.22;
    detailGroup.add(exLeft, exRight);
  }

  const exhaustOriginL = new THREE.Object3D();
  exhaustOriginL.position.set(-0.24, 0.22, -length * 0.54);
  const exhaustOriginR = new THREE.Object3D();
  exhaustOriginR.position.set(0.24, 0.22, -length * 0.54);
  detailGroup.add(exhaustOriginL, exhaustOriginR);

  const flameGeo = new THREE.ConeGeometry(0.075, 0.68, 10);
  flameGeo.rotateX(-Math.PI / 2);
  const nitroFlameLeft = new THREE.Mesh(flameGeo, flameMat);
  nitroFlameLeft.position.set(-0.24, 0.22, -length * 0.5 - 0.34);
  nitroFlameLeft.visible = false;
  const nitroFlameRight = new THREE.Mesh(flameGeo, flameMat);
  nitroFlameRight.position.set(0.24, 0.22, -length * 0.5 - 0.34);
  nitroFlameRight.visible = false;
  detailGroup.add(nitroFlameLeft, nitroFlameRight);

  // 9. Spoiler customization
  if (customization.spoilerStyle !== 'none') {
    const wingY = spec.silhouette.rearDeckHeight + (customization.spoilerStyle === 'lip' ? 0.04 : 0.24);
    if (customization.spoilerStyle === 'lip') {
      const lip = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.78, 0.06, 0.14), carbonMat);
      lip.position.set(0, wingY, -length * 0.45);
      lip.rotation.x = -0.25;
      detailGroup.add(lip);
    } else {
      const wingBlade = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth * 0.95, 0.04, 0.28),
        carbonMat
      );
      wingBlade.position.set(0, wingY, -length * 0.46);
      wingBlade.rotation.x = 0.08;
      wingBlade.castShadow = !options.useLod;
      detailGroup.add(wingBlade);

      [-0.36, 0.36].forEach((px) => {
        const pylon = new THREE.Mesh(
          new THREE.BoxGeometry(0.035, 0.24, 0.12),
          customization.spoilerStyle === 'swan_neck' ? trimDarkMat : carbonMat
        );
        pylon.position.set(px, wingY - 0.11, -length * 0.44);
        detailGroup.add(pylon);
      });
    }
  }

  // 10. Underglow Neon
  const underglowColor = new THREE.Color(customization.underglowColor);
  const underglowMat = new THREE.MeshBasicMaterial({
    color: underglowColor,
    transparent: true,
    opacity: customization.underglowEnabled ? 0.85 : 0,
  });
  const glowStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(bodyWidth * 0.9, length * 0.82),
    underglowMat
  );
  glowStrip.rotation.x = -Math.PI / 2;
  glowStrip.position.y = 0.035;
  glowStrip.visible = customization.underglowEnabled;
  detailGroup.add(glowStrip);

  let underglowLight: THREE.PointLight | null = null;
  if (customization.underglowEnabled && options.isPlayer) {
    underglowLight = new THREE.PointLight(underglowColor, 2.2, 5.5);
    underglowLight.position.set(0, 0.25, 0);
    detailGroup.add(underglowLight);
  }

  // 11. 4 Wheel Assemblies (with front steering pivots)
  const frontSteerL = new THREE.Group();
  frontSteerL.position.set(-wheelX, spec.stats.wheelRadius, wheelZFront);
  const frontSteerR = new THREE.Group();
  frontSteerR.position.set(wheelX, spec.stats.wheelRadius, wheelZFront);

  const wheelFL = buildWheelAssembly(spec.stats.wheelRadius, 0.27, true, customization);
  const wheelFR = buildWheelAssembly(spec.stats.wheelRadius, 0.27, false, customization);
  frontSteerL.add(wheelFL.pivot);
  frontSteerR.add(wheelFR.pivot);

  const wheelRL = buildWheelAssembly(spec.stats.wheelRadius * 1.03, 0.32, true, customization);
  wheelRL.pivot.position.set(-wheelX, spec.stats.wheelRadius * 1.03, wheelZRear);
  const wheelRR = buildWheelAssembly(spec.stats.wheelRadius * 1.03, 0.32, false, customization);
  wheelRR.pivot.position.set(wheelX, spec.stats.wheelRadius * 1.03, wheelZRear);

  detailGroup.add(frontSteerL, frontSteerR, wheelRL.pivot, wheelRR.pivot);

  // 12. Headlight Volumetric Cones & Real SpotLights (player only for GPU efficiency)
  const beamGeo = new THREE.ConeGeometry(1.8, 13, 14, 1, true);
  beamGeo.translate(0, -6.5, 0);
  beamGeo.rotateX(-Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.09,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beamConeLeft = new THREE.Mesh(beamGeo, beamMat);
  beamConeLeft.position.set(-bodyWidth * 0.34, 0.38, length * 0.48);
  beamConeLeft.visible = false;
  const beamConeRight = new THREE.Mesh(beamGeo, beamMat);
  beamConeRight.position.set(bodyWidth * 0.34, 0.38, length * 0.48);
  beamConeRight.visible = false;
  detailGroup.add(beamConeLeft, beamConeRight);

  let headlightSpotLeft: THREE.SpotLight | null = null;
  let headlightSpotRight: THREE.SpotLight | null = null;
  if (options.enableSpotLights) {
    headlightSpotLeft = new THREE.SpotLight(0xe0f2fe, 0, 55, Math.PI / 6, 0.55, 1.3);
    headlightSpotLeft.position.set(-bodyWidth * 0.34, 0.48, length * 0.48);
    headlightSpotLeft.target.position.set(-bodyWidth * 0.25, 0.1, length * 0.5 + 18);
    detailGroup.add(headlightSpotLeft, headlightSpotLeft.target);

    headlightSpotRight = new THREE.SpotLight(0xe0f2fe, 0, 55, Math.PI / 6, 0.55, 1.3);
    headlightSpotRight.position.set(bodyWidth * 0.34, 0.48, length * 0.48);
    headlightSpotRight.target.position.set(bodyWidth * 0.25, 0.1, length * 0.5 + 18);
    detailGroup.add(headlightSpotRight, headlightSpotRight.target);
  }

  // Damage overlay mesh
  const damageOverlayMesh = new THREE.Mesh(
    new THREE.BoxGeometry(bodyWidth * 0.9, height * 0.48, length * 0.96),
    new THREE.MeshBasicMaterial({
      map: getDamageScratchesTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  damageOverlayMesh.position.set(0, 0.44, 0);
  detailGroup.add(damageOverlayMesh);

  // Attach detailGroup either directly or wrapped in a mobile-friendly LOD shell for AI rivals
  if (options.useLod && !options.isPlayer && !options.isGhost) {
    const lod = new THREE.LOD();
    lod.addLevel(detailGroup, 0);

    const lowPolyGroup = new THREE.Group();
    const lpBody = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.92, height * 0.46, length * 0.95),
      bodyPaintMat
    );
    lpBody.position.set(0, height * 0.36, 0);
    const lpCabin = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.68, height * 0.34, length * 0.42),
      glassMat
    );
    lpCabin.position.set(0, height * 0.72, spec.silhouette.cabinOffsetZ);
    lowPolyGroup.add(lpBody, lpCabin);

    const lpWheelGeo = new THREE.CylinderGeometry(
      spec.stats.wheelRadius,
      spec.stats.wheelRadius,
      0.28,
      10
    );
    lpWheelGeo.rotateZ(Math.PI / 2);
    const lpWheelPositions: [number, number][] = [
      [-wheelX, wheelZFront],
      [wheelX, wheelZFront],
      [-wheelX, wheelZRear],
      [wheelX, wheelZRear],
    ];
    lpWheelPositions.forEach(([wx, wz]) => {
      const wMesh = new THREE.Mesh(lpWheelGeo, trimDarkMat);
      wMesh.position.set(wx, spec.stats.wheelRadius, wz);
      lowPolyGroup.add(wMesh);
    });

    lod.addLevel(lowPolyGroup, 42);
    root.add(lod);
  } else {
    root.add(detailGroup);
  }

  // Camera & Smoke anchors
  const hoodSmokeOrigin = new THREE.Object3D();
  hoodSmokeOrigin.position.set(0, 0.52, length * 0.32);
  const cockpitCameraAnchor = new THREE.Object3D();
  cockpitCameraAnchor.position.set(-0.24, height * 0.8, spec.silhouette.cabinOffsetZ - 0.1);
  const hoodCameraAnchor = new THREE.Object3D();
  hoodCameraAnchor.position.set(0, height * 0.68, length * 0.28);
  const rearMirrorAnchor = new THREE.Object3D();
  rearMirrorAnchor.position.set(0, height * 0.96, -length * 0.28);

  root.add(hoodSmokeOrigin, cockpitCameraAnchor, hoodCameraAnchor, rearMirrorAnchor);

  let ghostMaterials: { material: THREE.Material; baseOpacity: number }[] | undefined;

  if (options.isGhost) {
    shadowPlane.geometry.dispose();
    (shadowPlane.material as THREE.Material).dispose();
    glowStrip.visible = false;
    damageOverlayMesh.visible = false;

    const ghostBodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      metalness: 0.28,
      roughness: 0.18,
      clearcoat: 0.85,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    const ghostAccentMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.4,
      metalness: 0.35,
      roughness: 0.25,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const ghostGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      emissive: 0x0369a1,
      emissiveIntensity: 0.25,
      metalness: 0.1,
      roughness: 0.08,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    });
    const ghostHeadlightMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0xbae6fd,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const ghostTaillightMat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x22d3ee,
      emissiveIntensity: 1.4,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    });

    ghostMaterials = [
      { material: ghostBodyMat, baseOpacity: 0.34 },
      { material: ghostAccentMat, baseOpacity: 0.42 },
      { material: ghostGlassMat, baseOpacity: 0.24 },
      { material: ghostHeadlightMat, baseOpacity: 0.6 },
      { material: ghostTaillightMat, baseOpacity: 0.62 },
    ];

    // Dispose unused opaque materials built earlier for the ghost rig
    const seenOldMats = new Set<THREE.Material>();
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.castShadow = false;
      obj.receiveShadow = false;
      if (
        obj === nitroFlameLeft ||
        obj === nitroFlameRight ||
        obj === beamConeLeft ||
        obj === beamConeRight ||
        obj === damageOverlayMesh ||
        obj === glowStrip
      ) {
        if (obj === nitroFlameLeft || obj === nitroFlameRight) {
          obj.renderOrder = 5;
        }
        return;
      }

      obj.renderOrder = 4;
      const oldMat = obj.material;
      if (!Array.isArray(oldMat)) {
        seenOldMats.add(oldMat);
        if (oldMat === glassMat) {
          obj.material = ghostGlassMat;
        } else if (oldMat === headlightMat) {
          obj.material = ghostHeadlightMat;
        } else if (oldMat === taillightMat) {
          obj.material = ghostTaillightMat;
        } else if (oldMat === bodyPaintMat) {
          obj.material = ghostBodyMat;
        } else {
          obj.material = ghostAccentMat;
        }
      }
    });
    seenOldMats.forEach((m) => m.dispose());

    // Tint ghost nitro flames holographic cyan-blue
    const flameMatL = nitroFlameLeft.material as THREE.MeshBasicMaterial;
    const flameMatR = nitroFlameRight.material as THREE.MeshBasicMaterial;
    flameMatL.color.setHex(0x67e8f9);
    flameMatL.opacity = 0.55;
    flameMatR.color.setHex(0x67e8f9);
    flameMatR.opacity = 0.55;
  }

  return {
    root,
    bodyPaintMat,
    glassMat,
    headlightMat,
    taillightMat,
    leftIndicatorMat,
    rightIndicatorMat,
    underglowMat,
    underglowLight,
    headlightSpotLeft,
    headlightSpotRight,
    beamConeLeft,
    beamConeRight,
    nitroFlameLeft,
    nitroFlameRight,
    steeringWheel,
    leftWiper,
    rightWiper,
    frontSteerPivots: [frontSteerL, frontSteerR],
    wheelSpinGroups: [
      wheelFL.spinGroup,
      wheelFR.spinGroup,
      wheelRL.spinGroup,
      wheelRR.spinGroup,
    ],
    damageOverlayMesh,
    hoodSmokeOrigin,
    exhaustOrigins: [exhaustOriginL, exhaustOriginR],
    cockpitCameraAnchor,
    hoodCameraAnchor,
    rearMirrorAnchor,
    ghostMaterials,
  };
}
