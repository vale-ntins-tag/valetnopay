import React,{useEffect,useState} from 'react';
export const FileCard=({children}:any)=><main className="app">{children}</main>;
export const Header=({title,fact,intro}:any)=><header className="intro"><h1>{title}</h1><p className="fact">{fact}</p><p>{intro}</p></header>;
export const Group=({label,children}:any)=><section><h2>{label}</h2>{children}</section>;
export const Closing=({children}:any)=><footer>{children}</footer>;
export const Caption=({children}:any)=><p className="caption">{children}</p>;
export const Callout=({title,children}:any)=><aside className="callout"><strong>{title}</strong><div>{children}</div></aside>;
export const CloseButton=({label,onClick}:any)=><button aria-label={label} onClick={onClick}>×</button>;
export const FileButton=({children,variant,selected,...props}:any)=><button {...props} aria-pressed={selected} className={(variant==='ghost'?'ghost ':'')+(selected?'selected':'')}>{children}</button>;
export const TextLink=({children,href}:any)=><a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
export const ChoiceRow=({label,options,value,onChange}:any)=><fieldset className="choices"><legend>{label}</legend>{options.map((o:any)=><button key={o.value} aria-pressed={o.value===value} className={o.value===value?'selected':'ghost'} onClick={()=>onChange(o.value)}>{o.label}</button>)}</fieldset>;
export function CopyButton({text,label}:any){const [notice,setNotice]=useState('');return <><button onClick={async()=>{try{await navigator.clipboard.writeText(text);setNotice('Copied.');}catch{setNotice('Clipboard unavailable. Select and copy the backup text instead.');}}}>{label}</button><span role="status">{notice}</span></>;}
export function useLocalState<T>(key:string,initial:T){const [value,setValue]=useState(initial);const [status,setStatus]=useState({ready:false,message:'Loading saved state...'});useEffect(()=>{try{const data=localStorage.getItem(key);if(data)setValue(JSON.parse(data));const probe=key+'.probe';localStorage.setItem(probe,'1');localStorage.removeItem(probe);setStatus({ready:true,message:'Saved in this browser only. Copy a backup before relying on it.'});}catch{setStatus({ready:true,message:'Not saved. Changes last only while this app is open.'});}},[]);const update=(next:T)=>{setValue(next);try{localStorage.setItem(key,JSON.stringify(next));setStatus({ready:true,message:'Saved in this browser only. Copy a backup before relying on it.'});}catch{setStatus({ready:true,message:'Not saved. Changes last only while this app is open.'});}};return [value,update,status] as const;}
