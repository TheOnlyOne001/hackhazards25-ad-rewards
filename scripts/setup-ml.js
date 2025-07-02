// scripts/setup-ml.js - Download and setup local ML files
const fs = require('fs');
const path = require('path');
const https = require('https');

const REQUIRED_DIRS = [
  'lib',
  'models',
  'models/distilbert-base-uncased'
];

const DOWNLOAD_URL = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1/dist/transformers.min.js';
const LOCAL_PATH = 'lib/transformers.min.js';

/**
 * Create required directories
 */
function createDirectories() {
  console.log('📁 Creating required directories...');
  
  REQUIRED_DIRS.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created: ${dir}`);
    } else {
      console.log(`📁 Exists: ${dir}`);
    }
  });
}

/**
 * Download transformers library
 */
function downloadTransformers() {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(LOCAL_PATH)) {
      console.log('📦 Transformers library already exists');
      resolve();
      return;
    }

    console.log(`⬇️ Downloading transformers library...`);
    console.log(`From: ${DOWNLOAD_URL}`);
    console.log(`To: ${LOCAL_PATH}`);
    
    const file = fs.createWriteStream(LOCAL_PATH);
    
    https.get(DOWNLOAD_URL, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: transformers.min.js (${fs.statSync(LOCAL_PATH).size} bytes)`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(LOCAL_PATH, () => {}); // Delete partial file
      reject(err);
    });
  });
}

/**
 * Verify setup
 */
function verifySetup() {
  console.log('🔍 Verifying setup...');
  
  // Check transformers library
  if (fs.existsSync(LOCAL_PATH)) {
    const stats = fs.statSync(LOCAL_PATH);
    console.log(`✅ Transformers: ${LOCAL_PATH} (${stats.size} bytes)`);
  } else {
    console.log(`❌ Missing: ${LOCAL_PATH}`);
    return false;
  }
  
  // Check directories
  let allDirsExist = true;
  REQUIRED_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`✅ Directory: ${dir}`);
    } else {
      console.log(`❌ Missing: ${dir}`);
      allDirsExist = false;
    }
  });
  
  return allDirsExist;
}

/**
 * Update package.json scripts
 */
function updatePackageJson() {
  const packagePath = 'package.json';
  
  if (!fs.existsSync(packagePath)) {
    console.log('❌ package.json not found');
    return;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Add required scripts
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts['setup-ml'] = 'node scripts/setup-ml.js';
  packageJson.scripts['build'] = 'webpack --mode production';
  packageJson.scripts['build:dev'] = 'webpack --mode development';
  packageJson.scripts['watch'] = 'webpack --mode development --watch';
  
  // Add required dev dependencies
  packageJson.devDependencies = packageJson.devDependencies || {};
  packageJson.devDependencies['webpack'] = '^5.75.0';
  packageJson.devDependencies['webpack-cli'] = '^5.0.0';
  packageJson.devDependencies['copy-webpack-plugin'] = '^11.0.0';
  packageJson.devDependencies['dotenv'] = '^16.0.0';
  
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Updated package.json');
}

/**
 * Main setup function
 */
async function main() {
  console.log('🚀 Setting up local ML files for browser extension...\n');
  
  try {
    // 1. Create directories
    createDirectories();
    
    // 2. Update package.json
    updatePackageJson();
    
    // 3. Download transformers library
    await downloadTransformers();
    
    // 4. Verify setup
    const success = verifySetup();
    
    if (success) {
      console.log('\n✅ Setup complete!');
      console.log('\n📋 Next steps:');
      console.log('1. Run: npm install');
      console.log('2. Ensure .env file has GROQ_API_KEY (if using Groq fallback)');
      console.log('3. Run: npm run build');
      console.log('4. Load dist/ folder in browser as unpacked extension');
      console.log('\n🔍 Verification:');
      console.log('- Check that dist/lib/transformers.min.js exists after build');
      console.log('- No "https://" URLs should appear in background console');
    } else {
      console.log('\n❌ Setup incomplete - check errors above');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };