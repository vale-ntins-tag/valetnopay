import React,{useState} from 'react';
import ov from './overview.json';
import {Group,Caption,Callout,FileButton,TextLink} from './ui';
const [VX,VY,VW,VH]=ov.viewBox as number[];
const RED='rgba(220,38,38,0.16)',REDLINE='rgba(220,38,38,0.45)',PART='rgba(124,58,237,0.38)',PARTLINE='#5b2fbf';
const gmaps=(lat:number,lon:number)=>`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
const amaps=(lat:number,lon:number)=>`https://maps.apple.com/?ll=${lat},${lon}&q=Reye`;
export function GermanyOverview(){
 const [sel,setSel]=useState<''|'muenster'|'hamburg'>('');
 const goMuenster=()=>{const el=document.querySelector('[aria-label="Interactive Münster test-area map"]');el?.scrollIntoView({behavior:'smooth',block:'center'});};
 const pick=(k:'muenster'|'hamburg')=>setSel(sel===k?'':k);
 return <Group label="Germany overview" heading>
  <p>Light red means this place is not covered yet. Purple means partly researched. Nothing here is a claim that parking is allowed.</p>
  <div className="germany" role="group" aria-label="Germany coverage overview">
   <svg viewBox={`${VX} ${VY} ${VW} ${VH}`} role="img" aria-label="Map of Germany. The whole country is shaded light red as not covered yet, except Münster and Hamburg, which are partly researched." style={{width:'100%',maxWidth:420,display:'block',margin:'0 auto'}}>
    <path d={ov.germany} fill={RED} stroke={REDLINE} strokeWidth="1.2" strokeLinejoin="round" fillRule="evenodd"/>
    <path d={ov.muenster} fill={PART} stroke={PARTLINE} strokeWidth="1.6"/>
    <path d={ov.hamburg} fill={PART} stroke={PARTLINE} strokeWidth="1.6"/>
    <circle cx={ov.reyePt[0]} cy={ov.reyePt[1]} r="2.6" fill="#fff" stroke={PARTLINE} strokeWidth="1.4"/>
    <g fontSize="15" fontFamily="system-ui,sans-serif" fill="#3b1d8f"><text x={ov.muensterPt[0]-8} y={ov.muensterPt[1]-14} textAnchor="end">Münster</text><text x={ov.hamburgPt[0]+14} y={ov.hamburgPt[1]-12}>Hamburg</text></g>
    <circle cx={ov.muensterPt[0]} cy={ov.muensterPt[1]} r="16" fill="transparent" role="button" tabIndex={0} aria-label="Münster, partly researched" onClick={()=>pick('muenster')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')pick('muenster');}} style={{cursor:'pointer'}}/>
    <circle cx={ov.hamburgPt[0]} cy={ov.hamburgPt[1]} r="16" fill="transparent" role="button" tabIndex={0} aria-label="Hamburg, partly researched" onClick={()=>pick('hamburg')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')pick('hamburg');}} style={{cursor:'pointer'}}/>
   </svg>
   <ul className="legend" style={{listStyle:'none',padding:0,margin:'8px 0'}}>
    <li><span aria-hidden style={{display:'inline-block',width:14,height:14,background:RED,border:'1px solid '+REDLINE,verticalAlign:'middle',marginRight:8}}/>Not covered yet (all of Germany outside the purple areas, including every city)</li>
    <li><span aria-hidden style={{display:'inline-block',width:14,height:14,background:PART,border:'1px solid '+PARTLINE,verticalAlign:'middle',marginRight:8}}/>Partly researched (never fully covered)</li>
   </ul>
  </div>
  <div role="group" aria-label="Partly researched cities" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
   <FileButton variant="ghost" selected={sel==='muenster'} onClick={()=>pick('muenster')}>Münster: partly researched</FileButton>
   <FileButton variant="ghost" selected={sel==='hamburg'} onClick={()=>pick('hamburg')}>Hamburg: partly researched</FileButton>
  </div>
  {sel==='muenster'&&<Callout title="Münster: partly researched">13 official park-and-ride lots are listed. Their maximum stay and public-transport rules are not verified yet. <FileButton onClick={goMuenster}>Show the Münster map</FileButton></Callout>}
  {sel==='hamburg'&&<Callout title="Hamburg: partly researched">No officially verified free parking yet. One user-reported tip: <strong>Reye</strong> (22397 Hamburg-Wandsbek). Reported by the app owner on 25 November 2026: the whole street can be parked on with no time limit. Not officially verified and not yet checked against signs, so it is only a tip. Hamburg park-and-ride lots are paid and hidden by default (Parking results, City: Hamburg). <TextLink href={gmaps(53.7014021,10.1199507)}>Google Maps</TextLink> · <TextLink href={amaps(53.7014021,10.1199507)}>Apple Maps</TextLink> · <TextLink href="https://hamburg.staedte-info.net/reye_266553.php">Street listing</TextLink></Callout>}
  <Caption>Germany outline: Natural Earth (public domain). Münster and Hamburg boundaries: © OpenStreetMap contributors (ODbL). Hamburg lot positions: Freie und Hansestadt Hamburg, Behörde für Wirtschaft, Verkehr und Innovation, <TextLink href="https://www.govdata.de/dl-de/by-2-0">Datenlizenz Deutschland Namensnennung 2.0</TextLink>. Outlines are simplified. The street position is the street's centre, not its full length.</Caption>
 </Group>;
}

const C0=Math.cos(51.2*Math.PI/180);
const proj=(lon:number,lat:number)=>[(lon-5.8)*C0*100,(55.1-lat)*100];
type HPin={id:string;name:string;lat:number;lon:number;kind?:string};
export function HamburgPins({pins,selected,onPick}:{pins:HPin[];selected:string;onPick:(id:string)=>void}){
 return <div className="hhview" role="group" aria-label="Hamburg pin view">
  <p>Hamburg pin view. Simplified city outline, no streets. Positions are for orientation only, not parking permission.</p>
  <svg viewBox="242 132 46 42" role="img" aria-label="Simplified outline of Hamburg with spot pins" style={{width:'100%',maxWidth:420,display:'block',margin:'0 auto',background:'#fffdfb'}}>
   <path d={ov.hamburg} fill="rgba(124,58,237,0.12)" stroke={PARTLINE} strokeWidth="0.35" strokeLinejoin="round"/>
   {[...pins].sort((a,b)=>(a.kind==='reported'?1:0)-(b.kind==='reported'?1:0)).map(p=>{const [x,y]=proj(p.lon,p.lat);const rep=p.kind==='reported';return <g key={p.id} role="button" tabIndex={0} aria-label={p.name+(rep?', user-reported, not verified':', paid, not free')} onClick={()=>onPick(p.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')onPick(p.id);}} style={{cursor:'pointer'}}>
    <circle cx={x} cy={y} r={rep?1.6:1.1} fill={rep?'#fff':'#9ca3af'} stroke={rep?PARTLINE:'#4b5563'} strokeWidth={selected===p.id?0.7:0.35}/>
    {rep&&<text x={x} y={y+0.6} fontSize="1.8" textAnchor="middle" fill={PARTLINE} fontFamily="system-ui,sans-serif">R</text>}
   </g>;})}
  </svg>
  <Caption>R: Reye, user-reported, not verified. Grey: paid park-and-ride (not free), only when you turn them on below. Tap a pin for details.</Caption>
 </div>;
}
