import { useEffect, useState } from 'react';
import { catalog } from './data';
import { getAllDays, getDay, importDays, RecordDay, saveDay, Severity, VitalReading } from './db';

const iso=()=>new Date().toLocaleDateString('en-CA');
const emptyVital=():VitalReading=>({time:'',bp:'',heartRate:'',temperature:'',context:''});
const blank=(date=iso()):RecordDay=>({
  date,status:'Typical',burden:0,energy:0,upright:0,sleep:0,symptoms:{},
  measurements:{weight:'',fluid:'',urine:'',urinations:'',bp:'',heartRate:'',temperature:'',weightUnit:'lb',fluidUnit:'oz',tempUnit:'°F',electrolyte:false,vitals:[emptyVital(),emptyVital(),emptyVital()]},
  activity:{physical:'None',cognitive:'None',social:'None',delayed:'None'},
  cycle:{day:'',phase:'Unknown',pmdd:'None',note:''},notes:'',updatedAt:new Date().toISOString()
});
const favoriteDefault=['Brain fog','Dizziness','Lightheadedness','Post-exertional malaise','Delayed crashes','Energy collapse','Nausea','Weakness','Non-restorative sleep','Sensory overload','Headache','Temperature dysregulation'];
const symptomLabel=['None','Mild','Moderate','Severe'];

function normalizeDay(v:RecordDay):RecordDay{
  const base=blank(v.date);
  const old:any=(v as any).measurements||{};
  const vitals:Array<VitalReading>=Array.isArray(old.vitals)?old.vitals.slice(0,3):[];
  while(vitals.length<3)vitals.push(emptyVital());
  if(!vitals.some(x=>x.bp||x.heartRate||x.temperature) && (old.bp||old.heartRate||old.temperature)){
    vitals[0]={time:'',bp:old.bp||'',heartRate:old.heartRate||'',temperature:old.temperature||'',context:''};
  }
  return {
    ...base,
    ...v,
    symptoms:v.symptoms||{},
    measurements:{
      ...base.measurements,
      ...old,
      weight:old.weight ?? (v as any).weight ?? '',
      bp:old.bp ?? (v as any).bp ?? '',
      heartRate:old.heartRate ?? (v as any).heartRate ?? '',
      temperature:old.temperature ?? (v as any).temperature ?? '',
      vitals
    },
    activity:{...base.activity,...v.activity},
    cycle:{...base.cycle,...v.cycle}
  };
}

