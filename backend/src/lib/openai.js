const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY in env');
}

console.log('OpenAI API key loaded:', OPENAI_API_KEY.startsWith('sk-') ? 'present' : 'invalid format');

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const summarizeText = async (text) => {
  try {
    console.log('Calling OpenAI summarize API with text length:', text.length);
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that summarizes text.' },
        { role: 'user', content: `Summarize the following text:\n\n${text}` }
      ],
      max_tokens: 150,
    });
    console.log('OpenAI summarize API call successful');
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI summarize error:', error.message);
    throw new Error('Failed to summarize text');
  }
};

const generateMCQs = async (text, count = 10, difficulty = 'intermediate') => {
  try {
    console.log('Calling OpenAI MCQ generation API with text length:', text.length, 'count:', count);
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that generates multiple-choice questions. Always respond with valid JSON only.' },
        { role: 'user', content: `Generate ${count} MCQs from the following text with ${difficulty} difficulty. Format as JSON array with each object having: question (string), options (object with A,B,C,D keys), correct_answer (string like "A").\n\n${text}` }
      ],
      max_tokens: 1500,
    });
    console.log('OpenAI MCQ generation API call successful');
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
      throw new Error('Invalid JSON response from OpenAI');
    }
  } catch (error) {
    console.error('OpenAI MCQ generation error:', error.message);
    throw new Error('Failed to generate MCQs');
  }
};

const generateImage = async (prompt, style = 'modern') => {
  try {
    const stylePrompts = {
      modern: 'Modern, clean, professional design',
      classic: 'Classic, elegant, timeless design',
      minimal: 'Minimal, simple, focused design'
    };

    const fullPrompt = `${prompt}. Style: ${stylePrompts[style] || stylePrompts.modern}`;

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: fullPrompt,
      size: '1024x1024',
      quality: 'standard',
      n: 1,
    });

    return response.data[0].url;
  } catch (error) {
    console.error('OpenAI image generation error:', error);
    throw new Error('Failed to generate image');
  }
};

const generateMindMap = async (text) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that creates mind maps from text content.' },
        { role: 'user', content: `Create a detailed mind map structure from the following text. Format as JSON with a central topic and branches containing subtopics and key points.\n\n${text}` }
      ],
      max_tokens: 1000,
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
      throw new Error('Invalid JSON response from OpenAI');
    }
  } catch (error) {
    console.error('OpenAI mind map generation error:', error);
    throw new Error('Failed to generate mind map');
  }
};

const generateStudyGuide = async (text) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that creates comprehensive study guides from text content.' },
        { role: 'user', content: `Create a detailed study guide from the following text. Include key concepts, definitions, examples, and practice questions.\n\n${text}` }
      ],
      max_tokens: 1500,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI study guide generation error:', error);
    throw new Error('Failed to generate study guide');
  }
};

const generateFlashcards = async (text, count = 10) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that creates flashcards from text content.' },
        { role: 'user', content: `Generate ${count} flashcards from the following text. Format as JSON array with each object having 'question' and 'answer' properties.\n\n${text}` }
      ],
      max_tokens: 1500,
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
      throw new Error('Invalid JSON response from OpenAI');
    }
  } catch (error) {
    console.error('OpenAI flashcards generation error:', error);
    throw new Error('Failed to generate flashcards');
  }
};

module.exports = { summarizeText, generateMCQs, generateImage, generateMindMap, generateStudyGuide, generateFlashcards };
