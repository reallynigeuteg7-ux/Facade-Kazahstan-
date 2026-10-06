// Group before pagination so one client's totals never depend on the current page.
export function clientQuery(where) {
  const phoneKey =
    "replace(replace(replace(replace(replace(replace(phone,'+',''),' ',''),'-',''),'(',''),')',''),char(160),'')";
  return `WITH selected AS (SELECT *, ${phoneKey} AS phone_key FROM crm_leads ${where}),
    ranked AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY phone_key ORDER BY created_at DESC,id DESC) AS rn,
      COUNT(*) OVER (PARTITION BY phone_key) AS order_count,
      SUM(amount) OVER (PARTITION BY phone_key) AS order_amount FROM selected)
    SELECT id,name,phone,phone_key,city,order_count,order_amount FROM ranked WHERE rn=1`;
}
