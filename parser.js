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

  function parse(text){
    const filtered=filterSongSections(text);
    const normal=parseByLines(filtered);
    if(normal.length>=3)return normal;
    return parseLoose(filtered);
  }
  function roles(lines){return [...new Set(lines.map(l=>l.speaker).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"nl"))}

  function pdfItemsToLines(items){
    const rows=[];
    for(const item of items){
      const text=String(item.str||"").trim();if(!text)continue;
      const x=item.transform?.[4]??0,y=item.transform?.[5]??0;
      let row=rows.find(r=>Math.abs(r.y-y)<=4);
      if(!row){row={y,parts:[]};rows.push(row)}
      row.parts.push({x,text});
    }
    return rows.sort((a,b)=>b.y-a.y).map(r=>r.parts.sort((a,b)=>a.x-b.x).map(p=>p.text).join(" ").replace(/\s+/g," ").trim()).filter(Boolean).join("\n");
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
  return {parse,roles,extractFile,filterSongSections,getLastSongFilterInfo};
})();
