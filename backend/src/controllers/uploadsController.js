const { supabaseAdmin } = require('../lib/supabase');
const { v4: uuidv4 } = require('uuid');
const { summarizeText } = require('../lib/openai');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

// Async AI processing function (non-blocking) with multiple AI features
const processAIAnalysisAsync = async (noteId, extractedText, userId) => {
  try {
    console.log(`[${new Date().toISOString()}] Starting comprehensive async AI analysis for note ${noteId}, text length: ${extractedText.length}`);

    const { summarizeText, generateMindMap, generateStudyGuide, generateFlashcards } = require('../lib/openai');

    // Create timeout promises for each AI operation
    const createTimeout = (operationName, timeoutMs = 30000) =>
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${operationName} timeout`)), timeoutMs)
      );

    // Process multiple AI analyses in parallel for comprehensive analysis
    const aiTasks = [];

    // 1. Basic summary (always done)
    aiTasks.push(
      Promise.race([
        summarizeText(extractedText),
        createTimeout('Summary', 30000)
      ]).then(result => ({ type: 'summary', content: result }))
    );

    // 2. Mind map (for structured content)
    if (extractedText.length > 500) {
      aiTasks.push(
        Promise.race([
          generateMindMap(extractedText),
          createTimeout('Mind Map', 45000)
        ]).then(result => ({ type: 'mind_map', content: result }))
        .catch(error => {
          console.log(`[${new Date().toISOString()}] Mind map generation skipped: ${error.message}`);
          return null;
        })
      );
    }

    // 3. Study guide (for educational content)
    if (extractedText.length > 1000) {
      aiTasks.push(
        Promise.race([
          generateStudyGuide(extractedText),
          createTimeout('Study Guide', 60000)
        ]).then(result => ({ type: 'study_guide', content: result }))
        .catch(error => {
          console.log(`[${new Date().toISOString()}] Study guide generation skipped: ${error.message}`);
          return null;
        })
      );
    }

    // 4. Flashcards (for key concepts)
    if (extractedText.length > 300) {
      aiTasks.push(
        Promise.race([
          generateFlashcards(extractedText, Math.min(10, Math.floor(extractedText.length / 200))),
          createTimeout('Flashcards', 45000)
        ]).then(result => ({ type: 'flashcards', content: result }))
        .catch(error => {
          console.log(`[${new Date().toISOString()}] Flashcards generation skipped: ${error.message}`);
          return null;
        })
      );
    }

    // Wait for all AI tasks to complete
    const aiResults = await Promise.allSettled(aiTasks);

    // Process results and create comprehensive analysis
    const analysis = {
      summary: '',
      mind_map: null,
      study_guide: null,
      flashcards: null,
      processed_at: new Date().toISOString(),
      ai_features_used: []
    };

    aiResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        const { type, content } = result.value;
        analysis[type] = content;
        analysis.ai_features_used.push(type);
      }
    });

    // Create a formatted analysis string
    let analysisText = `📄 **Summary:**\n${analysis.summary}\n\n`;

    if (analysis.mind_map) {
      analysisText += `🗺️ **Mind Map:**\n${JSON.stringify(analysis.mind_map, null, 2)}\n\n`;
    }

    if (analysis.study_guide) {
      analysisText += `📚 **Study Guide:**\n${analysis.study_guide}\n\n`;
    }

    if (analysis.flashcards && Array.isArray(analysis.flashcards)) {
      analysisText += `🎴 **Flashcards (${analysis.flashcards.length}):**\n`;
      analysis.flashcards.slice(0, 5).forEach((card, index) => {
        analysisText += `${index + 1}. **Q:** ${card.question}\n   **A:** ${card.answer}\n`;
      });
      if (analysis.flashcards.length > 5) {
        analysisText += `... and ${analysis.flashcards.length - 5} more flashcards\n`;
      }
      analysisText += '\n';
    }

    analysisText += `🤖 **AI Analysis completed on:** ${analysis.processed_at}\n`;
    analysisText += `✨ **AI Features used:** ${analysis.ai_features_used.join(', ')}\n`;

    // Update the note with comprehensive AI analysis
    const { error: updateError } = await supabaseAdmin
      .from('upload_notes')
      .update({
        ai_analysis: analysisText,
        ai_analysis_json: analysis, // Store structured data too
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update comprehensive AI analysis:', updateError);
    } else {
      console.log(`[${new Date().toISOString()}] Comprehensive AI analysis completed for note ${noteId} using ${analysis.ai_features_used.length} AI features`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Comprehensive AI analysis failed for note ${noteId}:`, error.message);

    // Fallback to basic summary if comprehensive analysis fails
    try {
      console.log(`[${new Date().toISOString()}] Attempting fallback basic summary for note ${noteId}`);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Basic summary timeout')), 30000)
      );

      const basicSummary = await Promise.race([
        summarizeText(extractedText),
        timeoutPromise
      ]);

      const fallbackAnalysis = `📄 **Basic Summary (Fallback):**\n${basicSummary}\n\n⚠️ **Note:** Comprehensive AI analysis failed. Only basic summary is available.\n🤖 **Processed on:** ${new Date().toISOString()}`;

      await supabaseAdmin
        .from('upload_notes')
        .update({ ai_analysis: fallbackAnalysis, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .eq('user_id', userId);

      console.log(`[${new Date().toISOString()}] Fallback basic summary completed for note ${noteId}`);
    } catch (fallbackError) {
      console.error(`[${new Date().toISOString()}] Fallback summary also failed:`, fallbackError.message);

      // Final fallback
      try {
        await supabaseAdmin
          .from('upload_notes')
          .update({ ai_analysis: 'AI analysis failed - please try regenerating. The file may be too large or complex for processing.', updated_at: new Date().toISOString() })
          .eq('id', noteId)
          .eq('user_id', userId);
      } catch (finalError) {
        console.error('Failed to update final error status:', finalError);
      }
    }
  }
};

