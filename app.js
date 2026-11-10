/* San Diego Water portfolio: use + contamination + connection + action.
   Data: SD_DATA (sd-water-data.js, water use), COND / COND_LAKES (sd-conductivity-data.js). */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const NS='http://www.w3.org/2000/svg';
const el=(t,a={},p)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e};
const fmt=n=>Math.round(n).toLocaleString();
const median=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const monthName=ym=>MONTHS[+ym.slice(5,7)-1];
const ymLabel=iso=>MONTHS[+iso.slice(5,7)-1]+' '+iso.slice(0,4);
const INDOOR_STD=47; // gal/person/day, California indoor residential standard from 2025 (AB 1668 / SB 606)
const TILES='https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const ATTR='Tiles © Esri — Esri, HERE, Garmin, OpenStreetMap contributors';
const mkMap=(id,view,zoom)=>{const m=L.map(id,{scrollWheelZoom:false,zoomSnap:.25}).setView(view,zoom);
  L.tileLayer(TILES,{attribution:ATTR,maxZoom:13}).addTo(m);
  m.on('focus',()=>m.scrollWheelZoom.enable());m.on('blur',()=>m.scrollWheelZoom.disable());return m};

/* ====================== DATA PREP ====================== */
const SUP=Object.values(SD_DATA.suppliers);
const SECTORS=[{k:'res',n:'Residential (homes & apartments)',c:'#1f78b4'},{k:'cii',n:'Commercial, industrial & institutional',c:'#f0a030'},{k:'irr',n:'Landscape irrigation (dedicated meters)',c:'#4caf6b'},{k:'ag',n:'Agriculture',c:'#b5651d'},{k:'oth',n:'Other',c:'#8e6bbf'}];
const okSect=SUP.filter(s=>s.sectorsMG);
const COUNTY_SECT={};SECTORS.forEach(x=>COUNTY_SECT[x.k]=okSect.reduce((a,s)=>a+s.sectorsMG[x.k],0));
const popTotal=SUP.reduce((a,s)=>a+s.pop,0), afTotal=okSect.reduce((a,s)=>a+s.demandAF,0);
const rOK=SUP.filter(s=>s.rgpcd!=null);
const countyR=rOK.reduce((a,s)=>a+s.rgpcd*s.pop,0)/rOK.reduce((a,s)=>a+s.pop,0);
const per=(()=>{const a=SUP.map(s=>s.period[0]).sort(),b=SUP.map(s=>s.period[1]).sort();return ymLabel(a[a.length-1])+' – '+ymLabel(b[0])})();
const hiS=rOK.reduce((a,b)=>b.rgpcd>a.rgpcd?b:a), loS=rOK.reduce((a,b)=>b.rgpcd<a.rgpcd?b:a);
const sectTot=Object.values(COUNTY_SECT).reduce((a,b)=>a+b,0);
const resShare=Math.round(COUNTY_SECT.res/sectTot*100), irrShare=COUNTY_SECT.irr/sectTot*100;
function countyMonthly(){const m={};rOK.forEach(s=>s.monthly.forEach(x=>{if(x.rgpcd==null)return;(m[x.m]=m[x.m]||{w:0,v:0});m[x.m].w+=s.pop;m[x.m].v+=x.rgpcd*s.pop}));return Object.keys(m).sort().map(k=>({m:k,rgpcd:m[k].v/m[k].w}))}
const CM=countyMonthly(), summerBump=Math.round((Math.max(...CM.map(d=>d.rgpcd))/Math.min(...CM.map(d=>d.rgpcd))-1)*100);

/* conductivity bins */
const BINS=[[0,500,'#2b8cbe','Low (under 500)','Low'],[500,1500,'#7fcdbb','Typical (500–1,500)','Typical'],[1500,5000,'#fdc75b','Elevated (1,500–5,000)','Elevated'],[5000,20000,'#e4572e','High / brackish (5,000–20,000)','High'],[20000,1e9,'#6a3d9a','Ocean / tidal (over 20,000)','Ocean/tidal']];
const bin=v=>BINS.find(b=>v>=b[0]&&v<b[1])||BINS[4], colorFor=v=>bin(v)[2];
const lightTag=c=>c==='#fdc75b'||c==='#7fcdbb'?';color:#222':'';
const inlandCreek=COND.filter(d=>!d[3]&&d[4]<20000&&d[5]>=3);
const pctElev=Math.round(inlandCreek.filter(d=>d[4]>=1500).length/inlandCreek.length*100);
const runoffMed=median(COND.filter(d=>d[3]===1&&d[4]<20000&&d[5]>=1).map(d=>d[4]));
const creekMed=median(COND.filter(d=>!d[3]&&d[4]<20000&&d[5]>=1).map(d=>d[4]));

/* hero stats */
$('#h1').textContent=Math.round(countyR);
$('#h2').textContent=(hiS.rgpcd/loS.rgpcd).toFixed(1)+'×';
$('#h3').textContent=pctElev+'%';
$('#nSup').textContent=SUP.length;
(()=>{const f=SUP.filter(s=>s.suspect).map(s=>s.name).join(' and ');$('#flagTxt').textContent=f?`${f} report sector figures that fail basic checks, so their residential and sector figures are hidden. Cal-Am's boundary outlines only Coronado while its data covers its whole San Diego district.`:''})();

/* hero animation */
(function(){const c=$('#heroCanvas'),x=c.getContext('2d');let w,h,t=0;const rs=()=>{w=c.width=c.clientWidth;h=c.height=c.clientHeight};rs();addEventListener('resize',rs);
 (function f(){x.clearRect(0,0,w,h);t+=reduceMotion?0:.012;for(let k=0;k<5;k++){x.beginPath();x.moveTo(0,h);for(let i=0;i<=w;i+=12)x.lineTo(i,h*(.62+k*.07)+Math.sin(i/180+t*(1+k*.25)+k)*16);x.lineTo(w,h);x.closePath();x.fillStyle='rgba(255,255,255,'+(.04+k*.012)+')';x.fill()}requestAnimationFrame(f)})()})();

