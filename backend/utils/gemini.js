const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.API_KEY) {
  console.warn("⚠️ API_KEY not set in .env");
}

const ai = new GoogleGenerativeAI(process.env.API_KEY || "mock_key");
const useMock = !process.env.API_KEY;

async function runHomeChat(text) {
  if (useMock) return `Mock response for: ${text}`;

  const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(text);
  return result.response.text();
}

async function runNotesBreakdown(mode, text) {
  if (useMock) return `Mock notes breakdown (${mode}): ${text}`;

  const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

  let prompt = "";
  if (mode === "Smart Summary") prompt = `Summarize this text:\n${text}`;
  if (mode === "Mind Map") prompt = `Make a mind map of:\n${text}`;
  if (mode === "Study Guide") prompt = `Create a study guide for:\n${text}`;
  if (mode === "Flashcards") prompt = `Generate flashcards from:\n${text}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function runGenerateImage(prompt, type, style) {
  if (useMock) return `https://picsum.photos/seed/${Date.now()}/500/500`;

  const model = ai.getGenerativeModel({ model: "imagen-3.0" });
  const result = await model.generateContent(
    `Generate a ${style} ${type} of: ${prompt}`
  );
  return result.response.text(); // placeholder, real API may differ
}

async function runMCQGenerator(content, count, difficulty) {
  if (useMock) {
    return Array.from({ length: count }, (_, i) => ({
      question: `Mock Q${i + 1} (${difficulty})`,
      options: ["A", "B", "C", "D"],
      correctAnswer: "A",
    }));
  }

  const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Generate ${count} ${difficulty} MCQs from:\n${content}`;
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

async function runSummarizer(content, mode) {
  if (useMock) return `Mock summary (${mode}) of: ${content}`;

  const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
  let prompt = "";
  if (mode === "Summarize") prompt = `Summarize this:\n${content}`;
  if (mode === "Generate Questions")
    prompt = `Generate key questions from:\n${content}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

module.exports = {
  runHomeChat,
  runNotesBreakdown,
  runGenerateImage,
  runMCQGenerator,
  runSummarizer,
};