// Extract text from uploaded file with timeout and size limits
const extractTextFromFile = async (buffer, mimetype) => {
  try {
    const maxFileSize = 10 * 1024 * 1024; // 10MB limit
    const maxTextLength = 50000; // 50K characters limit
    const timeoutMs = 15000; // 15 second timeout

    if (buffer.length > maxFileSize) {
      console.warn(`[${new Date().toISOString()}] File too large for text extraction: ${buffer.length} bytes`);
      return 'File too large for text extraction. AI analysis will be limited.';
    }

    let extractedText = '';

    if (mimetype === 'application/pdf') {
      console.log(`[${new Date().toISOString()}] Starting PDF text extraction, size: ${buffer.length} bytes`);

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('PDF extraction timeout')), timeoutMs)
        );

        const extractPromise = pdfParse(buffer);
        const data = await Promise.race([extractPromise, timeoutPromise]);

        extractedText = data.text || '';

        if (!extractedText.trim()) {
          console.warn(`[${new Date().toISOString()}] PDF extraction returned empty text`);
          extractedText = 'PDF appears to contain no extractable text. This may be an image-based PDF or corrupted file.';
        } else {
          console.log(`[${new Date().toISOString()}] PDF extraction completed, extracted ${extractedText.length} characters`);
        }
      } catch (pdfError) {
        console.error(`[${new Date().toISOString()}] PDF extraction failed:`, pdfError.message);
        extractedText = 'PDF text extraction failed. The file may be corrupted, password-protected, or contain only images.';
      }

    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
               mimetype === 'application/msword') {
      console.log(`[${new Date().toISOString()}] Starting Word document text extraction, size: ${buffer.length} bytes`);

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Word extraction timeout')), timeoutMs)
        );

        const extractPromise = mammoth.extractRawText({ buffer });
        const result = await Promise.race([extractPromise, timeoutPromise]);

        extractedText = result.value || '';

        if (!extractedText.trim()) {
          console.warn(`[${new Date().toISOString()}] Word extraction returned empty text`);
          extractedText = 'Word document appears to contain no extractable text. This may be an image-based document or corrupted file.';
        } else {
          console.log(`[${new Date().toISOString()}] Word extraction completed, extracted ${extractedText.length} characters`);
        }
      } catch (wordError) {
        console.error(`[${new Date().toISOString()}] Word extraction failed:`, wordError.message);
        extractedText = 'Word document text extraction failed. The file may be corrupted, password-protected, or in an unsupported format.';
      }

    } else if (mimetype.startsWith('text/') || mimetype === 'application/json' || mimetype === 'application/javascript') {
      // For text-based files
      console.log(`[${new Date().toISOString()}] Starting text file extraction, size: ${buffer.length} bytes`);

      try {
        extractedText = buffer.toString('utf-8');

        // Basic validation for text content
        if (!extractedText.trim()) {
          extractedText = 'Text file appears to be empty or contains no readable content.';
        } else {
          console.log(`[${new Date().toISOString()}] Text file extraction completed, extracted ${extractedText.length} characters`);
        }
      } catch (textError) {
        console.error(`[${new Date().toISOString()}] Text extraction failed:`, textError.message);
        extractedText = 'Text file extraction failed. The file may be corrupted or in an unsupported encoding.';
      }

    } else {
      console.warn(`[${new Date().toISOString()}] Unsupported file type for text extraction: ${mimetype}`);
      extractedText = `File type '${mimetype}' is not supported for text extraction. AI analysis will not be available for this file.`;
    }

    // Clean up the extracted text
    if (extractedText) {
      // Remove excessive whitespace and normalize line breaks
      extractedText = extractedText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      // Truncate if too long
      if (extractedText.length > maxTextLength) {
        console.log(`[${new Date().toISOString()}] Truncating extracted text from ${extractedText.length} to ${maxTextLength} characters`);
        extractedText = extractedText.substring(0, maxTextLength) + '...[truncated due to length limit]';
      }
    }

    return extractedText;

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Text extraction error:`, error.message);
    return `Text extraction failed: ${error.message}. AI analysis will not be available for this file.`;
  }
};

exports.uploadNote = async (req, res, next) => {
  const startTime = Date.now();
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file selected',
        message: `${req.user?.name || 'User'} upload your files!..`
      });
    }

    // Enhanced user validation
    if (!req.user || !req.user.id) {
      console.error(`[${new Date().toISOString()}] Upload failed: User not authenticated or missing ID`, {
        user: req.user,
        headers: req.headers.authorization ? 'present' : 'missing'
      });
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in again to upload files'
      });
    }

    const userId = req.user.id;
    const userName = req.user.name || 'User';
    const fileExtension = req.file.originalname.split('.').pop();
    const storagePath = `${userId}/upload_notes/${Date.now()}-${uuidv4()}.${fileExtension}`;

    console.log(`[${new Date().toISOString()}] Starting file upload for user ${userId}, file: ${req.file.originalname}, size: ${req.file.size} bytes`);

    // Upload to storage
    const storageStart = Date.now();
    const { data, error } = await supabaseAdmin.storage
      .from('files')
      .upload(storagePath, req.file.buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: req.file.mimetype,
      });
    if (error) {
      console.error(`[${new Date().toISOString()}] Storage upload failed:`, error);
      return res.status(500).json({ error: error.message });
    }
    console.log(`[${new Date().toISOString()}] Storage upload completed in ${Date.now() - storageStart}ms`);

    // Create signed URL
    const urlStart = Date.now();
    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from('files')
      .createSignedUrl(storagePath, 3600);

    if (urlError) {
      console.error(`[${new Date().toISOString()}] Signed URL creation failed:`, urlError);
      return res.status(500).json({ error: urlError.message });
    }
    console.log(`[${new Date().toISOString()}] Signed URL created in ${Date.now() - urlStart}ms`);

    const { title = req.file.originalname } = req.body;

    // Extract text asynchronously (with timeout)
    const extractStart = Date.now();
    const extractedText = await extractTextFromFile(req.file.buffer, req.file.mimetype);
    console.log(`[${new Date().toISOString()}] Text extraction completed in ${Date.now() - extractStart}ms, extracted ${extractedText.length} characters`);

    // Database insert with enhanced metadata
    const dbStart = Date.now();
    const { data: record, error: insertError } = await supabaseAdmin
      .from('upload_notes')
      .insert({
        user_id: userId,
        file_id: storagePath,
        title,
        file_name: req.file.originalname,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        ai_analysis: null, // Will be updated asynchronously
      })
      .select()
      .single();

    if (insertError) {
      console.error(`[${new Date().toISOString()}] Database insert failed:`, insertError);
      return res.status(500).json({
        error: 'Database insert failed',
        details: insertError.message,
        code: insertError.code
      });
    }

    if (!record) {
      console.error(`[${new Date().toISOString()}] Database insert returned null record`);
      return res.status(500).json({
        error: 'Database insert failed',
        details: 'No record returned from insert operation'
      });
    }

    console.log(`[${new Date().toISOString()}] Database insert completed in ${Date.now() - dbStart}ms, record ID: ${record.id}`);

    // Process AI analysis in background (non-blocking)
    if (extractedText && extractedText.trim().length > 0) {
      processAIAnalysisAsync(record.id, extractedText, userId);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] File upload completed successfully in ${totalTime}ms for user ${userId}`);

    res.status(201).json({
      message: `Your "${req.file.originalname}" is uploaded successfully`,
      uploadNote: {
        ...record,
        file_name: req.file.originalname,
        file_type: req.file.mimetype,
        file_size: req.file.size
      },
      fileUrl: signedUrlData.signedUrl,
      processingTime: totalTime
    });
  } catch (err) {
    const totalTime = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] File upload failed after ${totalTime}ms:`, err);
    next(err);
  }
};

exports.getNotes = async (req, res, next) => {
  try {
    console.log(`[${new Date().toISOString()}] getNotes called - checking authentication`);

    // Check if req.user exists
    if (!req.user) {
      console.error(`[${new Date().toISOString()}] getNotes failed: req.user is undefined`);
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.id) {
      console.error(`[${new Date().toISOString()}] getNotes failed: req.user.id is undefined`, { user: req.user });
      return res.status(401).json({ error: 'User ID missing from authentication' });
    }

    const userId = req.user.id;
    console.log(`[${new Date().toISOString()}] getNotes: Processing for user ${userId}`);

    // Check Supabase connection
    if (!supabaseAdmin) {
      console.error(`[${new Date().toISOString()}] getNotes failed: supabaseAdmin is undefined`);
      return res.status(500).json({ error: 'Database connection not available' });
    }

    console.log(`[${new Date().toISOString()}] getNotes: Executing database query for user ${userId}`);

    const { data, error } = await supabaseAdmin
      .from('upload_notes')
      .select('id, title, file_id, ai_analysis, created_at, updated_at, file_name, file_type, file_size, is_favorite, folder_id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50); // Limit for performance

    if (error) {
      console.error(`[${new Date().toISOString()}] getNotes database error:`, {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId: userId
      });
      return res.status(500).json({ error: error.message });
    }

    console.log(`[${new Date().toISOString()}] getNotes success: Retrieved ${data ? data.length : 0} notes for user ${userId}`);
    res.json(data);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] getNotes unexpected error:`, {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    next(err);
  }
};

