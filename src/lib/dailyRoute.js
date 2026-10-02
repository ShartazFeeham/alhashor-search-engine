export const TABS = ['today', 'plans'];

export function tabOf(params) {
  const tab = params.get('tab');
  return TABS.includes(tab) ? tab : 'today';
}

export const planOf = (params, plans) => plans.find((plan) => plan.id === params.get('plan')) ?? null;

// The address of a tab of the daily page.
export function dailyHref({ tab = 'today', plan } = {}) {
  const query = [];
  if (tab !== 'today') query.push(`tab=${tab}`);
  if (tab === 'plans' && plan) query.push(`plan=${encodeURIComponent(plan)}`);
  return query.length > 0 ? `/daily?${query.join('&')}` : '/daily';
}
