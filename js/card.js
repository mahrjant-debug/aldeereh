/* بطاقة المشاركة كصورة 1080×1350 (منقولة من التطبيق الأصلي) */
(function () {
'use strict';
let busy = false;
  async function _card(p){
    const W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
    const img=(src,cors=true)=>new Promise(r=>{if(!src)return r(null);const i=new Image();if(cors&&/^https?:/.test(src)){i.crossOrigin='anonymous';src+=(src.includes('?')?'&':'?')+'cardcors=1';}i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src;});
    try{await document.fonts.load('700 60px "IBM Plex Sans Arabic"');await document.fonts.load('600 30px "IBM Plex Sans Arabic"');}catch(e){}
    const LOGO=(window.__resources&&window.__resources.logo)||'/assets/logo.png';
    const PX=u=>'https://wsrv.nl/?url='+encodeURIComponent(u)+'&w=1200&output=jpg';
    const usable=im=>{if(!im)return false;try{const t=document.createElement('canvas');t.width=t.height=2;const tx=t.getContext('2d');tx.drawImage(im,0,0,2,2);tx.getImageData(0,0,1,1);return true;}catch(e){return false;}};
    const getPic=async src=>{if(!src)return null;let im=await img(src);if(usable(im))return im;im=await new Promise(r=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>r(i);i.onerror=()=>r(null);i.src=PX(src);});return usable(im)?im:null;};
    let [pic,lg]=await Promise.all([getPic(p.img||p.thumb),img(LOGO,false)]);if(!pic&&p.thumb&&p.thumb!==p.img)pic=await getPic(p.thumb);
    const cover=(im,dx,dy,dw,dh,fy)=>{const r=Math.max(dw/im.width,dh/im.height),w=im.width*r,hh=im.height*r;x.drawImage(im,dx+(dw-w)/2,dy+(dh-hh)*(fy??.35),w,hh);};
    let ok=false;
    const wrap=(t,font,max,maxL)=>{x.font=font;const ws=t.split(/\s+/);const L=[];let cur='';ws.forEach(w=>{const tt=cur?cur+' '+w:w;if(x.measureText(tt).width>max&&cur){L.push(cur);cur=w;}else cur=tt;});if(cur)L.push(cur);if(L.length>maxL){L.length=maxL;L[maxL-1]=L[maxL-1].replace(/\s?\S+$/,'')+'…';}return L;};
    const P=64,RX=W-P;
    let fs=62,lines=wrap(p.title,'700 62px "IBM Plex Sans Arabic",sans-serif',W-P*2,4);if(lines.length>=3){fs=54;lines=wrap(p.title,'700 54px "IBM Plex Sans Arabic",sans-serif',W-P*2,4);}
    const lh=fs*1.42, footY=H-P+4;
    const sub=p.subtitle?wrap(p.subtitle,'600 32px "IBM Plex Sans Arabic",sans-serif',W-P*2,2):[];
    let y=footY-70-(lines.length-1)*lh;
    const sy0=y-fs-12-(sub.length?(sub.length-1)*46+8:0);
    const rowY=(sub.length?sy0-32:y-fs)-30-50;
    const avail=rowY-36;
    let ih=0;
    if(pic){try{
      x.save();x.filter='blur(44px) saturate(1.35) brightness(.82)';cover(pic,-80,-80,W+160,H+160,.5);x.restore();x.filter='none';
      x.fillStyle='rgba(8,16,11,.18)';x.fillRect(0,0,W,H);
      const fade=Math.min(260,H*.2);
      const r=Math.min(W/pic.width,(avail+fade)/pic.height);let dw=pic.width*r,dh=pic.height*r;
      if(dw<W&&dw/W>0.8){dw=W;dh=Math.min(pic.height*W/pic.width,avail+fade);}
      ih=dh;const dx=(W-dw)/2,iy=0;
      const L=document.createElement('canvas');L.width=W;L.height=Math.ceil(dh);const lx=L.getContext('2d');
      const rr=Math.max(dw/pic.width,dh/pic.height);lx.drawImage(pic,dx+(dw-pic.width*rr)/2,(dh-pic.height*rr)*.3,pic.width*rr,pic.height*rr);
      const M=document.createElement('canvas');M.width=W;M.height=L.height;const mx=M.getContext('2d');
      const fy=Math.max(0,dh-fade);const mg=mx.createLinearGradient(0,fy,0,dh);mg.addColorStop(0,'rgba(0,0,0,1)');mg.addColorStop(.55,'rgba(0,0,0,.55)');mg.addColorStop(1,'rgba(0,0,0,0)');
      mx.fillStyle='#000';mx.fillRect(0,0,W,fy);mx.fillStyle=mg;mx.fillRect(0,fy,W,dh-fy);
      if(dw<W){const sm=Math.min(70,(W-dw)/2);mx.globalCompositeOperation='destination-out';mx.fillStyle='#000';mx.fillRect(0,0,dx,dh);mx.fillRect(dx+dw,0,W-dx-dw,dh);
        const gl=mx.createLinearGradient(dx,0,dx+sm,0);gl.addColorStop(0,'rgba(0,0,0,1)');gl.addColorStop(1,'rgba(0,0,0,0)');mx.fillStyle=gl;mx.fillRect(dx,0,sm,dh);
        const gr=mx.createLinearGradient(dx+dw-sm,0,dx+dw,0);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,1)');mx.fillStyle=gr;mx.fillRect(dx+dw-sm,0,sm,dh);}
      lx.globalCompositeOperation='destination-in';lx.drawImage(M,0,0);
      x.drawImage(L,0,iy);
      x.getImageData(0,0,1,1);ok=true;}catch(e){ok=false;x.filter='none';}}
    if(!ok){const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,'#4E9A38');g.addColorStop(.55,'#1F3B20');g.addColorStop(1,'#0E1A12');x.fillStyle=g;x.fillRect(0,0,W,H);
      x.globalAlpha=.08;for(let i=0;i<14;i++){x.beginPath();x.arc(W*.85,H*.18,90+i*70,0,Math.PI*2);x.lineWidth=2;x.strokeStyle='#fff';x.stroke();}x.globalAlpha=1;}
    const gs=Math.max(0,rowY-140);
    let g=x.createLinearGradient(0,gs,0,H);g.addColorStop(0,'rgba(8,16,11,0)');g.addColorStop(Math.min(.9,140/(H-gs)),'rgba(8,16,11,.62)');g.addColorStop(1,'rgba(8,16,11,.9)');x.fillStyle=g;x.fillRect(0,gs,W,H-gs);
    x.direction='rtl';x.textAlign='right';x.textBaseline='alphabetic';
    if(sub.length){x.fillStyle='#CDEB9E';x.font='600 32px "IBM Plex Sans Arabic",sans-serif';x.shadowColor='rgba(0,0,0,.5)';x.shadowBlur=12;sub.forEach((l,i)=>x.fillText(l,RX,sy0+i*46));x.shadowBlur=0;}
    const cat=p.cat||'أخبار';x.font='700 28px "IBM Plex Sans Arabic",sans-serif';const ch=50,cw=x.measureText(cat).width+44;
    x.fillStyle='#8CC63F';x.beginPath();x.roundRect(RX-cw,rowY,cw,ch,25);x.fill();x.fillStyle='#0E1A0B';x.fillText(cat,RX-22,rowY+34);
    let nx=RX-cw-12;
    if(p.breaking){x.font='700 26px "IBM Plex Sans Arabic",sans-serif';const bw=x.measureText('عاجل').width+40;x.fillStyle='#E2231A';x.beginPath();x.roundRect(nx-bw,rowY,bw,ch,25);x.fill();x.fillStyle='#fff';x.fillText('عاجل',nx-20,rowY+34);nx-=bw+12;}
    if(lg){const lw=Math.min(240,(ch-12)*lg.width/lg.height+24);x.fillStyle='rgba(255,255,255,.96)';x.beginPath();x.roundRect(nx-lw,rowY,lw,ch,14);x.fill();const iw=lw-24,ih2=Math.min(iw*lg.height/lg.width,ch-12);x.drawImage(lg,nx-lw+12,rowY+(ch-ih2)/2,iw,ih2);}
    x.fillStyle='#fff';x.font='700 '+fs+'px "IBM Plex Sans Arabic",sans-serif';x.shadowColor='rgba(0,0,0,.4)';x.shadowBlur=18;lines.forEach((l,i)=>x.fillText(l,RX,y+i*lh));x.shadowBlur=0;
    // footer
    x.fillStyle='rgba(255,255,255,.18)';x.fillRect(P,footY-52,W-P*2,2);
    x.fillStyle='rgba(255,255,255,.92)';x.font='600 30px "IBM Plex Sans Arabic",sans-serif';
    let dt='';try{dt=new Intl.DateTimeFormat('ar',{day:'numeric',month:'long',year:'numeric',numberingSystem:'latn'}).format(new Date(p.date));}catch(e){}
    x.fillText(dt,RX,footY);x.textAlign='left';x.direction='ltr';x.fillStyle='#8CC63F';x.font='700 30px "IBM Plex Sans Arabic",sans-serif';x.fillText('aldeereh.com',P,footY);
    const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.92));if(!blob){AL.toast('تعذّر إنشاء البطاقة');return;}
    const file=new File([blob],'aldeereh-'+p.id+'.jpg',{type:'image/jpeg'});
    if(!ok&&(p.img||p.thumb))AL.toast('تعذّر تحميل صورة الخبر، أُنشئت البطاقة بخلفية الصحيفة');
    try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:p.title,text:p.title+'\n'+p.link});return;}}catch(e){return;}
    const u=URL.createObjectURL(blob);AL.cardPreview(u,p);
  }

AL.cardPreview = (u, p) => {
  AL.openModal(`<div class="m-box light"><button class="m-x" aria-label="إغلاق"><span class="material-symbols-rounded">close</span></button><img class="cardprev" src="${u}" alt="بطاقة الخبر"><div class="acts"><a class="btn" href="${u}" download="aldeereh-${p.id}.jpg">حفظ الصورة</a></div></div>`);
};
AL.shareCard = async (p, btn) => {
  if (busy) return; busy = true; if (btn) btn.disabled = true; AL.toast('جارٍ إنشاء البطاقة…');
  try { await _card(p); } catch (e) { AL.toast('تعذّر إنشاء البطاقة'); }
  busy = false; if (btn) btn.disabled = false;
};
})();
