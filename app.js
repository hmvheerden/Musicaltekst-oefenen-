
window.addEventListener("error",event=>{
  console.error("App-fout:",event.error||event.message);
});

const KEY="musicaltekst-oefenen-v1";
async function forceVersion24Refresh(){
  const marker="mto-v24-cache-reset";
  if(localStorage.getItem(marker))return;
  localStorage.setItem(marker,"1");
  if("caches" in window){
    try{for(const key of await caches.keys())await caches.delete(key)}catch{}
  }
  if("serviceWorker" in navigator){
    try{const regs=await navigator.serviceWorker.getRegistrations();for(const reg of regs)await reg.update()}catch{}
  }
}


const EXPECTED_MUSKETEERS_ROLES=[
  {name:"D'Artagnan",aliases:["D’Artagnan","D Artagnan","Dartagnan"]},
  {name:"Athos",aliases:[]},
  {name:"Porthos",aliases:[]},
  {name:"Aramis",aliases:["Aramius"]},
  {name:"Constance Bonacieux",aliases:["Constance","Constance B."]},
  {name:"Milady de Winter",aliases:["Milady","Milady de W."]},
  {name:"Kardinaal Richelieu",aliases:["Richelieu","Kardinaal"]},
  {name:"Koningin Anna",aliases:["Anna","Koningin"]},
  {name:"Koning Lodewijk XIII",aliases:["Lodewijk","Koning Lodewijk","Lod."]},
  {name:"Rochefort",aliases:[]},
  {name:"Bootsman",aliases:["Bootsvrouw"]},
  {name:"Buckingham",aliases:["Lord Buckingham"]},
  {name:"Dienstbode",aliases:[]},
  {name:"Vader van D'Artagnan",aliases:["Vader","Vader D'Artagnan"]},
  {name:"Moeder van D'Artagnan",aliases:["Moeder","Moeder D'Artagnan"]},
  {name:"Spreekstalmeester",aliases:["Spreekstalmeester 1","Spreekstalmeester 2","Spreekstalmeester 3","Spreekstalmeester 4","Spreekstalmeester 5","Spreekstalmeester 6","Spreekstalmeester 7"]},
  {name:"Isabel",aliases:[]},
  {name:"Waardin",aliases:[]},
  {name:"Man 1",aliases:["Man1","MAN 1"]},
  {name:"Man 2",aliases:["Man2","MAN 2"]},
  {name:"Man 3",aliases:["Man3","MAN 3"]},
  {name:"Madame S",aliases:["Madame S."]},
  {name:"Madame E",aliases:["Madame E."]},
  {name:"Gravin",aliases:[]},
  {name:"Man 1 scène 15",aliases:["Man 1 scene 15"]},
  {name:"Vrouw 1",aliases:["Vrouw1","VROUW 1"]},
  {name:"Vrouw 2",aliases:["Vrouw2","VROUW 2"]},
  {name:"Vrouw 3",aliases:["Vrouw3","VROUW 3"]},
  {name:"Hugenoot",aliases:[]},
  {name:"Gardist",aliases:[]},
  {name:"Bewakers",aliases:["Bewaker"]},
  {name:"Musketiers",aliases:["3 Musketiers","Drie Musketiers"]},
  {name:"Garde van de Kardinaal",aliases:["Kardinale Garde","Garde"]},
  {name:"Hofdames",aliases:["Hofdame"]},
  {name:"Edelmannen",aliases:["Edelman"]},
  {name:"Burgers / Marktvolk",aliases:["Burgers","Marktvolk"]},
  {name:"Gevangenen",aliases:["Gevangene"]},
  {name:"Zeelieden / Soldaten",aliases:["Zeelieden","Soldaten"]},
  {name:"Allen",aliases:["ALLEN"]},
  {name:"Ensemble",aliases:["ENSEMBLE"]},
  {name:"Mannen",aliases:["MANNEN"]},
  {name:"Vrouwen",aliases:["VROUWEN"]},
  {name:"Hugenoten",aliases:["HUGENOTEN"]},
  {name:"Katholieken",aliases:["KATHOLIEKEN"]},
  {name:"Beiden",aliases:["BEIDEN","Alle 2"]},
  {name:"Alle 3",aliases:["Alle drie","ALLE 3"]},
  {name:"Anna en Lodewijk",aliases:["Anna en Lod.","Anna + Lodewijk"]},
  {name:"Milady en vrouwen",aliases:["Milady + vrouwen","Milady+vrouwen"]},
  {name:"Milady en mannen",aliases:["Milady + mannen","Milady+mannen"]}
];

function roleMatchesExpected(foundRole,expected){
  const foundId=ScriptParser.roleIdentity(foundRole);
  return [expected.name,...(expected.aliases||[])]
    .some(name=>ScriptParser.rolesAreFuzzyMatch(foundRole,name)||foundId===ScriptParser.roleIdentity(name));
}

function buildRoleAudit(lines){
  const foundRoles=ScriptParser.roles(lines);
  const counts=new Map();
  for(const line of lines){
    counts.set(line.speaker,(counts.get(line.speaker)||0)+1);
  }

  const expected=EXPECTED_MUSKETEERS_ROLES.map(role=>{
    const matches=foundRoles.filter(found=>roleMatchesExpected(found,role));
    const count=matches.reduce((sum,name)=>sum+(counts.get(name)||0),0);
    return {...role,matches,count,found:count>0};
  });

  const matchedFound=new Set(expected.flatMap(item=>item.matches));
  const extra=foundRoles
    .filter(role=>!matchedFound.has(role))
    .map(role=>({name:role,count:counts.get(role)||0}));

  return {
    expected,
    extra,
    missing:expected.filter(item=>!item.found),
    foundCount:expected.filter(item=>item.found).length,
    expectedCount:expected.length
  };
}

