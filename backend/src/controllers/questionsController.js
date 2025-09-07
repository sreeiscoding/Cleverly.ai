const { supabaseAdmin } = require('../lib/supabase');
const { z } = require('zod');

exports.getAllQuestions = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('my_questions').select('*').eq('user_id', req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { next(err); }
};

exports.searchQuestions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const { data, error } = await supabaseAdmin
      .from('my_questions')
      .select('*')
      .eq('user_id', userId)
      .or(`question_text.ilike.%${q}%,options.cs.{${q}}`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { next(err); }
};

exports.createQuestion = async (req, res, next) => {
  try {
    const schema = z.object({
      question_text: z.string(),
      options: z.array(z.string()),
      answer: z.string()
    });
    const { question_text, options, answer } = schema.parse(req.body);

    const { data, error } = await supabaseAdmin.from('my_questions')
      .insert({ user_id: req.user.id, question_text, options, answer })
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  } catch (err) { next(err); }
};

exports.getQuestion = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabaseAdmin.from('my_questions').select('*').eq('id', id).eq('user_id', req.user.id).single();
    if (error) return res.status(404).json({ error: 'Question not found' });
    res.json(data);
  } catch (err) { next(err); }
};

exports.updateQuestion = async (req, res, next) => {
  try {
    const id = req.params.id;
    const schema = z.object({
      question_text: z.string().optional(),
      options: z.array(z.string()).optional(),
      answer: z.string().optional(),
    });
    const updateData = schema.parse(req.body);

    const { data, error } = await supabaseAdmin.from('my_questions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error) return res.status(404).json({ error: 'Update failed or not found' });

    res.json(data);
  } catch (err) { next(err); }
};

exports.deleteQuestion = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { error } = await supabaseAdmin.from('my_questions').delete().eq('id', id).eq('user_id', req.user.id);
    if (error) return res.status(404).json({ error: 'Delete failed or not found' });
    res.status(204).send();
  } catch (err) { next(err); }
};
