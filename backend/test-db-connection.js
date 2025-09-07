require('dotenv').config();
const { supabaseAdmin } = require('./src/lib/supabase');

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  console.log('Supabase URL:', process.env.SUPABASE_URL);
  console.log('Service Role Key exists:', !!process.env.SUPABASE_SERVICE_ROLE);
  
  try {
    // Test basic connection by trying to access a common table
    // Let's try to access users_app table first
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users_app')
      .select('id')
      .limit(1);

    if (!userError) {
      console.log('✅ Database connection successful!');
      console.log('Users_app table accessible, found', userData?.length || 0, 'records');
    } else {
      console.log('Users_app table not accessible:', userError.message);
    }

    // Test other common tables
    const tables = ['notes', 'files', 'payments', 'my_questions', 'notes_breakdown', 'ai_images', 'mcq_generator', 'upload_notes', 'dictionary'];
    const tableStatus = {};
    
    for (const table of tables) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .limit(1);
      
      tableStatus[table] = {
        accessible: !error,
        error: error?.message,
        recordCount: data?.length || 0
      };
    }
    
    console.log('\nTable accessibility status:');
    Object.entries(tableStatus).forEach(([table, status]) => {
      const icon = status.accessible ? '✅' : '❌';
      console.log(`${icon} ${table}: ${status.accessible ? 'accessible' : status.error}`);
    });
    
    // If at least one table is accessible, connection is working
    const accessibleTables = Object.values(tableStatus).filter(s => s.accessible).length;
    if (accessibleTables > 0 || !userError) {
      console.log('\n✅ Database connection is working!');
      return true;
    } else {
      console.log('\n❌ No tables are accessible - database connection may have issues');
      return false;
    }
  } catch (err) {
    console.error('Database connection test failed:', err.message);
    return false;
  }
}

testDatabaseConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
