const { VertexAI } = require("@google-cloud/vertexai");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

async function testModel() {
  try {
    // Read .env.local manually
    const envContent = await fs.readFile(path.join(__dirname, ".env.local"), "utf-8");
    const match = envContent.match(/GOOGLE_CREDENTIALS=(.*)/);
    let credentialsJsonString = match ? match[1] : process.env.GOOGLE_CREDENTIALS;

    if (credentialsJsonString) {
      const firstBrace = credentialsJsonString.indexOf("{");
      const lastBrace = credentialsJsonString.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        credentialsJsonString = credentialsJsonString.substring(firstBrace, lastBrace + 1);
      }
    }

    if (!credentialsJsonString) {
      throw new Error("GOOGLE_CREDENTIALS not set");
    }

    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, `creds-test-${Date.now()}.json`);
    await fs.writeFile(filePath, credentialsJsonString);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = filePath;

    const vertex_ai = new VertexAI({
      project: "api1-346604",
      location: "asia-northeast1",
    });

    const modelName = "gemini-2.5-pro";
    console.log(`Testing model: ${modelName}`);

    const generativeModel = vertex_ai.getGenerativeModel({
      model: modelName,
    });

    const result = await generativeModel.generateContent({
      contents: [{ role: "user", parts: [{ text: "Hello" }] }],
    });

    console.log("Success!");
    console.log(JSON.stringify(result, null, 2));

    await fs.unlink(filePath);
  } catch (error) {
    console.error("Error testing model:");
    console.error(error);
  }
}

testModel();
