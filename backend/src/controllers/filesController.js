const supabaseAdmin = require('../lib/supabase');
const { v4: uuidv4 } = require('uuid');

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File is required' });
    const userId = req.user.id;
    const fileExtension = req.file.originalname.split('.').pop();
    const path = `${userId}/${Date.now()}-${uuidv4()}.${fileExtension}`;

    const { data, error } = await supabaseAdmin.storage
      .from('files')
      .upload(path, req.file.buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: req.file.mimetype
      });
    if (error) return res.status(500).json({ error: error.message });

    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from('files')
      .createSignedUrl(path, 3600);

    if (urlError) return res.status(500).json({ error: urlError.message });

    const { data: fileRecord, error: insertError } = await supabaseAdmin
      .from('files')
      .insert({
        user_id: userId,
        file_url: signedUrlData.signedUrl,
        file_type: req.file.mimetype
      })
      .single();

    if (insertError) return res.status(500).json({ error: insertError.message });

    res.status(201).json({ message: 'File uploaded', file: fileRecord });
  } catch (err) {
    next(err);
  }
};

exports.listFiles = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin.from('files').select('*').eq('user_id', userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    next(err);
  }
};
