const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  '',
  ''
);

async function run() {
  // First, find the user's ID from auth.users by email.
  // Wait, service_role can query auth.users? Only via admin API.
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('Auth Error:', authError);
    return;
  }
  
  const user = users.find(u => u.email === 'vedantanillahane@gmail.com');
  if (!user) {
    console.error('User not found in auth.users!');
    return;
  }
  
  console.log('Found user ID:', user.id);
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_admin: true })
    .eq('id', user.id);
    
  if (error) {
    console.error('Update Error:', error);
  } else {
    console.log('Successfully updated is_admin to true for vedantanillahane@gmail.com');
  }
}

run();
