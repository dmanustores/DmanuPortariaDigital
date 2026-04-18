-- Table for granular interactions/updates on occurrences
CREATE TABLE IF NOT EXISTS occurrence_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occurrence_id UUID REFERENCES occurrences(id) ON DELETE CASCADE,
    operador_id UUID REFERENCES operators(id) ON DELETE SET NULL,
    mensagem TEXT NOT NULL,
    tipo TEXT DEFAULT 'Update', -- 'StatusChange', 'Comment', 'Resolve'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE occurrence_interactions ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated users
CREATE POLICY "Allow all for authenticated on interactions" 
ON occurrence_interactions FOR ALL 
TO authenticated 
USING (true);
