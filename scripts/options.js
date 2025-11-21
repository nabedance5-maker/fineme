// @ts-nocheck
export {};
const OPTIONS_KEY = 'glowup:options';

function uuid(){
  return 'opt-' + 'xxxxxxxx'.replace(/[x]/g, c => (Math.random()*16|0).toString(16));
}

export function loadOptions(){
  try{
    const raw = localStorage.getItem(OPTIONS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}

export function saveOptions(list){
  localStorage.setItem(OPTIONS_KEY, JSON.stringify(list));
}

export function getOptionById(id){
  if(!id) return null;
  const all = loadOptions();
  return all.find(o=> String(o.id) === String(id)) || null;
}

export function createOption({ name='', description='', price=0, active=true } = {}){
  const all = loadOptions();
  const o = { id: uuid(), name: String(name||''), description: String(description||''), price: (Number.isFinite(Number(price))? Number(price): 0), active: !!active };
  all.push(o);
  saveOptions(all);
  return o;
}

export function updateOption(id, patch){
  if(!id) return null;
  const all = loadOptions();
  const idx = all.findIndex(o=> String(o.id) === String(id));
  if(idx === -1) return null;
  all[idx] = { ...all[idx], ...patch };
  saveOptions(all);
  return all[idx];
}

export function deleteOption(id){
  if(!id) return false;
  const all = loadOptions();
  const next = all.filter(o=> String(o.id) !== String(id));
  saveOptions(next);
  return true;
}
