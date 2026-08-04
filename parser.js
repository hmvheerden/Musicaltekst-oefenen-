/* Scriptparser voor Musicaltekst Oefenen — versie 16 */
window.ScriptParser = (() => {
  const sceneRx = /(?:^|\n)\s*(?:SC[ÈE]NE|SCENE)\s*[.:\-]?\s*([^\n]*)/gi;
  const actRx = /(?:^|\n)\s*(?:AKTE|ACT)\s*[.:\-]?\s*([^\n]*)/gi;
  const stageNames = /^(?:locatie|decor|decorwisseling|licht|instrumentaal|underscore|intro|cue|scenewisseling|scene wissel|tekst tijdens|pauze|einde)$/i;

  const songStartRx = /^(?:(?:LIED|SONG|MUZIEKNUMMER|MUSICALNUMMER|ZANGNUMMER|ZANG|NUMMER)\b|(?:REFREIN|COUPLET|VERSE|CHORUS|BRIDGE)\b|[♪♫])[\s:.\-–—0-9A-Za-zÀ-ÖØ-öø-ÿ’'"()[\]]*$/iu;
  const songBracketStartRx = /^(?:\[(?:LIED|SONG|MUZIEK|ZANG)[^\]]*\]|\((?:LIED|SONG|MUZIEK|ZANG)[^)]*\))$/iu;
  const songEndRx = /^(?:EINDE\s+(?:LIED|SONG|NUMMER|MUZIEK)|LIED\s+AFGELOPEN|MUZIEK\s+STOPT|ZANG\s+STOPT|DIALOOG|APPLAUS)\b/i;
  let lastSongFilterInfo={sections:0,lines:0};

  function isSceneOrActHeading(line){
    return /^(?:AKTE|ACT|SC[ÈE]NE|SCENE)\s*[.:\-]?\s*/i.test(line);
  }
  function isSongStart(line){
    const value=String(line||"").trim();
    if(!value)return false;
    return songStartRx.test(value)||songBracketStartRx.test(value);
  }
  function filterSongSections(text){
    const source=String(text||"").replace(/\r\n?/g,"\n");
    const input=source.split("\n");
    const output=[];
    let inSong=false,sections=0,skippedLines=0;

    for(const raw of input){
      const line=raw.trim();

      if(!inSong&&isSongStart(line)){
        inSong=true;
        sections++;
        if(line)skippedLines++;
        continue;
      }

      if(inSong){
        if(isSceneOrActHeading(line)){
          inSong=false;
          output.push(raw);
          continue;
        }
        if(songEndRx.test(line)){
          inSong=false;
          if(line)skippedLines++;
          continue;
        }
        if(line)skippedLines++;
        continue;
      }

      output.push(raw);
    }

    lastSongFilterInfo={sections,lines:skippedLines};
    return output.join("\n");
  }

  function blankStats(){return {attempts:0,good:0,almost:0,wrong:0,last:null,streak:0,nextDue:0}}
  function makeLine(act,scene,speaker,text){return {id:crypto.randomUUID(),act,scene,speaker,text,difficult:false,stats:blankStats()}}
  function normalize(text){return String(text||"").replace(/\r\n?/g,"\n").replace(/\u00a0/g," ").replace(/[ \t]+/g," ").replace(/ *\n */g,"\n").replace(/\n{3,}/g,"\n\n").trim()}
  function cleanSpeaker(s){return s.replace(/\([^)]*\)/g,"").replace(/\s+/g," ").trim()}
  function validSpeaker(s){
    s=cleanSpeaker(s);
    if(!s||s.length>42||stageNames.test(s)||/[!?]/.test(s))return false;
    const words=s.split(/\s+/);
    if(words.length>5)return false;
    return /^[A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÖØ-öø-ÿ0-9’' .+&()\/-]*$/u.test(s);
  }
  function lastHeading(text,index,type){
    const rx=type==="scene"?new RegExp(sceneRx.source,"gi"):new RegExp(actRx.source,"gi");
    let m,last=null;while((m=rx.exec(text))&&m.index<index)last=m[1].trim();
    if(!last)return type==="scene"?"Scène 1":"Akte 1";
    const label=type==="scene"?"Scène":"Akte";
    return /^\d/.test(last)?`${label} ${last.replace(/[.]+$/,'')}`:last;
  }

  function parseByLines(text){
    let act="Akte 1",scene="Scène 1",pending=null;const out=[];
    const speakerLine=/^([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÖØ-öø-ÿ0-9’' .+&()\/-]{0,41})\s*:\s*(.*)$/u;
    for(const raw of normalize(text).split("\n")){
      const line=raw.trim();if(!line){pending=null;continue}
      let m=line.match(/^(?:AKTE|ACT)\s*[.:\-]?\s*(.*)$/i);if(m){act=m[1]?(/^\d/.test(m[1])?`Akte ${m[1].replace(/[.]+$/,'')}`:m[1]):"Akte";pending=null;continue}
      m=line.match(/^(?:SC[ÈE]NE|SCENE)\s*[.:\-]?\s*(.*)$/i);if(m){scene=m[1]?(/^\d/.test(m[1])?`Scène ${m[1].replace(/[.]+$/,'')}`:m[1]):"Scène";pending=null;continue}
      m=line.match(speakerLine);
      if(m&&validSpeaker(m[1])){const sp=cleanSpeaker(m[1]),tx=m[2].trim();if(tx)out.push(makeLine(act,scene,sp,tx));else pending=sp;continue}
      if(pending){out.push(makeLine(act,scene,pending,line));pending=null;continue}
      if(out.length&&!/^(?:locatie|decor|licht|instrumentaal|underscore|intro|cue|scenewisseling)/i.test(line))out[out.length-1].text+=" "+line;
    }
    return out;
  }

  function parseLoose(text){
    text=normalize(text).replace(/\n/g," \n ");
    // Zoek elke korte, plausibele naam vóór een dubbele punt. Dit werkt ook als een PDF-pagina één lange regel wordt.
    const marker=/(?:^|[\n.!?]\s+|\)\s+)([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÖØ-öø-ÿ0-9’' .+&()\/-]{0,41}?)\s*:\s*/gu;
    const matches=[...text.matchAll(marker)].filter(m=>validSpeaker(m[1]));
    const out=[];
    for(let i=0;i<matches.length;i++){
      const m=matches[i], start=m.index+m[0].length, end=i+1<matches.length?matches[i+1].index:text.length;
      let spoken=text.slice(start,end).replace(/\s*\n\s*/g," ").replace(/\s+/g," ").trim();
      // Knip duidelijke scène-/akte- of paginawissels aan het einde af.
      spoken=spoken.split(/\s+(?=(?:SC[ÈE]NE|SCENE|AKTE|ACT)\s*\d|\d+\s*$)/i)[0].trim();
      if(!spoken)continue;
      const speaker=cleanSpeaker(m[1]);
      out.push(makeLine(lastHeading(text,m.index,"act"),lastHeading(text,m.index,"scene"),speaker,spoken));
    }
    return out;
  }


  function normalizeRoleForMatch(value){
    return String(value||"")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/[’‘`´]/g,"'")
      .replace(/[.\-–—_]/g," ")
      .replace(/\s+/g," ")
      .trim()
      .toLowerCase();
  }

  function roleIdentity(value){
    const normalized=normalizeRoleForMatch(value);

    // Genummerde rollen blijven altijd afzonderlijk.
    // Voorbeelden: MAN 1, MAN 2, MAN 3, STEM 1, STEM 2.
    const numbered=normalized.match(/^(.*?)(?:\s*)(\d+)$/);
    if(numbered){
      const base=numbered[1].replace(/[^a-z0-9]/g,"");
      return `${base}#${numbered[2]}`;
    }

    // Niet-genummerde rollen worden gecombineerd wanneer alleen
    // hoofdletters, accenten, spaties, apostroffen of kleine leestekens verschillen.
    return normalized.replace(/[^a-z0-9]/g,"");
  }

  function chooseCanonicalRole(names){
    const cleaned=[...new Set(names.map(name=>String(name||"").trim()).filter(Boolean))];
    if(!cleaned.length)return "";

    return cleaned.sort((a,b)=>{
      const score=name=>{
        let points=0;
        if(/[a-z]/.test(name)&&/[A-Z]/.test(name))points+=5;
        if(/['’]/.test(name))points+=2;
        if(name===name.toUpperCase())points-=3;
        return points;
      };
      return score(b)-score(a)||a.length-b.length||a.localeCompare(b,"nl");
    })[0];
  }

  function levenshteinDistance(a,b){
    const left=String(a||"");
    const right=String(b||"");
    const rows=left.length+1;
    const cols=right.length+1;
    const matrix=Array.from({length:rows},()=>Array(cols).fill(0));

    for(let i=0;i<rows;i++)matrix[i][0]=i;
    for(let j=0;j<cols;j++)matrix[0][j]=j;

    for(let i=1;i<rows;i++){
      for(let j=1;j<cols;j++){
        const cost=left[i-1]===right[j-1]?0:1;
        matrix[i][j]=Math.min(
          matrix[i-1][j]+1,
          matrix[i][j-1]+1,
          matrix[i-1][j-1]+cost
        );
      }
    }
    return matrix[left.length][right.length];
  }

  function numberedRoleParts(value){
    const normalized=normalizeRoleForMatch(value);
    const match=normalized.match(/^(.*?)(?:\s*)(\d+)$/);
    if(!match)return null;
    return {
      base:match[1].replace(/[^a-z0-9]/g,""),
      number:match[2]
    };
  }

  function rolesAreFuzzyMatch(a,b){
    const numberedA=numberedRoleParts(a);
    const numberedB=numberedRoleParts(b);

    // Zodra één van beide namen een nummer heeft, mag alleen exact dezelfde
    // basis én exact hetzelfde nummer worden gecombineerd.
    if(numberedA||numberedB){
      return Boolean(
        numberedA&&numberedB&&
        numberedA.base===numberedB.base&&
        numberedA.number===numberedB.number
      );
    }

    const left=roleIdentity(a);
    const right=roleIdentity(b);
    if(!left||!right)return false;
    if(left===right)return true;

    const maxLength=Math.max(left.length,right.length);
    const minLength=Math.min(left.length,right.length);

    // Bij korte namen is fuzzy matching te riskant.
    if(minLength<5)return false;

    const distance=levenshteinDistance(left,right);
    const allowedDistance=maxLength>=9?2:1;
    const similarity=1-(distance/maxLength);

    return distance<=allowedDistance&&similarity>=0.80;
  }

  function groupRoles(lines){
    const groups=[];

    for(const line of lines||[]){
      const speaker=String(line.speaker||"").trim();
      if(!speaker)continue;

      let group=groups.find(existing=>
        existing.variants.some(variant=>rolesAreFuzzyMatch(variant,speaker))
      );

      if(!group){
        group={variants:[]};
        groups.push(group);
      }

      if(!group.variants.includes(speaker))group.variants.push(speaker);
    }

    return groups.map(group=>({
      key:roleIdentity(chooseCanonicalRole(group.variants)),
      canonical:chooseCanonicalRole(group.variants),
      variants:[...group.variants]
    }));
  }

  function canonicalizeRoleNames(lines){
    const groups=groupRoles(lines);
    const canonicalByVariant=new Map();

    for(const group of groups){
      for(const variant of group.variants){
        canonicalByVariant.set(roleIdentity(variant),group.canonical);
      }
    }

    return (lines||[]).map(line=>({
      ...line,
      originalSpeaker:line.originalSpeaker||line.speaker,
      speaker:canonicalByVariant.get(roleIdentity(line.speaker))||line.speaker
    }));
  }

  function parse(text){
    const filtered=filterSongSections(text);
    const normal=parseByLines(filtered);
    const parsed=normal.length>=3?normal:parseLoose(filtered);
    return canonicalizeRoleNames(parsed);
  }
  function roles(lines){
    return groupRoles(lines).map(group=>group.canonical).sort((a,b)=>a.localeCompare(b,"nl"));
  }
  async function extractFile(file){
    const ext=file.name.split(".").pop().toLowerCase();
    if(ext==="txt")return await file.text();
    if(ext==="docx"){
      if(!window.mammoth)throw new Error("De Word-lezer kon niet worden geladen. Controleer internet en probeer opnieuw.");
      const out=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});return out.value;
    }
    if(ext==="pdf"){
      try{
        const pdfjs=await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
        const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;let text="";
        for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n),content=await page.getTextContent({normalizeWhitespace:true});text+=pdfItemsToLines(content.items)+"\n\n"}
        return text;
      }catch(e){console.error(e);throw new Error("De PDF kon niet worden gelezen. Probeer de PDF opnieuw of plak de tekst.")}
    }
    throw new Error("Dit bestandstype wordt niet ondersteund.");
  }
  function getLastSongFilterInfo(){return {...lastSongFilterInfo}}
  return {parse,roles,extractFile,filterSongSections,getLastSongFilterInfo,normalizeRoleForMatch,roleIdentity,levenshteinDistance,rolesAreFuzzyMatch,groupRoles,canonicalizeRoleNames};
})();