const defaultState={scripts:[],sessions:[],activeScriptId:null,settings:{theme:"system",font:"normal",autoReveal:0,sound:false,vibration:false,accuracy:"normal"},currentSession:null};
let state=loadState(), currentReviewId=null, practice=null, learn=null, autoTimer=null;
let activeRecorder=null, recordingChunks=[], recordingLineId=null, recordingStream=null, currentPlayback=null;
const AUDIO_DB="musicaltekst-oefenen-audio-v1", AUDIO_STORE="recordings";
function openAudioDB(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(AUDIO_DB,1);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(AUDIO_STORE))db.createObjectStore(AUDIO_STORE)};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
function audioKey(scriptId,lineId){return `${scriptId}:${lineId}`}
async function saveRecording(scriptId,lineId,blob){
  const db=await openAudioDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(AUDIO_STORE,"readwrite");
    tx.objectStore(AUDIO_STORE).put(blob,audioKey(scriptId,lineId));
    tx.oncomplete=()=>{db.close();resolve()};
    tx.onerror=()=>{db.close();reject(tx.error)};
  });
}
async function getRecording(scriptId,lineId){
  const db=await openAudioDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(AUDIO_STORE,"readonly");
    const req=tx.objectStore(AUDIO_STORE).get(audioKey(scriptId,lineId));
    req.onsuccess=()=>{db.close();resolve(req.result||null)};
    req.onerror=()=>{db.close();reject(req.error)};
  });
}
async function deleteRecording(scriptId,lineId){
  const db=await openAudioDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(AUDIO_STORE,"readwrite");
    tx.objectStore(AUDIO_STORE).delete(audioKey(scriptId,lineId));
    tx.oncomplete=()=>{db.close();resolve()};
    tx.onerror=()=>{db.close();reject(tx.error)};
  });
}
async function clearRecordings(){
  const db=await openAudioDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(AUDIO_STORE,"readwrite");
    tx.objectStore(AUDIO_STORE).clear();
    tx.oncomplete=()=>{db.close();resolve()};
    tx.onerror=()=>{db.close();reject(tx.error)};
  });
}

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function loadState(){try{return {...defaultState,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return structuredClone(defaultState)}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}

function emptyStats(){return {attempts:0,good:0,almost:0,wrong:0,last:null,streak:0,nextDue:0}}
function ensureDataShape(){
  state.scripts=(state.scripts||[]).map(script=>{
    script.aliases=Array.isArray(script.aliases)?script.aliases:[];
    script.roles=Array.isArray(script.roles)?script.roles.filter(Boolean):[];
    if(!script.roles.length&&script.role)script.roles=[script.role];
    script.roles=[...new Set([...script.roles,...script.aliases].map(x=>String(x).trim()).filter(Boolean))];
    script.customRoles=Array.isArray(script.customRoles)?script.customRoles:[];
    script.lines=ScriptParser.canonicalizeRoleNames((script.lines||[]).map(line=>{
      line.id=line.id||crypto.randomUUID();
      line.difficult=!!line.difficult;
      line.stats={...emptyStats(),...(line.stats||{})};
      for(const key of ["attempts","good","almost","wrong","streak","nextDue"]){
        const value=Number(line.stats[key]);
        line.stats[key]=Number.isFinite(value)?value:0;
      }
      return line;
    }));
    return script;
  });
  state.sessions=Array.isArray(state.sessions)?state.sessions:[];
  save();
}

function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.remove("hidden");setTimeout(()=>t.classList.add("hidden"),2200)}
function nowIso(){return new Date().toISOString()}
function esc(s=""){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function activeScript(){return state.scripts.find(s=>s.id===state.activeScriptId)||state.scripts[0]}
function go(page){
  if(!["practice","learn"].includes(page))stopAllAudio();
  $$(".page").forEach(p=>p.classList.toggle("active",p.dataset.page===page));
  $$(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.go===page));
  window.scrollTo({top:0,behavior:"smooth"});
  if(page==="dashboard") renderDashboard();
  if(page==="scripts") renderScripts();
  if(page==="practiceSetup") renderPracticeSetup();
  if(page==="oefenenSetup") renderLearnSetup();
  if(page==="extraSetup") renderExtraSetup();
  if(page==="inleren") renderInleren();
  if(page==="progress") renderProgress();
  if(page==="history") renderHistory();
}
$$("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));

function applySettings(){
  const theme=state.settings.theme;
  const actual=theme==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):theme;
  document.documentElement.dataset.theme=actual;
  document.documentElement.dataset.font=state.settings.font;
  $("#settingTheme").value=theme;$("#settingFont").value=state.settings.font;$("#settingAutoReveal").value=String(state.settings.autoReveal);
  $("#settingSound").checked=state.settings.sound;$("#settingVibration").checked=state.settings.vibration;$("#settingAccuracy").value=state.settings.accuracy;
}
$("#themeQuick").onclick=()=>{state.settings.theme=document.documentElement.dataset.theme==="dark"?"light":"dark";save();applySettings()};
["settingTheme","settingFont","settingAutoReveal","settingAccuracy"].forEach(id=>$("#"+id).onchange=e=>{const map={settingTheme:"theme",settingFont:"font",settingAutoReveal:"autoReveal",settingAccuracy:"accuracy"};state.settings[map[id]]=id==="settingAutoReveal"?+e.target.value:e.target.value;save();applySettings()});
["settingSound","settingVibration"].forEach(id=>$("#"+id).onchange=e=>{state.settings[id==="settingSound"?"sound":"vibration"]=e.target.checked;save()});

