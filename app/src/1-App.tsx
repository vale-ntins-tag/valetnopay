import React,{useEffect,useMemo,useRef,useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './style.css';
import realData from './real.json';
import hhData from './hamburg.json';
import curated from './curated.json';
import logo from './photos/muscle-bay.png';

// ---------- model ----------
export type Status='free-unlimited'|'likely-free'|'free-unknown'|'free-limited'|'unverified'|'possible'|'paid'|'avoid';
export type Space='often'|'sometimes'|'rarely'|'';
export type Spot={id:string;lat:number;lon:number;name:string;status:Status;src:'user'|'osm'|'official';maxstay:number;cap:number;note:string;line?:number[][];space:Space;date:string;sources:{label:string;url:string}[];city?:string;own?:boolean;restricted?:boolean};
type Mark={status?:Status;space?:Space;note?:string;date?:string};
type Parked={id:string;name:string;lat:number;lon:number;start:number;maxstay:number};
export const STATUS:Record<Status,{label:string;short:string;color:string;rank:number}>={
 'free-unlimited':{label:'Free and unlimited',short:'Free · unlimited',color:'#16a34a',rank:0},
 'likely-free':{label:'Free, map says no time limit',short:'Free · no limit tagged',color:'#65c23a',rank:1},
 'free-unknown':{label:'Free, time limit unknown',short:'Free · limit unknown',color:'#14b8a6',rank:1.5},
 'free-limited':{label:'Free, time limit',short:'Free · limited',color:'#f5a524',rank:2},
 'possible':{label:'Possibly good, check on site',short:'Possible',color:'#3b82f6',rank:3},
 'unverified':{label:'Free per source, rules unclear',short:'Rules unclear',color:'#9ca3af',rank:4},
 'paid':{label:'Paid',short:'Paid',color:'#ef4444',rank:6},
 'avoid':{label:'Not good',short:'Not good',color:'#6b7280',rank:7}};
const SPACE:Record<string,string>={often:'Usually space',sometimes:'Sometimes space',rarely:'Often full'};
const fmtMin=(m:number)=>m<=0?'no limit':m%1440===0?`${m/1440} d`:m%60===0?`${m/60} h`:m<60?`${m} min`:`${Math.floor(m/60)} h ${m%60} min`;
export function distance(a:{lat:number;lon:number},b:{lat:number;lon:number}){const r=Math.PI/180,dl=(b.lat-a.lat)*r,dn=(b.lon-a.lon)*r;const h=Math.sin(dl/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dn/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
const dtext=(m:number)=>m<1000?`${Math.round(m/10)*10} m`:`${(m/1000).toFixed(m<10000?1:0)} km`;
export function classifyOsm(maxstay:number,explicitNone:boolean):Status{return maxstay>0?'free-limited':maxstay<0?'unverified':explicitNone?'likely-free':'free-unknown';}

const OSM_COPY={label:'OpenStreetMap contributors (ODbL)',url:'https://www.openstreetmap.org/copyright'};
const baseSpots=():Spot[]=>{
 const out:Spot[]=[];
 for(const s of realData as any[])out.push({id:s.id,lat:s.lat,lon:s.lon,name:s.name,status:'unverified',src:'official',maxstay:0,cap:s.capacity||0,note:s.ruleGap,space:'',date:s.checked,city:'Münster',sources:[{label:'Official P+R summary',url:s.source},{label:'City confirmation',url:s.citySource}]});
 for(const s of hhData as any[]){if(s.kind==='reported')continue;out.push({id:s.id,lat:s.lat,lon:s.lon,name:s.name,status:'paid',src:'official',maxstay:0,cap:s.capacity||0,note:'Hamburg P+R lots are paid (day ticket 2 EUR per the operator) and meant for onward public transport.',space:'',date:s.checked,city:'Hamburg',sources:[{label:'Operator prices',url:'https://www.pr.hamburg/preise/'}]});}
 for(const c of curated as any[])out.push({...c,sources:c.sources||[]});
 return out;
};
type Store={marks:Record<string,Mark>;mine:Spot[];favs:string[];parked:Parked|null};
const KEY='valetnopay.v3';
const loadStore=():Store=>{try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s)return {marks:s.marks||{},mine:s.mine||[],favs:s.favs||[],parked:s.parked||null};}catch{}
 // carry over favourites and own spots from the earlier version
 let favs:string[]=[],mine:Spot[]=[];try{favs=JSON.parse(localStorage.getItem('parking-favourites.v1')||'[]');}catch{}
 try{mine=(JSON.parse(localStorage.getItem('parking-spots.v1')||'[]') as any[]).map(o=>({id:o.id,lat:o.lat,lon:o.lon,name:o.name,status:o.known?(o.freeMax||o.legalMax?'free-limited':'free-unlimited'):'possible',src:'user' as const,maxstay:o.freeMax||o.legalMax||0,cap:0,note:o.condition||'',space:'' as Space,date:o.checked||'',sources:[],own:true}));}catch{}
 return {marks:{},mine,favs,parked:null};};

// ---------- map layer ----------
function pinIcon(color:string,n?:number,selected?:boolean){
 if(n)return L.divIcon({className:'vp-cl',html:`<div class="cl3d" style="--c:${color}"><b>${n>=1000?(n/1000).toFixed(n>=10000?0:1)+'k':n}</b></div>`,iconSize:[44,44],iconAnchor:[22,22]});
 return L.divIcon({className:'vp-pin',html:`<div class="pin3d${selected?' sel':''}" style="--c:${color}"><i></i></div>`,iconSize:[30,38],iconAnchor:[15,36]});
}
const shown=(s:Spot,m:Mark|undefined):Status=>m?.status||s.status;

export function App(){
 const [store,setStoreRaw]=useState<Store>(()=>loadStore());
 const setStore=(f:(s:Store)=>Store)=>setStoreRaw(prev=>{const n=f(prev);try{localStorage.setItem(KEY,JSON.stringify(n));}catch{}return n;});
 const [osm,setOsm]=useState<Spot[]>([]);
 const [dataMsg,setDataMsg]=useState('Loading Germany-wide places…');
 const [sel,setSel]=useState<string>('');
 const [tab,setTab]=useState<'map'|'near'|'saved'|'tools'>('map');
 const [filter,setFilter]=useState({min:'all' as 'all'|'free'|'unlimited',stay:0,hidePaid:true,onlyMine:false});
 const [loc,setLoc]=useState<{lat:number;lon:number;acc:number;at:number}|null>(null);
 const [msg,setMsg]=useState('');
 const [q,setQ]=useState('');
 const [now,setNow]=useState(Date.now());
 const [dark,setDark]=useState(()=>{try{return localStorage.getItem('valetnopay.dark')==='1';}catch{return false;}});
 const [adding,setAdding]=useState(false);
 const mapEl=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),layer=useRef<L.LayerGroup|null>(null),me=useRef<L.Layer|null>(null),addingRef=useRef(false);
 addingRef.current=adding;
 const all=useMemo(()=>[...baseSpots(),...osm,...store.mine],[osm,store.mine]);
 const byId=useMemo(()=>new Map(all.map(s=>[s.id,s])),[all]);
 const eff=(s:Spot):Spot=>{const m=store.marks[s.id];return m?{...s,status:m.status||s.status,space:(m.space??s.space) as Space,note:m.note??s.note,date:m.date||s.date}:s;};
 const visible=useMemo(()=>{
  const f=filter;const res:Spot[]=[];
  for(const s0 of all){const s=eff(s0),st=s.status;
   if(st==='paid'&&f.hidePaid)continue;if(st==='avoid')continue;
   if(f.onlyMine&&!(store.marks[s.id]||s.own||s.src==='user'))continue;
   if(f.min==='free'&&(st==='paid'||st==='unverified'||st==='possible'))continue;
   if(f.min==='unlimited'&&st!=='free-unlimited'&&st!=='likely-free')continue;
   if(f.stay>0&&st==='free-limited'&&s.maxstay>0&&s.maxstay<f.stay)continue;
   res.push(s);}
  return res;},[all,store.marks,filter]);// eslint-disable-line
 const visRef=useRef<Spot[]>([]);visRef.current=visible;
 const selRef=useRef('');selRef.current=sel;

 // data
 useEffect(()=>{let ok=true;(async()=>{try{const r=await fetch('./spots-de.json');if(!r.ok)throw new Error(String(r.status));const d=await r.json();if(!ok)return;
   const out:Spot[]=[];for(let i=0;i<d.lots.length;i++){const [lat,lon,name,ms,cap,acc,fl]=d.lots[i];if(acc===2)continue;
    const st=classifyOsm(ms,!!(fl&1));
    out.push({id:'o'+i,lat,lon,name:name||'Parking area',status:st,src:'osm',maxstay:ms>0?ms:0,cap,space:'',date:d.date,note:ms>0?`OpenStreetMap lists a maximum stay of ${fmtMin(ms)}.`:ms<0?'OpenStreetMap has a maximum stay value this app could not read.':fl&1?'OpenStreetMap says: no maximum stay. Volunteer-edited, check the sign.':'OpenStreetMap says free, but lists no time limit. That does not mean there is none. Check the sign.',sources:[OSM_COPY],restricted:!!(fl&2)||acc===1});}
   setOsm(out);setDataMsg(`${out.length.toLocaleString('en')} fee-free parking areas from OpenStreetMap (${d.date}). Covered so far: ${(d.states||[]).join(', ')}. The rest of Germany is not loaded yet, so empty areas on the map do not mean there is no parking.`);}catch(e){setDataMsg('Germany-wide data could not load (offline?). Official places and your marks still work.');}})();return()=>{ok=false;};},[]);

 // map init
 useEffect(()=>{if(!mapEl.current||map.current)return;
  const m=L.map(mapEl.current,{zoomControl:false,preferCanvas:true,minZoom:5,maxZoom:19}).setView([51.1,10.3],6);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(m);
  L.control.zoom({position:'topright'}).addTo(m);
  layer.current=L.layerGroup().addTo(m);map.current=m;
  m.on('click',(e:L.LeafletMouseEvent)=>{if(addingRef.current){const id='u'+Date.now();const spot:Spot={id,lat:+e.latlng.lat.toFixed(6),lon:+e.latlng.lng.toFixed(6),name:'My spot',status:'possible',src:'user',maxstay:0,cap:0,note:'',space:'',date:new Date().toISOString().slice(0,10),sources:[],own:true};setStore(s=>({...s,mine:[...s.mine,spot]}));setAdding(false);setSel(id);setMsg('Spot added. Set its label below.');}else setSel('');});
  return()=>{m.remove();map.current=null;};},[]);
 // render
 const draw=()=>{const m=map.current,g=layer.current;if(!m||!g)return;g.clearLayers();
  const b=m.getBounds().pad(0.15),z=m.getZoom(),list=visRef.current;const inb:Spot[]=[];
  for(const s of list){if(b.contains([s.lat,s.lon])||s.id===selRef.current)inb.push(s);}
  const click=(s:Spot)=>()=>{setSel(s.id);};
  if(z<=12&&inb.length>60){
   const cell=z<=7?1.2:z<=8?.6:z<=9?.3:z<=10?.15:z<=11?.07:.035,cells=new Map<string,{n:number;la:number;lo:number;best:Status;one:Spot}>();
   for(const s of inb){const k=Math.floor(s.lat/cell)+':'+Math.floor(s.lon/(cell*1.6));const c=cells.get(k);if(c){c.n++;c.la+=s.lat;c.lo+=s.lon;if(STATUS[s.status].rank<STATUS[c.best].rank)c.best=s.status;}else cells.set(k,{n:1,la:s.lat,lo:s.lon,best:s.status,one:s});}
   for(const c of cells.values()){if(c.n===1){L.marker([c.one.lat,c.one.lon],{icon:pinIcon(STATUS[c.one.status].color),keyboard:false}).on('click',click(c.one)).addTo(g);}
    else L.marker([c.la/c.n,c.lo/c.n],{icon:pinIcon(STATUS[c.best].color,c.n),keyboard:false}).on('click',()=>m.setView([c.la/c.n,c.lo/c.n],Math.min(z+2,16))).addTo(g);}
  }else{
   let n=0;for(const s of inb){if(n++>1400)break;const col=STATUS[s.status].color;
    if(s.line){L.polyline(s.line as any,{color:col,weight:z>=15?9:6,opacity:.9,lineCap:'round'}).on('click',click(s)).addTo(g);}
    if(!s.line||z<15)L.marker([s.lat,s.lon],{icon:pinIcon(col,0,s.id===selRef.current),keyboard:false,zIndexOffset:s.id===selRef.current?1000:STATUS[s.status].rank===0?500:0}).on('click',click(s)).addTo(g);}
  }
  if(store.parked)L.marker([store.parked.lat,store.parked.lon],{icon:L.divIcon({className:'vp-car',html:'<div class="car3d">🚗</div>',iconSize:[36,36],iconAnchor:[18,18]}),zIndexOffset:2000}).addTo(g);};
 useEffect(()=>{const m=map.current;if(!m)return;m.on('moveend zoomend',draw);return()=>{m.off('moveend zoomend',draw);};});
 useEffect(()=>{draw();},[visible,sel,store.parked]);// eslint-disable-line
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';try{localStorage.setItem('valetnopay.dark',dark?'1':'0');}catch{}},[dark]);
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(t);},[]);
 useEffect(()=>{document.body.classList.toggle('adding',adding);},[adding]);

 const selected=sel?byId.get(sel):undefined;const selE=selected?eff(selected):undefined;
 const focus=(s:Spot,zoom=17)=>{setSel(s.id);map.current?.setView([s.lat,s.lon],zoom);setTab('map');};
 const locate=()=>{if(!navigator.geolocation){setMsg('This browser has no location. Use search instead.');return;}setMsg('Finding you…');navigator.geolocation.getCurrentPosition(p=>{const l={lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy,at:Date.now()};setLoc(l);map.current?.setView([l.lat,l.lon],15);if(me.current)map.current?.removeLayer(me.current);me.current=L.circleMarker([l.lat,l.lon],{radius:9,color:'#fff',weight:3,fillColor:'#2563eb',fillOpacity:1}).addTo(map.current!);setMsg('One-time location. It is not saved or sent anywhere.');},e=>setMsg(e.code===1?'Location permission denied. Use search instead.':'Location unavailable right now.'),{timeout:10000});};
 const search=async(e:React.FormEvent)=>{e.preventDefault();if(!q.trim())return;setMsg('Searching…');try{const r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=de&q='+encodeURIComponent(q));const d=await r.json();if(!d[0]){setMsg('Nothing found in Germany for that search.');return;}const b=d[0].boundingbox.map(Number);map.current?.fitBounds([[b[0],b[2]],[b[1],b[3]]],{maxZoom:16});setMsg(d[0].display_name);}catch{setMsg('Search needs a connection.');}};
 const mark=(s:Spot,m:Mark)=>setStore(st=>{
  if(s.own&&s.src==='user'&&st.mine.some(x=>x.id===s.id))return {...st,mine:st.mine.map(x=>x.id===s.id?{...x,...(m.status?{status:m.status}:{}),...(m.space!==undefined?{space:m.space}:{}),...(m.note!==undefined?{note:m.note}:{}),date:new Date().toISOString().slice(0,10)}:x)};
  return {...st,marks:{...st.marks,[s.id]:{...st.marks[s.id],...m,date:new Date().toISOString().slice(0,10)}}};});
 const unmark=(s:Spot)=>setStore(st=>{const marks={...st.marks};delete marks[s.id];return {...st,marks};});
 const del=(s:Spot)=>{setStore(st=>({...st,mine:st.mine.filter(x=>x.id!==s.id)}));setSel('');};
 const toggleFav=(id:string)=>setStore(s=>({...s,favs:s.favs.includes(id)?s.favs.filter(x=>x!==id):[...s.favs,id]}));
 const park=(s:Spot)=>{setStore(st=>({...st,parked:{id:s.id,name:s.name,lat:s.lat,lon:s.lon,start:Date.now(),maxstay:s.maxstay}}));setMsg('Saved. Open Tools to see your timer.');};
 const near=useMemo(()=>{const c=loc||(map.current?{lat:map.current.getCenter().lat,lon:map.current.getCenter().lng}:null);if(!c)return[];return visible.map(s=>({s,d:distance(c,s)})).sort((a,b)=>a.d-b.d||0).slice(0,60);},[visible,loc,tab]);// eslint-disable-line
 const exportData=()=>JSON.stringify({app:'valetnopay',v:3,store});
 const [backup,setBackup]=useState('');
 const importData=()=>{try{const d=JSON.parse(backup);const s=d.store||d;if(!s.marks&&!s.mine&&!s.favs)throw 0;setStore(()=>({marks:s.marks||{},mine:s.mine||[],favs:s.favs||[],parked:s.parked||null}));setMsg('Backup restored.');}catch{setMsg('That is not a ValetNoPay backup.');}};
 const counts=useMemo(()=>{const c:Record<string,number>={};for(const s of visible)c[s.status]=(c[s.status]||0)+1;return c;},[visible]);
 const parkedLeft=store.parked&&store.parked.maxstay>0?store.parked.start+store.parked.maxstay*60000-now:null;

 return <div className="shell">
  <div ref={mapEl} className="map" aria-label="Parking map of Germany"/>
  <header className="top glass">
   <div className="brand"><img src={logo} alt=""/><b>ValetNoPay</b></div>
   <form onSubmit={search} className="search"><input aria-label="Search a place" placeholder="Search city or street" value={q} onChange={e=>setQ(e.target.value)}/><button aria-label="Search">⌕</button></form>
   <button className="icon" aria-label="Toggle dark mode" onClick={()=>setDark(!dark)}>{dark?'☀':'☾'}</button>
  </header>
  <div className="fab">
   <button className="fab3d" onClick={locate} aria-label="Show my location">◎</button>
   <button className={'fab3d'+(adding?' on':'')} onClick={()=>{setAdding(!adding);setMsg(adding?'':'Tap the map where the spot is.');}} aria-label="Add a spot">{adding?'×':'＋'}</button>
  </div>
  {msg&&<div className="toast glass" role="status" onClick={()=>setMsg('')}>{msg}</div>}
  {selE&&<section className="sheet glass" aria-label="Selected spot">
   <div className="sheethead"><span className="dot" style={{background:STATUS[selE.status].color}}/><div><h2>{selE.name}</h2><p className="main-label" style={{color:STATUS[selE.status].color}}>{STATUS[selE.status].label}{selE.space?` · ${SPACE[selE.space]}`:''}</p></div><button className="x" aria-label="Close" onClick={()=>setSel('')}>×</button></div>
   <p className="meta">{store.marks[selE.id]||selE.src==='user'?'Marked by you':selE.src==='osm'?'From OpenStreetMap':selE.src==='official'?'Official source':'Marked by Valentin'}{selE.date?` · ${selE.date}`:''}{selE.maxstay>0?` · max ${fmtMin(selE.maxstay)}`:''}{selE.cap?` · ${selE.cap} spaces`:''}{loc?` · ${dtext(distance(loc,selE))} away`:''}</p>
   {selE.restricted&&<p className="warn">OpenStreetMap lists opening hours or only permissive access for this place. Check the sign before parking.</p>}
   {selE.status==='paid'&&<p className="warn">Paid. Shown only because you turned paid places on.</p>}
   {selE.note&&<p className="note">{selE.note}</p>}
   <div className="seg" role="group" aria-label="Your label">{(['free-unlimited','free-limited','possible','paid','avoid'] as Status[]).map(k=><button key={k} className={selE.status===k?'on':''} style={{'--c':STATUS[k].color} as any} onClick={()=>mark(selected!,{status:k})}>{k==='free-unlimited'?'Free, unlimited':k==='free-limited'?'Free, limit':k==='possible'?'Maybe':k==='paid'?'Paid':'Not good'}</button>)}</div>
   <div className="seg" role="group" aria-label="How full is it">{(['often','sometimes','rarely'] as Space[]).map(k=><button key={k} className={selE.space===k?'on':''} onClick={()=>mark(selected!,{space:selE.space===k?'':k})}>{SPACE[k]}</button>)}</div>
   <textarea aria-label="Your note" placeholder="Your note (signs, times, what you saw)" defaultValue={store.marks[selE.id]?.note??(store.mine.find(x=>x.id===selE.id)?.note||'')} key={selE.id} onBlur={e=>{mark(selected!,{note:e.target.value});}}/>
   <div className="actions"><a className="btn primary" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${selE.lat},${selE.lon}`}>Directions</a><a className="btn" target="_blank" rel="noopener noreferrer" href={`https://maps.apple.com/?daddr=${selE.lat},${selE.lon}&dirflg=d`}>Apple Maps</a><a className="btn" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${selE.lat},${selE.lon}`}>Reviews</a><button className="btn" onClick={()=>toggleFav(selE.id)}>{store.favs.includes(selE.id)?'★ Saved':'☆ Save'}</button><button className="btn" onClick={()=>park(selE)}>I parked here</button>{store.marks[selE.id]&&<button className="btn ghost" onClick={()=>unmark(selected!)}>Reset my label</button>}{selE.src==='user'&&store.mine.some(x=>x.id===selE.id)&&<button className="btn ghost" onClick={()=>del(selected!)}>Delete</button>}</div>
   <p className="src">{selE.sources.map(x=><a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer">{x.label}</a>)}</p>
  </section>}
  <nav className="dock glass" aria-label="Sections">
   {(['map','near','saved','tools'] as const).map(t=><button key={t} className={tab===t?'on':''} onClick={()=>setTab(t)}>{({map:'Map',near:'Nearby',saved:'Saved',tools:'Tools'})[t]}</button>)}
  </nav>
  {tab!=='map'&&<section className="panel glass" aria-label={tab}>
   <button className="x" aria-label="Close panel" onClick={()=>setTab('map')}>×</button>
   {tab==='near'&&<><h2>Nearby</h2><p className="meta">{loc?'Sorted from your location.':'Sorted from the map centre. Tap ◎ for your location.'} Distances are straight-line.</p><ul className="list">{near.map(({s,d})=><li key={s.id}><button onClick={()=>focus(s)}><span className="dot" style={{background:STATUS[s.status].color}}/><span className="t"><b>{s.name}</b><small>{STATUS[s.status].short}{s.space?` · ${SPACE[s.space]}`:''}{s.maxstay>0?` · ${fmtMin(s.maxstay)}`:''}</small></span><em>{dtext(d)}</em></button></li>)}{near.length===0&&<li className="meta">Nothing matches the filters here.</li>}</ul></>}
   {tab==='saved'&&<><h2>Saved and marked</h2><ul className="list">{all.filter(s=>store.favs.includes(s.id)||store.marks[s.id]||s.src==='user').map(s=>eff(s)).map(s=><li key={s.id}><button onClick={()=>focus(s)}><span className="dot" style={{background:STATUS[s.status].color}}/><span className="t"><b>{store.favs.includes(s.id)?'★ ':''}{s.name}</b><small>{STATUS[s.status].short}{s.space?` · ${SPACE[s.space]}`:''}</small></span></button></li>)}</ul><p className="meta">Marks and saved places stay in this browser. Use a backup in Tools before clearing browser data.</p></>}
   {tab==='tools'&&<><h2>Tools</h2>
    <h3>Filter</h3>
    <div className="seg"><button className={filter.min==='all'?'on':''} onClick={()=>setFilter({...filter,min:'all'})}>All</button><button className={filter.min==='free'?'on':''} onClick={()=>setFilter({...filter,min:'free'})}>Free only</button><button className={filter.min==='unlimited'?'on':''} onClick={()=>setFilter({...filter,min:'unlimited'})}>Map says no limit</button></div>
    <div className="seg"><span className="lbl">I stay</span>{[0,60,120,240,480].map(v=><button key={v} className={filter.stay===v?'on':''} onClick={()=>setFilter({...filter,stay:v})}>{v?fmtMin(v):'any'}</button>)}</div>
    <label className="chk"><input type="checkbox" checked={!filter.hidePaid} onChange={e=>setFilter({...filter,hidePaid:!e.target.checked})}/>Show paid Hamburg P+R</label>
    <label className="chk"><input type="checkbox" checked={filter.onlyMine} onChange={e=>setFilter({...filter,onlyMine:e.target.checked})}/>Only places I marked</label>
    <p className="meta">{visible.length.toLocaleString('en')} places shown: {Object.entries(counts).sort((a,b)=>STATUS[a[0] as Status].rank-STATUS[b[0] as Status].rank).map(([k,v])=>`${v.toLocaleString('en')} ${STATUS[k as Status].short.toLowerCase()}`).join(', ')}</p>
    <h3>My car</h3>
    {store.parked?<div className="car"><b>{store.parked.name}</b><p>Parked {Math.max(0,Math.round((now-store.parked.start)/60000))} min ago{parkedLeft!==null?(parkedLeft>0?`. Time limit ends in ${fmtMin(Math.round(parkedLeft/60000))}.`:'. The recorded time limit has passed.'):'. No time limit recorded.'}</p><div className="actions"><button className="btn" onClick={()=>{const s=byId.get(store.parked!.id);map.current?.setView([store.parked!.lat,store.parked!.lon],17);setTab('map');if(s)setSel(s.id);}}>Show on map</button><a className="btn" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${store.parked.lat},${store.parked.lon}`}>Walk to car</a><button className="btn ghost" onClick={()=>setStore(s=>({...s,parked:null}))}>Clear</button></div></div>:<p className="meta">Open a place and tap "I parked here". The timer shows any recorded time limit. It is a helper, not a reminder service.</p>}
    <h3>Backup</h3>
    <textarea aria-label="Backup text" value={backup} onChange={e=>setBackup(e.target.value)} placeholder="Backup text appears here. Paste a backup to restore."/>
    <div className="actions"><button className="btn" onClick={()=>setBackup(exportData())}>Create backup</button><button className="btn" onClick={async()=>{try{await navigator.clipboard.writeText(exportData());setMsg('Backup copied.');}catch{setBackup(exportData());}}}>Copy</button><button className="btn" onClick={importData}>Restore</button></div>
    <h3>How to read the labels</h3>
    <ul className="legend">{(Object.keys(STATUS) as Status[]).filter(k=>k!=='avoid').map(k=><li key={k}><span className="dot" style={{background:STATUS[k].color}}/>{STATUS[k].label}</li>)}</ul>
    <p className="meta">Green "Free and unlimited" is your own call, or one you made earlier. Teal "Free, time limit unknown" and light green "Free, map says no time limit" come from OpenStreetMap tags (fee=no, with or without maxstay=no). Missing limit is never read as unlimited. Private, customer-only and permit places are left out. OpenStreetMap is volunteer-edited, not a sign check. "Usually space" is a report from people, never live availability. {dataMsg}</p>
    <p className="meta">Map © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>, ODbL. Parking data from OpenStreetMap via Geofabrik. Found a problem? <a href="./support.html">Tell us</a>.</p></>}
  </section>}
 </div>;
}
