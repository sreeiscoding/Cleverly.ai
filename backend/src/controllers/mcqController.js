const { supabaseAdmin } = require('../lib/supabase');
const { generateMCQs } = require('../lib/openai');
const { z } = require('zod');

exports.getAllMCQs = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('mcq_generator').select('*').eq('user_id', req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { next(err); }
};

exports.createMCQ = async (req, res, next) => {
  try {
    const schema = z.object({
      source_text: z.string(),
      question_count: z.number().optional().default(10),
      difficulty: z.string().optional().default('intermediate'),
      generated_mcqs: z.array(z.any()).optional()
    });
    const { source_text, question_count, difficulty, generated_mcqs } = schema.parse(req.body);

    let mcqs = generated_mcqs;
    if (!mcqs) {
      mcqs = await generateMCQs(source_text, question_count, difficulty);
    }

    const { data, error } = await supabaseAdmin.from('mcq_generator')
      .insert({ user_id: req.user.id, source_text, generated_mcqs: mcqs })
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  } catch (err) { next(err); }
};

exports.getMCQ = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabaseAdmin.from('mcq_generator').select('*').eq('id', id).eq('user_id', req.user.id).single();

    if (error) return res.status(404).json({ error: 'MCQ not found' });

    res.json(data);
  } catch (err) { next(err); }
};

exports.updateMCQ = async (req, res, next) => {
  try {
    const id = req.params.id;
    const schema = z.object({
      source_text: z.string().optional(),
      generated_mcqs: z.array(z.any()).optional()
    });
    const updateData = schema.parse(req.body);

    const { data, error } = await supabaseAdmin.from('mcq_generator')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error) return res.status(404).json({ error: 'Update failed or not found' });

    res.json(data);
  } catch (err) { next(err); }
};

exports.deleteMCQ = async (req, res, next) => {
  try {
    const id = req.params.id;

    const { error } = await supabaseAdmin.from('mcq_generator').delete().eq('id', id).eq('user_id', req.user.id);

    if (error) return res.status(404).json({ error: 'Delete failed or not found' });

    res.status(204).send();
  } catch (err) { next(err); }
};
