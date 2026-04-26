import { getAuditFields } from './audit';
import { getSupabaseClient } from './supabase/client';
import { toNullableDbId } from '../utils/dbIds';

type MonthlySummaryNoteRow = {
  client_id: number | string;
  note: string | null;
};

export async function fetchMonthlySummaryNotes(yearMonth: string): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('monthly_summary_notes')
    .select('client_id, note')
    .eq('year_month', yearMonth);

  if (error) {
    throw error;
  }

  const notes: Record<string, string> = {};
  for (const row of (data ?? []) as MonthlySummaryNoteRow[]) {
    notes[String(row.client_id)] = row.note ?? '';
  }

  return notes;
}

export async function saveMonthlySummaryNote(
  yearMonth: string,
  clientId: string,
  note: string,
): Promise<void> {
  const clientDbId = toNullableDbId(clientId);
  if (clientDbId === null) {
    throw new Error('종합장 비고를 저장할 거래처를 찾지 못했습니다.');
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('monthly_summary_notes')
    .upsert(
      {
        year_month: yearMonth,
        client_id: clientDbId,
        note,
        ...getAuditFields(),
      },
      { onConflict: 'year_month,client_id' },
    );

  if (error) {
    throw error;
  }
}
