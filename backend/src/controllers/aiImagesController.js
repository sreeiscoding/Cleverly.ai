const { generateImage } = require('../lib/openai');
const supabaseAdmin = require('../lib/supabase');
const { z } = require('zod');

exports.generateImage = async (req, res, next) => {
  try {
    const schema = z.object({
      prompt: z.string().min(1),
      style: z.string().optional().default('modern'),
      type: z.string().optional().default('diagram')
    });
    const { prompt, style, type } = schema.parse(req.body);

    const imageUrl = await generateImage(prompt, style);

    // Save to database
    const { data, error } = await supabaseAdmin.from('ai_images')
      .insert({
        user_id: req.user.id,
        prompt,
        style,
        type,
        image_url: imageUrl
      })
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({ image_url: imageUrl, id: data.id });
  } catch (err) {
    next(err);
  }
};

exports.getUserImages = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('ai_images')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.deleteImage = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { error } = await supabaseAdmin.from('ai_images')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) return res.status(404).json({ error: 'Image not found or delete failed' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
