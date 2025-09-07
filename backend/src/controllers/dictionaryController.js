const { supabaseAdmin } = require('../lib/supabase');
const { z } = require('zod');

exports.getAllWords = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('dictionary').select('*').eq('user_id', req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.searchWords = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const { data, error } = await supabaseAdmin
      .from('dictionary')
      .select('*')
      .eq('user_id', userId)
      .or(`word.ilike.%${q}%,meaning.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.addWord = async (req, res, next) => {
  try {
    const schema = z.object({
      word: z.string(),
      meaning: z.string()
    });
    const { word, meaning } = schema.parse(req.body);
    const { data, error } = await supabaseAdmin.from('dictionary').insert({
      user_id: req.user.id,
      word,
      meaning
    }).single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

exports.getWord = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabaseAdmin.from('dictionary').select('*').eq('id', id).eq('user_id', req.user.id).single();
    if (error) return res.status(404).json({ error: 'Word not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.updateWord = async (req, res, next) => {
  try {
    const id = req.params.id;
    const schema = z.object({
      word: z.string().optional(),
      meaning: z.string().optional()
    });
    const updateData = schema.parse(req.body);
    const { data, error } = await supabaseAdmin.from('dictionary').update(updateData).eq('id', id).eq('user_id', req.user.id).single();
    if (error) return res.status(404).json({ error: 'Update failed or word not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.deleteWord = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { error } = await supabaseAdmin.from('dictionary').delete().eq('id', id).eq('user_id', req.user.id);
    if (error) return res.status(404).json({ error: 'Delete failed or word not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
