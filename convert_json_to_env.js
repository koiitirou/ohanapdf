const fs = require('fs');

// Usage: node convert_json_to_env.js path/to/your-service-account.json

const jsonFilePath = process.argv[2];

if (!jsonFilePath) {
    console.error('Usage: node convert_json_to_env.js <path-to-service-account.json>');
    process.exit(1);
}

try {
    const content = fs.readFileSync(jsonFilePath, 'utf8');
    const minified = JSON.stringify(JSON.parse(content));

    console.log('\n=== Add this line to your .env.local file ===\n');
    console.log(`GOOGLE_CREDENTIALS=${minified}`);
    console.log('\n==============================================\n');
} catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
}
