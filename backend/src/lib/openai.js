const OpenAI = require('openai');

// Use Ollama instead of OpenAI
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama2';

let openai = null;
let apiKeyConfigured = false;
let lastHealthCheck = null;
let healthCheckCache = null;
const HEALTH_CHECK_CACHE_DURATION = 30000; // 30 seconds

// Configure for Ollama (no API key needed)
try {
  openai = new OpenAI({
    baseURL: `${OLLAMA_BASE_URL}/v1`,
    apiKey: 'ollama' // Ollama doesn't require an API key
  });
  apiKeyConfigured = true;
  console.log(`Ollama configured: ${OLLAMA_BASE_URL} with model ${OLLAMA_MODEL}`);
} catch (error) {
  console.error('Ollama configuration failed:', error.message);
  console.error('Make sure Ollama is running on the specified port');
  console.error('Installation instructions:');
  console.error('1. Download Ollama from https://ollama.ai');
  console.error('2. Install and start Ollama');
  console.error('3. Pull the required model: ollama pull llama2');
  console.error('4. Verify Ollama is running: curl http://localhost:11434/api/tags');
}

// Health check function for Ollama connectivity
async function checkOllamaHealth() {
  // Use cached result if recent
  if (lastHealthCheck && healthCheckCache && (Date.now() - lastHealthCheck) < HEALTH_CHECK_CACHE_DURATION) {
    return healthCheckCache;
  }

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const models = data.models || [];

    // Check if our required model is available
    const hasRequiredModel = models.some(model => model.name === OLLAMA_MODEL || model.name.startsWith(OLLAMA_MODEL));

    const healthStatus = {
      available: true,
      hasRequiredModel,
      models: models.map(m => m.name),
      baseUrl: OLLAMA_BASE_URL,
      requiredModel: OLLAMA_MODEL
    };

    // Cache the result
    lastHealthCheck = Date.now();
    healthCheckCache = healthStatus;

    return healthStatus;
  } catch (error) {
    const healthStatus = {
      available: false,
      error: error.message,
      baseUrl: OLLAMA_BASE_URL,
      requiredModel: OLLAMA_MODEL
    };

    // Cache the result
    lastHealthCheck = Date.now();
    healthCheckCache = healthStatus;

    return healthStatus;
  }
}

// Enhanced error handling function
function createOllamaError(error, operation = 'AI operation') {
  if (error.code === 'ECONNREFUSED' || error.message.includes('fetch') || error.message.includes('connect')) {
    return new Error(`Cannot connect to Ollama at ${OLLAMA_BASE_URL}. Please ensure Ollama is running and accessible.`);
  } else if (error.status === 404) {
    return new Error(`Model '${OLLAMA_MODEL}' not found. Please run: ollama pull ${OLLAMA_MODEL}`);
  } else if (error.status === 500) {
    return new Error('Ollama server error. Please check Ollama logs and restart if necessary.');
  } else if (error.message.includes('timeout')) {
    return new Error('Ollama request timed out. The model may be too large or the server is overloaded.');
  } else if (error.message.includes('model') && error.message.includes('not found')) {
    return new Error(`Required model '${OLLAMA_MODEL}' is not available. Please run: ollama pull ${OLLAMA_MODEL}`);
  } else {
    return new Error(`${operation} failed: ${error.message}`);
  }
}

const summarizeText = async (text) => {
  if (!apiKeyConfigured) {
    throw new Error('AI service is currently unavailable. Please make sure Ollama is running.');
  }

  try {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Calling Ollama summarize API with text length: ${text.length}`);
    const response = await openai.chat.completions.create({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that summarizes text. Generate concise chapter summaries and key points.' },
        { role: 'user', content: `Generate concise chapter summaries and key points from the following text:\n\n${text}` }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });
    const endTime = Date.now();
    console.log(`[${new Date().toISOString()}] Ollama summarize API call successful in ${endTime - startTime}ms`);
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Ollama summarize error:', error.message);
    throw createOllamaError(error, 'Text summarization');
  }
};

const generateMCQs = async (text, count = 10, difficulty = 'intermediate') => {
  if (!apiKeyConfigured) {
    throw new Error('AI service is currently unavailable. Please make sure Ollama is running.');
  }

  try {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Calling Ollama MCQ generation API with text length: ${text.length}, count: ${count}`);
    const response = await openai.chat.completions.create({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that generates multiple-choice questions. Always respond with valid JSON only, no additional text.' },
        { role: 'user', content: `Generate ${count} MCQs from the following text with ${difficulty} difficulty. Format as JSON array with each object having: question (string), options (object with A,B,C,D keys), correct_answer (string like "A").\n\n${text}` }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });
    const endTime = Date.now();
    console.log(`[${new Date().toISOString()}] Ollama MCQ generation API call successful in ${endTime - startTime}ms`);
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
    throw createOllamaError(error, 'MCQ generation');
  }
};

