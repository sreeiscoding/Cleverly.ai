const supabaseAdmin = require('../lib/supabase');
const { z } = require('zod');

exports.register = async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().optional()
    });
    const { email, password, name } = schema.parse(req.body);

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });
    if (error) return res.status(400).json({ error: error.message });

    await supabaseAdmin.from('users_app').insert({ id: data.id, email, name, plan: 'free' });

    res.status(201).json({ message: 'User registered successfully', user: { id: data.id, email, name } });
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

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });

    res.json({ token: data.session.access_token, user: data.user });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { data, error } = await supabaseAdmin.from('users_app').select('*').eq('id', req.user.id).single();
    if (error) return res.status(404).json({ error: 'User profile not found' });
    res.json({ user: data });
  } catch (err) {
    next(err);
  }
};
