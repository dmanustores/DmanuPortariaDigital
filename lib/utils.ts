export const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const formatRG = (value: string) => {
  const digits = value.replace(/[^\dX]/gi, '').toUpperCase();
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})([\dX]{1,2})/, '$1-$2')
    .replace(/(-[\dX]{1,2}).*$/, '$1');
};

export const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    // Fixed line: (00) 0000-0000
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  } else {
    // Mobile: (00) 00000-0000
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  }
};

export const capitalize = (value: string) => {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const stripNonDigits = (value: string) => {
  return value.replace(/\D/g, '');
};

export const formatPlate = (value?: string | null) => {
  if (!value) return '';
  const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (cleaned.length > 3) {
    return cleaned.substring(0, 3) + '-' + cleaned.substring(3).substring(0, 4);
  }
  return cleaned;
};

/**
 * Given a free-text unit description like "Bloco 01, Apt 101" or "Bloco 1 Apto 201",
 * queries the `units` table and returns the matching UUID (or null if not found).
 */
export const lookupUnitId = async (
  supabase: any,
  unidadeDesc: string
): Promise<string | null> => {
  if (!unidadeDesc) return null;

  // Match "Bloco XX" and "Apt(o) YY"
  const blocoMatch = unidadeDesc.match(/bloco\s*([0-9a-z]+)/i);
  const aptoMatch  = unidadeDesc.match(/apt[o]?\s*([0-9a-z]+)/i);

  if (!blocoMatch || !aptoMatch) return null;

  const bloco  = blocoMatch[1].padStart(2, '0');
  const numero = aptoMatch[1];

  const { data } = await supabase
    .from('units')
    .select('id')
    .eq('bloco', bloco)
    .eq('numero', numero)
    .maybeSingle();

  return data?.id ?? null;
};

/**
 * Returns the UUID of the currently authenticated operator (auth.uid()),
 * or null if there is no active session.
 */
export const getCurrentOperatorId = async (supabase: any): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
};
