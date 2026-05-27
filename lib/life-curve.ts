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
 * Säkerställer att values-arrayen täcker HELA pågående livsår.
 * För en 13-åring ger detta punkter 0.0, 0.5, …, 13.0, 13.5 (28 st).
 * Det innebär att man kan sätta status för innevarande år oavsett
 * när på året man föddes.
 *
 * - Förkortar inte (bevarar historik)
 * - Förlängs med 0 om för kort
 */
export function ensureValuesLength(
  values: number[],
  birthYear: number | null
): number[] {
  if (birthYear == null) return values;
  const age = currentAge(birthYear);
  // Inkluderar midpunkt på pågående år (age + 0.5)
  const expectedLength = ageToIndex(age) + 2;
  if (values.length >= expectedLength) return values;
  const extended = [...values];
  while (extended.length < expectedLength) extended.push(0);
  return extended;
}

export const VALUE_MIN = -10;
export const VALUE_MAX = 10;

/**
 * Klampa ett värde till [VALUE_MIN, VALUE_MAX].
 */
export function clampValue(v: number): number {
  return Math.max(VALUE_MIN, Math.min(VALUE_MAX, v));
}
