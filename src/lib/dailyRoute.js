import { serializeIds } from './khutbahList';

export const TABS = ['today', 'plans', 'khutbah'];

export function tabOf(params) {
  const tab = params.get('tab');
  return TABS.includes(tab) ? tab : 'today';
}

export const planOf = (params, plans) => plans.find((plan) => plan.id === params.get('plan')) ?? null;

// The address of a tab of the daily page. The khutbah list (`items`) rides along on every tab, so
// adding a hadis from the daily or plan lists keeps it while the visitor moves around; commas are
// left readable.
export function dailyHref({ tab = 'today', plan, items = [] } = {}) {
  const query = [];
  if (tab !== 'today') query.push(`tab=${tab}`);
  if (tab === 'plans' && plan) query.push(`plan=${encodeURIComponent(plan)}`);
  if (items.length > 0) query.push(`ids=${serializeIds(items)}`);
  return query.length > 0 ? `/daily?${query.join('&')}` : '/daily';
}
