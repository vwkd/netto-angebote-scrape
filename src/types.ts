/**
 * Options of command
 */
export interface Options {
  /**
   * Path to output directory
   */
  dir: string;
  /**
   * Loop in random order
   */
  random: boolean;
}

/**
 * Brochures
 *
 * - including local offers if store address is present
 */
export interface Brochures {
  address?: string;
  brochures: Brochure[];
}

/**
 * Brochure
 */
export interface Brochure {
  id: string;
  url: string;
}