/* ====================== PART 1: WATER USE ====================== */
$('#ustats').innerHTML=`
 <div class="ustat"><b>${SUP.length}</b><span>water districts in the dataset</span></div>
 <div class="ustat"><b>${(popTotal/1e6).toFixed(1)} million</b><span>people served</span></div>
 <div class="ustat"><b>${Math.round(countyR)} gal</b><span>avg residential use / person / day (population-weighted)</span></div>
 <div class="ustat"><b>${(afTotal/1000).toFixed(0)}k</b><span>acre-feet/yr of reported potable demand</span></div>`;
$('#mapSub').textContent=`Each district is shaded by its use over the most recent 12 reported months (about ${per}). Residential use per person ranges from about ${Math.round(loS.rgpcd)} to ${Math.round(hiS.rgpcd)} gallons a day. Click a district for details.`;

const umap=mkMap('umap',[33.0,-116.95],9);
L.geoJSON(SD_DATA.context,{style:{color:'#9aa8b0',weight:1,fillColor:'#c9d3d9',fillOpacity:.35},onEachFeature:(f,l)=>l.bindTooltip(f.properties.name+' (not in urban supplier dataset)',{sticky:true})}).addTo(umap);
const RAMP=['#eaf4fb','#a9d3ec','#5aa9d6','#1f78b4','#08306b'];
const hx=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16));
function ramp(t){t=Math.max(0,Math.min(1,t))*(RAMP.length-1);const i=Math.min(Math.floor(t),RAMP.length-2),f=t-i,a=hx(RAMP[i]),b=hx(RAMP[i+1]);return 'rgb('+a.map((v,j)=>Math.round(v+(b[j]-v)*f)).join(',')+')'}
let metric='rgpcd',selected=null,ulayer,DLAYER={};
const range=()=>{const v=SUP.map(s=>s[metric]).filter(x=>x!=null);return [Math.min(...v),Math.max(...v)]};
function styleFor(f){const s=SD_DATA.suppliers[f.properties.sid],v=s[metric],[lo,hi]=range(),sel=selected===s,base={weight:sel?3:1,color:sel?'#e4572e':'#fff',fillOpacity:.82};
  return v==null?{...base,fillColor:'#bbb',dashArray:'4 3',fillOpacity:.55}:{...base,fillColor:ramp((v-lo)/(hi-lo))}}
function drawULayer(){if(ulayer)umap.removeLayer(ulayer);DLAYER={};
  ulayer=L.geoJSON(SD_DATA.boundaries,{style:styleFor,onEachFeature:(f,l)=>{const sid=f.properties.sid,s=SD_DATA.suppliers[sid],v=s[metric];(DLAYER[sid]=DLAYER[sid]||[]).push(l);
    l.bindTooltip(`<b>${s.name}</b><br>${v==null?'residential split flagged':Math.round(v)+' gal/person/day'}`,{sticky:true});l.on('click',()=>selectSupplier(s))}}).addTo(umap);
  const [lo,hi]=range();$('#lgLo').textContent=Math.round(lo)+' gal';$('#lgHi').textContent=Math.round(hi)+' gal'}
$$('#metricToggle button').forEach(b=>b.onclick=()=>{$$('#metricToggle button').forEach(x=>x.classList.toggle('on',x===b));metric=b.dataset.m;drawULayer();drawRankBars()});

/* point-in-polygon: creek stations per district */
function pip(x,y,ring){let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c}
function inside(x,y,g){const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;return polys.some(p=>pip(x,y,p[0])&&!p.slice(1).some(h=>pip(x,y,h)))}
const DIST={};
SD_DATA.boundaries.features.forEach(f=>{const sid=f.properties.sid,d=DIST[sid]=DIST[sid]||{creek:[],run:[]};
  COND.forEach(c=>{if(c[4]>=20000||c[4]<20)return;if(inside(c[1],c[0],f.geometry))(c[3]?d.run:d.creek).push(c[4])})});
const sidOf=s=>Object.keys(SD_DATA.suppliers).find(k=>SD_DATA.suppliers[k]===s);

