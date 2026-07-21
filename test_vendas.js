const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if(k && v.length) acc[k.trim()] = v.join('=').trim();
  return acc;
}, {});

async function run() {
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase
    .from('mesas')
    .select(`
      numero,
      status,
      reservado_em,
      vendas (
        status,
        forma_pagamento,
        compradores (
          nome,
          telefone
        )
      )
    `)
    .neq('status', 'livre')
    .order('numero', { ascending: true });

  if (error) console.error('ERROR:', error);
  console.log(JSON.stringify(data, null, 2));
}
run();