exports.searchUploadNotes = async (req, res, next) => {
  try {
    // Enhanced user validation
    if (!req.user || !req.user.id) {
      console.error(`[${new Date().toISOString()}] Search upload notes failed: User not authenticated or missing ID`, {
        user: req.user,
        headers: req.headers.authorization ? 'present' : 'missing'
      });
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in again'
      });
    }

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
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { next(err); }
};

exports.deleteNote = async (req, res, next) => {
  try {
    // Enhanced user validation
    if (!req.user || !req.user.id) {
      console.error(`[${new Date().toISOString()}] Delete note failed: User not authenticated or missing ID`, {
        user: req.user,
        headers: req.headers.authorization ? 'present' : 'missing'
      });
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in again'
      });
    }

    const userId = req.user.id;
    const { noteId } = req.params;

    // Get the note record first to get the file_id for storage cleanup
    const { data: noteRecord, error: fetchError } = await supabaseAdmin
      .from('upload_notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !noteRecord) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Delete from storage if file exists
    if (noteRecord.file_id) {
      try {
        const { error: storageError } = await supabaseAdmin.storage
          .from('files')
          .remove([noteRecord.file_id]);

        if (storageError) {
          console.error('Storage deletion error:', storageError);
          // Continue with database deletion even if storage deletion fails
        }
      } catch (storageCleanupError) {
        console.error('Storage cleanup error:', storageCleanupError);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('upload_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error('Delete note error:', err);
    next(err);
  }
};

// Initialize chunked upload
exports.initChunkedUpload = async (req, res, next) => {
  try {
    // Enhanced user validation
    if (!req.user || !req.user.id) {
      console.error(`[${new Date().toISOString()}] Init chunked upload failed: User not authenticated or missing ID`, {
        user: req.user,
        headers: req.headers.authorization ? 'present' : 'missing'
      });
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in again to upload files'
      });
    }

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
  const startTime = Date.now();
  try {
    // Enhanced user validation
    if (!req.user || !req.user.id) {
      console.error(`[${new Date().toISOString()}] Upload chunk failed: User not authenticated or missing ID`, {
        user: req.user,
        headers: req.headers.authorization ? 'present' : 'missing'
      });
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in again to upload files'
      });
    }

    const { uploadId, chunkIndex, totalChunks } = req.body;
    const chunk = req.file.buffer;

    if (!uploadId || chunkIndex === undefined || !chunk) {
      return res.status(400).json({ error: 'Missing required fields: uploadId, chunkIndex, chunk' });
    }

    console.log(`[${new Date().toISOString()}] Processing chunk ${chunkIndex + 1}/${totalChunks} for upload ${uploadId}, size: ${chunk.length} bytes`);

    // Get upload record
    const { data: uploadRecord, error: fetchError } = await supabaseAdmin
      .from('file_uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !uploadRecord) {
      console.error(`[${new Date().toISOString()}] Upload record not found for ${uploadId}`);
      return res.status(404).json({ error: 'Upload not found' });
    }

    if (uploadRecord.status !== 'uploading') {
      console.error(`[${new Date().toISOString()}] Upload ${uploadId} not in uploading state: ${uploadRecord.status}`);
      return res.status(400).json({ error: 'Upload not in progress' });
    }

    // Append chunk to temp file
    const appendStart = Date.now();
    fs.appendFileSync(uploadRecord.temp_path, chunk);
    console.log(`[${new Date().toISOString()}] Chunk appended to temp file in ${Date.now() - appendStart}ms`);

    // Update progress
    const uploadedSize = uploadRecord.uploaded_size + chunk.length;
    const progress = Math.round((uploadedSize / uploadRecord.file_size) * 100);

    const updateStart = Date.now();
    const { error: updateError } = await supabaseAdmin
      .from('file_uploads')
      .update({
        uploaded_size: uploadedSize,
        progress: progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', uploadId);

    if (updateError) {
      console.error(`[${new Date().toISOString()}] Progress update failed:`, updateError);
      return res.status(500).json({ error: updateError.message });
    }
    console.log(`[${new Date().toISOString()}] Progress updated in ${Date.now() - updateStart}ms: ${progress}%`);

    // Check if upload is complete
    if (chunkIndex === totalChunks - 1) {
      console.log(`[${new Date().toISOString()}] Final chunk received, starting finalization for upload ${uploadId}`);
      await finalizeUpload(uploadId, req.user.id);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Chunk upload completed in ${totalTime}ms`);

    res.json({
      message: 'Chunk uploaded successfully',
      progress: progress,
      uploadedSize: uploadedSize,
      processingTime: totalTime
    });
  } catch (err) {
    const totalTime = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] Chunk upload failed after ${totalTime}ms:`, err);
    next(err);
  }
};

// Finalize upload
const finalizeUpload = async (uploadId, userId) => {
  const startTime = Date.now();
  try {
    console.log(`[${new Date().toISOString()}] Starting finalization for upload ${uploadId}`);

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
    const readStart = Date.now();
    const fileBuffer = fs.readFileSync(uploadRecord.temp_path);
    console.log(`[${new Date().toISOString()}] File read completed in ${Date.now() - readStart}ms, size: ${fileBuffer.length} bytes`);

    // Upload to Supabase storage
    const fileExtension = uploadRecord.file_name.split('.').pop();
    const storagePath = `${userId}/upload_notes/${Date.now()}-${uuidv4()}.${fileExtension}`;

    const storageStart = Date.now();
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('files')
      .upload(storagePath, fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: uploadRecord.file_type,
      });

    if (storageError) {
      console.error(`[${new Date().toISOString()}] Storage upload failed:`, storageError);
      throw new Error(storageError.message);
    }
    console.log(`[${new Date().toISOString()}] Storage upload completed in ${Date.now() - storageStart}ms`);

    // Extract text and generate AI summary asynchronously
    const extractedText = await extractTextFromFile(fileBuffer, uploadRecord.file_type);

    // Save to upload_notes table with enhanced metadata
    const dbStart = Date.now();
    const { data: noteRecord, error: insertError } = await supabaseAdmin
      .from('upload_notes')
      .insert({
        user_id: userId,
        file_id: storagePath,
        title: uploadRecord.file_name,
        file_name: uploadRecord.file_name,
        file_type: uploadRecord.file_type,
        file_size: uploadRecord.file_size,
        ai_analysis: null, // Will be updated asynchronously
      })
      .select()
      .single();

    if (insertError) {
      console.error(`[${new Date().toISOString()}] Database insert failed:`, insertError);
      throw new Error(insertError.message);
    }
    console.log(`[${new Date().toISOString()}] Database insert completed in ${Date.now() - dbStart}ms`);

    // Process comprehensive AI analysis in background (non-blocking)
    if (extractedText && extractedText.trim().length > 0) {
      processAIAnalysisAsync(noteRecord.id, extractedText, userId);
    }

    // Update upload record status
    const statusStart = Date.now();
    await supabaseAdmin
      .from('file_uploads')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', uploadId);
    console.log(`[${new Date().toISOString()}] Status update completed in ${Date.now() - statusStart}ms`);

    // Clean up temp file
    try {
      fs.unlinkSync(uploadRecord.temp_path);
      console.log(`[${new Date().toISOString()}] Temp file cleanup completed`);
    } catch (cleanupError) {
      console.error('Temp file cleanup error:', cleanupError);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Upload finalization completed successfully in ${totalTime}ms for upload ${uploadId}`);

    return noteRecord;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] Upload finalization failed after ${totalTime}ms:`, error);

    // Update status to failed
    try {
      await supabaseAdmin
        .from('file_uploads')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('id', uploadId);
    } catch (statusError) {
      console.error('Failed to update failed status:', statusError);
    }

    throw error;
  }
};

