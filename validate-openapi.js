#!/usr/bin/env node

/**
 * OpenAPI Schema Validator
 * Validates the OpenAPI schema files for the Remittance API Server
 */

import fs from 'fs';
import yaml from 'js-yaml';

function validateOpenAPISchema() {
  console.log('🔍 Validating OpenAPI schemas...\n');

  try {
    // Validate YAML file
    console.log('1. Validating openapi.yaml...');
    const yamlContent = fs.readFileSync('./openapi.yaml', 'utf8');
    const yamlSchema = yaml.load(yamlContent);
    console.log('✅ YAML schema is valid');
    console.log(`   - Title: ${yamlSchema.info.title}`);
    console.log(`   - Version: ${yamlSchema.info.version}`);
    console.log(`   - Endpoints: ${Object.keys(yamlSchema.paths).length}`);
    console.log('');

    // Validate JSON file
    console.log('2. Validating openapi.json...');
    const jsonContent = fs.readFileSync('./openapi.json', 'utf8');
    const jsonSchema = JSON.parse(jsonContent);
    console.log('✅ JSON schema is valid');
    console.log(`   - Title: ${jsonSchema.info.title}`);
    console.log(`   - Version: ${jsonSchema.info.version}`);
    console.log(`   - Endpoints: ${Object.keys(jsonSchema.paths).length}`);
    console.log('');

    // Compare schemas
    console.log('3. Comparing YAML and JSON schemas...');
    const yamlEndpoints = Object.keys(yamlSchema.paths).sort();
    const jsonEndpoints = Object.keys(jsonSchema.paths).sort();
    
    if (JSON.stringify(yamlEndpoints) === JSON.stringify(jsonEndpoints)) {
      console.log('✅ Both schemas have the same endpoints');
    } else {
      console.log('❌ Endpoints differ between YAML and JSON');
      console.log('YAML endpoints:', yamlEndpoints);
      console.log('JSON endpoints:', jsonEndpoints);
    }
    console.log('');

    // List all endpoints
    console.log('4. Available API endpoints:');
    yamlEndpoints.forEach((endpoint, index) => {
      const methods = Object.keys(yamlSchema.paths[endpoint]);
      console.log(`   ${index + 1}. ${endpoint} (${methods.join(', ').toUpperCase()})`);
    });
    console.log('');

    // List all components
    console.log('5. Available components:');
    const schemas = Object.keys(yamlSchema.components.schemas);
    const securitySchemes = Object.keys(yamlSchema.components.securitySchemes);
    console.log(`   - Schemas: ${schemas.length} (${schemas.join(', ')})`);
    console.log(`   - Security Schemes: ${securitySchemes.length} (${securitySchemes.join(', ')})`);
    console.log('');

    console.log('🎉 OpenAPI schema validation completed successfully!');
    console.log('');
    console.log('📚 You can use these schemas with:');
    console.log('   - Swagger UI: https://editor.swagger.io/');
    console.log('   - Postman: Import the JSON file');
    console.log('   - OpenAPI Generator: Generate client SDKs');
    console.log('   - API documentation tools');

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

// Check if js-yaml is available
try {
  import('js-yaml').then(() => {
    validateOpenAPISchema();
  });
} catch (error) {
  console.log('⚠️  js-yaml not found. Installing...');
  console.log('Run: npm install js-yaml');
  console.log('Then run this script again.');
}