function selectSupplier(s){selected=s;ulayer.setStyle(styleFor);if(s)(DLAYER[sidOf(s)]||[]).forEach(l=>l.bringToFront());showDetail(s);drawRankBars();drawScatter()}
function showDetail(s){const d=$('#detail');
  if(!s){d.innerHTML=`<h3>Click a district</h3><p>The map shows the ${SUP.length} urban water suppliers San Diego County reports to the State Water Board. Click one to see its numbers, its sector mix and its month-by-month use.</p><p class="note">Higher use per person tends to be where lots and yards are bigger and summers are hotter, mostly in inland districts.</p>`;drawPie(COUNTY_SECT,'County');drawBars(null);return}
  const dr=s.rgpcd==null?'':` (${s.rgpcd>=countyR?Math.round((s.rgpcd/countyR-1)*100)+'% above':Math.round((1-s.rgpcd/countyR)*100)+'% below'} the county average of ${Math.round(countyR)})`;
  const dd=DIST[sidOf(s)],cm=dd&&dd.creek.length?median(dd.creek):null;
  d.innerHTML=`<h3>${s.name}</h3>
   <div class="big">${s.rgpcd==null?'—':Math.round(s.rgpcd)}<span> residential gal / person / day${dr}</span></div>
   <p style="margin:2px 0"><b>${Math.round(s.tgpcd)}</b> gal / person / day total supplied &nbsp;·&nbsp; <b>${fmt(s.pop)}</b> people</p>
   <p style="margin:2px 0">${s.demandAF==null?'':`<b>${fmt(s.demandAF)}</b> acre-feet/yr reported demand (≈ ${fmt(s.demandAF*325851/1e6)} million gallons)`}</p>
   ${s.rgpcd!=null&&s.rgpcd>INDOOR_STD?`<p style="margin:8px 0 2px"><b>${Math.round(s.rgpcd-INDOOR_STD)} gal</b> per person per day above the state's ${INDOOR_STD}-gallon indoor standard, a rough measure of outdoor use and leaks.</p>`:''}
   <p style="margin:8px 0 2px">${cm==null?'No creek monitoring stations in this district in our data.':`Creek stations inside this district: median <b>${fmt(cm)} µS/cm</b> conductivity (${dd.creek.length} stations, <span class="tag" style="background:${colorFor(cm)}${lightTag(colorFor(cm))}">${bin(cm)[4]}</span>).`}</p>
   ${cm==null?'':`<button class="btn alt" id="seeCreeks" style="margin-top:6px">See these creeks on the map ↓</button>`}
   ${s.suspect?`<div class="warn">⚠ <b>Flagged:</b> ${s.suspect} Residential and sector figures are hidden for this district.</div>`:''}
   ${s.name.startsWith('California American')?'<div class="warn">The state’s boundary layer outlines only the Coronado area for this system, while the usage data covers Cal-Am’s whole San Diego district.</div>':''}
   <p class="note">Data period ${ymLabel(s.period[0])} – ${ymLabel(s.period[1])}.</p>`;
  const b=$('#seeCreeks');if(b)b.onclick=()=>{$('#contam').scrollIntoView();setTimeout(()=>{const g=L.featureGroup(DLAYER[sidOf(s)]);cmap.fitBounds(g.getBounds(),{maxZoom:11})},500)};
  s.sectorsMG?drawPie(s.sectorsMG,s.name):drawPie(COUNTY_SECT,'County',s.name);drawBars(s)}

function drawPie(mix,label,flagged){const svg=$('#pie');svg.innerHTML='';const tot=SECTORS.reduce((a,x)=>a+mix[x.k],0);let ang=-Math.PI/2;const ul=$('#pieLegend');ul.innerHTML='';
  SECTORS.forEach(x=>{const v=mix[x.k];if(v<=0)return;const a2=ang+v/tot*2*Math.PI-1e-6,large=a2-ang>Math.PI?1:0,p=[100+90*Math.cos(ang),100+90*Math.sin(ang),100+90*Math.cos(a2),100+90*Math.sin(a2)];
    const path=el('path',{d:`M100 100 L${p[0]} ${p[1]} A90 90 0 ${large} 1 ${p[2]} ${p[3]} Z`,fill:x.c,stroke:'#fff','stroke-width':1.5,class:'slice'},svg);
    const li=document.createElement('li'),pct=v/tot*100;li.innerHTML=`<span class="sw" style="background:${x.c}"></span>${x.n}<span class="pct">${pct<1?'<1':Math.round(pct)}%</span>`;
    const on=f=>{path.classList.toggle('hl',f);li.classList.toggle('hl',f)};path.onmouseenter=li.onmouseenter=()=>on(true);path.onmouseleave=li.onmouseleave=()=>on(false);ul.appendChild(li);ang=a2+1e-6});
  el('circle',{cx:100,cy:100,r:38,fill:getComputedStyle(document.body).getPropertyValue('--card')||'#fff'},svg);
  const t=el('text',{x:100,y:97,'text-anchor':'middle','font-size':8.5,fill:'#5b7480'},svg);t.textContent=fmt(tot/1000)+'k';
  const t2=el('text',{x:100,y:108,'text-anchor':'middle','font-size':7,fill:'#5b7480'},svg);t2.textContent='million gal/yr';
  $('#whoTitle').textContent=label==='County'?'Where the water goes (county-wide)':'Where the water goes: '+label;
  $('#pieNote').innerHTML=(flagged?`<b>${flagged}</b> has flagged sector data, so the county mix is shown instead.<br>`:'')+`Potable water only; recycled water and unaccounted losses are not included. Landscape irrigation on dedicated meters is ${irrShare.toFixed(0)}% county-wide, and much outdoor use also runs through residential meters.`}

function drawBars(s){const svg=$('#bars');svg.innerHTML='';const has=s&&s.monthly.some(x=>x.rgpcd!=null),data=has?s.monthly:CM,title=has?s.name:'County average (population-weighted)',vals=data.map(d=>d.rgpcd).filter(v=>v!=null);
  const mx=Math.max(Math.max(...vals),INDOOR_STD)*1.15,W=700,H=220,Lm=40,B=28,bw=(W-Lm-10)/data.length,yOf=v=>H-B-(H-B-24)*v/mx;
  [0,.5,1].forEach(f=>{const y=yOf(mx*f);el('line',{x1:Lm,x2:W-5,y1:y,y2:y,stroke:'#cdd9e0','stroke-opacity':.5},svg);el('text',{x:Lm-6,y:y+3,'text-anchor':'end','font-size':10,fill:'#5b7480'},svg).textContent=Math.round(mx*f)});
  el('text',{x:Lm,y:14,'font-size':12,'font-weight':600,fill:'currentColor'},svg).textContent=title;
  data.forEach((d,i)=>{if(d.rgpcd==null)return;const x=Lm+i*bw+4,h=H-B-yOf(d.rgpcd)+0;const hh=(H-B-24)*d.rgpcd/mx;
    const r=el('rect',{x,y:H-B-hh,width:bw-8,height:hh,rx:3,fill:'#1f78b4'},svg);el('title',{},r).textContent=`${monthName(d.m)} ${d.m.slice(0,4)}: ${Math.round(d.rgpcd)} gal/person/day`;
    el('text',{x:x+(bw-8)/2,y:H-B-hh-4,'text-anchor':'middle','font-size':9,fill:'currentColor'},svg).textContent=Math.round(d.rgpcd);
    el('text',{x:x+(bw-8)/2,y:H-10,'text-anchor':'middle','font-size':10,fill:'#5b7480'},svg).textContent=monthName(d.m)});
  const ys=yOf(INDOOR_STD);el('line',{x1:Lm,x2:W-5,y1:ys,y2:ys,stroke:'#e4572e','stroke-width':1.6,'stroke-dasharray':'5 4'},svg);
  el('text',{x:W-8,y:ys-4,'text-anchor':'end','font-size':10,fill:'#e4572e'},svg).textContent='State indoor standard: '+INDOOR_STD;
  const hi=Math.max(...vals),lo=Math.min(...vals);$('#barNote').textContent=`Peak month is ${Math.round((hi/lo-1)*100)}% higher than the lowest month. Click a district on the map to see its pattern.`}

function drawRankBars(){const rows=SUP.filter(s=>s[metric]!=null).sort((a,b)=>b[metric]-a[metric]),mx=Math.max(INDOOR_STD*1.1,rows[0][metric]),box=$('#rankbars');box.innerHTML='';
  rows.forEach(s=>{const r=document.createElement('div');r.className='row'+(selected===s?' sel':'');r.tabIndex=0;r.innerHTML=`<span>${s.name.replace(/ (Municipal )?Water( District| Company)?| Authority| Irrigation District| Public Utility District/,'').replace('California American','Cal-Am')}</span><div class="trk"><b style="width:${s[metric]/mx*100}%"></b>${metric==='rgpcd'?`<i style="left:${INDOOR_STD/mx*100}%" title="State indoor standard"></i>`:''}</div><span class="v">${Math.round(s[metric])}</span>`;
    r.onclick=()=>selectSupplier(s);r.onkeydown=e=>{if(e.key==='Enter')selectSupplier(s)};box.appendChild(r)})}

/* ====================== PART 2: CONTAMINATION ====================== */
const REFS=[['Distilled water',5,'Almost no dissolved material. Barely conducts electricity.'],['Rainwater',30,'Very pure. Rain only picks up salts after it hits the ground.'],['Mountain stream',250,'Clean headwaters, like the upper Sweetwater River (about 300).'],['Typical tap water',900,'Roughly where much Southern California tap water falls. Safe, but carries dissolved minerals.'],['Salty creek',4200,'Like the Sweetwater River in Chula Vista (about 4,200 in 2016). Too salty for many freshwater animals and for irrigation.'],['Seawater',52000,'The ocean. Natural, and a benchmark: anything freshwater approaching this has lost its freshwater character.']];
const sl=$('#cslider'),hiLog=Math.log10(60000),toVal=p=>Math.pow(10,hiLog*p/1000),toPos=v=>Math.log10(v)/hiLog*1000;
REFS.forEach(r=>{const b=document.createElement('button');b.textContent=r[0];b.onclick=()=>{sl.value=toPos(r[1]);upd()};$('#refs').appendChild(b)});
const gx=$('#glass').getContext('2d'),ions=Array.from({length:300},()=>({x:Math.random()*280,y:70+Math.random()*290,vx:(Math.random()-.5)*.9,vy:(Math.random()-.5)*.9,t:Math.random()<.5}));let cur=500;
function upd(){cur=toVal(+sl.value);$('#cval').textContent=cur<10?cur.toFixed(1):fmt(cur);$('#marker').style.left=(+sl.value/10)+'%';
  let t=REFS[0],best=1e9;REFS.forEach(r=>{const d=Math.abs(Math.log(r[1]/cur));if(d<best){best=d;t=r}});$$('#refs button').forEach((b,i)=>b.classList.toggle('on',REFS[i]===t&&best<.5));
  const m=cur<100?'Very pure water with few dissolved salts.':cur<1500?'In the normal range for freshwater in our region.':cur<5000?'Elevated. Salts are building up, as in creeks that receive runoff or wastewater.':cur<20000?'Brackish, like where a river meets the sea.':'Ocean-strength salinity.';
  $('#verdict').innerHTML='<b>'+m+'</b>'+(best<.5?'<br>'+t[0]+': '+t[2]:'')}
sl.oninput=upd;upd();
(function f(){gx.clearRect(0,0,280,374);gx.fillStyle='#cfe8f4';gx.fillRect(0,50,280,324);const k=Math.min(1,Math.log10(1+cur)/hiLog),n=Math.round(300*k);
  for(let i=0;i<n;i++){const p=ions[i];if(!reduceMotion){p.x+=p.vx;p.y+=p.vy;if(p.x<6||p.x>274)p.vx*=-1;if(p.y<58||p.y>366)p.vy*=-1}gx.fillStyle=p.t?'#e4572e':'#06344d';gx.beginPath();gx.arc(p.x,p.y,4,0,7);gx.fill()}
  gx.strokeStyle='#555';gx.lineWidth=4;gx.beginPath();gx.moveTo(80,0);gx.lineTo(80,140);gx.moveTo(200,0);gx.lineTo(200,140);gx.stroke();
  gx.strokeStyle='rgba(255,190,0,'+(.2+.8*k)+')';gx.lineWidth=1+3.5*k;gx.beginPath();gx.moveTo(80,120);for(let x=90;x<200;x+=10)gx.lineTo(x,120+(Math.random()-.5)*18*k);gx.lineTo(200,120);gx.stroke();
  gx.fillStyle='#06344d';gx.font='12px system-ui';gx.fillText('● Na⁺/Ca²⁺',10,18);gx.fillStyle='#e4572e';gx.fillText('● Cl⁻/SO₄²⁻',10,34);requestAnimationFrame(f)})();

const YEARS=[];for(let y=2010;y<=2026;y++)YEARS.push(y);
const cmap=mkMap('cmap',[32.95,-116.9],9);
let view='dots',yi=0,clayer=L.layerGroup().addTo(cmap),lakeLayer=L.layerGroup().addTo(cmap),heat=null;
const val=d=>yi===0?d[4]:d[7][YEARS[yi-1]];
const visible=d=>{const v=val(d);if(v==null)return false;if(v>=20000&&!$('#fSea').checked)return false;return d[3]?$('#fRun').checked:$('#fShow').checked};
function spark(yrs){const k=Object.keys(yrs).sort();if(k.length<2)return '';const mx=Math.max(...k.map(y=>yrs[y]));return '<div class="bars" style="height:40px;margin:6px 0 2px">'+k.map(y=>`<b title="${y}: ${fmt(yrs[y])}" style="height:${Math.max(6,yrs[y]/mx*100)}%;background:${colorFor(yrs[y])}"></b>`).join('')+`</div><small>${k[0]} → ${k[k.length-1]} (yearly averages)</small>`}
function pop(d){const v=val(d),b=bin(v);return `<b>${d[2]}</b><br>${yi===0?'Average':YEARS[yi-1]}: <b>${fmt(v)} µS/cm</b> <span class="tag" style="background:${b[2]}${lightTag(b[2])}">${b[4]}</span><br><small>${d[5]} measurements · max ${fmt(d[6])} · ${d[3]?'storm-drain runoff':'receiving water'}</small>${spark(d[7])}`}
function drawLakes(){lakeLayer.clearLayers();if(!$('#fLake').checked)return;
  COND_LAKES.lakes.forEach(l=>{const v=yi===0?l.mean:l.yrs[YEARS[yi-1]];if(v==null)return;const m=L.circleMarker([l.lat,l.lon],{radius:11,color:colorFor(v),weight:5,fillColor:'#fff',fillOpacity:.95});
    m.bindTooltip(l.name,{permanent:cmap.getZoom()>=10,direction:'top',className:'lakeLabel',offset:[0,-8]});
    m.bindPopup(`<b>🏞️ ${l.name}</b><br>${yi===0?'Average':YEARS[yi-1]}: <b>${fmt(v)} µS/cm</b><br><small>${l.n.toLocaleString()} measurements · source: ${l.src}</small>${spark(l.yrs)}`);lakeLayer.addLayer(m)});
  if(yi===0)COND_LAKES.gaps.forEach(g=>{const m=L.circleMarker([g[1],g[2]],{radius:10,color:'#7a8a96',weight:3,dashArray:'3 4',fillColor:'#fff',fillOpacity:.6});m.bindTooltip(g[0],{permanent:cmap.getZoom()>=10,direction:'top',className:'lakeLabel',offset:[0,-8]});m.bindPopup(`<b>🏞️ ${g[0]}</b><br>No conductivity data in this dataset.`);lakeLayer.addLayer(m)})}
function drawCond(){clayer.clearLayers();if(heat){cmap.removeLayer(heat);heat=null}let n=0,pts=[];
  COND.forEach(d=>{if(!visible(d))return;n++;const v=val(d);
    if(view==='dots'){const m=L.circleMarker([d[0],d[1]],{radius:5.5,color:'#fff',weight:1,fillColor:colorFor(v),fillOpacity:.92});m.bindPopup(()=>pop(d));clayer.addLayer(m)}
    else pts.push([d[0],d[1],Math.min(1,Math.log10(1+v)/hiLog)**2.2])});
  if(view==='heat')heat=L.heatLayer(pts,{radius:22,blur:20,maxZoom:11,max:.55,gradient:{.2:'#2b8cbe',.4:'#7fcdbb',.55:'#fdc75b',.8:'#e4572e',1:'#6a3d9a'}}).addTo(cmap);
  drawLakes();$('#mapcount').textContent=n.toLocaleString()+' stations shown'+(yi?' for '+YEARS[yi-1]:' (all years averaged)')+'.'}
$('#clegend').innerHTML=BINS.map(b=>`<span><i style="background:${b[2]}"></i>${b[3]}</span>`).join('');
$$('#viewSeg button').forEach(b=>b.onclick=()=>{$$('#viewSeg button').forEach(x=>x.classList.remove('on'));b.classList.add('on');view=b.dataset.v;drawCond()});
['fShow','fRun','fSea','fLake'].forEach(i=>$('#'+i).onchange=drawCond);cmap.on('zoomend',drawLakes);
const yr=$('#yr');yr.max=YEARS.length;
function setYear(i){yi=i;yr.value=i;$('#yearLabel').textContent=i===0?'All years (average)':YEARS[i-1];drawCond()}
yr.oninput=()=>setYear(+yr.value);let timer=null;
$('#play').onclick=()=>{if(timer){clearInterval(timer);timer=null;$('#play').textContent='▶ Play years';return}$('#play').textContent='⏸ Pause';let i=yi===0||yi>=YEARS.length?1:yi+1;setYear(i);timer=setInterval(()=>{i++;if(i>YEARS.length)i=1;setYear(i)},1100)};
drawCond();
const hav=(a,b,c,d)=>{const r=Math.PI/180,x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 12742*Math.asin(Math.sqrt(x))};
$('#near').onclick=()=>{if(!navigator.geolocation){alert('Location is not available in this browser.');return}
  navigator.geolocation.getCurrentPosition(p=>{const la=p.coords.latitude,lo=p.coords.longitude,list=COND.filter(d=>d[4]<20000).map(d=>({d,km:hav(la,lo,d[0],d[1])})).sort((a,b)=>a.km-b.km).slice(0,5);
    $('#nearCard').hidden=false;$('#nearList').innerHTML=list.map(x=>{const b=bin(x.d[4]);return `<li><b>${x.d[2]}</b><br>${x.km.toFixed(1)} km away · ${fmt(x.d[4])} µS/cm <span class="tag" style="background:${b[2]}${lightTag(b[2])}">${b[4]}</span></li>`}).join('');
    cmap.flyTo([la,lo],12);L.circleMarker([la,lo],{radius:8,color:'#fff',weight:3,fillColor:'#0a6f86',fillOpacity:1}).addTo(cmap).bindTooltip('You are here')},()=>alert('We could not get your location. You can still browse the map.'))};

/* lakes grid */
(function(){const g=$('#lakeGrid');
  g.innerHTML=COND_LAKES.lakes.map(l=>{const b=bin(l.mean),k=Object.keys(l.yrs).sort(),mx=Math.max(...k.map(y=>l.yrs[y]));
    return `<div class="card lake" data-la="${l.lat}" data-lo="${l.lon}" tabindex="0" role="button"><h3>${l.name}</h3><div class="v" style="color:${lightTag(b[2])?'var(--ink)':b[2]}">${fmt(l.mean)} <small style="font:400 .8rem system-ui;color:var(--mut)">µS/cm · ${b[4]}</small></div><div class="note">${l.n.toLocaleString()} measurements · ${l.src}</div>${k.length>1?`<div class="bars">${k.map(y=>`<b title="${y}: ${fmt(l.yrs[y])}" style="height:${Math.max(8,l.yrs[y]/mx*100)}%;background:${colorFor(l.yrs[y])}"></b>`).join('')}</div><div class="note">${k[0]}–${k[k.length-1]}</div>`:`<div class="note">single sampling period (${k.join(', ')})</div>`}</div>`}).join('')+
   COND_LAKES.gaps.map(x=>`<div class="card lake gap" data-la="${x[1]}" data-lo="${x[2]}" tabindex="0" role="button"><h3>${x[0]}</h3><div class="note">No conductivity data in this dataset</div></div>`).join('');
  g.querySelectorAll('.lake').forEach(c=>{const go=()=>{$('#cmap').scrollIntoView({block:'center'});setTimeout(()=>cmap.flyTo([+c.dataset.la,+c.dataset.lo],12),450)};c.onclick=go;c.onkeydown=e=>{if(e.key==='Enter')go()}})})();

/* ranking table */
let rtype=0;
function rank(){const rows=COND.filter(d=>d[3]===rtype&&d[4]<5000&&d[5]>=3&&!/estuar|lagoon|bay|beach|surf|outfall|mouth/i.test(d[2])).sort((a,b)=>b[4]-a[4]).slice(0,15),mx=rows[0]?rows[0][4]:1;
  $('#rankBody').innerHTML=rows.map((d,i)=>`<tr tabindex="0" data-i="${COND.indexOf(d)}"><td>${i+1}. ${d[2]}<div class="bar"><b style="width:${d[4]/mx*100}%;background:${colorFor(d[4])}"></b></div></td><td class="v">${fmt(d[4])}</td><td class="v">${d[5]}</td></tr>`).join('');
  $$('#rankBody tr').forEach(tr=>{const go=()=>{const d=COND[+tr.dataset.i];$('#cmap').scrollIntoView({block:'center'});setTimeout(()=>{cmap.flyTo([d[0],d[1]],13);L.popup().setLatLng([d[0],d[1]]).setContent(pop(d)).openOn(cmap)},450)};tr.onclick=go;tr.onkeydown=e=>{if(e.key==='Enter')go()}})}
$$('#rankSeg button').forEach(b=>b.onclick=()=>{$$('#rankSeg button').forEach(x=>x.classList.remove('on'));b.classList.add('on');rtype=+b.dataset.r;rank()});rank();

/* ====================== PART 3: CONNECTION ====================== */
const STEPS=[
 {e:'🚰',t:'Tap',h:'Water arrives at your tap',p:'Much of San Diego County’s water is imported, and imported water carries dissolved salts with it. After you use it, those salts stay in the water.',n:Math.round(countyR),u:'gallons per person per day is the average residential use across the county'},
 {e:'🌿',t:'Yard',h:'A big share goes on the yard',p:'Indoor use is fairly steady. Outdoor watering is what swings. In summer the county’s residential use runs well above its winter low, and a lot of the water above California’s indoor standard goes to lawns, gardens and leaks.',n:'+'+summerBump+'%',u:'residential use in the peak month versus the lowest month'},
 {e:'🌧️',t:'Gutter',h:'Overspray and runoff reach the gutter',p:'Overwatering, sprinkler overspray, car-wash water and hosed-down driveways run into storm drains. That water picks up fertilizer, pet waste, soap, oil and dissolved salts on the way. Storm drains generally don’t go to a treatment plant.',n:fmt(runoffMed),u:'µS/cm is the median conductivity at storm-drain runoff monitoring stations'},
 {e:'🏞️',t:'Creek',h:'It flows into our creeks',p:'Storm drains empty into creeks and rivers, even on dry days, when overwatering and car washing keep the flow going. Salts and pollutants add up, and sensitive stream life disappears first.',n:fmt(creekMed),u:`µS/cm is the median at creek and river stations; ${pctElev}% of well-sampled sites read “elevated” or higher`},
 {e:'🌊',t:'Ocean',h:'Then to lagoons and the ocean',p:'Creeks end in lagoons and estuaries, the nurseries of coastal fish and birds, and then at the beach. Seawater itself reads about 52,000, so conductivity here isn’t the worry. The bacteria, nutrients and chemicals that ride along with runoff are.',n:'~52,000',u:'µS/cm is typical for seawater, the natural top of the scale'}];
let stepI=0;
function drawStep(){$('#steps').innerHTML=STEPS.map((s,i)=>`<button class="${i===stepI?'on':''}" data-i="${i}" aria-pressed="${i===stepI}"><span class="e">${s.e}</span>${i+1}. ${s.t}</button>`).join('');
  $$('#steps button').forEach(b=>b.onclick=()=>{stepI=+b.dataset.i;drawStep()});const s=STEPS[stepI];
  $('#stepText').innerHTML=`<h3 style="font-size:1.3rem">${s.h}</h3><p>${s.p}</p>`;$('#stepFact').innerHTML=`<div class="n">${s.n}</div><div class="note" style="margin-top:6px">${s.u}</div>`}
drawStep();

function spearman(pts){const rk=v=>{const o=v.map((x,i)=>[x,i]).sort((a,b)=>a[0]-b[0]),r=[];o.forEach((p,k)=>r[p[1]]=k);return r},a=rk(pts.map(p=>p.x)),b=rk(pts.map(p=>p.y)),n=pts.length,ma=a.reduce((s,x)=>s+x,0)/n,mb=b.reduce((s,x)=>s+x,0)/n;
  let sab=0,saa=0,sbb=0;for(let i=0;i<n;i++){sab+=(a[i]-ma)*(b[i]-mb);saa+=(a[i]-ma)**2;sbb+=(b[i]-mb)**2}return sab/Math.sqrt(saa*sbb)}
function drawScatter(){const svg=$('#scatter');svg.innerHTML='';
  const pts=[];Object.keys(SD_DATA.suppliers).forEach(sid=>{const s=SD_DATA.suppliers[sid],d=DIST[sid];if(s.rgpcd==null||!d||d.creek.length<5)return;if(pts.some(p=>p.s===s))return;pts.push({s,x:s.rgpcd,y:median(d.creek),n:d.creek.length})});
  const W=700,H=380,L0=56,B=44,T=16,R=20,xmin=40,xmax=170,ymax=5500,X=v=>L0+(W-L0-R)*(v-xmin)/(xmax-xmin),Y=v=>H-B-(H-B-T)*v/ymax;
  [0,1000,2000,3000,4000,5000].forEach(v=>{el('line',{x1:L0,x2:W-R,y1:Y(v),y2:Y(v),stroke:'#cdd9e0','stroke-opacity':.5},svg);el('text',{x:L0-8,y:Y(v)+4,'text-anchor':'end'},svg).textContent=fmt(v)});
  [50,75,100,125,150].forEach(v=>{el('text',{x:X(v),y:H-B+18,'text-anchor':'middle'},svg).textContent=v});
  el('text',{x:(L0+W-R)/2,y:H-8,'text-anchor':'middle'},svg).textContent='Residential water use (gal / person / day)';
  el('text',{x:14,y:(H-B+T)/2,'text-anchor':'middle',transform:`rotate(-90 14 ${(H-B+T)/2})`},svg).textContent='Median creek conductivity (µS/cm)';
  [[1500,'Elevated'],[5000,'High']].forEach(([v,t])=>{el('line',{x1:L0,x2:W-R,y1:Y(v),y2:Y(v),stroke:colorFor(v),'stroke-dasharray':'4 4','stroke-width':1.2},svg)});
  const xs=X(INDOOR_STD);if(INDOOR_STD>=xmin){el('line',{x1:xs,x2:xs,y1:T,y2:H-B,stroke:'#e4572e','stroke-dasharray':'4 4'},svg)}
  pts.forEach(p=>{const sel=selected===p.s,g=el('g',{class:'pt',tabindex:0},svg);
    el('circle',{cx:X(p.x),cy:Y(p.y),r:Math.min(16,5+Math.sqrt(p.s.pop)/60),fill:colorFor(p.y),'fill-opacity':.8,stroke:sel?'#e4572e':'#fff','stroke-width':sel?3:1.5},g);
    el('title',{},g).textContent=`${p.s.name}: ${Math.round(p.x)} gal/person/day, median creek ${fmt(p.y)} µS/cm (${p.n} stations)`;
    const lab=p.s.name.replace(/ (Municipal )?Water( District| Company)?| Authority| Irrigation District| Public Utility District|City of /g,'').replace('California American','Cal-Am');
    if(sel||p.s.pop>100000||p.x>105||p.y>3500)el('text',{x:X(p.x)+8,y:Y(p.y)-8,'font-size':10},g).textContent=lab;
    g.onclick=()=>{selectSupplier(p.s)};g.onkeydown=e=>{if(e.key==='Enter')selectSupplier(p.s)}});
  const rho=pts.length>=5?spearman(pts):null;
  $('#scatterNote').className='note';
  $('#scatterNote').innerHTML=rho==null?'':`Dot size = population served. ${pts.length} districts with at least 5 creek stations. Rank correlation (Spearman) = <b>${rho.toFixed(2)}</b>. `+
    (Math.abs(rho)<.2?'That is no clear relationship.':rho<0?'If anything, the saltiest creeks tend to be in districts where people use <em>less</em> water per person: the dense, urbanized, coastal districts. The thirstiest districts are mostly larger-lot, inland and rural ones.':'The districts that use more water per person tend to have saltier creeks.')+
    ` <b>This is not proof of cause either way.</b> Creek salinity also reflects geology, imported water, tidal influence near the coast, urban runoff, and which sites get sampled. The takeaway is that the two problems show up in different places: high use inland, higher contamination where runoff is concentrated, so both need to be tackled.`}
drawScatter();

/* ====================== PART 4: ACTIONS ====================== */
const PW={R:'Less runoff',F:'Fewer fertilizers & pesticides',B:'Less pet waste & bacteria',C:'Fewer chemicals & soaps',S:'Less salt load'};
const TIPS=[
 {i:'🌿',t:'Replace some lawn with native plants',d:'Outdoor irrigation is the biggest swing in home use, and natives rarely need fertilizer.',s:40,c:'Yard',p:'RFS'},
 {i:'🕐',t:'Water before 8am, never at midday',d:'Less evaporation and wind drift.',s:10,c:'Yard',p:'R'},
 {i:'📡',t:'Install a smart sprinkler controller',d:'Adjusts to weather and soil, and skips watering when it rains.',s:30,c:'Yard',p:'RS'},
 {i:'💦',t:'Fix sprinkler overspray and broken heads',d:'If water reaches the sidewalk, it’s heading to a storm drain.',s:20,c:'Yard',p:'RFS'},
 {i:'🧪',t:'Use less fertilizer and skip it before rain',d:'Excess fertilizer washes into creeks and feeds algae.',s:0,c:'Yard',p:'F'},
 {i:'🛢️',t:'Catch rain with a barrel or rain garden',d:'Keeps roof runoff on your property and waters plants for free.',s:5,c:'Yard',p:'RS'},
 {i:'🐕',t:'Pick up pet waste, every time',d:'Bacteria from pet waste flows to creeks and beaches.',s:0,c:'Around the home',p:'B'},
 {i:'🚗',t:'Wash the car at a commercial car wash',d:'They recycle water and send soapy runoff to the sewer.',s:15,c:'Around the home',p:'C'},
 {i:'🧹',t:'Sweep, don’t hose down the driveway',d:'A hose uses about 10 gal/min and pushes grit and oil into the gutter.',s:10,c:'Around the home',p:'RC'},
 {i:'🏊',t:'Drain pool water to the sewer cleanout, not the street',d:'Pool chlorine and salt are harmful to stream life. Check your city’s rules.',s:0,c:'Around the home',p:'CS'},
 {i:'☣️',t:'Take paint, oil and chemicals to hazardous-waste drop-off',d:'Never pour them down a storm drain.',s:0,c:'Around the home',p:'C'},
 {i:'🕳️',t:'Check your meter for hidden leaks',d:'Turn everything off; if the meter still moves, you have a leak.',s:25,c:'Around the home',p:'R'},
 {i:'🚿',t:'Cut one minute off your showers',d:'About 2 gallons per minute.',s:2,c:'Bathroom'},
 {i:'🚿',t:'Swap in a WaterSense showerhead',d:'About 1.5 gal/min instead of 2.5.',s:8,c:'Bathroom'},
 {i:'🚽',t:'Replace an old toilet with a high-efficiency one',d:'Older toilets use 3.5+ gallons per flush.',s:20,c:'Bathroom'},
 {i:'🔧',t:'Fix a leaky toilet or faucet',d:'A running toilet can waste 200+ gal/day.',s:30,c:'Bathroom'},
 {i:'🪥',t:'Turn off the tap while brushing',d:'Saves about 8 gallons each time.',s:8,c:'Bathroom'},
 {i:'🧺',t:'Run full loads of laundry only',d:'Skip the half-empty cycles.',s:10,c:'Kitchen & laundry'},
 {i:'🍽️',t:'Run the dishwasher full, skip pre-rinsing',d:'Modern machines don’t need it.',s:6,c:'Kitchen & laundry'}];
let cat='All',picked=new Set();
function drawFilters(){const f=$('#filters');f.innerHTML='';['All',...new Set(TIPS.map(t=>t.c))].forEach(c=>{const b=document.createElement('button');b.textContent=c;b.className=c===cat?'on':'';b.onclick=()=>{cat=c;drawFilters();drawTips()};f.appendChild(b)})}
function drawTips(){const box=$('#tips');box.innerHTML='';
  TIPS.forEach((t,i)=>{if(cat!=='All'&&t.c!==cat)return;const d=document.createElement('div');d.className='tip'+(picked.has(i)?' on':'');d.tabIndex=0;d.setAttribute('role','checkbox');d.setAttribute('aria-checked',picked.has(i));
    d.innerHTML=`<span class="ic">${t.i}</span><div><b>${t.t}</b><small>${t.d}</small><span class="save">${t.s?'~'+t.s+' gal/day':'Protects creeks'}</span>${t.p?`<span class="pw">${[...t.p].map(k=>PW[k]).join(' · ')}</span>`:''}</div>`;
    const tog=()=>{picked.has(i)?picked.delete(i):picked.add(i);drawTips();meter()};d.onclick=tog;d.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tog()}};box.appendChild(d)})}
function meter(){const day=[...picked].reduce((s,i)=>s+TIPS[i].s,0),yrg=day*365;$('#mDay').textContent=fmt(day);$('#mYear').textContent=fmt(yrg);$('#mPools').textContent=(yrg/20000).toFixed(1);$('#mUsd').textContent='$'+fmt(yrg/1000*6);
  const on=new Set();picked.forEach(i=>[...(TIPS[i].p||'')].forEach(k=>on.add(k)));$('#pways').innerHTML=Object.keys(PW).map(k=>`<span class="${on.has(k)?'on':''}">${on.has(k)?'✓ ':''}${PW[k]}</span>`).join('')}
function compare(){const p=+$('#pp').value,h=+$('#hh').value;$('#ppV').textContent=p;$('#hhV').textContent=h;const me=h/p,diff=Math.round((me/countyR-1)*100);
  $('#cmpOut').innerHTML=`That’s <b>${Math.round(me)}</b> gallons per person per day, <b>${Math.abs(diff)}% ${diff>=0?'above':'below'}</b> the county’s average residential use (${Math.round(countyR)}). The state’s indoor standard is ${INDOOR_STD}.`+(diff>20?' Outdoor watering and leaks are the first places to look.':diff<-20?' Nice, you’re already well below average.':'')}
function calc(){const m=+$('#sh').value,d=+$('#lw').value;$('#shV').textContent=m;$('#lwV').textContent=d;const sy=m*2*365,se=m*1.5*365,ly=d*52*(1000*.62*.8),l2=Math.min(d,2)*52*(1000*.62*.8);
  $('#calcOut').innerHTML=`Your shower: <b>${fmt(sy)}</b> gal/yr (<b>${fmt(sy-se)}</b> less with a WaterSense head).<br>Watering a 1,000 sq ft lawn ${d}×/week ≈ <b>${fmt(ly)}</b> gal/yr (about 0.8 in per watering). ${d>2?`Cutting to 2 days saves <b>${fmt(ly-l2)}</b> gal/yr and leaves less to run off.`:'That’s already efficient. Nice.'}`}
['sh','lw'].forEach(id=>$('#'+id).oninput=calc);['pp','hh'].forEach(id=>$('#'+id).oninput=compare);

/* ====================== QUIZ ====================== */
const QS=[
 {q:'Roughly what does conductivity measure in water?',a:['How acidic it is','How easily it carries electricity, a clue to dissolved salts','How warm it is'],r:1,e:'Dissolved salts make water conduct electricity better, so conductivity is a quick proxy for saltiness.'},
 {q:'Is a high conductivity reading always a sign of pollution?',a:['Yes, always','No. Tidal lagoons and the ocean are naturally high','Only in lakes'],r:1,e:'Seawater is about 52,000 µS/cm. What matters is a high reading in water that should be fresh.'},
 {q:`About what share of San Diego County’s reported potable demand is residential?`,a:['About 15%','About two-thirds','About 95%'],r:1,e:`In the state data it’s about ${resShare}% across the districts with usable sector data.`},
 {q:'Which kind of district uses the most water per person at home?',a:['Dense coastal/urban districts','Larger-lot inland and rural districts','They’re all about the same'],r:1,e:`${hiS.name} is highest at about ${Math.round(hiS.rgpcd)} gal/person/day vs about ${Math.round(loS.rgpcd)} in ${loS.name}.`},
 {q:'About what share of well-sampled creek sites in our data read "elevated" (over 1,500 µS/cm) or higher?',a:['About 10%','About 35%','About 60%'],r:[10,35,60].reduce((bi,v,i,arr)=>Math.abs(v-pctElev)<Math.abs(arr[bi]-pctElev)?i:bi,0),e:`${pctElev}% of creek sites with at least 3 measurements. Median storm-drain runoff is about ${fmt(runoffMed)} µS/cm and median creek is about ${fmt(creekMed)}.`},
 {q:'Water from your yard that runs down the gutter usually goes where?',a:['To a wastewater treatment plant','Straight to a creek or the ocean, mostly untreated','Back to your tap'],r:1,e:'Storm drains are separate from sewers, so anything in the gutter generally ends up in local waters.'},
 {q:'A running toilet can waste about how much per day?',a:['2 gallons','20 gallons','200+ gallons'],r:2,e:'Silent leaks add up fast. Try the food-coloring test in the tank.'}];
let qi=0,score=0;
function drawQ(){const b=$('#quiz-box');if(qi>=QS.length){b.innerHTML=`<h3>You got ${score} / ${QS.length} 🎉</h3><button class="btn" id="again">Try again</button>`;$('#again').onclick=()=>{qi=0;score=0;drawQ()};return}
  const q=QS[qi];b.innerHTML=`<b>Q${qi+1} of ${QS.length}.</b> ${q.q}<div id="ans"></div><p class="fb" id="fb"></p>`;
  q.a.forEach((t,i)=>{const btn=document.createElement('button');btn.textContent=t;btn.onclick=()=>{[...$('#ans').children].forEach((x,j)=>{x.disabled=true;if(j===q.r)x.classList.add('right')});if(i===q.r)score++;else btn.classList.add('wrong');$('#fb').textContent=q.e;
    const n=document.createElement('button');n.textContent='Next →';n.style.textAlign='center';n.onclick=()=>{qi++;drawQ()};$('#ans').appendChild(n)};$('#ans').appendChild(btn)})}

/* ====================== INIT ====================== */
drawULayer();drawRankBars();showDetail(null);drawFilters();drawTips();meter();compare();calc();drawQ();
const navs=$$('nav.top a').map(a=>[a,document.querySelector(a.getAttribute('href'))]);
addEventListener('scroll',()=>{let c=null;navs.forEach(([a,s])=>{if(s.getBoundingClientRect().top<140)c=a});navs.forEach(([a])=>a.classList.toggle('on',a===c))},{passive:true});