function FieldScore({label,value,set}:{label:string;value:number;set:(n:number)=>void}){
  return <label className="score"><span>{label}</span><input aria-label={label} type="range" min="0" max="5" value={value} onChange={e=>set(+e.target.value)}/><b>{value}</b></label>;
}
function MiniChart({label,days,keyName,color}:{label:string;days:RecordDay[];keyName:'burden'|'energy'|null;color:string}){
  const vals=days.slice(-30).map(d=>keyName?d[keyName]:Number(d.measurements.weight)||0);
  const max=Math.max(5,...vals);
  const pts=vals.map((v,i)=>`${vals.length<2?0:i/(vals.length-1)*100},${40-v/max*36}`).join(' ');
  return <section className="card"><h3>{label}</h3>{vals.length?<svg viewBox="0 0 100 42" preserveAspectRatio="none" className="chart"><polyline fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" points={pts}/></svg>:<p>No data yet.</p>}</section>;
}

type Flag={label:string;detail:string};
function average(values:number[]){return values.length?values.reduce((a,b)=>a+b,0)/values.length:0}
function baselineFlags(days:RecordDay[]):Flag[]{
  const ordered=days.slice().sort((a,b)=>a.date.localeCompare(b.date));
  const recent=ordered.slice(-3), baseline=ordered.slice(-17,-3);
  if(recent.length<2||baseline.length<7)return [];
  const flags:Flag[]=[];
  const compare=(label:string,recentValues:number[],baseValues:number[],direction:'up'|'down')=>{
    if(recentValues.length<2||baseValues.length<7)return;
    const r=average(recentValues),b=average(baseValues),difference=r-b;
    if((direction==='up'&&difference>=1)||(direction==='down'&&difference<=-1))flags.push({label,detail:`Recent average ${r.toFixed(1)} versus earlier baseline ${b.toFixed(1)}`});
  };
  const symptomValues=(set:RecordDay[],name:string)=>set.flatMap(d=>d.symptoms[name]?[d.symptoms[name].severity]:[]);
  compare('Fatigue after standing above recent baseline',symptomValues(recent,'Fatigue after standing'),symptomValues(baseline,'Fatigue after standing'),'up');
  compare('Lightheadedness above recent baseline',symptomValues(recent,'Lightheadedness'),symptomValues(baseline,'Lightheadedness'),'up');
  compare('Available energy below recent baseline',recent.map(d=>d.energy),baseline.map(d=>d.energy),'down');
  compare('Upright tolerance below recent baseline',recent.map(d=>d.upright),baseline.map(d=>d.upright),'down');
  compare('Overall symptom burden above recent baseline',recent.map(d=>d.burden),baseline.map(d=>d.burden),'up');
  return flags;
}

function download(data:string,name:string,type:string){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
function aiExport(days:RecordDay[]){
  const lines:string[]=['# Autonomic Tracker Data Export','','## Important context','- User-entered observations; not a diagnosis or medical record.','- Symptom severity: 0 none, 1 mild, 2 moderate, 3 severe.','- Overall scores use 0–5.','- Missing fields mean not recorded, not zero.','','## Date range',days.length?`${days[0].date} through ${days[days.length-1].date}`:'No records','','## Daily entries'];
  days.forEach(d=>{
    lines.push('',`### ${d.date}`,`Status: ${d.status}`,`Overall symptom burden: ${d.burden}/5`,`Available energy: ${d.energy}/5`,`Upright tolerance: ${d.upright}/5`,`Sleep quality: ${d.sleep}/5`,`Weight: ${d.measurements.weight||'Not recorded'} ${d.measurements.weight?d.measurements.weightUnit:''}`.trim(),`Fluid intake: ${d.measurements.fluid||'Not recorded'} ${d.measurements.fluid?d.measurements.fluidUnit:''}`.trim(),`Urine output: ${d.measurements.urine||'Not recorded'} ${d.measurements.urine?d.measurements.fluidUnit:''}`.trim(),`Number of urinations: ${d.measurements.urinations||'Not recorded'}`,`Electrolyte packet: ${d.measurements.electrolyte?'Yes':'No'}`,'','Vital readings:');
    const recorded=d.measurements.vitals.filter(v=>v.time||v.bp||v.heartRate||v.temperature||v.context);
    if(!recorded.length)lines.push('- None recorded');
    recorded.forEach((v,i)=>lines.push(`- Reading ${i+1}: time ${v.time||'not recorded'}; BP ${v.bp||'not recorded'}; HR ${v.heartRate||'not recorded'}; temperature ${v.temperature||'not recorded'}${v.temperature?d.measurements.tempUnit:''}; context ${v.context||'not recorded'}`));
    lines.push('','Symptoms:');
    const symptoms=Object.entries(d.symptoms).filter(([,v])=>v.severity>0);
    if(!symptoms.length)lines.push('- None recorded');
    symptoms.forEach(([name,v])=>lines.push(`- ${name}: ${symptomLabel[v.severity]}${v.note?`; note: ${v.note}`:''}`));
    lines.push('',`Activity: physical ${d.activity.physical}; cognitive ${d.activity.cognitive}; social/sensory ${d.activity.social}; delayed worsening ${d.activity.delayed}.`,`Cycle: day ${d.cycle.day||'not recorded'}; phase ${d.cycle.phase}; PMDD severity ${d.cycle.pmdd}.${d.cycle.note?` Note: ${d.cycle.note}`:''}`,`Daily notes: ${d.notes||'None'}`);
  });
  lines.push('','## Suggested analysis request','Please identify patterns and changes from the recorded baseline, including possible relationships among symptoms, activity, delayed worsening, fluids, electrolyte use, vital readings, sleep, and cycle entries. Separate: (1) direct observations, (2) possible explanations requiring confirmation, (3) missing information and data-quality limitations, and (4) questions worth discussing with a healthcare professional. Do not diagnose a condition or recommend treatment changes.');
  download(lines.join('\n'),`autonomic-tracker-ai-export-${iso()}.md`,'text/markdown');
}

export default function App(){
  const[tab,setTab]=useState('Today');const[date,setDate]=useState(iso());const[day,setDay]=useState<RecordDay>(blank());const[days,setDays]=useState<RecordDay[]>([]);const[saved,setSaved]=useState('');const[faves,setFaves]=useState<string[]>(()=>JSON.parse(localStorage.getItem('favorites')||JSON.stringify(favoriteDefault)));const[open,setOpen]=useState<string[]>([]);
  const loadAll=async()=>setDays((await getAllDays()).map(normalizeDay));
  useEffect(()=>{getDay(date).then(v=>setDay(v?normalizeDay(v):blank(date)));loadAll()},[date]);
  useEffect(()=>{const t=setTimeout(()=>saveDay({...day,updatedAt:new Date().toISOString()}).then(()=>{setSaved('Saved');loadAll()}).catch(()=>setSaved('Save failed')),500);return()=>clearTimeout(t)},[day]);
  const patch=(p:Partial<RecordDay>)=>setDay(d=>({...d,...p}));
  const sev=(name:string)=>day.symptoms[name]?.severity||0;
  const setSym=(name:string,severity:Severity)=>setDay(d=>({...d,symptoms:{...d.symptoms,[name]:{severity,note:d.symptoms[name]?.note||''}}}));
  const toggleFav=(n:string)=>{const next=faves.includes(n)?faves.filter(x=>x!==n):faves.length<12?[...faves,n]:faves;setFaves(next);localStorage.setItem('favorites',JSON.stringify(next))};
  const renderSym=(name:string)=><div className="sym" key={name}><div className="sym-title"><button className={'star '+(faves.includes(name)?'on':'')} onClick={()=>toggleFav(name)} aria-label="Pin symptom">★</button><span>{name}</span></div><div className="severity">{symptomLabel.map((x,i)=><button key={x} className={sev(name)===i?'selected':''} onClick={()=>setSym(name,i as Severity)}>{x}</button>)}</div>{sev(name)>0&&<input className="note" placeholder="Optional note" value={day.symptoms[name]?.note||''} onChange={e=>setDay(d=>({...d,symptoms:{...d.symptoms,[name]:{severity:sev(name),note:e.target.value}}}))}/>}</div>;
  const setVital=(index:number,key:keyof VitalReading,value:string)=>setDay(d=>{const vitals=d.measurements.vitals.map((v,i)=>i===index?{...v,[key]:value}:v);return {...d,measurements:{...d.measurements,vitals}}});
  const rows=()=>{const out:(string|number)[][]=[['Date','Status','Burden','Energy','Upright','Sleep','Weight','Fluid','Urine','Urinations','Electrolyte packet','BP','Heart rate','Temperature','Vital readings','Physical','Cognitive','Social/Sensory','Delayed worsening','Cycle day','Cycle phase','PMDD','Daily notes','Symptoms']];days.forEach(d=>out.push([d.date,d.status,d.burden,d.energy,d.upright,d.sleep,d.measurements.weight,d.measurements.fluid,d.measurements.urine,d.measurements.urinations,d.measurements.electrolyte?'Yes':'No',d.measurements.bp,d.measurements.heartRate,d.measurements.temperature,d.measurements.vitals.filter(v=>v.time||v.bp||v.heartRate||v.temperature||v.context).map(v=>`${v.time||'no time'} | BP ${v.bp||'-'} | HR ${v.heartRate||'-'} | Temp ${v.temperature||'-'} ${d.measurements.tempUnit} | ${v.context||'-'}`).join('; '),d.activity.physical,d.activity.cognitive,d.activity.social,d.activity.delayed,d.cycle.day,d.cycle.phase,d.cycle.pmdd,d.notes,Object.entries(d.symptoms).filter(([,v])=>v.severity>0).map(([k,v])=>`${k}:${symptomLabel[v.severity]}${v.note?' ('+v.note+')':''}`).join('; ')]));return out};
  const csv=()=>download(rows().map(r=>r.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\n'),'autonomic-daily.csv','text/csv');
  const backup=()=>download(JSON.stringify(days,null,2),'autonomic-daily-backup.json','application/json');
  const importFile=async(f?:File)=>{if(!f)return;const parsed=JSON.parse(await f.text());if(!Array.isArray(parsed))throw new Error('Invalid backup');await importDays(parsed.map(normalizeDay));await loadAll();alert('Backup imported')};
  const flags=baselineFlags(days);
  return <div className="app"><header><div><h1>Autonomic Daily</h1><small>Private, local-first symptom log</small></div><span className="saved">{saved}</span></header><main>
  {tab==='Today'&&<><section className="card date"><label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></section><section className="card"><h2>Quick check-in</h2><div className="status">{['Better than usual','Typical','Worse than usual','Flare / Crash'].map(x=><button key={x} className={day.status===x?'selected':''} onClick={()=>patch({status:x})}>{x}</button>)}</div><FieldScore label="Overall symptom burden" value={day.burden} set={n=>patch({burden:n})}/><FieldScore label="Available energy" value={day.energy} set={n=>patch({energy:n})}/><FieldScore label="Upright tolerance" value={day.upright} set={n=>patch({upright:n})}/><FieldScore label="Sleep quality" value={day.sleep} set={n=>patch({sleep:n})}/></section><section className="card"><h2>Pinned symptoms</h2>{faves.map(renderSym)}</section><section className="card"><h2>All symptoms</h2>{Object.entries(catalog).map(([cat,list])=><div className="category" key={cat}><button className="category-head" onClick={()=>setOpen(o=>o.includes(cat)?o.filter(x=>x!==cat):[...o,cat])}>{cat}<span>{open.includes(cat)?'−':'+'}</span></button>{open.includes(cat)&&list.map(renderSym)}</div>)}</section>
  <section className="card"><h2>Measurements</h2><div className="grid">{([['weight','Weight'],['fluid','Fluid intake'],['urine','Urine output'],['urinations','Number of urinations'],['bp','Blood pressure'],['heartRate','Heart rate'],['temperature','Temperature']] as const).map(([k,l])=><label key={k}>{l}<input inputMode={k==='bp'?'text':'decimal'} value={day.measurements[k]} onChange={e=>setDay(d=>({...d,measurements:{...d.measurements,[k]:e.target.value}}))}/></label>)}</div><label className="check"><input type="checkbox" checked={Boolean(day.measurements.electrolyte)} onChange={e=>setDay(d=>({...d,measurements:{...d.measurements,electrolyte:e.target.checked}}))}/><span>Used one electrolyte packet today</span></label><div className="grid units"><label>Weight unit<select value={day.measurements.weightUnit} onChange={e=>setDay(d=>({...d,measurements:{...d.measurements,weightUnit:e.target.value}}))}><option>lb</option><option>kg</option></select></label><label>Fluid unit<select value={day.measurements.fluidUnit} onChange={e=>setDay(d=>({...d,measurements:{...d.measurements,fluidUnit:e.target.value}}))}><option>oz</option><option>mL</option></select></label><label>Temperature unit<select value={day.measurements.tempUnit} onChange={e=>setDay(d=>({...d,measurements:{...d.measurements,tempUnit:e.target.value}}))}><option>°F</option><option>°C</option></select></label></div></section>
  <section className="card"><h2>Vital readings</h2><p className="hint">Up to three optional readings. Leave unused slots blank.</p>{day.measurements.vitals.map((v,i)=><div className="vital" key={i}><h3>Reading {i+1}</h3><div className="grid"><label>Time<input type="time" value={v.time} onChange={e=>setVital(i,'time',e.target.value)}/></label><label>Blood pressure<input placeholder="Example: 102/68" value={v.bp} onChange={e=>setVital(i,'bp',e.target.value)}/></label><label>Heart rate<input inputMode="numeric" value={v.heartRate} onChange={e=>setVital(i,'heartRate',e.target.value)}/></label><label>Temperature<input inputMode="decimal" value={v.temperature} onChange={e=>setVital(i,'temperature',e.target.value)}/></label><label>Context<select value={v.context} onChange={e=>setVital(i,'context',e.target.value)}><option value="">Not recorded</option><option>Resting</option><option>Upright</option><option>After activity</option><option>Symptomatic</option><option>Other</option></select></label></div></div>)}</section>
  <section className="card"><h2>Activity and delayed effects</h2>{(['physical','cognitive','social'] as const).map(k=><label key={k}>{k==='social'?'Social / sensory':k[0].toUpperCase()+k.slice(1)} exertion<select value={day.activity[k]} onChange={e=>setDay(d=>({...d,activity:{...d.activity,[k]:e.target.value}}))}>{['None','Light','Moderate','High'].map(x=><option key={x}>{x}</option>)}</select></label>)}<label>Delayed worsening<select value={day.activity.delayed} onChange={e=>setDay(d=>({...d,activity:{...d.activity,delayed:e.target.value}}))}>{['None','Same day','Next day','Two to three days later'].map(x=><option key={x}>{x}</option>)}</select></label></section>
  <section className="card"><h2>Cycle pattern</h2><div className="grid"><label>Estimated cycle day<input inputMode="numeric" value={day.cycle.day} onChange={e=>setDay(d=>({...d,cycle:{...d.cycle,day:e.target.value}}))}/></label><label>Cycle phase<select value={day.cycle.phase} onChange={e=>setDay(d=>({...d,cycle:{...d.cycle,phase:e.target.value}}))}>{['Unknown','Follicular','Ovulatory','Luteal'].map(x=><option key={x}>{x}</option>)}</select></label><label>PMDD severity<select value={day.cycle.pmdd} onChange={e=>setDay(d=>({...d,cycle:{...d.cycle,pmdd:e.target.value}}))}>{['None','Mild','Moderate','Severe'].map(x=><option key={x}>{x}</option>)}</select></label></div><textarea placeholder="Cycle notes" value={day.cycle.note} onChange={e=>setDay(d=>({...d,cycle:{...d.cycle,note:e.target.value}}))}/></section><section className="card"><h2>Daily notes</h2><textarea value={day.notes} onChange={e=>patch({notes:e.target.value})}/></section></>}
  {tab==='History'&&<section className="card"><h2>History</h2>{days.length?days.slice().reverse().map(d=><button key={d.date} className="history" onClick={()=>{setDate(d.date);setTab('Today')}}><b>{d.date}</b><span>{d.status} · burden {d.burden}/5</span></button>):<p>No records yet.</p>}</section>}
  {tab==='Trends'&&<><section className="card"><h2>Changes from your recent baseline</h2><p className="hint">Observational only. Flags compare the latest three recorded days with up to 14 earlier days and require enough recorded data.</p>{flags.length?flags.map(f=><div className="flag" key={f.label}><strong>{f.label}</strong><span>{f.detail}</span></div>):<p>No notable changes detected, or there is not enough data yet.</p>}<p className="disclaimer">These flags cannot identify a cause or diagnose an illness. Review new, worsening, or concerning changes with a healthcare professional.</p></section><MiniChart label="Symptom burden, last 30 entries" days={days} keyName="burden" color="#a43f55"/><MiniChart label="Energy, last 30 entries" days={days} keyName="energy" color="#2f6f68"/><section className="card"><h3>Recorded totals</h3><p>{days.length} daily records · {days.reduce((n,d)=>n+Object.values(d.symptoms).filter(x=>x.severity>0).length,0)} symptom observations</p></section></>}
  {tab==='Export'&&<section className="card"><h2>Export and backup</h2><p>Your entries are stored in this browser on this device. Export backups regularly.</p><button className="primary" onClick={csv}>Download CSV</button><button className="primary" onClick={()=>aiExport(days)}>Export for AI review</button><button className="primary" onClick={()=>window.print()}>Print / Save as PDF</button><button onClick={backup}>Download JSON backup</button><label className="file">Import JSON backup<input type="file" accept="application/json" onChange={e=>importFile(e.target.files?.[0]).catch(()=>alert('Could not import this file'))}/></label><hr/><p><b>AI export privacy:</b> Review the Markdown file before uploading it because it may contain sensitive health notes.</p><p className="disclaimer">This report contains user-entered observations and is not a medical diagnosis.</p></section>}
  </main><nav>{['Today','History','Trends','Export'].map(x=><button key={x} className={tab===x?'active':''} onClick={()=>setTab(x)}>{x}</button>)}</nav></div>;
}

