const { validateEnv } = require('../lib/env');

function validateEnvironment() {
  console.log('🔍 Validating environment variables...');
  
  const result = validateEnv();
  
  if (!result.isValid) {
    console.error('❌ Environment validation failed:');
    result.errors.forEach(error => {
      console.error(`  - ${error}`);
    });
    process.exit(1);
  }
  
  console.log('✅ Environment validation passed');
}

// Run validation
validateEnvironment(); 