const generateImage = async (prompt, style = 'modern') => {
  if (!apiKeyConfigured) {
    throw new Error('AI service is currently unavailable. Please make sure Ollama is running.');
  }

  try {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Calling Ollama image generation API with prompt length: ${prompt.length}`);
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

    const endTime = Date.now();
    console.log(`[${new Date().toISOString()}] Ollama image generation API call successful in ${endTime - startTime}ms`);

    // Return a placeholder URL with the description as a data URL
    const description = response.choices[0].message.content.trim();
    const dataUrl = `data:text/plain;base64,${Buffer.from(description).toString('base64')}`;
    return dataUrl;
  } catch (error) {
    console.error('Ollama image generation error:', error);
    throw createOllamaError(error, 'Image generation');
  }
};

const generateMindMap = async (text) => {
  if (!apiKeyConfigured) {
    throw new Error('AI service is currently unavailable. Please make sure Ollama is running.');
  }

  try {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Calling Ollama mind map API with text length: ${text.length}`);
    const response = await openai.chat.completions.create({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that creates mind maps from text content. Always respond with valid JSON only, no additional text or explanations.' },
        { role: 'user', content: `Create a detailed mind map structure from the following text. Format as JSON with this exact structure:
{
  "central_topic": "Main Topic",
  "branches": [
    {
      "topic": "Branch Topic",
      "subtopics": ["Subtopic 1", "Subtopic 2"],
      "key_points": ["Point 1", "Point 2"]
    }
  ]
}

Text to analyze:
${text}` }
      ],
      max_tokens: 1500,
      temperature: 0.5,
    });
    const endTime = Date.now();
    console.log(`[${new Date().toISOString()}] Ollama mind map API call successful in ${endTime - startTime}ms`);
    const content = response.choices[0].message.content.trim();

    // Try to extract JSON from response
    let jsonContent = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonContent);

      // Validate the structure
      if (!parsed.central_topic || !Array.isArray(parsed.branches)) {
        throw new Error('Invalid mind map structure');
      }

      return parsed;
    } catch (parseError) {
      console.error('JSON parse error for mind map:', parseError);
      console.error('Response content:', content);

      // Fallback: Create a basic mind map structure
      console.log('Creating fallback mind map structure');
      const fallbackMindMap = {
        central_topic: text.split(' ').slice(0, 3).join(' ') + '...',
        branches: [
          {
            topic: 'Key Concepts',
            subtopics: ['Main ideas', 'Important points'],
            key_points: text.split('.').slice(0, 3).map(s => s.trim()).filter(s => s.length > 0)
          },
          {
            topic: 'Summary',
            subtopics: ['Overview', 'Conclusions'],
            key_points: ['Content processed', 'Basic structure created']
          }
        ]
      };

      return fallbackMindMap;
    }
  } catch (error) {
    console.error('Ollama mind map generation error:', error);
    throw createOllamaError(error, 'Mind map generation');
  }
};

const generateStudyGuide = async (text) => {
  if (!apiKeyConfigured) {
    throw new Error('AI service is currently unavailable. Please make sure Ollama is running.');
  }

  try {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Calling Ollama study guide API with text length: ${text.length}`);
    const response = await openai.chat.completions.create({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that creates comprehensive study guides from text content. Generate comprehensive study guide.' },
        { role: 'user', content: `Generate comprehensive study guide from the following text. Include key concepts, definitions, examples, and practice questions.\n\n${text}` }
      ],
      max_tokens: 2000,
      temperature: 0.4,
    });
    const endTime = Date.now();
    console.log(`[${new Date().toISOString()}] Ollama study guide API call successful in ${endTime - startTime}ms`);
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Ollama study guide generation error:', error);
    throw createOllamaError(error, 'Study guide generation');
  }
};

const generateFlashcards = async (text, count = 10) => {
  if (!apiKeyConfigured) {
    throw new Error('AI service is currently unavailable. Please make sure Ollama is running.');
  }

  try {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Calling Ollama flashcards API with text length: ${text.length}, count: ${count}`);
    const response = await openai.chat.completions.create({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that creates flashcards from text content. Always respond with valid JSON only, no additional text or explanations.' },
        { role: 'user', content: `Generate ${count} flashcards from the following text. Format as JSON array with each object having 'question' and 'answer' properties.

Text to process:
${text}

Example format:
[
  {"question": "What is photosynthesis?", "answer": "The process by which plants convert sunlight into energy"},
  {"question": "Who wrote Romeo and Juliet?", "answer": "William Shakespeare"}
]` }
      ],
      max_tokens: 2000,
      temperature: 0.6,
    });
    const endTime = Date.now();
    console.log(`[${new Date().toISOString()}] Ollama flashcards API call successful in ${endTime - startTime}ms`);
    const content = response.choices[0].message.content.trim();

    // Try to extract JSON from response
    let jsonContent = content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    try {
      const flashcards = JSON.parse(jsonContent);

      // Validate the structure
      if (Array.isArray(flashcards) && flashcards.length > 0) {
        // Ensure each flashcard has question and answer
        const validFlashcards = flashcards.filter(card =>
          card && typeof card === 'object' && card.question && card.answer
        );

        if (validFlashcards.length > 0) {
          return validFlashcards.slice(0, count); // Limit to requested count
        }
      }

      throw new Error('Invalid flashcard structure');
    } catch (parseError) {
      console.error('JSON parse error for flashcards:', parseError);
      console.error('Response content:', content);

      // Fallback: Create basic flashcards from text
      console.log('Creating fallback flashcards');
      const flashcards = [];
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

      for (let i = 0; i < Math.min(count, sentences.length); i++) {
        const sentence = sentences[i].trim();
        if (sentence.length > 20) {
          flashcards.push({
            question: `What is the main idea of: "${sentence.substring(0, 80)}${sentence.length > 80 ? '...' : ''}"`,
            answer: sentence
          });
        }
      }

      // If still no flashcards, create a basic one
      if (flashcards.length === 0) {
        flashcards.push({
          question: "What is the main topic discussed in this text?",
          answer: text.substring(0, 200) + (text.length > 200 ? "..." : "")
        });
      }

      return flashcards;
    }
  } catch (error) {
    console.error('Ollama flashcards generation error:', error);
    throw createOllamaError(error, 'Flashcard generation');
  }
};

