const { generateMindMap, generateStudyGuide, generateFlashcards } = require('../lib/openai');
const { supabaseAdmin } = require('../lib/supabase');
const { z } = require('zod');

exports.generateMindMap = async (req, res, next) => {
  try {
    const schema = z.object({
      text: z.string().min(1).max(50000), // Add reasonable text limit
      title: z.string().optional()
    });
    const { text, title = 'Mind Map' } = schema.parse(req.body);

    console.log(`[${new Date().toISOString()}] Generating mind map for user ${req.user.id}, text length: ${text.length}`);

    let mindMap;
    try {
      mindMap = await generateMindMap(text);
    } catch (aiError) {
      console.error('AI generation failed:', aiError.message);

      // Provide fallback mind map structure
      mindMap = {
        central_topic: title,
        branches: [{
          topic: "Key Concepts",
          key_points: [
            "Content analysis in progress",
            "Please try again if this persists",
            `Text length: ${text.length} characters`
          ]
        }],
        generated_with_fallback: true,
        error_message: aiError.message
      };
    }

    // Save to database with error handling
    const { data, error } = await supabaseAdmin.from('notes_breakdown')
      .insert({
        user_id: req.user.id,
        type: 'mind_map',
        title,
        content: text,
        result: mindMap,
        created_at: new Date().toISOString()
      })
      .single();

    if (error) {
      console.error('Database insert error:', error);
      return res.status(500).json({
        error: 'Failed to save mind map',
        message: 'Your mind map was generated but could not be saved. Please try again.'
      });
    }

    console.log(`[${new Date().toISOString()}] Mind map generated and saved successfully for user ${req.user.id}, ID: ${data.id}`);

    res.json({
      mind_map: mindMap,
      id: data.id,
      success: true,
      message: mindMap.generated_with_fallback ? 'Mind map generated with fallback (AI service temporarily unavailable)' : 'Mind map generated successfully'
    });
  } catch (err) {
    console.error('Mind map generation error:', err);
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
      text: z.string().min(1).max(50000), // Add reasonable text limit
      count: z.number().min(1).max(50).optional().default(10), // Reasonable limits
      title: z.string().optional()
    });
    const { text, count, title = 'Flashcards' } = schema.parse(req.body);

    console.log(`[${new Date().toISOString()}] Generating ${count} flashcards for user ${req.user.id}, text length: ${text.length}`);

    let flashcards;
    try {
      flashcards = await generateFlashcards(text, count);
    } catch (aiError) {
      console.error('AI flashcards generation failed:', aiError.message);

      // Provide fallback flashcards
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      flashcards = [];

      for (let i = 0; i < Math.min(count, sentences.length); i++) {
        const sentence = sentences[i].trim();
        if (sentence.length > 20) {
          flashcards.push({
            question: `What is the main idea of: "${sentence.substring(0, 80)}${sentence.length > 80 ? '...' : ''}"`,
            answer: sentence,
            generated_with_fallback: true
          });
        }
      }

      if (flashcards.length === 0) {
        flashcards = [{
          question: "What is the main topic discussed in this text?",
          answer: text.substring(0, 200) + (text.length > 200 ? "..." : ""),
          generated_with_fallback: true
        }];
      }

      flashcards.error_message = aiError.message;
    }

    // Save to database with error handling
    const { data, error } = await supabaseAdmin.from('notes_breakdown')
      .insert({
        user_id: req.user.id,
        type: 'flashcards',
        title,
        content: text,
        result: flashcards,
        created_at: new Date().toISOString()
      })
      .single();

    if (error) {
      console.error('Database insert error:', error);
      return res.status(500).json({
        error: 'Failed to save flashcards',
        message: 'Your flashcards were generated but could not be saved. Please try again.'
      });
    }

    console.log(`[${new Date().toISOString()}] Flashcards generated and saved successfully for user ${req.user.id}, ID: ${data.id}, count: ${flashcards.length}`);

    res.json({
      flashcards,
      id: data.id,
      success: true,
      message: flashcards.some(card => card.generated_with_fallback)
        ? `Flashcards generated with fallback (${flashcards.length} cards created)`
        : `Flashcards generated successfully (${flashcards.length} cards)`
    });
  } catch (err) {
    console.error('Flashcards generation error:', err);
    next(err);
  }
};

