import { CarSpec } from '../types/game';

/**
 * Global game version & creator credits shown on About and Home footer.
 */
export const APP_VERSION = 'v2.0.0';
export const CREATOR_NAME = 'DEEKSHITH.S';

/**
 * Config switch for car manufacturer & model naming:
 * - true: real supercar brands & model names
 * - false: original DK Car Race fictional names
 */
export const useRealBrands = true;

export function getCarBrand(spec: CarSpec): string {
  return useRealBrands ? spec.brand : spec.fictionalBrand;
}

export function getCarName(spec: CarSpec): string {
  return useRealBrands ? spec.name : spec.fictionalName;
}

export function getCarDisplayName(spec: CarSpec): string {
  const brand = getCarBrand(spec);
  const name = getCarName(spec);
  if (name.toLowerCase().startsWith(brand.toLowerCase())) {
    return name;
  }
  return `${brand} ${name}`;
}