// Pause upload
exports.pauseUpload = async (req, res, next) => {
  try {
    // Enhanced user validation
    if (!req.user || !req.user.id) {
      console.error(`[${new Date().toISOString()}] Pause upload failed: User not authenticated or missing ID`, {
        user: req.user,
        headers: req.headers.authorization ? 'present' : 'missing'
      });
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in again'
      });
    }

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
    // Enhanced user validation
    if (!req.user || !req.user.id) {
      console.error(`[${new Date().toISOString()}] Resume upload failed: User not authenticated or missing ID`, {
        user: req.user,
        headers: req.headers.authorization ? 'present' : 'missing'
      });
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in again'
      });
    }

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
    // Enhanced user validation
    if (!req.user || !req.user.id) {
      console.error(`[${new Date().toISOString()}] Delete upload failed: User not authenticated or missing ID`, {
        user: req.user,
        headers: req.headers.authorization ? 'present' : 'missing'
      });
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in again'
      });
    }

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
    // Enhanced user validation
    if (!req.user || !req.user.id) {
      console.error(`[${new Date().toISOString()}] Get upload progress failed: User not authenticated or missing ID`, {
        user: req.user,
        headers: req.headers.authorization ? 'present' : 'missing'
      });
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in again'
      });
    }

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
    // Enhanced user validation
    if (!req.user || !req.user.id) {
      console.error(`[${new Date().toISOString()}] Get user uploads failed: User not authenticated or missing ID`, {
        user: req.user,
        headers: req.headers.authorization ? 'present' : 'missing'
      });
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in again'
      });
    }

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

