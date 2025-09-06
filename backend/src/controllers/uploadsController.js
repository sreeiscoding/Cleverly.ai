const supabaseAdmin = require('../lib/supabase');
const { v4: uuidv4 } = require('uuid');

exports.uploadNote = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File is required' });
    const userId = req.user.id;
    const fileExtension = req.file.originalname.split('.').pop();
    const path = `${userId}/upload_notes/${Date.now()}-${uuidv4()}.${fileExtension}`;

    const { data, error } = await supabaseAdmin.storage
      .from('files')
      .upload(path, req.file.buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: req.file.mimetype,
      });
    if (error) return res.status(500).json({ error: error.message });

    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from('files')
      .createSignedUrl(path, 3600);

    if (urlError) return res.status(500).json({ error: urlError.message });

    const { title = req.file.originalname, ai_analysis = null } = req.body;

    const { data: record, error: insertError } = await supabaseAdmin
      .from('upload_notes')
      .insert({
        user_id: userId,
        file_id: path,
        title,
        ai_analysis,
      })
      .single();

    if (insertError) return res.status(500).json({ error: insertError.message });

    res.status(201).json({ message: 'Note uploaded', uploadNote: record, fileUrl: signedUrlData.signedUrl });
  } catch (err) {
    next(err);
  }
};

exports.getNotes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin.from('upload_notes').select('*').eq('user_id', userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { next(err); }
};
