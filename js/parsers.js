/* WordPress parsers (from the original prototype) */
function fromWP(p){
    const dec=s=>{const t=document.createElement('textarea');t.innerHTML=s||'';return t.value;};
    const emb=p._embedded||{}; const m=(emb['wp:featuredmedia']||[])[0]||{}; const sz=(m.media_details||{}).sizes||{};
    const doc=new DOMParser().parseFromString((p.content||{}).rendered||'','text/html');
    let paras=[...doc.querySelectorAll('p')].map(x=>x.textContent.replace(/\s+/g,' ').trim()).filter(t=>t.length>1);
    if(!paras.length)paras=doc.body.textContent.split(/\n+/).map(t=>t.trim()).filter(Boolean);
    const featured=m.source_url||''; const base=u=>(u||'').replace(/-\d+x\d+(?=\.\w+$)/,'').replace(/-scaled(?=\.\w+$)/,'');
    const seenG=new Set([base(featured)]); const gallery=[];
    doc.querySelectorAll('img').forEach(im=>{
      let src=im.getAttribute('data-src')||im.getAttribute('data-lazy-src')||im.getAttribute('src')||'';
      const ss=im.getAttribute('srcset')||im.getAttribute('data-srcset');
      if(ss){const best=ss.split(',').map(x=>x.trim().split(/\s+/)).map(([u,w])=>({u,w:parseInt(w)||0})).sort((a,b)=>b.w-a.w)[0];if(best&&best.u)src=best.u;}
      if(!/wp-content\/uploads/.test(src)||/emoji|gravatar|avatar/.test(src))return;
      const b=base(src); if(seenG.has(b))return; seenG.add(b);
      let th=src; const sm=ss&&ss.split(',').map(x=>x.trim().split(/\s+/)).map(([u,w])=>({u,w:parseInt(w)||0})).filter(x=>x.w>=300).sort((a,b)=>a.w-b.w)[0]; if(sm)th=sm.u;
      gallery.push({src,th});
    });
    const cats=((emb['wp:term']||[])[0]||[]).map(t=>dec(t.name));
    const keys=cats.map(nk);
    const match=CATS.find(c=>keys.some(k=>k.includes(nk(c.n))||nk(c.n).includes(k)));
    const rawT=dec((p.title||{}).rendered).trim(); if(!rawT)return null;
    const tags=((emb['wp:term']||[])[1]||[]).map(t=>dec(t.name).trim());
    const isBrk=BRK.test(rawT)||tags.includes('عاجل')||cats.some(c=>/^(عاجل|الأخبار العاجلة)$/.test(c.trim()))||(p.categories||[]).includes(8953);
    const title=rawT.replace(/^\s*[\[(«]?\s*عاجل\s*[\])»]?\s*[:：|\-–—.]*\s*/,'').trim()||rawT;
    const ex=new DOMParser().parseFromString((p.excerpt||{}).rendered||'','text/html').body.textContent.trim();
    const sub=dec(p.subtitle||(p.acf&&(p.acf.subtitle||p.acf.sub_title))||(p.meta&&(p.meta.subtitle||p.meta.sub_title))||'').replace(/<[^>]+>/g,'').trim();
    return norm({id:p.id,modified:p.modified,title,subtitle:sub||(FALLBACK.find(f=>f.id===p.id)||{}).subtitle||'',excerpt:ex,paras,gallery,full:true,commentsClosed:p.comment_status==='closed',date:p.date,link:p.link,
      img:(sz.large||sz.medium_large||{}).source_url||m.source_url||'',thumb:(sz.medium||sz.thumbnail||{}).source_url||m.source_url||'',
      cat:match?match.n:(cats[0]||'أخبار'),catKeys:keys,cids:(p.categories||[]),author:((emb.author||[])[0]||{}).name||'أصداء الديرة',views:+(p.views||p.post_views||(p.meta&&(p.meta.views||p.meta.post_views_count))||((FALLBACK.find(f=>f.id===p.id)||{}).views)||0),breaking:isBrk});
  }
function parseObit(x){
    const dec=s=>{const t=document.createElement('textarea');t.innerHTML=s||'';return t.value;};
    const title=dec((x.title||{}).rendered).trim();
    if(!/ذمة الله|رحمة الله|الرفيق الأعلى|وفاة|توفي/.test(title))return null;
    const html=((x.content||{}).rendered||'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n');
    const text=new DOMParser().parseFromString(html,'text/html').body.textContent;
    const lines=text.split(/\n+/).map(t=>t.replace(/\s+/g,' ').trim()).filter(t=>t.length>2);
    const body=lines.filter(l=>!/تتقدم|للإبلاغ|^0\d{8,}/.test(l));
    const female=/الحاجة|الشابة|الطفلة|السيدة|انتقلت|ستُشيع|ستشيع/.test(title+' '+text.slice(0,200));
    const nm=(title.match(/«([^»]+)»/)||[])[1]||title.replace(/في ذمة الله|تحديث\d*\s*:|محدّث\s*:/g,'').trim();
    const pre=(title.match(/(الحاجة|الحاج|الشابة|الشاب|الطفلة|الطفل|الأستاذة|الأستاذ|السيدة|السيد|سماحة)/)||[])[1]||'';
    const funeral=body.find(l=>/يُشيع|يشيع|ستُشيع|ستشيع|سيُشيع|تشييع|الدفن|مثوا/.test(l))||'';
    const time=(funeral.match(/(?:الساعة\s*)?[\d٠-٩]{1,2}[:٫][\d٠-٩]{2}\s*(?:عصراً|عصرا|ليلاً|ليلا|صباحاً|صباحا|ظهراً|ظهرا|مساءً|مساء)?/)||funeral.match(/بعد صلاة (?:الظهر|العصر|المغرب|العشاء|الفجر)/)||[])[0]||'';
    const place=(funeral.match(/(مقبرة[^،.\n]*|بقيع[^،.\n]*)/)||[])[1]||'';
    const cond=body.filter(l=>/عزاء|العزاء/.test(l)&&!/التعازي/.test(l));
    const ct=cond.join(' ');
    const both=(ct.match(/في ([^،.]*?)\s*،?\s*للرجال وللنساء/)||ct.match(/للرجال وللنساء[^،.]*?في ([^،.]+)/)||[])[1];
    const men=both||(ct.match(/(?:للرجال|عزاء الرجال:?)\s*(?:في\s*)?([^،.\n]+?)(?=،|\.|$|\s+وللنساء|\s+للنساء|\s+عزاء)/)||[])[1]||'';
    const women=both||(ct.match(/(?:للنساء|عزاء النساء:?)\s*(?:في\s*)?([^،.\n]+?)(?=،|\.|$|\s+عزاء)/)||[])[1]||'';
    const days=(ct.match(/(ثلاثة|يومين|يوم واحد|أربعة|خمسة)\s*أيام?/)||[])[0]||'';
    const age=(Date.now()-Date.parse(x.date))/864e5;
    const n=Math.max(1,Math.floor(age)+1);
    return {id:x.id,title,name:nm.replace(/^(الحاج|الحاجة|الشاب|الشابة|الطفل|الطفلة)\s*-?\s*/,'').replace(/\s*-\s*/,' – ').trim(),pre,female,date:x.date,link:x.link,
      funeral,time:time.trim(),place:place.trim(),men:men.trim(),women:women.trim(),days,cond,active:age<=3.2,dayN:n,
      closed:x.comment_status==='closed',paras:body};
  }
