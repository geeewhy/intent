/** dev-only in-mem store */
interface Identifiable { id:string }

export function createStore<T extends Identifiable>(maxLength = Infinity) {
  const data: T[] = [];

  // trim only if maxLength is finite
  const push = (item:T) => { data.unshift(item); if (data.length > maxLength) data.pop(); };
  const list  = (limit=50, f?:(x:T)=>boolean)=>(f?data.filter(f):data).slice(0,limit);
  const find  = (id: string | ReadonlyArray<string>)=>data.find(x=>x.id===id);
  const seed  = (factory:()=>T, n:number)=>{ for(let i=0;i<n;i++) push(factory()); };
  const reset = ()=>{ data.length = 0 };

  return { push, list, find, seed, reset };
}