const generateKeyPoints = async (text) => {
  if (!apiKeyConfigured) {
    throw new Error('AI service is currently unavailable. Please make sure Ollama is running.');
  }

  try {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Calling Ollama key points API with text length: ${text.length}`);
    const response = await openai.chat.completions.create({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that extracts key points from text content. Always respond with valid JSON only, no additional text or explanations.' },
        { role: 'user', content: `Extract the most important key points from the following text. Format as JSON with this structure:
{
  "key_points": [
    "Point 1",
    "Point 2",
    "Point 3"
  ],
  "main_themes": ["Theme 1", "Theme 2"],
  "important_concepts": ["Concept 1", "Concept 2"]
}

Text to analyze:
${text}` }
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });
    const endTime = Date.now();
    console.log(`[${new Date().toISOString()}] Ollama key points API call successful in ${endTime - startTime}ms`);
    const content = response.choices[0].message.content.trim();

    // Try to extract JSON from response
    let jsonContent = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonContent);

      // Validate the structure
      if (!parsed.key_points || !Array.isArray(parsed.key_points)) {
        throw new Error('Invalid key points structure');
      }

      return parsed;
    } catch (parseError) {
      console.error('JSON parse error for key points:', parseError);
      console.error('Response content:', content);

      // Fallback: Extract basic key points
      console.log('Creating fallback key points');
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
      const fallbackKeyPoints = {
        key_points: sentences.slice(0, 5).map(s => s.trim()),
        main_themes: ['Main Content', 'Key Information'],
        important_concepts: ['Core Concepts']
      };

      return fallbackKeyPoints;
    }
  } catch (error) {
    console.error('Ollama key points generation error:', error);
    throw createOllamaError(error, 'Key points extraction');
  }
};

const generateConceptMap = async (text) => {
  if (!apiKeyConfigured) {
    throw new Error('AI service is currently unavailable. Please make sure Ollama is running.');
  }

  try {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Calling Ollama concept map API with text length: ${text.length}`);
    const response = await openai.chat.completions.create({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that creates concept maps from text content. Always respond with valid JSON only, no additional text or explanations.' },
        { role: 'user', content: `Create a concept map from the following text. Format as JSON with this structure:
{
  "concepts": [
    {
      "name": "Concept Name",
      "definition": "Brief definition",
      "connections": ["Related Concept 1", "Related Concept 2"],
      "examples": ["Example 1", "Example 2"]
    }
  ],
  "relationships": [
    {
      "from": "Concept A",
      "to": "Concept B",
      "type": "relationship_type",
      "description": "How they relate"
    }
  ]
}

Text to analyze:
${text}` }
      ],
      max_tokens: 1500,
      temperature: 0.4,
    });
    const endTime = Date.now();
    console.log(`[${new Date().toISOString()}] Ollama concept map API call successful in ${endTime - startTime}ms`);
    const content = response.choices[0].message.content.trim();

    // Try to extract JSON from response
    let jsonContent = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonContent);

      // Validate the structure
      if (!parsed.concepts || !Array.isArray(parsed.concepts)) {
        throw new Error('Invalid concept map structure');
      }

      return parsed;
    } catch (parseError) {
      console.error('JSON parse error for concept map:', parseError);
      console.error('Response content:', content);

      // Fallback: Create basic concept map
      console.log('Creating fallback concept map');
      const fallbackConceptMap = {
        concepts: [
          {
            name: 'Main Topic',
            definition: 'Primary subject matter',
            connections: ['Related Ideas'],
            examples: ['Key examples from text']
          }
        ],
        relationships: [
          {
            from: 'Main Topic',
            to: 'Related Ideas',
            type: 'contains',
            description: 'Main topic encompasses related ideas'
          }
        ]
      };

      return fallbackConceptMap;
    }
  } catch (error) {
    console.error('Ollama concept map generation error:', error);
    throw createOllamaError(error, 'Concept map generation');
  }
};

module.exports = { summarizeText, generateMCQs, generateImage, generateMindMap, generateStudyGuide, generateFlashcards, generateKeyPoints, generateConceptMap, checkOllamaHealth };
