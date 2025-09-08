const { supabaseAdmin } = require('../lib/supabase');
const { v4: uuidv4 } = require('uuid');
const { summarizeText } = require('../lib/openai');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

// Extract text from uploaded file
const extractTextFromFile = async (buffer, mimetype) => {
  try {
    if (mimetype === 'application/pdf') {
      const data = await pdfParse(buffer);
      return data.text;
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else {
      // For other text files
      return buffer.toString('utf-8');
    }
  } catch (error) {
    console.error('Text extraction error:', error);
    throw new Error('Failed to extract text from file');
  }
};

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

    const { title = req.file.originalname } = req.body;

    // Extract text and generate AI summary
    let aiAnalysis = null;
    try {
      const extractedText = await extractTextFromFile(req.file.buffer, req.file.mimetype);
      if (extractedText && extractedText.trim().length > 0) {
        aiAnalysis = await summarizeText(extractedText);
      }
    } catch (error) {
      console.error('AI processing failed:', error);
      // Continue without AI analysis if it fails
    }

    const { data: record, error: insertError } = await supabaseAdmin
      .from('upload_notes')
      .insert({
        user_id: userId,
        file_id: path,
        title,
        ai_analysis: aiAnalysis,
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

exports.searchUploadNotes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const { data, error } = await supabaseAdmin
      .from('upload_notes')
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${q}%,ai_analysis.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { next(err); }
};

// Initialize chunked upload
exports.initChunkedUpload = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fileName, fileSize, fileType } = req.body;

    if (!fileName || !fileSize || !fileType) {
      return res.status(400).json({ error: 'Missing required fields: fileName, fileSize, fileType' });
    }

    const uploadId = uuidv4();
    const tempDir = path.join(__dirname, '../../temp');
    const tempFilePath = path.join(tempDir, `${uploadId}_${fileName}`);

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create upload record in database
    const { data: uploadRecord, error: insertError } = await supabaseAdmin
      .from('file_uploads')
      .insert({
        id: uploadId,
        user_id: userId,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        status: 'uploading',
        uploaded_size: 0,
        temp_path: tempFilePath
      })
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    // Initialize empty file
    fs.writeFileSync(tempFilePath, '');

    res.json({
      uploadId,
      message: 'Upload initialized',
      chunkSize: 1024 * 1024 // 1MB chunks
    });
  } catch (err) {
    console.error('Init chunked upload error:', err);
    next(err);
  }
};

