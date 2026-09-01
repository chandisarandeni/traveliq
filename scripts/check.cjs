const path = require('node:path');
const dotenv = require('dotenv');

const envPath = path.resolve(process.cwd(), '.env');

// ============= Environment Setup =============
dotenv.config({ path: envPath, quiet: true });

const checks = {
  newgeo: checkGeoapifyApi,
};

const checkName = process.argv[2];

if (!checkName || !checks[checkName]) {
  console.error(`Unknown check "${checkName ?? ''}". Available checks: ${Object.keys(checks).join(', ')}`);
  process.exit(1);
}

checks[checkName]().catch((error) => {
  console.error(`Geoapify API check failed: ${error.message}`);
  process.exit(1);
});

async function checkGeoapifyApi() {
  // ============= Geoapify API =============
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    console.error('Geoapify API check failed: GEOAPIFY_API_KEY is missing in .env');
    process.exit(1);
  }

  const address = '38 Upper Montagu Street, Westminster W1H 1LJ, United Kingdom';
  const url = new URL('https://api.geoapify.com/v1/geocode/search');
  url.searchParams.set('text', address);
  url.searchParams.set('apiKey', apiKey);

  // --------------------- Live Request ------------------
  const response = await fetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`request returned HTTP ${response.status} ${response.statusText}: ${responseText}`);
  }

  const result = await response.json();

  if (!Array.isArray(result.features) || result.features.length === 0) {
    throw new Error('request succeeded but returned no geocoding features');
  }

  const firstFeature = result.features[0];
  const formattedAddress = firstFeature?.properties?.formatted ?? address;
  const coordinates = firstFeature?.geometry?.coordinates;

  console.log(`Geoapify API check passed: GEOAPIFY_API_KEY is working (${maskValue(apiKey)})`);
  console.log(`Matched address: ${formattedAddress}`);
  console.log(`Coordinates: ${Array.isArray(coordinates) ? coordinates.join(', ') : 'Unavailable'}`);
}

function maskValue(value) {
  // ============= Secret Masking =============
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