function renderDashboard(){
  const s=activeScript();$("#activeScriptLabel").textContent=s?s.title:"Nog geen script gekozen";
  const all=s?targetLines(s):[], mastered=all.filter(l=>masteredLine(l)).length;
  $("#dashMastered").textContent=all.length?Math.round(mastered/all.length*100)+"%":"0%";
  $("#dashRemaining").textContent=Math.max(0,all.length-mastered);
  $("#dashDifficult").textContent=all.filter(l=>l.difficult).length;
  $("#dashStreak").textContent=calcStreak();
  const last=state.sessions.at(-1);
  $("#continueBox").innerHTML=last?`<div class="list-item"><div><h3>${esc(last.scriptTitle)}</h3><div class="meta">${formatDate(last.started)} · ${last.count} teksten</div></div><button class="secondary small" data-go="${last.kind==="oefenen"?"oefenenSetup":"practiceSetup"}">${last.kind==="oefenen"?"Opnieuw oefenen":"Opnieuw repeteren"}</button></div>`:"Start eerst een repetitie.";
  $("#recentSessions").innerHTML=state.sessions.slice(-3).reverse().map(sessionHtml).join("")||"Nog geen sessies opgeslagen.";
  $$("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
}

function renderRoleAudit(script){
  const card=$("#roleAuditCard");
  if(!card)return;
  if(!script?.lines?.length){
    card.hidden=true;
    return;
  }

  const audit=buildRoleAudit(script.lines);
  script.roleAudit=audit;
  card.hidden=false;

  $("#roleAuditSummary").innerHTML=`
    <span class="audit-pill good">${audit.foundCount} van ${audit.expectedCount} bekende rollen gevonden</span>
    <span class="audit-pill">${script.lines.length} dialoogregels</span>
    <span class="audit-pill">${ScriptParser.roles(script.lines).length} unieke rollen in het script</span>
  `;

  $("#roleAuditWarnings").innerHTML=audit.missing.length
    ? `<div class="warning-box"><strong>Controleer deze niet-gevonden rollen:</strong><p>${audit.missing.map(item=>escapeHtml(item.name)).join(", ")}</p><p class="muted">Een rol kan bewust geen tekst hebben, alleen in zang voorkomen of onder een onverwachte schrijfwijze staan.</p></div>`
    : `<div class="success-box">Alle bekende rollen met gesproken tekst zijn gevonden.</div>`;

  $("#roleAuditList").innerHTML=audit.expected.map(item=>`
    <div class="role-audit-row ${item.found?"found":"missing"}">
      <span>${item.found?"✓":"!"}</span>
      <strong>${escapeHtml(item.name)}</strong>
      <span>${item.count} tekstregel${item.count===1?"":"s"}</span>
      <small>${item.matches.length?`Gevonden als: ${item.matches.map(escapeHtml).join(", ")}`:"Niet gevonden"}</small>
    </div>
  `).join("");

  $("#roleAuditExtra").innerHTML=audit.extra.length
    ? audit.extra.map(item=>`
        <div class="role-audit-row extra">
          <span>+</span><strong>${escapeHtml(item.name)}</strong>
          <span>${item.count} tekstregel${item.count===1?"":"s"}</span>
        </div>
      `).join("")
    : `<p class="muted">Geen overige rollen gevonden.</p>`;
}

function renderScripts(){
  $("#scriptList").innerHTML=state.scripts.map(s=>`<div class="list-item"><div><h3>${esc(s.title)}</h3><div class="meta">${s.lines.length} regels · ${ScriptParser.roles(s.lines).length} rollen${s.songFilter?.sections?` · ${s.songFilter.sections} liedsectie${s.songFilter.sections===1?"":"s"} overgeslagen`:""}</div></div><div><button class="secondary small" onclick="openReview('${s.id}')">Open</button> <button class="danger small" onclick="deleteScript('${s.id}')">Verwijder</button></div></div>`).join("")||`<div class="empty card">Nog geen scripts toegevoegd.</div>`;
}
$("#newScriptBtn").onclick=()=>$("#uploadCard").scrollIntoView({behavior:"smooth"});
$("#parseScriptBtn").onclick=async()=>{
  const title=$("#scriptTitle").value.trim(), file=$("#scriptFile").files[0], pasted=$("#scriptPaste").value.trim(), status=$("#parseStatus");
  if(!title)return toast("Vul eerst de naam van de musical in.");
  if(!file&&!pasted)return toast("Upload een bestand of plak tekst.");
  status.classList.remove("hidden");status.textContent="Script wordt verwerkt…";
  try{
    const text=pasted||await ScriptParser.extractFile(file);
    const lines=ScriptParser.parse(text);
    const songFilter=ScriptParser.getLastSongFilterInfo?.()||{sections:0,lines:0};
    if(!text||text.trim().length<20){
      throw new Error("Er is vrijwel geen leesbare tekst uit het bestand gehaald. Mogelijk is de PDF gescand of bestaat hij vooral uit afbeeldingen.");
    }
    if(!lines.length){
      throw new Error(`De PDF is wel gelezen (${text.length} tekens), maar er zijn geen duidelijke dialoogregels gevonden buiten de liedteksten. Controleer of rollen en tekstregels herkenbaar zijn opgemaakt.`);
    }
    const script={id:crypto.randomUUID(),title,created:nowIso(),lines,role:"",roles:[],aliases:[],customRoles:[],songFilter};
    script.roleAudit=buildRoleAudit(lines);
    state.scripts.push(script);state.activeScriptId=script.id;save();
    $("#scriptTitle").value="";$("#scriptPaste").value="";$("#scriptFile").value="";
    status.textContent=`Bestand gelezen: ${text.length} tekens. ${lines.length} tekstregels gevonden.${songFilter.sections?` ${songFilter.sections} liedsectie${songFilter.sections===1?"":"s"} overgeslagen${songFilter.titles?.length?`: ${songFilter.titles.join(", ")}`:""}.${songFilter.interludes?` ${songFilter.interludes} gesproken tussenstuk${songFilter.interludes===1?"":"ken"} behouden.`:""}`:" Geen herkenbare liedsecties gevonden."}`;
    renderRoleAudit(script);
    openReview(script.id);
  }catch(e){status.textContent=e.message}
};
window.deleteScript=id=>{if(!confirm("Dit script en de bijbehorende voortgang verwijderen?"))return;state.scripts=state.scripts.filter(s=>s.id!==id);state.sessions=state.sessions.filter(x=>x.scriptId!==id);if(state.activeScriptId===id)state.activeScriptId=state.scripts[0]?.id||null;save();renderScripts()};
window.openReview=id=>{currentReviewId=id;state.activeScriptId=id;save();renderReview();go("review")};
function renderReview(){
  const s=state.scripts.find(x=>x.id===currentReviewId);if(!s)return;
  const scenes=[...new Set(s.lines.map(l=>l.scene))];
  $("#reviewSceneFilter").innerHTML=`<option value="">Alle scènes</option>`+scenes.map(x=>`<option>${esc(x)}</option>`).join("");
  renderReviewLines();
}
function renderReviewLines(){
  const s=state.scripts.find(x=>x.id===currentReviewId), q=$("#reviewSearch").value.toLowerCase(), scene=$("#reviewSceneFilter").value;
  $("#reviewLines").innerHTML=s.lines.filter(l=>(!q||(l.text+" "+l.speaker).toLowerCase().includes(q))&&(!scene||l.scene===scene)).map(l=>`<div class="review-row" data-id="${l.id}">
    <div class="row-grid"><input class="edit-speaker" value="${esc(l.speaker)}"><textarea class="edit-text" rows="2">${esc(l.text)}</textarea></div>
    <div class="review-actions"><span class="scene-chip">${esc(l.act)} · ${esc(l.scene)}</span><div><button class="danger small delete-line">Wis</button></div></div>
  </div>`).join("");
  $$(".review-row").forEach(row=>{
    const l=s.lines.find(x=>x.id===row.dataset.id);
    row.querySelector(".edit-speaker").onchange=e=>{l.speaker=e.target.value.trim();save()};
    row.querySelector(".edit-text").onchange=e=>{l.text=e.target.value.trim();save()};
    row.querySelector(".delete-line").onclick=()=>{s.lines=s.lines.filter(x=>x.id!==l.id);save();renderReviewLines()};
  });
}
$("#reviewSearch").oninput=renderReviewLines;$("#reviewSceneFilter").onchange=renderReviewLines;


$("#saveReviewBtn").onclick=()=>{save();toast("Wijzigingen opgeslagen")};
$("#addLineBtn").onclick=()=>{const s=state.scripts.find(x=>x.id===currentReviewId);const last=s.lines.at(-1)||{};s.lines.push({id:crypto.randomUUID(),act:last.act||"Akte 1",scene:last.scene||"Scène 1",speaker:s.role||"ROL",text:"Nieuwe tekstregel",difficult:false,stats:{attempts:0,good:0,almost:0,wrong:0,last:null,streak:0,nextDue:0}});save();renderReviewLines()};

function normalizedRoleName(value){
  return ScriptParser.roleIdentity(value);
}
function selectedRoleNames(script){
  const values=[
    ...(Array.isArray(script.roles)?script.roles:[]),
    ...(Array.isArray(script.aliases)?script.aliases:[]),
    script.role
  ].filter(Boolean);
  return [...new Set(values.map(normalizedRoleName))];
}
function isMine(script,line){
  return selectedRoleNames(script).includes(normalizedRoleName(line.speaker));
}
function targetLines(s){return s.lines.filter(l=>isMine(s,l))}

function getRoleOptions(script){
  const raw=[
    ...ScriptParser.roles(script?.lines||[]),
    ...(script?.customRoles||[]),
    "ALLEN","MANNEN","VROUWEN","ENSEMBLE","KOOR"
  ];
  const unique=new Map();
  for(const role of raw){
    const key=ScriptParser.roleIdentity(role);
    if(!unique.has(key))unique.set(key,role);
  }
  return [...unique.values()].sort((a,b)=>a.localeCompare(b,"nl"));
}
function fillThreeRoleSelects(prefix,script){
  if(!script)return;
  const options=getRoleOptions(script);
  const selected=Array.isArray(script.roles)?script.roles.slice(0,3):[];
  for(let i=1;i<=3;i++){
    const select=$("#"+prefix+"Role"+i);
    if(!select)continue;
    const current=selected[i-1]||"";
    select.innerHTML=`<option value="">${i===1?"Kies een rol":"Geen extra rol"}</option>`+
      options.map(role=>`<option value="${esc(role)}" ${role===current?"selected":""}>${esc(role)}</option>`).join("");
    select.onchange=()=>saveThreeRoles(prefix,script);
  }
}
function saveThreeRoles(prefix,script){
  const raw=[1,2,3].map(i=>$("#"+prefix+"Role"+i)?.value||"").filter(Boolean);
  const unique=[];
  let duplicate=false;
  for(const role of raw){
    if(unique.some(x=>normalizedRoleName(x)===normalizedRoleName(role)))duplicate=true;
    else unique.push(role);
  }
  script.roles=unique;
  script.role=unique[0]||"";
  script.aliases=[];
  save();
  fillThreeRoleSelects(prefix,script);
  if(duplicate)toast("Een dubbele rol is maar één keer opgeslagen.");
}
function selectedThreeRoles(prefix){
  return [1,2,3].map(i=>$("#"+prefix+"Role"+i)?.value||"").filter(Boolean);
}
function validateThreeRoles(prefix,script){
  const roles=selectedThreeRoles(prefix);
  if(!roles.length){
    toast("Selecteer minimaal Rol 1.");
    return false;
  }
  const unique=[];
  for(const role of roles){
    if(!unique.some(x=>normalizedRoleName(x)===normalizedRoleName(role)))unique.push(role);
  }
  script.roles=unique;
  script.role=unique[0]||"";
  script.aliases=[];
  save();
  return true;
}

function renderPracticeSetup(){
  $("#practiceScript").innerHTML=state.scripts.map(s=>`<option value="${s.id}" ${s.id===state.activeScriptId?"selected":""}>${esc(s.title)}</option>`).join("");
  updatePracticeRoles();$("#practiceAccuracy").value=state.settings.accuracy;updateScopeOptions();
}
$("#practiceScript").onchange=e=>{state.activeScriptId=e.target.value;save();updatePracticeRoles();updateScopeOptions()};
function updatePracticeRoles(){fillThreeRoleSelects("practice",activeScript())}
$("#practiceScope").onchange=updateScopeOptions;
function updateScopeOptions(){
  const s=activeScript(), scope=$("#practiceScope").value, wrap=$("#scopeValueWrap");if(!s)return;
  if(scope==="act"||scope==="scene"){wrap.classList.remove("hidden");const vals=[...new Set(s.lines.map(l=>l[scope]))];$("#practiceScopeValue").innerHTML=vals.map(v=>`<option>${esc(v)}</option>`).join("")}else wrap.classList.add("hidden");
}
$("#startPracticeBtn").onclick=()=>{
  try{
  const s=activeScript();if(!s)return toast("Voeg eerst een script toe.");
  if(!validateThreeRoles("practice",s))return;
  let items=buildPracticeItems(s,$("#practiceUnit").value).filter(item=>Array.isArray(item.lines)&&item.lines.length);
  const scope=$("#practiceScope").value,val=$("#practiceScopeValue").value;
  if(scope==="act")items=items.filter(x=>x.act===val);
  if(scope==="scene")items=items.filter(x=>x.scene===val);
  if(scope==="difficult")items=items.filter(x=>x.lines.some(l=>l.difficult));
  if(scope==="wrong")items=items.filter(x=>x.lines.some(l=>l.stats.wrong>0));
  // Slimme herhaling wordt pas toegepast nadat een antwoord is beoordeeld.
  // Daardoor kan deze optie het starten van een sessie nooit blokkeren.
  if($("#practiceOrder").value==="random")items.sort(()=>Math.random()-.5);
  if(!Array.isArray(items)||!items.length)return toast("Geen teksten gevonden voor deze keuze.");
  practice={kind:"repeteren",scriptId:s.id,mode:$("#practiceMode").value,unit:$("#practiceUnit").value,queue:items,index:0,started:Date.now(),results:{good:0,almost:0,wrong:0},count:0,scenes:new Set(),currentGraded:false};
  showPracticeItem();go("practice");
  }catch(error){console.error(error);toast("De repetitie kon niet starten. Ververs de app en probeer opnieuw.");}
};
function buildPracticeItems(s,unit){
  const out=[];
  if(unit==="line"){
    s.lines.forEach((l,i)=>{if(isMine(s,l))out.push({id:l.id,lines:[l],cue:s.lines[i-1]||null,act:l.act,scene:l.scene})});
  } else if(unit==="block"){
    for(let i=0;i<s.lines.length;i++){if(!isMine(s,s.lines[i]))continue;const block=[],start=i;while(i<s.lines.length&&isMine(s,s.lines[i]))block.push(s.lines[i++]);i--;out.push({id:block[0].id,lines:block,cue:s.lines[start-1]||null,act:block[0].act,scene:block[0].scene})}
  } else {
    [...new Set(s.lines.map(l=>l.scene))].forEach(scene=>{const inScene=s.lines.filter(l=>l.scene===scene),mine=inScene.filter(l=>isMine(s,l));if(mine.length){const firstIndex=s.lines.indexOf(mine[0]);out.push({id:"scene-"+scene,lines:mine,cue:s.lines[firstIndex-1]||null,act:mine[0].act,scene})}})
  }
  return out;
}
function itemPriority(x){
  return (x.lines||[]).reduce((total,line)=>{
    const stats={...emptyStats(),...(line.stats||{})};
    return total+(Number(stats.wrong)||0)*4+(Number(stats.almost)||0)*2+(line.difficult?5:0)-(Number(stats.good)||0);
  },0);
}
function showPracticeItem(){
  clearTimeout(autoTimer);
  const item=practice.queue[practice.index];
  const script=state.scripts.find(entry=>entry.id===practice.scriptId);
  const blocks=getTwoPreviousRoleBlocks(script,item);

  practice.currentGraded=false;
  item.cueBlocks=blocks;
  item.cues=blocks.flatMap(block=>block.lines);

  $("#practiceProgress").textContent=`${practice.index+1} / ${practice.queue.length}`;
  $("#practiceScene").textContent=`${item.act} · ${item.scene}`;
  renderPreviousBlocks($("#practiceCues"),blocks);

  $("#markDifficultBtn").textContent=item.lines.some(line=>line.difficult)?"★":"☆";

  const answer=item.lines.map(line=>line.text).join("\n");
  $("#spokenAnswer").textContent=answer;
  $("#spokenAnswer").classList.add("hidden");
  $("#selfGradeButtons").classList.add("hidden");

  $("#typedAnswer").value="";
  $("#typeFeedback").className="feedback hidden";
  $("#typedNextBtn").classList.add("hidden");

  $("#speakArea").classList.toggle("hidden",practice.mode!=="speak");
  $("#typeArea").classList.toggle("hidden",practice.mode!=="type");
  practice.scenes.add(item.scene);

  if(state.settings.autoReveal&&practice.mode==="speak"){
    autoTimer=setTimeout(revealAnswer,state.settings.autoReveal*1000);
  }
}
function revealAnswer(){$("#spokenAnswer").classList.remove("hidden");$("#selfGradeButtons").classList.remove("hidden")}
$("#revealAnswerBtn").onclick=revealAnswer;
async function speakLines(lines){}
function stopAllAudio(){}
$("#readCueBtn").onclick=()=>{};
$("#markDifficultBtn").onclick=()=>{const item=practice.queue[practice.index], val=!item.lines.every(l=>l.difficult);item.lines.forEach(l=>l.difficult=val);save();$("#markDifficultBtn").textContent=val?"★":"☆"};
$$("[data-grade]").forEach(b=>b.onclick=()=>gradeCurrent(b.dataset.grade));
$("#retryBtn").onclick=()=>{$("#spokenAnswer").classList.add("hidden");$("#selfGradeButtons").classList.add("hidden")};
$("#nextLineBtn").onclick=()=>{if(!practice.currentGraded)gradeCurrent("almost",false);nextPractice()};
function gradeCurrent(grade,advance=true){
  if(practice.currentGraded)return;practice.currentGraded=true;const item=practice.queue[practice.index];
  item.lines.forEach(l=>updateStats(l,grade));practice.results[grade]++;practice.count++;
  if($("#smartRepeat").checked&&(grade==="wrong"||grade==="almost")){const offset=grade==="wrong"?2:5;practice.queue.splice(Math.min(practice.index+offset,practice.queue.length),0,item)}
  save();feedbackPulse(grade);if(advance)setTimeout(nextPractice,350);
}
function updateStats(l,g){l.stats={...emptyStats(),...(l.stats||{})};l.stats.attempts++;l.stats[g]++;l.stats.last=nowIso();l.stats.streak=g==="good"?l.stats.streak+1:0;l.stats.nextDue=Date.now()+(g==="wrong"?5*60e3:g==="almost"?6*3600e3:Math.min(14,l.stats.streak+1)*86400e3)}
function feedbackPulse(g){if(state.settings.vibration&&navigator.vibrate)navigator.vibrate(g==="good"?40:[60,40,60]);if(state.settings.sound){const ctx=new AudioContext(),o=ctx.createOscillator(),gain=ctx.createGain();o.frequency.value=g==="good"?660:330;gain.gain.value=.04;o.connect(gain);gain.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.12)}}
function nextPractice(){practice.index++;if(practice.index>=practice.queue.length)return finishPractice();showPracticeItem()}
$("#checkTypedBtn").onclick=()=>{
  const item=practice.queue[practice.index], expected=item.lines.map(l=>l.text).join("\n"), actual=$("#typedAnswer").value, result=compareText(actual,expected,$("#practiceAccuracy").value);
  const f=$("#typeFeedback");f.className="feedback "+result.grade;f.innerHTML=`<strong>${result.label}</strong><p>${result.html}</p><p class="meta">Overeenkomst: ${Math.round(result.score*100)}%</p>`;$("#typedNextBtn").classList.remove("hidden");
  if(!practice.currentGraded){practice.currentGraded=true;item.lines.forEach(l=>updateStats(l,result.grade));practice.results[result.grade]++;practice.count++;if($("#smartRepeat").checked&&result.grade!=="good")practice.queue.splice(Math.min(practice.index+(result.grade==="wrong"?2:5),practice.queue.length),0,item);save();feedbackPulse(result.grade)}
};
$("#typedNextBtn").onclick=nextPractice;
function normalize(s,strict){s=s.trim().replace(/\s+/g," ");if(!strict)s=s.toLowerCase().replace(/[.,!?;:'"()\-–—]/g,"");return s}
function levenshtein(a,b){const m=Array.from({length:b.length+1},(_,i)=>[i]);for(let j=0;j<=a.length;j++)m[0][j]=j;for(let i=1;i<=b.length;i++)for(let j=1;j<=a.length;j++)m[i][j]=b[i-1]===a[j-1]?m[i-1][j-1]:1+Math.min(m[i-1][j],m[i][j-1],m[i-1][j-1]);return m[b.length][a.length]}
function compareText(actual,expected,accuracy){
  const strict=accuracy==="strict",a=normalize(actual,strict),e=normalize(expected,strict),score=e.length?1-levenshtein(a,e)/Math.max(a.length,e.length):1;
  const good=accuracy==="strict"?.98:accuracy==="lenient"?.88:.93, almost=accuracy==="strict"?.88:accuracy==="lenient"?.65:.78;
  const grade=score>=good?"good":score>=almost?"almost":"wrong",label=grade==="good"?"Goed":grade==="almost"?"Bijna goed":"Fout";
  return{grade,label,score,html:`Jouw antwoord: <em>${esc(actual||"—")}</em><br>Juiste tekst: <strong>${esc(expected)}</strong>`}
}
$("#stopPracticeBtn").onclick=()=>{if(confirm("Repetitie stoppen en opslaan?"))finishPractice()};
function finishPractice(){
  clearTimeout(autoTimer);const s=state.scripts.find(x=>x.id===practice.scriptId),session={id:crypto.randomUUID(),kind:practice.kind||"repeteren",scriptId:s.id,scriptTitle:s.title,started:new Date(practice.started).toISOString(),ended:nowIso(),duration:Math.round((Date.now()-practice.started)/1000),mode:practice.mode,unit:practice.unit,count:practice.count,...practice.results,scenes:[...practice.scenes]};
  state.sessions.push(session);save();practice=null;toast("Repetitie opgeslagen");go("dashboard")
}


function fillScriptSelector(scriptSel){
  if(!scriptSel)return;
  scriptSel.innerHTML=state.scripts.map(s=>`<option value="${s.id}" ${s.id===state.activeScriptId?"selected":""}>${esc(s.title)}</option>`).join("");
}
function renderLearnSetup(){
  fillScriptSelector($("#learnScript"));
  const s=state.scripts.find(x=>x.id===$("#learnScript").value)||activeScript();
  fillThreeRoleSelects("learn",s);
  updateLearnScope();
}
$("#learnScript").onchange=()=>{
  state.activeScriptId=$("#learnScript").value;
  save();
  const s=state.scripts.find(x=>x.id===$("#learnScript").value)||activeScript();
  fillThreeRoleSelects("learn",s);
  updateLearnScope();
};
$("#learnScope").onchange=updateLearnScope;
function updateLearnScope(){
  const s=state.scripts.find(x=>x.id===$("#learnScript").value)||activeScript();
  const scope=$("#learnScope").value,w=$("#learnScopeWrap");
  if(!s)return;
  if(scope==="act"||scope==="scene"){
    w.classList.remove("hidden");
    $("#learnScopeValue").innerHTML=[...new Set(s.lines.map(l=>l[scope]))].map(v=>`<option>${esc(v)}</option>`).join("");
  }else{
    w.classList.add("hidden");
  }
}
$("#startLearnBtn").onclick=()=>{
  try{
    const s=state.scripts.find(x=>x.id===$("#learnScript").value)||activeScript();
    if(!s)return toast("Voeg eerst een script toe.");
    if(!validateThreeRoles("learn",s))return;
    let items=buildPracticeItems(s,"line");
    const scope=$("#learnScope").value,val=$("#learnScopeValue").value;
    if(scope==="act")items=items.filter(x=>x.act===val);
    if(scope==="scene")items=items.filter(x=>x.scene===val);
    if($("#learnOrder").value==="random")items.sort(()=>Math.random()-.5);
    if(!items.length)return toast("Geen teksten gevonden voor deze rolkeuze.");
    learn={scriptId:s.id,queue:items,index:0,started:Date.now()};
    showLearnItem();
    go("learn");
  }catch(error){
    console.error(error);
    toast("Oefenen kon niet starten. Controleer de rolkeuzes.");
  }
};

function renderExtraSetup(){
  fillScriptSelector($("#extraScript"));
  const s=state.scripts.find(x=>x.id===$("#extraScript").value)||activeScript();
  fillThreeRoleSelects("extra",s);
}
$("#extraScript").onchange=()=>{
  state.activeScriptId=$("#extraScript").value;
  save();
  const s=state.scripts.find(x=>x.id===$("#extraScript").value)||activeScript();
  fillThreeRoleSelects("extra",s);
};
$("#startExtraBtn").onclick=()=>{
  try{
    const s=state.scripts.find(x=>x.id===$("#extraScript").value)||activeScript();
    if(!s)return toast("Voeg eerst een script toe.");
    if(!validateThreeRoles("extra",s))return;
    let items=buildPracticeItems(s,"line").filter(item=>
      item.lines.some(line=>line.difficult || (line.stats?.wrong||0)>0 || (line.stats?.almost||0)>0)
    );
    if(!items.length){
      items=buildPracticeItems(s,"line");
      toast("Nog geen moeilijke teksten gevonden; alle teksten worden gebruikt.");
    }
    if(!items.length)return toast("Geen teksten gevonden voor deze rolkeuze.");
    items.sort((a,b)=>itemPriority(b)-itemPriority(a));
    practice={
      kind:"extra",
      scriptId:s.id,
      mode:$("#extraMode").value,
      unit:"line",
      queue:items,
      index:0,
      started:Date.now(),
      results:{good:0,almost:0,wrong:0},
      count:0,
      scenes:new Set(),
      currentGraded:false
    };
    showPracticeItem();
    go("practice");
  }catch(error){
    console.error(error);
    toast("Extra oefenen kon niet starten. Controleer de rolkeuzes.");
  }
};

function getTwoPreviousRoleBlocks(script,item){
  const firstItemIndex=script.lines.findIndex(line=>line.id===item.lines[0]?.id);
  if(firstItemIndex<0)return [];

  // Zoek het echte begin van het huidige eigen tekstblok.
  // Bij meerdere geselecteerde schrijfwijzen worden opeenvolgende eigen regels
  // samen als één eigen blok beschouwd.
  let blockStart=firstItemIndex;
  while(blockStart>0){
    const previous=script.lines[blockStart-1];
    const current=script.lines[blockStart];
    if(previous.scene!==item.scene || current.scene!==item.scene || !isMine(script,previous))break;
    blockStart--;
  }

  const blocks=[];
  let i=blockStart-1;

  // Pak exact de twee volledige sprekerblokken direct vóór het eigen tekstblok.
  while(i>=0 && blocks.length<2){
    const lastLine=script.lines[i];
    if(lastLine.scene!==item.scene)break;

    const speaker=lastLine.speaker;
    const lines=[];

    while(i>=0){
      const line=script.lines[i];
      if(line.scene!==item.scene || line.speaker!==speaker)break;
      lines.unshift(line);
      i--;
    }

    blocks.unshift({
      speaker,
      lines,
      text:lines.map(line=>line.text).join("\n")
    });
  }

  return blocks;
}

function renderPreviousBlocks(target,blocks){
  target.innerHTML=blocks.length
    ? blocks.map(block=>`
        <div class="cue-block">
          <strong>${esc(block.speaker)}</strong>
          <div class="cue-block-text">
            ${block.lines.map(line=>`<p>${esc(line.text)}</p>`).join("")}
          </div>
        </div>
      `).join("")
    : `<div class="cue-block">Er staan geen twee volledige tekstblokken vóór jouw tekst in deze scène.</div>`;
}

function showLearnItem(){
  const script=state.scripts.find(entry=>entry.id===learn.scriptId);
  const item=learn.queue[learn.index];
  const blocks=getTwoPreviousRoleBlocks(script,item);

  item.cueBlocks=blocks;
  item.cues=blocks.flatMap(block=>block.lines);

  $("#learnProgress").textContent=`${learn.index+1} / ${learn.queue.length}`;
  $("#learnScene").textContent=`${item.act} · ${item.scene}`;
  renderPreviousBlocks($("#learnCues"),blocks);

  $("#learnAnswer").textContent=item.lines.map(line=>line.text).join("\n");
  $("#learnAnswer").classList.add("hidden");
  $("#learnAnswer").hidden=true;
  $("#learnAnswer").style.display="none";

  $("#nextLearnBtn").classList.add("hidden");
  $("#nextLearnBtn").hidden=true;
  $("#nextLearnBtn").style.display="none";
}
function revealLearnAnswer(){
  const answer=$("#learnAnswer");
  const next=$("#nextLearnBtn");
  if(!answer)return;
  answer.hidden=false;
  answer.classList.remove("hidden");
  answer.style.removeProperty("display");
  if(next){
    next.hidden=false;
    next.classList.remove("hidden");
    next.style.removeProperty("display");
  }
}
$("#revealLearnBtn").onclick=revealLearnAnswer;

function masteredLine(l){return l.stats.good>=3&&l.stats.streak>=2&&l.stats.good>l.stats.wrong}
function renderProgress(){
  const s=activeScript(),lines=s?targetLines(s):[],attempted=lines.filter(l=>l.stats.attempts),mastered=lines.filter(masteredLine);
  $("#progressMastered").textContent=lines.length?Math.round(mastered.length/lines.length*100)+"%":"0%";$("#progressPracticed").textContent=attempted.length;
  $("#progressMinutes").textContent=Math.round(state.sessions.reduce((n,x)=>n+x.duration,0)/60);$("#progressDays").textContent=new Set(state.sessions.map(x=>x.started.slice(0,10))).size;
  const scenes=[...new Set(lines.map(l=>l.scene))];$("#sceneProgress").innerHTML=scenes.map(sc=>{const a=lines.filter(l=>l.scene===sc),m=a.filter(masteredLine).length,p=a.length?Math.round(m/a.length*100):0;return`<div class="progress-row"><div class="progress-label"><span>${esc(sc)}</span><span>${p}%</span></div><div class="bar"><span style="width:${p}%"></span></div></div>`}).join("")||"<p class='empty'>Nog geen gegevens.</p>";
  const diff=[...lines].sort((a,b)=>(b.stats.wrong*3+b.stats.almost+(b.difficult?5:0))-(a.stats.wrong*3+a.stats.almost+(a.difficult?5:0))).slice(0,8).filter(l=>l.stats.attempts||l.difficult);
  $("#difficultLines").innerHTML=diff.map(l=>`<div class="list-item"><div><h3>${esc(l.text)}</h3><div class="meta">${esc(l.scene)} · ${l.stats.wrong}× fout · ${l.stats.almost}× bijna</div></div></div>`).join("")||"Nog onvoldoende gegevens.";
}
function renderHistory(){$("#historyList").innerHTML=state.sessions.slice().reverse().map(x=>sessionHtml(x,true)).join("")||`<div class="empty card">Nog geen sessies.</div>`}
function sessionHtml(x,del=false){return`<div class="list-item"><div><h3>${esc(x.scriptTitle)}</h3><div class="meta">${formatDate(x.started)} · ${(x.kind==="oefenen"?"Oefenen":x.kind==="extra"?"Extra oefenen":"Repeteren")} · ${Math.round(x.duration/60)} min · ${x.count} teksten<br>${x.kind==="oefenen"?"zonder beoordeling":`${x.good} goed, ${x.almost} bijna, ${x.wrong} fout`}</div></div>${del?`<button class="danger small" onclick="deleteSession('${x.id}')">Wis</button>`:""}</div>`}
window.deleteSession=id=>{if(confirm("Deze sessie verwijderen?")){state.sessions=state.sessions.filter(x=>x.id!==id);save();renderHistory()}};
function calcStreak(){const days=[...new Set(state.sessions.map(x=>x.started.slice(0,10)))].sort().reverse();let n=0,d=new Date();for(const day of days){const want=d.toISOString().slice(0,10);if(day===want){n++;d.setDate(d.getDate()-1)}else if(n===0){d.setDate(d.getDate()-1);if(day===d.toISOString().slice(0,10)){n++;d.setDate(d.getDate()-1)}else break}else break}return n}
function formatDate(x){return new Intl.DateTimeFormat("nl-NL",{dateStyle:"medium",timeStyle:"short"}).format(new Date(x))}
$("#exportBtn").onclick=()=>download("musicaltekst-oefenen-backup.json",JSON.stringify(state,null,2),"application/json");
$("#importFile").onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(!data.scripts||!data.settings)throw Error();state={...defaultState,...data};save();forceVersion24Refresh();ensureDataShape();applySettings();renderDashboard();toast("Back-up geïmporteerd")}catch{toast("Ongeldig back-upbestand")}};
function download(name,content,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
$("#deleteAllBtn").onclick=async()=>{if(confirm("Alle scripts, voortgang en instellingen definitief verwijderen?")){localStorage.removeItem(KEY);try{await clearRecordings()}catch{}state=structuredClone(defaultState);forceVersion24Refresh();ensureDataShape();applySettings();renderDashboard();toast("Alle gegevens verwijderd")}};
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));
forceVersion24Refresh();ensureDataShape();applySettings();renderDashboard();
$("#nextLearnBtn").onclick=()=>{
  learn.index++;
  if(learn.index>=learn.queue.length){
    const s=state.scripts.find(x=>x.id===learn.scriptId);
    state.sessions.push({
      id:crypto.randomUUID(),kind:"oefenen",scriptId:s.id,scriptTitle:s.title,
      started:new Date(learn.started).toISOString(),ended:nowIso(),
      duration:Math.round((Date.now()-learn.started)/1000),mode:"speak",unit:"line",
      count:learn.queue.length,good:0,almost:0,wrong:0,
      scenes:[...new Set(learn.queue.map(x=>x.scene))]
    });
    save();learn=null;toast("Oefensessie opgeslagen");go("dashboard");
  }else showLearnItem();
};

$("#stopLearnBtn").onclick=()=>{if(confirm("Oefensessie stoppen?")){learn=null;go("dashboard")}};