// Upload file chunk
exports.uploadChunk = async (req, res, next) => {
  try {
    const { uploadId, chunkIndex, totalChunks } = req.body;
    const chunk = req.file.buffer;

    if (!uploadId || chunkIndex === undefined || !chunk) {
      return res.status(400).json({ error: 'Missing required fields: uploadId, chunkIndex, chunk' });
    }

    // Get upload record
    const { data: uploadRecord, error: fetchError } = await supabaseAdmin
      .from('file_uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !uploadRecord) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    if (uploadRecord.status !== 'uploading') {
      return res.status(400).json({ error: 'Upload not in progress' });
    }

    // Append chunk to temp file
    fs.appendFileSync(uploadRecord.temp_path, chunk);

    // Update progress
    const uploadedSize = uploadRecord.uploaded_size + chunk.length;
    const progress = Math.round((uploadedSize / uploadRecord.file_size) * 100);

    const { error: updateError } = await supabaseAdmin
      .from('file_uploads')
      .update({
        uploaded_size: uploadedSize,
        progress: progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', uploadId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    // Check if upload is complete
    if (chunkIndex === totalChunks - 1) {
      await finalizeUpload(uploadId, req.user.id);
    }

    res.json({
      message: 'Chunk uploaded successfully',
      progress: progress,
      uploadedSize: uploadedSize
    });
  } catch (err) {
    console.error('Upload chunk error:', err);
    next(err);
  }
};

// Finalize upload
const finalizeUpload = async (uploadId, userId) => {
  try {
    const { data: uploadRecord, error: fetchError } = await supabaseAdmin
      .from('file_uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !uploadRecord) {
      throw new Error('Upload record not found');
    }

    // Read the complete file
    const fileBuffer = fs.readFileSync(uploadRecord.temp_path);

    // Upload to Supabase storage
    const fileExtension = uploadRecord.file_name.split('.').pop();
    const storagePath = `${userId}/upload_notes/${Date.now()}-${uuidv4()}.${fileExtension}`;

    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('files')
      .upload(storagePath, fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: uploadRecord.file_type,
      });

    if (storageError) {
      throw new Error(storageError.message);
    }

    // Extract text and generate AI summary
    let aiAnalysis = null;
    try {
      const extractedText = await extractTextFromFile(fileBuffer, uploadRecord.file_type);
      if (extractedText && extractedText.trim().length > 0) {
        aiAnalysis = await summarizeText(extractedText);
      }
    } catch (error) {
      console.error('AI processing failed:', error);
    }

    // Save to upload_notes table
    const { data: noteRecord, error: insertError } = await supabaseAdmin
      .from('upload_notes')
      .insert({
        user_id: userId,
        file_id: storagePath,
        title: uploadRecord.file_name,
        ai_analysis: aiAnalysis,
      })
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    // Update upload record status
    await supabaseAdmin
      .from('file_uploads')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', uploadId);

    // Clean up temp file
    try {
      fs.unlinkSync(uploadRecord.temp_path);
    } catch (cleanupError) {
      console.error('Temp file cleanup error:', cleanupError);
    }

    return noteRecord;
  } catch (error) {
    console.error('Finalize upload error:', error);

    // Update status to failed
    await supabaseAdmin
      .from('file_uploads')
      .update({
        status: 'failed',
        error_message: error.message
      })
      .eq('id', uploadId);

    throw error;
  }
};

// Pause upload
exports.pauseUpload = async (req, res, next) => {
  try {
    const { uploadId } = req.params;

    const { error } = await supabaseAdmin
      .from('file_uploads')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('id', uploadId)
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Upload paused successfully' });
  } catch (err) {
    next(err);
  }
};

// Resume upload
exports.resumeUpload = async (req, res, next) => {
  try {
    const { uploadId } = req.params;

    const { error } = await supabaseAdmin
      .from('file_uploads')
      .update({
        status: 'uploading',
        updated_at: new Date().toISOString()
      })
      .eq('id', uploadId)
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Upload resumed successfully' });
  } catch (err) {
    next(err);
  }
};

// Delete upload
exports.deleteUpload = async (req, res, next) => {
  try {
    const { uploadId } = req.params;

    // Get upload record
    const { data: uploadRecord, error: fetchError } = await supabaseAdmin
      .from('file_uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !uploadRecord) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // Delete temp file if exists
    if (uploadRecord.temp_path && fs.existsSync(uploadRecord.temp_path)) {
      try {
        fs.unlinkSync(uploadRecord.temp_path);
      } catch (cleanupError) {
        console.error('Temp file cleanup error:', cleanupError);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('file_uploads')
      .delete()
      .eq('id', uploadId)
      .eq('user_id', req.user.id);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    res.json({ message: 'Upload deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Get upload progress
exports.getUploadProgress = async (req, res, next) => {
  try {
    const { uploadId } = req.params;

    const { data: uploadRecord, error } = await supabaseAdmin
      .from('file_uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !uploadRecord) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    res.json({
      uploadId: uploadRecord.id,
      fileName: uploadRecord.file_name,
      fileSize: uploadRecord.file_size,
      uploadedSize: uploadRecord.uploaded_size,
      progress: uploadRecord.progress || 0,
      status: uploadRecord.status,
      createdAt: uploadRecord.created_at,
      updatedAt: uploadRecord.updated_at
    });
  } catch (err) {
    next(err);
  }
};

// Get all user uploads
exports.getUserUploads = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .from('file_uploads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
};
