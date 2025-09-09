const OpenAI = require('openai');

// Use Ollama instead of OpenAI
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama2';

let openai = null;
let apiKeyConfigured = false;

// Configure for Ollama (no API key needed)
try {
  openai = new OpenAI({
    baseURL: `${OLLAMA_BASE_URL}/v1`,
    apiKey: 'ollama' // Ollama doesn't require an API key
  });
  apiKeyConfigured = true;
  console.log(`Ollama configured: ${OLLAMA_BASE_URL} with model ${OLLAMA_MODEL}`);
} catch (error) {
  console.warn('Ollama configuration failed:', error.message);
  console.warn('Make sure Ollama is running on the specified port');
}

const summarizeText = async (text) => {
  if (!apiKeyConfigured) {
    throw new Error('AI service is currently unavailable. Please make sure Ollama is running.');
  }

  try {
    console.log('Calling Ollama summarize API with text length:', text.length);
    const response = await openai.chat.completions.create({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that summarizes text. Keep summaries concise and clear.' },
        { role: 'user', content: `Summarize the following text:\n\n${text}` }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });
    console.log('Ollama summarize API call successful');
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Ollama summarize error:', error.message);

    // Handle Ollama-specific errors
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch') || error.message.includes('connect')) {
      throw new Error('Cannot connect to Ollama. Please make sure Ollama is running on ' + OLLAMA_BASE_URL);
    } else if (error.status === 404) {
      throw new Error(`Model '${OLLAMA_MODEL}' not found. Please pull the model first: ollama pull ${OLLAMA_MODEL}`);
    } else if (error.status === 500) {
      throw new Error('Ollama server error. Please check Ollama logs.');
    } else {
      throw new Error('AI service temporarily unavailable. Please try again later.');
    }
  }
};

const generateMCQs = async (text, count = 10, difficulty = 'intermediate') => {
  if (!apiKeyConfigured) {
    throw new Error('AI service is currently unavailable. Please make sure Ollama is running.');
  }

  try {
    console.log('Calling Ollama MCQ generation API with text length:', text.length, 'count:', count);
    const response = await openai.chat.completions.create({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that generates multiple-choice questions. Always respond with valid JSON only, no additional text.' },
        { role: 'user', content: `Generate ${count} MCQs from the following text with ${difficulty} difficulty. Format as JSON array with each object having: question (string), options (object with A,B,C,D keys), correct_answer (string like "A").\n\n${text}` }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });
    console.log('Ollama MCQ generation API call successful');
    const content = response.choices[0].message.content.trim();

    // Try to extract JSON from response
    let jsonContent = content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    try {
      return JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response content:', content);
      throw new Error('AI service error: Invalid response format. Please try again.');
    }
  } catch (error) {
    console.error('Ollama MCQ generation error:', error.message);

    // Handle Ollama-specific errors
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch') || error.message.includes('connect')) {
      throw new Error('Cannot connect to Ollama. Please make sure Ollama is running on ' + OLLAMA_BASE_URL);
    } else if (error.status === 404) {
      throw new Error(`Model '${OLLAMA_MODEL}' not found. Please pull the model first: ollama pull ${OLLAMA_MODEL}`);
    } else if (error.status === 500) {
      throw new Error('Ollama server error. Please check Ollama logs.');
    } else {
      throw new Error('AI service error: Failed to generate questions. Please try again.');
    }
  }
};

const generateImage = async (prompt, style = 'modern') => {
  if (!apiKeyConfigured) {
    throw new Error('AI service is currently unavailable. Please make sure Ollama is running.');
  }

  try {
    const stylePrompts = {
      modern: 'Modern, clean, professional design',
      classic: 'Classic, elegant, timeless design',
      minimal: 'Minimal, simple, focused design'
    };

    const fullPrompt = `${prompt}. Style: ${stylePrompts[style] || stylePrompts.modern}`;

    // Ollama doesn't support image generation, so we'll generate a text description
    const response = await openai.chat.completions.create({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: 'You are an AI that generates detailed image descriptions for visualization purposes.' },
        { role: 'user', content: `Generate a detailed description of an image based on this prompt: ${fullPrompt}. Make it vivid and specific so someone could visualize it clearly.` }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    // Return a placeholder URL with the description as a data URL
    const description = response.choices[0].message.content.trim();
    const dataUrl = `data:text/plain;base64,${Buffer.from(description).toString('base64')}`;
    return dataUrl;
  } catch (error) {
    console.error('Ollama image generation error:', error);

    // Handle Ollama-specific errors
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch') || error.message.includes('connect')) {
      throw new Error('Cannot connect to Ollama. Please make sure Ollama is running on ' + OLLAMA_BASE_URL);
    } else if (error.status === 404) {
      throw new Error(`Model '${OLLAMA_MODEL}' not found. Please pull the model first: ollama pull ${OLLAMA_MODEL}`);
    } else if (error.status === 500) {
      throw new Error('Ollama server error. Please check Ollama logs.');
    } else {
      throw new Error('AI service error: Failed to generate image description. Please try again.');
    }
  }
};

