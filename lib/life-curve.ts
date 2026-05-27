export type LifeCurveData = {
  birthYear: number | null;
  /**
   * Värden mellan -1 och 1 där 0 är neutralt.
   * Index n motsvarar åldern n * 0.5 år.
   * Längd = floor(currentAge * 2) + 1 om birthYear satt.
   */
  values: number[];
};

export const POINT_INTERVAL_YEARS = 0.5;

export function ageToIndex(age: number): number {
  return Math.round(age / POINT_INTERVAL_YEARS);
}

export function indexToAge(index: number): number {
  return index * POINT_INTERVAL_YEARS;
}

export function currentAge(birthYear: number, now: Date = new Date()): number {
  return now.getFullYear() - birthYear;
}

/**
 * Säkerställer att values-arrayen har rätt längd för given ålder.
 * - Förkortar inte (bevarar historik)
 * - Förlängs med 0 om för kort
 */
export function ensureValuesLength(
  values: number[],
  birthYear: number | null
): number[] {
  if (birthYear == null) return values;
  const age = currentAge(birthYear);
  const expectedLength = ageToIndex(age) + 1;
  if (values.length >= expectedLength) return values;
  const extended = [...values];
  while (extended.length < expectedLength) extended.push(0);
  return extended;
}

/**
 * Klampa ett värde till [-1, 1].
 */
export function clampValue(v: number): number {
  return Math.max(-1, Math.min(1, v));
}
