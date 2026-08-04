import { getAuditFields } from './audit';
import { getSupabaseClient } from './supabase/client';

export type ShippingScheduleDraft = {
  dispatch: string;
  note: string;
};

type ShippingScheduleDraftRow = {
  order_book_id: string;
  dispatch: string | null;
  note: string | null;
};

export async function fetchShippingScheduleDrafts(dateFrom: string, dateTo = dateFrom) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('shipping_schedule_drafts')
    .select('order_book_id, dispatch, note')
    .gte('schedule_date', dateFrom)
    .lte('schedule_date', dateTo);

  if (error) {
    if (isMissingDraftTableError(error)) return {};
    throw error;
  }

  const drafts: Record<string, ShippingScheduleDraft> = {};
  for (const row of (data ?? []) as ShippingScheduleDraftRow[]) {
    drafts[String(row.order_book_id)] = {
      dispatch: row.dispatch ?? '',
      note: row.note ?? '',
    };
  }
  return drafts;
}

export async function saveShippingScheduleDraft(
  orderBookId: string,
  date: string,
  draft: ShippingScheduleDraft,
) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('shipping_schedule_drafts')
    .upsert(
      {
        order_book_id: orderBookId,
        schedule_date: date,
        dispatch: draft.dispatch,
        note: draft.note,
        ...getAuditFields(),
      },
      { onConflict: 'order_book_id' },
    );

  if (error) {
    if (isMissingDraftTableError(error)) {
      throw new Error('운영 DB에 출고 일정 저장 테이블을 먼저 적용해 주세요.');
    }
    throw error;
  }
}

function isMissingDraftTableError(error: { code?: string; message?: string }) {
  return error.code === '42P01'
    || error.code === 'PGRST205'
    || error.message?.includes('shipping_schedule_drafts') === true;
}
