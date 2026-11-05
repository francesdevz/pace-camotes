(function(){
  document.documentElement.classList.add('load');

  /* ---------- cinematic court art (stand-ins for photography) ---------- */
  function lerp(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}
  function scene(o,id){
    var W=1600,H=1000,c=o.court; // c: [tl,tr,br,bl] screen corners of the court
    function P(u,v){var top=lerp(c[0],c[1],u),bot=lerp(c[3],c[2],u);return lerp(top,bot,v);}
    function L(u1,v1,u2,v2){var a=P(u1,v1),b=P(u2,v2);return '<line x1="'+a[0].toFixed(1)+'" y1="'+a[1].toFixed(1)+'" x2="'+b[0].toFixed(1)+'" y2="'+b[1].toFixed(1)+'"/>';}
    var k=7/44, s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>'+
      '<filter id="gl'+id+'" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="'+(o.glow||5)+'" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
      '<filter id="bl'+id+'"><feGaussianBlur stdDeviation="6"/></filter>'+
      '<radialGradient id="ld'+id+'" cx="'+o.light[0]+'" cy="'+o.light[1]+'" r="'+(o.light[2]||.7)+'"><stop offset="0" stop-color="'+o.lightCol+'" stop-opacity="'+(o.lightA||.55)+'"/><stop offset="1" stop-color="'+o.lightCol+'" stop-opacity="0"/></radialGradient>'+
      '<radialGradient id="bf'+id+'" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#F6FBA8"/><stop offset=".55" stop-color="'+(o.ballCol||'#D8E24B')+'"/><stop offset="1" stop-color="#6E7413"/></radialGradient>'+
      '</defs><rect width="'+W+'" height="'+H+'" fill="'+o.bg+'"/>';
    var surround=[P(-.18,-.12),P(1.18,-.12),P(1.18,1.12),P(-.18,1.12)];
    s+='<polygon points="'+surround.map(function(p){return p.join(',')}).join(' ')+'" fill="'+o.surround+'"/>';
    s+='<polygon points="'+c.map(function(p){return p.join(',')}).join(' ')+'" fill="'+o.surface+'"/>';
    s+='<g stroke="'+o.line+'" stroke-width="'+(o.lw||6)+'" stroke-linecap="square" fill="none" filter="url(#gl'+id+')" opacity="'+(o.lineA||.9)+'">'+
      L(0,0,1,0)+L(1,0,1,1)+L(1,1,0,1)+L(0,1,0,0)+L(0,.5-k,1,.5-k)+L(0,.5+k,1,.5+k)+L(.5,0,.5,.5-k)+L(.5,.5+k,.5,1)+'</g>';
    var n1=P(-.06,.5),n2=P(1.06,.5),h=o.netH||40;
    s+='<polygon points="'+n1[0]+','+n1[1]+' '+n2[0]+','+n2[1]+' '+n2[0]+','+(n2[1]-h)+' '+n1[0]+','+(n1[1]-h*.8)+'" fill="#05060A" opacity=".55"/>';
    s+='<line x1="'+n1[0]+'" y1="'+(n1[1]-h*.8)+'" x2="'+n2[0]+'" y2="'+(n2[1]-h)+'" stroke="'+o.line+'" stroke-width="4" opacity=".85"/>';
    s+='<rect width="'+W+'" height="'+H+'" fill="url(#ld'+id+')"/>';
    if(o.ball){var b=o.ball,st='';
      for(var i=0;i<6;i++){var yy=b.y-b.r*.55+i*b.r*.22,len=b.r*(3+(i%3)*1.4);st+='<rect x="'+(b.x-b.r-len)+'" y="'+yy+'" width="'+len+'" height="'+b.r*.08+'" rx="'+b.r*.04+'" fill="#F1EEE6" opacity="'+(.08+.06*(i%3))+'"/>';}
      var holes='';[[0,0],[.5,-.15],[-.48,-.2],[.12,.55],[-.3,.45],[.42,.42],[-.05,-.55],[.62,.1],[-.62,.12]].forEach(function(p){holes+='<circle cx="'+(b.x+p[0]*b.r)+'" cy="'+(b.y+p[1]*b.r)+'" r="'+b.r*.1+'" fill="#5E6410" opacity=".75"/>';});
      s+='<g class="ball">'+(b.streak?st:'')+'<ellipse cx="'+(b.x+b.r*.3)+'" cy="'+(b.y+b.r*2.4)+'" rx="'+b.r*1.1+'" ry="'+b.r*.22+'" fill="#000" opacity=".5" filter="url(#bl'+id+')"/><circle cx="'+b.x+'" cy="'+b.y+'" r="'+b.r*1.6+'" fill="#D8E24B" opacity=".12" filter="url(#bl'+id+')"/><circle cx="'+b.x+'" cy="'+b.y+'" r="'+b.r+'" fill="url(#bf'+id+')"/>'+holes+'</g>';}
    if(o.paddle){var p=o.paddle;s+='<g transform="translate('+p.x+' '+p.y+') rotate('+p.a+') scale('+(p.s||1)+')"><rect x="-24" y="150" width="48" height="200" rx="16" fill="#0A0B12"/><rect x="-24" y="170" width="48" height="10" fill="'+p.edge+'"/><rect x="-168" y="-210" width="336" height="390" rx="150" fill="'+p.face+'"/><rect x="-168" y="-210" width="336" height="390" rx="150" fill="none" stroke="'+p.edge+'" stroke-width="8"/><path d="M-90 -120 L90 120" stroke="rgba(255,255,255,.08)" stroke-width="60"/></g>';}
    if(o.vignette!==false)s+='<radialGradient id="vg'+id+'" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient><rect width="'+W+'" height="'+H+'" fill="url(#vg'+id+')"/>';
    return s+'</svg>';
  }
  /* ---------- poster art: island-sunset pickleball (stand-ins for photography) ---------- */
  var BALLHOLES=[[0,0],[.5,-.15],[-.48,-.2],[.12,.55],[-.3,.45],[.42,.42],[-.05,-.55],[.62,.1],[-.62,.12],[.28,-.62],[-.62,-.45],[.7,-.42],[-.22,.78],[.4,.75]];
  function holes(cx,cy,r,fill,op,k){var s='';BALLHOLES.forEach(function(p){if(p[0]*p[0]+p[1]*p[1]<.92)s+='<circle cx="'+(cx+p[0]*r).toFixed(1)+'" cy="'+(cy+p[1]*r).toFixed(1)+'" r="'+(r*(k||.085)).toFixed(1)+'" fill="'+fill+'" opacity="'+op+'"/>';});return s;}
  function wave(y,amp,len,w,phase){var d='M'+(-40)+' '+y;for(var x=-40;x<=w+40;x+=len/2){var up=Math.round((x+phase)/(len/2))%2===0;d+=' Q'+(x+len/4)+' '+(y+(up?-amp:amp))+' '+(x+len/2)+' '+y;}return d;}
  function svgOpen(w,h){return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';}

  function heroArt(){
    var W=1600,H=1000,hz=640,sx=1230,sr=240,s=svgOpen(W,H)+'<defs>'+
      '<linearGradient id="hSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B0D2E"/><stop offset=".38" stop-color="#1D1D5C"/><stop offset=".72" stop-color="#5A2273"/><stop offset=".93" stop-color="#C8378F"/><stop offset="1" stop-color="#F06A8E"/></linearGradient>'+
      '<radialGradient id="hSun" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#F7FCC0"/><stop offset=".5" stop-color="#DCE84A"/><stop offset="1" stop-color="#A9B528"/></radialGradient>'+
      '<radialGradient id="hGlow"><stop offset="0" stop-color="#FFD9A0" stop-opacity=".55"/><stop offset=".45" stop-color="#F06A8E" stop-opacity=".22"/><stop offset="1" stop-color="#F06A8E" stop-opacity="0"/></radialGradient>'+
      '<linearGradient id="hSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A1E66"/><stop offset=".35" stop-color="#1A1B55"/><stop offset="1" stop-color="#0B0D2E"/></linearGradient>'+
      '<clipPath id="hAbove"><rect width="'+W+'" height="'+hz+'"/></clipPath>'+
      '<filter id="hSoft"><feGaussianBlur stdDeviation="2"/></filter></defs>';
    s+='<rect width="'+W+'" height="'+H+'" fill="url(#hSky)"/>';
    // stars
    for(var i=0;i<46;i++){var x=(i*337)%W,y=(i*151)%330+18;s+='<circle cx="'+x+'" cy="'+y+'" r="'+(i%5===0?1.6:.9)+'" fill="#F4EFE6" opacity="'+(.2+(i%4)*.12)+'"/>';}
    s+='<circle cx="'+sx+'" cy="'+hz+'" r="'+(sr*2.6)+'" fill="url(#hGlow)"/>';
    // the sun is a pickleball, half set
    s+='<g class="sun" clip-path="url(#hAbove)"><g class="sun-in"><circle cx="'+sx+'" cy="'+(hz+30)+'" r="'+sr+'" fill="url(#hSun)"/>'+holes(sx,hz+30,sr,'#7C861A',.55,.07)+'</g></g>';
    // distant islands
    s+='<path d="M0 '+hz+' L0 '+(hz-34)+' C 90 '+(hz-70)+', 170 '+(hz-58)+', 250 '+(hz-30)+' C 320 '+(hz-46)+', 380 '+(hz-40)+', 470 '+hz+' Z" fill="#14123F"/>';
    s+='<path d="M1380 '+hz+' C 1440 '+(hz-26)+', 1500 '+(hz-38)+', 1560 '+(hz-22)+' L1600 '+(hz-18)+' L1600 '+hz+' Z" fill="#14123F"/>';
    // sea + reflection
    s+='<rect y="'+hz+'" width="'+W+'" height="'+(H-hz)+'" fill="url(#hSea)"/>';
    for(var k=0;k<16;k++){var yy=hz+10+k*k*1.55+k*6,ww=(sr*1.7)*(1-k/22)*(.7+((k*7)%5)/10);s+='<rect x="'+(sx-ww/2+((k%3)-1)*14)+'" y="'+yy+'" width="'+ww+'" height="'+(2.5+k*.35)+'" rx="2" fill="#DCE84A" opacity="'+(.55-k*.028)+'"/>';}
    for(var j=0;j<9;j++){var wy=hz+26+j*j*5+j*10;s+='<path d="'+wave(wy,3+j*.9,90+j*26,W,j*37)+'" stroke="#F4EFE6" stroke-width="'+(1+j*.18)+'" fill="none" opacity="'+(.16+j*.02)+'"/>';}
    return s+'</svg>';
  }

  // flat graphic posters, 600 × 800
  function poster(kind){
    var W=600,H=800,s=svgOpen(W,H);
    if(kind==='pSport'){
      s+='<rect width="600" height="800" fill="#1A1D52"/>';
      s+='<g stroke="#F4EFE6" stroke-width="5" fill="none"><rect x="110" y="70" width="380" height="660"/><line x1="110" y1="400" x2="490" y2="400" stroke-width="9" stroke-dasharray="3 9" stroke-linecap="round"/><line x1="110" y1="337" x2="490" y2="337"/><line x1="110" y1="463" x2="490" y2="463"/><line x1="300" y1="70" x2="300" y2="337"/><line x1="300" y1="463" x2="300" y2="730"/></g>';
      s+='<rect x="110" y="337" width="380" height="126" fill="#C8378F" opacity=".35"/>';
      s+='<path d="M200 650 C 120 470, 380 380, 420 190" stroke="#DCE84A" stroke-width="3" stroke-dasharray="10 10" fill="none"/>';
      s+='<circle cx="420" cy="190" r="46" fill="#DCE84A"/>'+holes(420,190,46,'#7C861A',.6,.1);
    }else if(kind==='pFood'){
      s+='<rect width="600" height="800" fill="#C8378F"/>';
      s+='<defs><clipPath id="fSun"><circle cx="300" cy="360" r="210"/></clipPath></defs>';
      s+='<g clip-path="url(#fSun)"><rect x="80" y="140" width="440" height="440" fill="#FFB36B"/>';
      for(var i=0;i<7;i++)s+='<rect x="80" y="'+(380+i*30)+'" width="440" height="'+(4+i*3)+'" fill="#C8378F"/>';
      s+='</g><rect y="560" width="600" height="240" fill="#1A1D52"/>';
      for(var j=0;j<6;j++)s+='<path d="'+wave(590+j*34,5,70+j*10,600,j*20)+'" stroke="#F4EFE6" stroke-width="2" fill="none" opacity=".35"/>';
      // glass with straw
      s+='<path d="M250 470 L350 470 L336 700 L264 700 Z" fill="#F4EFE6" opacity=".92"/><path d="M258 520 L342 520 L336 700 L264 700 Z" fill="#DCE84A"/><line x1="320" y1="420" x2="300" y2="600" stroke="#1A1D52" stroke-width="7" stroke-linecap="round"/><circle cx="345" cy="478" r="26" fill="#FFB36B" stroke="#F4EFE6" stroke-width="5"/>';
    }else if(kind==='pGear'){
      s+='<rect width="600" height="800" fill="#DCE84A"/>';
      s+='<g transform="translate(300 380) rotate(-24)"><rect x="-30" y="170" width="60" height="230" rx="20" fill="#0B0C1E"/><rect x="-30" y="196" width="60" height="12" fill="#C8378F"/><rect x="-30" y="226" width="60" height="12" fill="#C8378F"/><rect x="-170" y="-230" width="340" height="420" rx="150" fill="#1A1D52"/><rect x="-170" y="-230" width="340" height="420" rx="150" fill="none" stroke="#C8378F" stroke-width="14"/><path d="M-100 -150 L60 120" stroke="#F4EFE6" stroke-width="40" opacity=".08" stroke-linecap="round"/><text x="0" y="-10" text-anchor="middle" font-family="Archivo, Arial, sans-serif" font-style="italic" font-weight="900" font-size="74" fill="#F4EFE6" letter-spacing="-2">PACE</text></g>';
      s+='<circle cx="470" cy="660" r="58" fill="#F4EFE6"/>'+holes(470,660,58,'#B4AFBC',.7,.1);
    }else if(kind==='pCrew'){
      s+='<rect width="600" height="800" fill="#EEE6D6"/>';
      s+='<rect x="110" y="70" width="380" height="660" fill="#E3D8C3"/>';
      s+='<g stroke="#1A1D52" stroke-width="5" fill="none"><rect x="110" y="70" width="380" height="660"/><line x1="110" y1="400" x2="490" y2="400" stroke-width="9" stroke-dasharray="3 9" stroke-linecap="round"/><line x1="110" y1="337" x2="490" y2="337"/><line x1="110" y1="463" x2="490" y2="463"/><line x1="300" y1="70" x2="300" y2="337"/><line x1="300" y1="463" x2="300" y2="730"/></g>';
      var pl=[[205,300,'#C8378F'],[395,300,'#C8378F'],[205,505,'#1A1D52'],[395,505,'#1A1D52']];
      s+='<g stroke="#1A1D52" stroke-width="2" stroke-dasharray="4 7" opacity=".6"><line x1="205" y1="300" x2="395" y2="505"/><line x1="395" y1="300" x2="205" y2="505"/></g>';
      pl.forEach(function(p){s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="40" fill="'+p[2]+'"/><circle cx="'+p[0]+'" cy="'+p[1]+'" r="56" fill="none" stroke="'+p[2]+'" stroke-width="2" opacity=".4"/>';});
      s+='<circle cx="300" cy="400" r="20" fill="#DCE84A" stroke="#1A1D52" stroke-width="3"/>';
    }
    return s+'</svg>';
  }

  function cafeArt(){
    var W=800,H=1000,s=svgOpen(W,H)+'<defs><clipPath id="cSun"><circle cx="400" cy="470" r="300"/></clipPath><linearGradient id="cSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A1D52"/><stop offset="1" stop-color="#5A2273"/></linearGradient></defs>';
    s+='<rect width="800" height="1000" fill="url(#cSky)"/>';
    s+='<g clip-path="url(#cSun)"><rect x="100" y="170" width="600" height="600" fill="#FFB36B"/><rect x="100" y="170" width="600" height="200" fill="#FFD27A"/>';
    for(var i=0;i<8;i++)s+='<rect x="100" y="'+(470+i*34)+'" width="600" height="'+(5+i*3.4)+'" fill="#5A2273"/>';
    s+='</g><rect y="700" width="800" height="300" fill="#0B0C1E"/>';
    for(var j=0;j<7;j++)s+='<path d="'+wave(730+j*38,5+j,90+j*14,800,j*30)+'" stroke="#FFB36B" stroke-width="2" fill="none" opacity="'+(.45-j*.05)+'"/>';
    // palm silhouette
    s+='<path d="M120 1000 C 130 860, 150 760, 190 640" stroke="#0B0C1E" stroke-width="18" fill="none" stroke-linecap="round"/>';
    [[-150,-30],[-120,40],[-40,-90],[60,-70],[110,10],[20,60]].forEach(function(f){s+='<path d="M190 640 Q '+(190+f[0]*.55)+' '+(640+f[1]*.2-60)+' '+(190+f[0])+' '+(640+f[1])+'" stroke="#0B0C1E" stroke-width="14" fill="none" stroke-linecap="round"/>';});
    // pickleball on the table
    s+='<circle cx="610" cy="880" r="62" fill="#DCE84A"/>'+holes(610,880,62,'#7C861A',.6,.1);
    return s+'</svg>';
  }

  var NIGHT={bg:'#05060A',surround:'#0E0F1A',surface:'#12153D',line:'#DCE84A',lw:4,glow:9,lineA:.85,court:[[200,560],[1400,560],[1700,1100],[-100,1100]],netH:30,light:[.5,.1,.7],lightCol:'#E9F0FF',lightA:.28,ball:{x:520,y:640,r:26,streak:true}};
  document.querySelectorAll('[data-art]').forEach(function(el){
    var k=el.getAttribute('data-art'),html='';
    if(k==='hero')html=heroArt();
    else if(k==='night')html=scene(NIGHT,'night');
    else if(k==='cafe')html=cafeArt();
    else if(k.charAt(0)==='p')html=poster(k);
    if(html)el.insertAdjacentHTML('afterbegin',html);
  });

  /* hero ball drifts with scroll */
  var heroBall=document.querySelector('.hero .sun-in');
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- header ---------- */
  var hdr=document.getElementById('hdr');
  function onScroll(){var y=window.scrollY;hdr.classList.toggle('solid',y>40);if(heroBall&&!reduce&&y<1200)heroBall.style.transform='translateY('+(y*.22)+'px)';}
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  var burger=document.getElementById('burger'),nav=document.getElementById('nav');
  burger.addEventListener('click',function(){var o=nav.classList.toggle('open');burger.setAttribute('aria-expanded',String(o));burger.setAttribute('aria-label',o?'Close menu':'Open menu');hdr.classList.toggle('solid',o||scrollY>40);});
  nav.addEventListener('click',function(e){if(e.target.tagName==='A'){nav.classList.remove('open');burger.setAttribute('aria-expanded','false');}});

  /* ---------- reveal (only for elements below the first screen) ---------- */
  if('IntersectionObserver' in window&&!reduce){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.remove('pre');io.unobserve(e.target);}});},{rootMargin:'0px 0px -8% 0px'});
    document.querySelectorAll('.rv').forEach(function(el){if(el.getBoundingClientRect().top>innerHeight){el.classList.add('pre');io.observe(el);}});
  }

})();
