const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jyxjfivjnuecdmnyolpj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5eGpmaXZqbnVlY2RtbnlvbHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjAzOTUsImV4cCI6MjA4ODMzNjM5NX0.rgwSi_6RxDoGTcQnLYQSyIKYsVSPff08Ez2w20ko3iU';

async function testConnection() {
  console.log('Testing connection to:', supabaseUrl);
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.from('units').select('id').limit(1);
  if (error) {
    console.error('Error fetching units:', JSON.stringify(error, null, 2));
  } else {
    console.log('Successfully fetched units. Count:', data.length);
  }
}

testConnection();
