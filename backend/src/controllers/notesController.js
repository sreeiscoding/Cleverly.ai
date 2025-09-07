const { supabaseAdmin } = require('../lib/supabase');
const { z } = require('zod');

exports.getAllNotes = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('notes').select('*').eq('user_id', req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.searchNotes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const { data, error } = await supabaseAdmin
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.createNote = async (req, res, next) => {
  try {
    const schema = z.object({
      title: z.string(),
      content: z.string(),
    });
    const { title, content } = schema.parse(req.body);
    const { data, error } = await supabaseAdmin.from('notes').insert({
      user_id: req.user.id,
      title,
      content
    }).single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

exports.getNoteById = async (req, res, next) => {
  try {
    const noteId = req.params.id;
    const { data, error } = await supabaseAdmin.from('notes').select('*').eq('user_id', req.user.id).eq('id', noteId).single();
    if (error) return res.status(404).json({ error: 'Note not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.updateNote = async (req, res, next) => {
  try {
    const noteId = req.params.id;
    const schema = z.object({
      title: z.string().optional(),
      content: z.string().optional(),
    });
    const toUpdate = schema.parse(req.body);

    const { data, error } = await supabaseAdmin.from('notes')
      .update(toUpdate)
      .eq('id', noteId)
      .eq('user_id', req.user.id)
      .single();

    if (error) return res.status(404).json({ error: 'Note not found or update failed' });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.deleteNote = async (req, res, next) => {
  try {
    const noteId = req.params.id;

    const { error } = await supabaseAdmin.from('notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', req.user.id);

    if (error) return res.status(404).json({ error: 'Note not found or delete failed' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
