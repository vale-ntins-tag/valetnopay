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
  {sel==='hamburg'&&<Callout title="Hamburg: partly researched">Free parking: one street only, <strong>Reye</strong> (22397 Hamburg-Wandsbek). The 34 operator-listed Hamburg park-and-ride lots are also in the list as paid, not free (Parking results, City: Hamburg). Reye: reported by the app owner on 25 November 2026: the whole street can be parked on with no time limit. User-reported, not officially verified, and not yet checked against signs. <TextLink href={gmaps(53.7014021,10.1199507)}>Google Maps</TextLink> · <TextLink href={amaps(53.7014021,10.1199507)}>Apple Maps</TextLink> · <TextLink href="https://hamburg.staedte-info.net/reye_266553.php">Street listing</TextLink></Callout>}
  <Caption>Germany outline: Natural Earth (public domain). Münster and Hamburg boundaries: © OpenStreetMap contributors (ODbL). Hamburg lot positions: Freie und Hansestadt Hamburg, Behörde für Wirtschaft, Verkehr und Innovation, <TextLink href="https://www.govdata.de/dl-de/by-2-0">Datenlizenz Deutschland Namensnennung 2.0</TextLink>. Outlines are simplified. The street position is the street's centre, not its full length.</Caption>
 </Group>;
}
