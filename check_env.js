const fs = require('fs');

console.log("Checking environment variables...");
const vars = [
    "GOOGLE_CREDENTIALS",
    "GCS_CREDENTIALS_JSON",
    "GCS_PROJECT_ID",
    "GCS_BUCKET_NAME"
];

vars.forEach(v => {
    if (process.env[v]) {
        console.log(`${v}: SET (Length: ${process.env[v].length})`);
    } else {
        console.log(`${v}: NOT SET`);
    }
});