// Download file
exports.downloadFile = async (req, res, next) => {
  try {
    // Enhanced user validation
    if (!req.user || !req.user.id) {
      console.error(`[${new Date().toISOString()}] Download file failed: User not authenticated or missing ID`, {
        user: req.user,
        headers: req.headers.authorization ? 'present' : 'missing'
      });
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in again'
      });
    }

    const { uploadId } = req.params;
    const userId = req.user.id;

    // Get upload record
    const { data: uploadRecord, error: fetchError } = await supabaseAdmin
      .from('file_uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .single();

    if (fetchError || !uploadRecord) {
      return res.status(404).json({ error: 'File not found or not completed' });
    }

    // Get the file_id from upload_notes
    const { data: noteRecord, error: noteError } = await supabaseAdmin
      .from('upload_notes')
      .select('file_id')
      .eq('user_id', userId)
      .eq('title', uploadRecord.file_name)
      .order('updated_at', { ascending: false })
      .single();

    if (noteError || !noteRecord) {
      return res.status(404).json({ error: 'Note record not found' });
    }

    // Get the file from Supabase storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('files')
      .download(noteRecord.file_id);

    if (downloadError) {
      return res.status(500).json({ error: 'Failed to download file from storage' });
    }

    // Set headers for file download
    const fileName = uploadRecord.file_name;
    const mimeType = uploadRecord.file_type || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileData.size);

    // Send the file
    res.send(Buffer.from(await fileData.arrayBuffer()));

  } catch (err) {
    console.error('Download error:', err);
    next(err);
  }
};

