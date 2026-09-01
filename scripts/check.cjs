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
  // ============= Geoapify Route Matrix API =============
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    console.error('Geoapify API check failed: GEOAPIFY_API_KEY is missing in .env');
    process.exit(1);
  }

  const url = new URL('https://api.geoapify.com/v1/routematrix');
  url.searchParams.set('apiKey', apiKey);
  const body = {
    mode: 'drive',
    sources: [
      { location: [80.6337, 7.2906] },
      { location: [80.6413, 7.2936] },
    ],
    targets: [
      { location: [80.6337, 7.2906] },
      { location: [80.6413, 7.2936] },
    ],
  };

  // --------------------- Live Request ------------------
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`request returned HTTP ${response.status} ${response.statusText}: ${responseText}`);
  }

  const result = await response.json();

  if (!Array.isArray(result.sources_to_targets) || !result.sources_to_targets[0]?.[1]) {
    throw new Error('request succeeded but returned no route matrix value');
  }

  const routeMatrixValue = result.sources_to_targets[0][1];

  console.log(`Geoapify Route Matrix API check passed: GEOAPIFY_API_KEY is working (${maskValue(apiKey)})`);
  console.log(`Distance meters: ${routeMatrixValue.distance}`);
  console.log(`Travel time seconds: ${routeMatrixValue.time}`);
}

function maskValue(value) {
  // ============= Secret Masking =============
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
