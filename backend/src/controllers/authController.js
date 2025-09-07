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

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });
    if (error) return res.status(400).json({ error: error.message });

    await supabaseAdmin.from('users_app').insert({ id: data.id, email, name, plan: 'free', account_type });

    res.status(201).json({ message: 'User registered successfully', user: { id: data.id, email, name, account_type } });
  } catch (err) {
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

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });

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