// Toggle favorite status for a file
exports.toggleFavorite = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in again'
      });
    }

    const { noteId } = req.params;
    const userId = req.user.id;

    // Get current favorite status
    const { data: currentNote, error: fetchError } = await supabaseAdmin
      .from('upload_notes')
      .select('is_favorite')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !currentNote) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Toggle favorite status
    const newFavoriteStatus = !currentNote.is_favorite;

    const { data, error } = await supabaseAdmin
      .from('upload_notes')
      .update({
        is_favorite: newFavoriteStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      message: newFavoriteStatus ? 'Added to favorites' : 'Removed from favorites',
      is_favorite: newFavoriteStatus,
      note: data
    });
  } catch (err) {
    next(err);
  }
};

// Get favorite files
exports.getFavoriteFiles = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in again'
      });
    }

    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .from('upload_notes')
      .select('id, title, file_name, file_type, file_size, ai_analysis, created_at, updated_at, folder_id')
      .eq('user_id', userId)
      .eq('is_favorite', true)
      .order('updated_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// Create a new folder
exports.createFolder = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in again'
      });
    }

    const schema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      color: z.string().optional().default('#14807a')
    });

    const { name, description, color } = schema.parse(req.body);
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .from('notes_folders')
      .insert({
        user_id: userId,
        name,
        description,
        color
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({
      message: 'Folder created successfully',
      folder: data
    });
  } catch (err) {
    next(err);
  }
};

