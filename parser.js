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
  async function extractPdfWithPdfJs(file){
    if(typeof pdfjsLib==="undefined")throw new Error("De PDF-bibliotheek is niet geladen.");
    const buffer=await file.arrayBuffer();
    const pdf=await pdfjsLib.getDocument({data:buffer,disableWorker:true}).promise;
    const pages=[];

    for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
      const page=await pdf.getPage(pageNumber);
      const content=await page.getTextContent({
        normalizeWhitespace:true,
        disableCombineTextItems:false
      });

      const items=(content.items||[])
        .filter(item=>item&&typeof item.str==="string")
        .map(item=>({
          text:item.str,
          x:Number(item.transform?.[4]||0),
          y:Number(item.transform?.[5]||0)
        }))
        .filter(item=>item.text.trim());

      items.sort((a,b)=>{
        const yDiff=b.y-a.y;
        return Math.abs(yDiff)>2?yDiff:a.x-b.x;
      });

      const lines=[];
      for(const item of items){
        let line=lines.find(existing=>Math.abs(existing.y-item.y)<=2.5);
        if(!line){
          line={y:item.y,items:[]};
          lines.push(line);
        }
        line.items.push(item);
      }

      pages.push(
        lines
          .sort((a,b)=>b.y-a.y)
          .map(line=>line.items
            .sort((a,b)=>a.x-b.x)
            .map(item=>item.text)
            .join(" ")
            .replace(/\s+/g," ")
            .trim()
          )
          .filter(Boolean)
          .join("\n")
      );
    }

    return pages.join("\n\n").trim();
  }

  async function extractPdfFallback(file){
    if(typeof pdfjsLib==="undefined")throw new Error("De PDF-bibliotheek is niet geladen.");
    const buffer=await file.arrayBuffer();
    const pdf=await pdfjsLib.getDocument({data:buffer,disableWorker:true}).promise;
    const pages=[];

    for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
      const page=await pdf.getPage(pageNumber);
      const content=await page.getTextContent();
      let pageText="";
      let lastY=null;

      for(const item of content.items||[]){
        const text=String(item.str||"").trim();
        if(!text)continue;
        const y=Number(item.transform?.[5]||0);
        if(lastY!==null&&Math.abs(lastY-y)>4)pageText+="\n";
        else if(pageText&&!pageText.endsWith("\n"))pageText+=" ";
        pageText+=text;
        lastY=y;
      }

      pages.push(
        pageText
          .replace(/[ \t]+\n/g,"\n")
          .replace(/\n{3,}/g,"\n\n")
          .trim()
      );
    }

    return pages.join("\n\n").trim();
  }

  function explainPdfFailure(error,text){
    const message=String(error?.message||error||"").toLowerCase();
    if(message.includes("password"))return "Deze PDF is beveiligd met een wachtwoord.";
    if(message.includes("invalid pdf"))return "Dit bestand lijkt geen geldige PDF te zijn.";
    if(message.includes("missing pdf"))return "De PDF kon niet volledig worden geladen.";
    if(!text||text.trim().length<20)return "Deze PDF bevat waarschijnlijk alleen afbeeldingen of gescande pagina's zonder leesbare tekst.";
    return "De tekst uit de PDF kon niet goed worden verwerkt.";
  }

  async function extractFile(file){
    const name=String(file?.name||"").toLowerCase();
    const type=String(file?.type||"").toLowerCase();

    if(name.endsWith(".txt")||type.startsWith("text/")){
      return await file.text();
    }

    if(name.endsWith(".docx")){
      if(typeof mammoth==="undefined")throw new Error("De Word-bibliotheek is niet geladen.");
      const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
      return String(result.value||"").trim();
    }

    if(name.endsWith(".pdf")||type==="application/pdf"){
      let firstError=null;
      let firstText="";

      try{
        firstText=await extractPdfWithPdfJs(file);
        if(firstText&&firstText.trim().length>=20)return firstText;
      }catch(error){
        firstError=error;
      }

      try{
        const fallbackText=await extractPdfFallback(file);
        if(fallbackText&&fallbackText.trim().length>=20)return fallbackText;
        throw new Error(explainPdfFailure(firstError,fallbackText||firstText));
      }catch(error){
        throw new Error(explainPdfFailure(error,firstText));
      }
    }

    throw new Error("Dit bestandstype wordt niet ondersteund. Gebruik PDF, Word (.docx) of tekst (.txt).");
  }
  function getLastSongFilterInfo(){return {...lastSongFilterInfo}}
  return {parse,roles,extractFile,filterSongSections,getLastSongFilterInfo,normalizeRoleForMatch,roleIdentity,levenshteinDistance,rolesAreFuzzyMatch,groupRoles,canonicalizeRoleNames};
})();
