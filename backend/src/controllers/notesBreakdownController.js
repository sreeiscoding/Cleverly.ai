const { generateMindMap, generateStudyGuide, generateFlashcards } = require('../lib/openai');
const supabaseAdmin = require('../lib/supabase');
const { z } = require('zod');

exports.generateMindMap = async (req, res, next) => {
  try {
    const schema = z.object({
      text: z.string().min(1),
      title: z.string().optional()
    });
    const { text, title = 'Mind Map' } = schema.parse(req.body);

    const mindMap = await generateMindMap(text);

    // Save to database
    const { data, error } = await supabaseAdmin.from('notes_breakdown')
      .insert({
        user_id: req.user.id,
        type: 'mind_map',
        title,
        content: text,
        result: mindMap
      })
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({ mind_map: mindMap, id: data.id });
  } catch (err) {
    next(err);
  }
};

exports.generateStudyGuide = async (req, res, next) => {
  try {
    const schema = z.object({
      text: z.string().min(1),
      title: z.string().optional()
    });
    const { text, title = 'Study Guide' } = schema.parse(req.body);

    const studyGuide = await generateStudyGuide(text);

    // Save to database
    const { data, error } = await supabaseAdmin.from('notes_breakdown')
      .insert({
        user_id: req.user.id,
        type: 'study_guide',
        title,
        content: text,
        result: studyGuide
      })
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({ study_guide: studyGuide, id: data.id });
  } catch (err) {
    next(err);
  }
};

exports.generateFlashcards = async (req, res, next) => {
  try {
    const schema = z.object({
      text: z.string().min(1),
      count: z.number().optional().default(10),
      title: z.string().optional()
    });
    const { text, count, title = 'Flashcards' } = schema.parse(req.body);

    const flashcards = await generateFlashcards(text, count);

    // Save to database
    const { data, error } = await supabaseAdmin.from('notes_breakdown')
      .insert({
        user_id: req.user.id,
        type: 'flashcards',
        title,
        content: text,
        result: flashcards
      })
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({ flashcards, id: data.id });
  } catch (err) {
    next(err);
  }
};

exports.getUserNotesBreakdown = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('notes_breakdown')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    next(err);
  }
};