// Get all folders for user
exports.getFolders = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in again'
      });
    }

    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .from('notes_folders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// Add file to folder
exports.addFileToFolder = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in again'
      });
    }

    const schema = z.object({
      noteId: z.string().uuid(),
      folderId: z.string().uuid()
    });

    const { noteId, folderId } = schema.parse(req.body);
    const userId = req.user.id;

    // Verify file ownership
    const { data: fileData, error: fileError } = await supabaseAdmin
      .from('upload_notes')
      .select('id')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    if (fileError || !fileData) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Verify folder ownership
    const { data: folderData, error: folderError } = await supabaseAdmin
      .from('notes_folders')
      .select('id')
      .eq('id', folderId)
      .eq('user_id', userId)
      .single();

    if (folderError || !folderData) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Update file with folder assignment
    const { data, error } = await supabaseAdmin
      .from('upload_notes')
      .update({
        folder_id: folderId,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      message: 'File added to folder successfully',
      note: data
    });
  } catch (err) {
    next(err);
  }
};

// Get files in a specific folder
exports.getFolderFiles = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in again'
      });
    }

    const { folderId } = req.params;
    const userId = req.user.id;

    // Verify folder ownership
    const { data: folderData, error: folderError } = await supabaseAdmin
      .from('notes_folders')
      .select('*')
      .eq('id', folderId)
      .eq('user_id', userId)
      .single();

    if (folderError || !folderData) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Get files in folder
    const { data, error } = await supabaseAdmin
      .from('upload_notes')
      .select('id, title, file_name, file_type, file_size, ai_analysis, created_at, updated_at, is_favorite')
      .eq('user_id', userId)
      .eq('folder_id', folderId)
      .order('updated_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      folder: folderData,
      files: data
    });
  } catch (err) {
    next(err);
  }
};

// Delete folder
exports.deleteFolder = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in again'
      });
    }

    const { folderId } = req.params;
    const userId = req.user.id;

    // Check if folder has files
    const { data: filesInFolder, error: filesError } = await supabaseAdmin
      .from('upload_notes')
      .select('id')
      .eq('folder_id', folderId)
      .eq('user_id', userId);

    if (filesError) return res.status(500).json({ error: filesError.message });

    if (filesInFolder && filesInFolder.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete folder with files',
        message: 'Please move or delete all files in this folder first'
      });
    }

    // Delete folder
    const { error } = await supabaseAdmin
      .from('notes_folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', userId);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Folder deleted successfully' });
  } catch (err) {
    next(err);
  }
};