const generateMindMap = async (text) => {
  if (!apiKeyConfigured) {
    throw new Error('AI service is currently unavailable. Please make sure Ollama is running.');
  }

  try {
    const response = await openai.chat.completions.create({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that creates mind maps from text content. Always respond with valid JSON only.' },
        { role: 'user', content: `Create a detailed mind map structure from the following text. Format as JSON with a central topic and branches containing subtopics and key points.\n\n${text}` }
      ],
      max_tokens: 1500,
      temperature: 0.5,
    });
    const content = response.choices[0].message.content.trim();

    // Try to extract JSON from response
    let jsonContent = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    try {
      return JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response content:', content);
      throw new Error('AI service error: Invalid response format. Please try again.');
    }
  } catch (error) {
    console.error('Ollama mind map generation error:', error);

    // Handle Ollama-specific errors
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch') || error.message.includes('connect')) {
      throw new Error('Cannot connect to Ollama. Please make sure Ollama is running on ' + OLLAMA_BASE_URL);
    } else if (error.status === 404) {
      throw new Error(`Model '${OLLAMA_MODEL}' not found. Please pull the model first: ollama pull ${OLLAMA_MODEL}`);
    } else if (error.status === 500) {
      throw new Error('Ollama server error. Please check Ollama logs.');
    } else {
      throw new Error('AI service error: Failed to generate mind map. Please try again.');
    }
  }
};

const generateStudyGuide = async (text) => {
  if (!apiKeyConfigured) {
    throw new Error('AI service is currently unavailable. Please make sure Ollama is running.');
  }

  try {
    const response = await openai.chat.completions.create({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that creates comprehensive study guides from text content.' },
        { role: 'user', content: `Create a detailed study guide from the following text. Include key concepts, definitions, examples, and practice questions.\n\n${text}` }
      ],
      max_tokens: 2000,
      temperature: 0.4,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Ollama study guide generation error:', error);

    // Handle Ollama-specific errors
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch') || error.message.includes('connect')) {
      throw new Error('Cannot connect to Ollama. Please make sure Ollama is running on ' + OLLAMA_BASE_URL);
    } else if (error.status === 404) {
      throw new Error(`Model '${OLLAMA_MODEL}' not found. Please pull the model first: ollama pull ${OLLAMA_MODEL}`);
    } else if (error.status === 500) {
      throw new Error('Ollama server error. Please check Ollama logs.');
    } else {
      throw new Error('AI service error: Failed to generate study guide. Please try again.');
    }
  }
};

const generateFlashcards = async (text, count = 10) => {
  if (!apiKeyConfigured) {
    throw new Error('AI service is currently unavailable. Please make sure Ollama is running.');
  }

  try {
    const response = await openai.chat.completions.create({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that creates flashcards from text content. Always respond with valid JSON only.' },
        { role: 'user', content: `Generate ${count} flashcards from the following text. Format as JSON array with each object having 'question' and 'answer' properties.\n\n${text}` }
      ],
      max_tokens: 2000,
      temperature: 0.6,
    });
    const content = response.choices[0].message.content.trim();

    // Try to extract JSON from response
    let jsonContent = content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    try {
      return JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response content:', content);
      throw new Error('AI service error: Invalid response format. Please try again.');
    }
  } catch (error) {
    console.error('Ollama flashcards generation error:', error);

    // Handle Ollama-specific errors
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch') || error.message.includes('connect')) {
      throw new Error('Cannot connect to Ollama. Please make sure Ollama is running on ' + OLLAMA_BASE_URL);
    } else if (error.status === 404) {
      throw new Error(`Model '${OLLAMA_MODEL}' not found. Please pull the model first: ollama pull ${OLLAMA_MODEL}`);
    } else if (error.status === 500) {
      throw new Error('Ollama server error. Please check Ollama logs.');
    } else {
      throw new Error('AI service error: Failed to generate flashcards. Please try again.');
    }
  }
};

module.exports = { summarizeText, generateMCQs, generateImage, generateMindMap, generateStudyGuide, generateFlashcards };