exports.getUserNotesBreakdown = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notes_breakdown')
      .select('id, type, title, content, result, created_at, updated_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(100); // Limit results for performance

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getNotesBreakdownById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('notes_breakdown')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return res.status(404).json({ error: 'Notes breakdown not found' });
      }
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getProcessingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('notes_breakdown')
      .select('id, type, title, result, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Processing job not found' });
      }
      return res.status(500).json({ error: error.message });
    }

    // Determine status based on result content
    let status = 'completed';
    let progress = 100;
    let message = 'Processing completed successfully';

    if (!data.result) {
      status = 'processing';
      progress = 50;
      message = 'AI processing in progress...';
    } else if (data.result.generated_with_fallback) {
      status = 'completed_with_fallback';
      message = 'Completed with fallback due to AI service issues';
    } else if (data.result.error_message) {
      status = 'completed_with_errors';
      message = 'Completed but with some errors';
    }

    res.json({
      id: data.id,
      type: data.type,
      title: data.title,
      status,
      progress,
      message,
      created_at: data.created_at,
      updated_at: data.updated_at,
      has_result: !!data.result
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteNotesBreakdown = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('notes_breakdown')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Notes breakdown deleted successfully' });
  } catch (err) {
    next(err);
  }
};

exports.updateNotesBreakdown = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      title: z.string().optional(),
      result: z.any().optional()
    });
    const updates = schema.parse(req.body);

    const { data, error } = await supabaseAdmin
      .from('notes_breakdown')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// Process existing uploaded file with notesBreakdown features
exports.processUploadedFile = async (req, res, next) => {
  try {
    const schema = z.object({
      uploadId: z.string().uuid(),
      feature: z.enum(['mind_map', 'study_guide', 'flashcards']),
      title: z.string().optional(),
      count: z.number().min(1).max(50).optional().default(10)
    });
    const { uploadId, feature, title, count } = schema.parse(req.body);

    console.log(`[${new Date().toISOString()}] Processing uploaded file ${uploadId} with ${feature} for user ${req.user.id}`);

    // Get the uploaded file
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .from('upload_notes')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', req.user.id)
      .single();

    if (uploadError || !uploadData) {
      return res.status(404).json({ error: 'Uploaded file not found' });
    }

    // Check if AI analysis exists
    if (!uploadData.ai_analysis) {
      return res.status(400).json({
        error: 'No AI analysis available',
        message: 'Please wait for the file to be processed first, or re-upload if processing failed.'
      });
    }

    // Extract text from AI analysis (remove formatting)
    const textContent = uploadData.ai_analysis
      .replace(/\*\*.*?\*\*/g, '') // Remove bold markdown
      .replace(/📄|🗺️|📚|🎴|🤖|✨/g, '') // Remove emojis
      .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      .trim();

    if (textContent.length < 50) {
      return res.status(400).json({
        error: 'Insufficient content',
        message: 'The uploaded file does not contain enough text for processing.'
      });
    }

    let result;
    const processingTitle = title || `${feature.replace('_', ' ').toUpperCase()} - ${uploadData.title}`;

    // Process based on requested feature
    switch (feature) {
      case 'mind_map':
        result = await generateMindMap(textContent);
        break;
      case 'study_guide':
        result = await generateStudyGuide(textContent);
        break;
      case 'flashcards':
        result = await generateFlashcards(textContent, count);
        break;
      default:
        return res.status(400).json({ error: 'Invalid feature requested' });
    }

    // Save the result
    const { data: savedData, error: saveError } = await supabaseAdmin
      .from('notes_breakdown')
      .insert({
        user_id: req.user.id,
        type: feature,
        title: processingTitle,
        content: textContent,
        result: result,
        original_upload_id: uploadId,
        created_at: new Date().toISOString()
      })
      .single();

    if (saveError) {
      console.error('Failed to save processed result:', saveError);
      return res.status(500).json({ error: 'Failed to save processing result' });
    }

    console.log(`[${new Date().toISOString()}] Successfully processed uploaded file ${uploadId} with ${feature}, result ID: ${savedData.id}`);

    res.json({
      success: true,
      id: savedData.id,
      type: feature,
      title: processingTitle,
      result: result,
      message: `${feature.replace('_', ' ')} generated successfully from uploaded file`
    });

  } catch (err) {
    console.error('Process uploaded file error:', err);
    next(err);
  }
};

// Get user's uploaded files for processing
exports.getUserUploadedFiles = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('upload_notes')
      .select('id, title, ai_analysis, created_at, updated_at')
      .eq('user_id', req.user.id)
      .not('ai_analysis', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });

    // Filter and format the results
    const processedFiles = data.map(file => ({
      id: file.id,
      title: file.title,
      has_ai_analysis: !!file.ai_analysis,
      content_length: file.ai_analysis ? file.ai_analysis.length : 0,
      created_at: file.created_at,
      updated_at: file.updated_at
    }));

    res.json(processedFiles);
  } catch (err) {
    next(err);
  }
};
