const { summarizeText } = require('../lib/openai');
const { z } = require('zod');

exports.summarizeText = async (req, res, next) => {
  try {
    const schema = z.object({ text: z.string() });
    const { text } = schema.parse(req.body);
    const summary = await summarizeText(text);
    res.json({ summary });
  } catch (err) {
    next(err);
  }
};
