
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jyxjfivjnuecdmnyolpj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5eGpmaXZqbnVlY2RtbnlvbHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjAzOTUsImV4cCI6MjA4ODMzNjM5NX0.rgwSi_6RxDoGTcQnLYQSyIKYsVSPff08Ez2w20ko3iU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
    console.log('Checking carriers table...');
    const { data, error } = await supabase.from('carriers').select('*').limit(1);
    if (error) {
        console.error('Error or table does not exist:', error.message);
    } else {
        console.log('Table exists. Data:', data);
    }
}
checkTable();
