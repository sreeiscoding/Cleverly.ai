const { supabaseClient, supabaseAdmin } = require('../lib/supabase');
const { z } = require('zod');

exports.register = async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().optional(),
      account_type: z.string().default('student')
    });
    const { email, password, name, account_type } = schema.parse(req.body);

    console.log(`[${new Date().toISOString()}] Registering user: ${email}`);

    // Add timeout for registration
    const registerTimeout = 15000; // 15 seconds
    const registerPromise = supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Registration timed out')), registerTimeout)
    );

    const { data, error } = await Promise.race([registerPromise, timeoutPromise]);

    if (error) {
      console.error(`[${new Date().toISOString()}] Registration error for ${email}:`, error.message);
      return res.status(400).json({ error: error.message });
    }

    console.log(`[${new Date().toISOString()}] User created in auth, inserting profile for ${email}`);

    // Insert user profile with timeout
    const profileInsertPromise = supabaseAdmin.from('users_app').insert({
      id: data.id,
      email,
      name,
      plan: 'free',
      account_type
    });
    const profileTimeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Profile creation timed out')), 10000)
    );

    await Promise.race([profileInsertPromise, profileTimeoutPromise]);

    console.log(`[${new Date().toISOString()}] Registration successful for ${email}`);
    res.status(201).json({ message: 'User registered successfully', user: { id: data.id, email, name, account_type } });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Registration failed:`, err.message);
    if (err.message.includes('timed out')) {
      return res.status(504).json({ error: 'Registration service temporarily unavailable. Please try again later.' });
    }
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string()
    });

    const { email, password } = schema.parse(req.body);

    // Add timeout and retry for auth operations
    const authTimeout = 15000; // 15 seconds
    const maxRetries = 2;

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[${new Date().toISOString()}] Login attempt ${attempt + 1}/${maxRetries + 1} for ${email}`);

        const authPromise = supabaseClient.auth.signInWithPassword({ email, password });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Authentication timed out')), authTimeout)
        );

        const { data, error } = await Promise.race([authPromise, timeoutPromise]);

        if (error) {
          console.error(`[${new Date().toISOString()}] Auth error on attempt ${attempt + 1}:`, error.message);
          lastError = error;
          if (attempt < maxRetries && (error.message.includes('timeout') || error.message.includes('network'))) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff
            console.log(`[${new Date().toISOString()}] Retrying login in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          return res.status(401).json({ error: error.message });
        }

        console.log(`[${new Date().toISOString()}] Login successful for ${email} on attempt ${attempt + 1}`);

        // Fetch user profile from users_app to get account_type
        const { data: userProfile, error: profileError } = await supabaseAdmin
          .from('users_app')
          .select('account_type')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          // Continue without account_type if error
        }

        const userWithAccountType = {
          ...data.user,
          account_type: userProfile?.account_type || 'student'
        };

        res.json({ token: data.session.access_token, user: userWithAccountType });
        return; // Exit the function on success

      } catch (err) {
        console.error(`[${new Date().toISOString()}] Unexpected error on attempt ${attempt + 1}:`, err.message);
        lastError = err;
        if (attempt < maxRetries && (err.message.includes('timeout') || err.message.includes('network'))) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          console.log(`[${new Date().toISOString()}] Retrying after unexpected error in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        // If we've exhausted retries or it's not a retryable error, break out of loop
        break;
      }
    }

    // If we get here, all retries failed
    console.error(`[${new Date().toISOString()}] Login failed after ${maxRetries + 1} attempts for ${email}`);
    return res.status(500).json({ error: 'Authentication service temporarily unavailable. Please try again later.' });

  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    console.log('Me endpoint called with req.user:', req.user);
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabaseAdmin.from('users_app').select('*').eq('id', req.user.id).single();
    console.log('Database query result:', { data, error });

    if (error) {
      console.error('Database error in me endpoint:', error);

      // If user exists in auth but not in users_app table, create the record
      if (error.code === 'PGRST116' && req.user.email) {
        console.log('User exists in auth but not in users_app, creating record...');

        const { data: newUser, error: insertError } = await supabaseAdmin
          .from('users_app')
          .insert({
            id: req.user.id,
            email: req.user.email,
            name: req.user.email.split('@')[0], // Use email prefix as name
            plan: 'free',
            account_type: 'student'
          })
          .select('*')
          .single();

        if (insertError) {
          console.error('Failed to create user record:', insertError);
          return res.status(500).json({ error: 'Failed to create user profile', details: insertError.message });
        }

        console.log('Created new user record:', newUser);
        return res.json({ user: newUser });
      }

      return res.status(404).json({ error: 'User profile not found', details: error.message });
    }

    // Ensure account_type is included, defaulting to 'student' if not present
    const userWithAccountType = {
      ...data,
      account_type: data.account_type || 'student'
    };

    // If user role is 'admin', set plan to 'Full Access' and account_type to 'Creator'
    if (userWithAccountType.role === 'admin') {
      userWithAccountType.plan = 'Full Access';
      userWithAccountType.account_type = 'Creator';
    }

    res.json({ user: userWithAccountType });
  } catch (err) {
    console.error('Unexpected error in me endpoint:', err);
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const schema = z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      account_type: z.string().optional()
    });

    const updateData = schema.parse(req.body);

    const { data, error } = await supabaseAdmin
      .from('users_app')
      .update(updateData)
      .eq('id', req.user.id)
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Profile updated successfully', user: data });
  } catch (err) {
    next(err);
  }
};
