import { client, db, isAdmin, noStore, sameOrigin } from '@/lib/crm/server';
import { applyStock } from '@/lib/crm/inventory.mjs';
export async function GET(request: Request) {
  if (!(await isAdmin())) return noStore({ error: 'Нет доступа к CRM.' }, 403);
  const params = new URL(request.url).searchParams;
  const material = params.get('material') || '';
  const page = Math.max(1, Math.min(100000, Number(params.get('page')) || 1));
  try {
    const [materials, movements, count] = await Promise.all([
      db()
        .prepare('SELECT * FROM crm_materials ORDER BY created_at DESC,id')
        .all(),
      db()
        .prepare(
          "SELECT s.id,s.material_id,s.kind,s.delta,s.balance_after,s.note,s.lead_id,s.created_at,m.name,m.unit FROM crm_stock_movements s JOIN crm_materials m ON m.id=s.material_id WHERE (?='' OR s.material_id=?) ORDER BY s.created_at DESC,s.rowid DESC LIMIT 50 OFFSET ?",
        )
        .bind(material, material, (Math.floor(page) - 1) * 50)
        .all(),
      db()
        .prepare(
          "SELECT COUNT(*) total FROM crm_stock_movements WHERE (?='' OR material_id=?)",
        )
        .bind(material, material)
        .first(),
    ]);
    return noStore({
      materials: materials.results,
      movements: movements.results,
      total: count?.total || 0,
    });
  } catch {
    return noStore(
      { error: 'Не удалось загрузить склад. Попробуйте обновить страницу.' },
      503,
    );
  }
}
export async function POST(request: Request) {
  if (!(await isAdmin()) || !sameOrigin(request))
    return noStore({ error: 'Нет доступа к CRM.' }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 4000)
      return noStore({ error: 'Слишком много данных.' }, 413);
    return noStore(await applyStock(client(), JSON.parse(raw)));
  } catch (e) {
    const message = e instanceof Error ? e.message : '';
    const safe =
      /^(Укажите|Количество|Неверн|Неизвестн|Для корректировки|Выберите|Номер операции|Материал не найден|Заявка не найдена|Недостаточно|Превышен)/.test(
        message,
      );
    return noStore(
      {
        error: safe
          ? message
          : 'Не удалось сохранить операцию. Повторите попытку.',
      },
      safe ? 400 : 503,
    );
  }
}
