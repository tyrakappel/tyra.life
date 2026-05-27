/**
 * Build-version-info. Genereras vid build/dev av scripts/generate-version.js
 * till public/version.json. Klienten pollar /version.json (no-cache) för att
 * upptäcka nya deployments och visa en "ladda om"-prompt.
 */

import pkg from "../package.json";

export const APP_VERSION = pkg.version;
