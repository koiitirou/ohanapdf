const fs = require('fs');

try {
    const content = fs.readFileSync('.env.local', 'utf8');
    const lines = content.split('\n');

    let googleCreds = null;
    let gcsCreds = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('GOOGLE_CREDENTIALS=')) {
            googleCreds = trimmed.substring('GOOGLE_CREDENTIALS='.length);
        }
        if (trimmed.startsWith('GCS_CREDENTIALS_JSON=')) {
            gcsCreds = trimmed.substring('GCS_CREDENTIALS_JSON='.length);
        }
    }

    console.log('=== Current Credentials Status ===\n');

    if (googleCreds) {
        try {
            const parsed = JSON.parse(googleCreds);
            console.log('✅ GOOGLE_CREDENTIALS found:');
            console.log('   Email:', parsed.client_email);
        } catch (e) {
            console.log('❌ GOOGLE_CREDENTIALS invalid JSON');
        }
    } else {
        console.log('❌ GOOGLE_CREDENTIALS not found');
    }

    console.log('');

    if (gcsCreds) {
        try {
            const parsed = JSON.parse(gcsCreds);
            console.log('✅ GCS_CREDENTIALS_JSON found:');
            console.log('   Email:', parsed.client_email);
        } catch (e) {
            console.log('❌ GCS_CREDENTIALS_JSON invalid JSON');
        }
    } else {
        console.log('❌ GCS_CREDENTIALS_JSON not found');
    }

} catch (e) {
    console.error('Error:', e.message);
}
