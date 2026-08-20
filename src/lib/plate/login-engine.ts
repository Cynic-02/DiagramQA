// @ts-nocheck
/* ==================================================================
   THE LOGIN PLATE

   One specimen plate, five beats, scroll as the timeline. It strokes
   itself into existence, labels itself with six leader lines and six
   Bloom tags, lets those tags become questions, has a second agent
   stamp each one — rejecting 04, rewriting it, re-stamping it — and
   then files the set away into the wordmark. The card never moves.

   The plate also answers the form: focusing a field dims the specimen
   so the fields carry the contrast, and typing a password closes a
   security ring around the whole plate. Those come in through the
   handle, so React owns the form and the engine owns the drawing.

   Pure SVG + stroke-dashoffset. No WebGL, no assets. render() is a
   pure function of (scroll, form state).
   ================================================================== */

export type LoginPlateHandle = {
  /** 0 or 1 — an email/text field has focus. */
  setEmailFocus(v: number): void
  /** 0 or 1 — a password field has focus. */
  setPassFocus(v: number): void
  /** Password length; closes the security ring at 10 characters. */
  setPassLen(n: number): void
  /** Hold a fixed beat position, or null to follow scroll. */
  setScrub(v: number | null): void
  /** Scroll progress across the five beats, 0..1. */
  progress(): number
  destroy(): void
}

export type LoginPlateOptions = {
  /** Ids of the page's chrome. Any of them may be absent. */
  ids?: { progress?: string; beat?: string; rail?: string; caps?: string }
  /** Fired when the settled beat changes. */
  onBeat?: (index: number, name: string, progress: number) => void
}

export function mountLoginPlate(
  host: HTMLElement,
  opts: LoginPlateOptions = {}
): LoginPlateHandle {
  var IDS = opts.ids || {}
  var onBeat = opts.onBeat || null
  var lastBeat = -1
  var stopped = false
  var raf = 0

  var NS='http://www.w3.org/2000/svg';
  var clamp=function(v,a,b){return Math.max(a,Math.min(b,v))};
  var ease=function(t){return 1-Math.pow(1-t,3)};
  var easeIO=function(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
  var RM=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function E(tag,attrs,parent){
    var e=document.createElementNS(NS,tag);
    if(attrs) for(var k in attrs) e.setAttribute(k,attrs[k]);
    if(parent) parent.appendChild(e);
    return e;
  }

  /* ══════════════════════════════════════════════════════════
     BUILD THE PLATE
     ══════════════════════════════════════════════════════════ */
  var svg=E('svg',{viewBox:'0 0 1600 900',preserveAspectRatio:'xMidYMid slice','class':'plate-svg'},host);
  var defs=E('defs',{},svg);

  /* graph paper */
  var pat=E('pattern',{id:'gp',width:'40',height:'40',patternUnits:'userSpaceOnUse'},defs);
  E('path',{d:'M0 .5H40M.5 0V40',stroke:'currentColor','stroke-opacity':'.10','stroke-width':'1','stroke-dasharray':'6 7',fill:'none'},pat);
  var pat2=E('pattern',{id:'gp2',width:'200',height:'200',patternUnits:'userSpaceOnUse'},defs);
  E('path',{d:'M0 .5H200M.5 0V200',stroke:'currentColor','stroke-opacity':'.16','stroke-width':'1.2',fill:'none'},pat2);

  var gPaper=E('g',{},svg);
  E('rect',{x:0,y:0,width:1600,height:900,fill:'url(#gp)'},gPaper);
  E('rect',{x:0,y:0,width:1600,height:900,fill:'url(#gp2)'},gPaper);

  var gFar =E('g',{},svg);   /* plate frame + furniture (parallax slowest) */
  var gMid =E('g',{},svg);   /* the specimen                              */
  var gNear=E('g',{},svg);   /* leaders, tags, chips (parallax fastest)   */
  var gMark=E('g',{},svg);   /* wordmark                                  */

  /* ── plate frame + title block ───────────────────────────── */
  var frame=E('g',{},gFar);
  var fRect=E('rect',{x:596,y:112,width:610,height:676,fill:'none',stroke:'currentColor','stroke-width':2.4,'stroke-opacity':.5},frame);
  [[596,112,1],[1206,112,-1],[1206,788,-1],[596,788,1]].forEach(function(c,i){
    var sy=i<2?1:-1;
    E('path',{d:'M'+(c[0])+' '+(c[1]+26*sy)+' L '+c[0]+' '+c[1]+' L '+(c[0]+26*c[2])+' '+c[1],
      fill:'none',stroke:'currentColor','stroke-width':3,'stroke-opacity':.85},frame);
  });
  var tb=E('g',{},frame);
  E('line',{x1:610,y1:748,x2:840,y2:748,stroke:'currentColor','stroke-width':1.4,'stroke-opacity':.45},tb);
  var tbT1=E('text',{x:610,y:770,'class':'pf-mono','font-size':13,'font-weight':700,'letter-spacing':2.4,fill:'currentColor','fill-opacity':.7},tb);
  tbT1.textContent='PLATE 01 · SPECIMEN';
  var tbT2=E('text',{x:1206,y:770,'text-anchor':'end','class':'pf-mono','font-size':12,'letter-spacing':1.8,fill:'currentColor','fill-opacity':.45},tb);
  tbT2.textContent='DIAGRAMMIND · INGEST';
  /* scale bar */
  var sb=E('g',{},frame);
  E('rect',{x:1080,y:730,width:56,height:7,fill:'currentColor','fill-opacity':.65},sb);
  E('rect',{x:1136,y:730,width:56,height:7,fill:'none',stroke:'currentColor','stroke-width':1.4,'stroke-opacity':.65},sb);
  var sbT=E('text',{x:1080,y:722,'class':'pf-mono','font-size':10,'letter-spacing':1.4,fill:'currentColor','fill-opacity':.5},sb);
  sbT.textContent='10 µm';

  /* ── the specimen ────────────────────────────────────────── */
  var SHAPES=[
    ['ellipse',{cx:900,cy:450,rx:282,ry:250},3.2],
    ['ellipse',{cx:900,cy:450,rx:254,ry:223,'stroke-dasharray':'9 11'},1.8],
    ['circle',{cx:818,cy:392,r:106},2.6],
    ['circle',{cx:818,cy:392,r:118,'stroke-dasharray':'6 9'},1.6],
    ['circle',{cx:796,cy:370,r:36},2.4],
    ['path',{d:'M760 420 C 792 386, 800 442, 838 414 S 878 380, 892 418'},1.8],
    ['path',{d:'M772 350 C 802 322, 824 366, 862 340'},1.6],
    ['ellipse',{cx:1046,cy:566,rx:68,ry:32,transform:'rotate(-24 1046 566)'},2.6],
    ['path',{d:'M1000 578 q 14 -20 26 2 q 12 -22 26 0 q 12 -22 26 2',transform:'rotate(-24 1046 566)'},1.6],
    ['ellipse',{cx:756,cy:624,rx:60,ry:28,transform:'rotate(17 756 624)'},2.6],
    ['path',{d:'M716 632 q 13 -18 24 2 q 11 -20 24 0 q 11 -20 24 2',transform:'rotate(17 756 624)'},1.6],
    ['circle',{cx:1058,cy:328,r:55},2.6],
    ['path',{d:'M1030 300 q 22 14 44 -4'},1.5],
    ['path',{d:'M900 496 C 946 528, 990 480, 1032 512 S 1096 480, 1128 502'},2.2],
    ['path',{d:'M878 540 C 918 566, 962 528, 1000 552'},1.8],
    ['path',{d:'M964 232 q 46 -26 92 -4'},2],
    ['path',{d:'M978 254 q 44 -24 88 -4'},2],
    ['path',{d:'M992 276 q 42 -22 84 -4'},2],
    ['path',{d:'M660 470 C 690 430, 668 396, 700 366'},1.8],
    ['path',{d:'M672 546 C 706 520, 700 486, 730 470'},1.8],
    ['line',{x1:640,y1:392,x2:806,y2:508},1.2],
    ['line',{x1:1148,y1:414,x2:962,y2:520},1.2],
    ['line',{x1:900,y1:206,x2:900,y2:318},1.2]
  ];
  var strokes=SHAPES.map(function(s){
    var a=Object.assign({fill:'none',stroke:'currentColor','stroke-width':s[2],'stroke-linecap':'round','stroke-linejoin':'round'},s[1]);
    var e=E(s[0],a,gMid);
    var L=900; try{L=e.getTotalLength()||900}catch(err){}
    e.__L=L; e.__dashed=!!s[1]['stroke-dasharray'];
    if(!e.__dashed){e.setAttribute('stroke-dasharray',L);e.setAttribute('stroke-dashoffset',L);}
    else e.setAttribute('stroke-opacity',0);
    return e;
  });
  /* ribosome speckle */
  var gRibo=E('g',{},gMid);
  for(var r=0;r<46;r++){
    var ra=(Math.sin(r*12.9898)*43758.5453)%1, rb=(Math.sin(r*78.233)*43758.5453)%1;
    var an=Math.abs(ra)*Math.PI*2, rad=110+Math.abs(rb)*150;
    var rx=900+Math.cos(an)*rad*1.02, ry=450+Math.sin(an)*rad*0.86;
    E('circle',{cx:rx.toFixed(1),cy:ry.toFixed(1),r:3.1,fill:'currentColor','fill-opacity':0},gRibo);
  }
  var ribos=gRibo.querySelectorAll('circle');

  /* security ring (password) */
  var secRing=E('circle',{cx:900,cy:450,r:308,fill:'none',stroke:'var(--b1)','stroke-width':3,'stroke-dasharray':'0 3000','stroke-opacity':0},gMid);

  /* ── labels: leaders + tags ──────────────────────────────── */
  var LEVELS=['Remember','Understand','Apply','Analyze','Evaluate','Create'];
  var QS=[
    'Name the structure indicated at 01 and state its function.',
    'Explain how the region at 02 exchanges material with 05.',
    'Predict what happens downstream if the channel at 03 is blocked.',
    'A reading shows rising output. Which single failure explains it?',
    'Judge which of the two transport pathways is more efficient, and why.',
    'Design a modified specimen that removes the dependency at 06.'
  ];
  var QS_FIX='Output is rising. Using the plate, identify the one component whose failure explains it — and justify it from the pathway.';
  var ANCH=[[818,392],[1058,328],[1046,566],[900,700],[700,470],[1010,266]];
  var TAGP=[[690,168],[1122,150],[1216,506],[898,808],[604,614],[1230,258]];
  var CHIP_X=1150, CHIP_Y0=58, CHIP_H=112, CHIP_GAP=20, CHIP_W=400;

  var labels=ANCH.map(function(a,i){
    var t=TAGP[i], g=E('g',{},gNear);
    var mx=a[0]+(t[0]-a[0])*0.42, my=a[1]+(t[1]-a[1])*0.42;
    var lead=E('path',{d:'M'+a[0]+' '+a[1]+' L '+mx.toFixed(0)+' '+my.toFixed(0)+' L '+t[0]+' '+t[1],
      fill:'none',stroke:'currentColor','stroke-width':1.6,'stroke-opacity':.55},g);
    var L=1; try{L=lead.getTotalLength()}catch(e){}
    lead.setAttribute('stroke-dasharray',L); lead.setAttribute('stroke-dashoffset',L); lead.__L=L;
    E('circle',{cx:a[0],cy:a[1],r:5,fill:'currentColor'},g).setAttribute('opacity',0);
    var anchorDot=g.querySelector('circle');

    var tagG=E('g',{},g);
    E('rect',{x:t[0]-19,y:t[1]-19,width:38,height:38,fill:'var(--b'+(i+1)+')',stroke:'currentColor','stroke-width':2.6},tagG);
    var num=E('text',{x:t[0],y:t[1]+6,'text-anchor':'middle','class':'pf-mono','font-size':16,'font-weight':700,
      fill:(i===2||i===3)?'#0a0a0a':'#ffffff'},tagG);
    num.textContent='0'+(i+1);
    var lvl=E('text',{x:t[0],y:t[1]+38,'text-anchor':'middle','class':'pf-mono','font-size':10,'letter-spacing':1.6,
      fill:'currentColor','fill-opacity':.6},tagG);
    lvl.textContent=LEVELS[i].toUpperCase();

    /* the question chip it becomes */
    var chip=E('g',{},gNear);
    E('rect',{x:0,y:0,width:CHIP_W,height:CHIP_H,fill:'var(--surface)',stroke:'currentColor','stroke-width':2.6},chip);
    E('rect',{x:0,y:0,width:9,height:CHIP_H,fill:'var(--b'+(i+1)+')'},chip);
    var cl=E('text',{x:26,y:28,'class':'pf-mono','font-size':11,'font-weight':700,'letter-spacing':2,
      fill:'currentColor','fill-opacity':.62},chip);
    cl.textContent=('0'+(i+1)+'  '+LEVELS[i]).toUpperCase();
    var q1=E('text',{x:26,y:56,'class':'pf-sans','font-size':15,fill:'currentColor'},chip);
    var q2=E('text',{x:26,y:76,'class':'pf-sans','font-size':15,fill:'currentColor'},chip);
    /* confidence bar */
    E('rect',{x:26,y:90,width:180,height:7,fill:'none',stroke:'currentColor','stroke-width':1.4,'stroke-opacity':.5},chip);
    var conf=E('rect',{x:27.5,y:91.5,width:0,height:4,fill:'var(--b2)'},chip);
    var confT=E('text',{x:216,y:97,'class':'pf-mono','font-size':10,'letter-spacing':1.2,fill:'currentColor','fill-opacity':.55},chip);
    var mark=E('text',{x:CHIP_W-40,y:64,'text-anchor':'middle','class':'pf-disp','font-weight':900,'font-size':30,fill:'var(--b2)'},chip);
    var verd=E('text',{x:CHIP_W-40,y:86,'text-anchor':'middle','class':'pf-mono','font-size':9,'letter-spacing':1.4,fill:'var(--b2)'},chip);
    chip.setAttribute('opacity',0);

    return {g:g,lead:lead,anchorDot:anchorDot,tagG:tagG,chip:chip,q1:q1,q2:q2,conf:conf,confT:confT,mark:mark,verd:verd,
            tx:t[0],ty:t[1],base:QS[i],lvl:LEVELS[i]};
  });

  /* wrap helper: split a question into two lines of <= n chars */
  function wrap(s,n){
    var w=s.split(' '),a='',b='';
    for(var i=0;i<w.length;i++){ if((a+' '+w[i]).trim().length<=n && !b) a=(a+' '+w[i]).trim(); else b=(b+' '+w[i]).trim(); }
    return [a,b];
  }
  labels.forEach(function(l){var t=wrap(l.base,44);l.q1.textContent=t[0];l.q2.textContent=t[1];});

  /* set header above the chip stack */
  var setHead=E('g',{},gNear);
  E('line',{x1:CHIP_X,y1:34,x2:CHIP_X+CHIP_W,y2:34,stroke:'currentColor','stroke-width':2.4},setHead);
  var shT=E('text',{x:CHIP_X,y:24,'class':'pf-mono','font-size':12,'font-weight':700,'letter-spacing':2.6,fill:'currentColor'},setHead);
  shT.textContent='QUESTION SET · 06 ITEMS';
  var shR=E('text',{x:CHIP_X+CHIP_W,y:24,'text-anchor':'end','class':'pf-mono','font-size':12,'letter-spacing':1.8,fill:'var(--b2)'},setHead);
  shR.textContent='0 / 6 VERIFIED';
  setHead.setAttribute('opacity',0);

  /* wordmark */
  var wm=E('text',{x:900,y:470,'text-anchor':'middle','class':'pf-disp','font-weight':900,'font-size':120,
    'letter-spacing':-5,fill:'currentColor',opacity:0},gMark);
  wm.textContent='DIAGRAMMIND';
  var wmSub=E('text',{x:900,y:512,'text-anchor':'middle','class':'pf-mono','font-size':14,'letter-spacing':6,
    fill:'currentColor','fill-opacity':.55,opacity:0},gMark);
  wmSub.textContent='ONE PLATE · SIX QUESTIONS · VERIFIED';

  /* ══════════════════════════════════════════════════════════
     STATE
     ══════════════════════════════════════════════════════════ */
  /* Form state lives here and is written from React through the handle:
     focusing a field dims the specimen, typing a password closes the
     security ring around it. The plate reacts to the form, not to a
     timer. */
  var S={p:0,scrub:null,emailFocus:0,passFocus:0,passLen:0,submitting:0,fail:0,mx:0,my:0};

  var chromeProg=IDS.progress?document.getElementById(IDS.progress):null;
  var beatRead=IDS.beat?document.getElementById(IDS.beat):null;
  var railHost=IDS.rail?document.getElementById(IDS.rail):null;
  var capsHost=IDS.caps?document.getElementById(IDS.caps):null;
  var beatRail=railHost?railHost.querySelectorAll('.bt'):[];
  var caps=capsHost?capsHost.querySelectorAll('.cap'):[];
  var BEATS=['01 DRAW','02 LABEL','03 ASK','04 VERIFY','05 FILE'];
  var WIN=[0,.20,.38,.62,.84,1.001];

  function readScroll(){
    if(S.scrub!==null) return S.scrub;
    var max=document.body.scrollHeight-window.innerHeight;
    return max>0?clamp(window.scrollY/max,0,1):0;
  }

  /* pointer parallax */
  function onMouse(e){
    S.mx=(e.clientX/window.innerWidth-.5);
    S.my=(e.clientY/window.innerHeight-.5);
  }
  window.addEventListener('mousemove',onMouse,{passive:true});

  /* Text writes are the expensive part, not the maths. Skip any that
     would not change anything. */
  function setT(el,v){ if(el.__t===v)return; el.__t=v; el.textContent=v; }

  /* ══════════════════════════════════════════════════════════
     RENDER — a pure function of (scroll, form state)
     ══════════════════════════════════════════════════════════ */
  var vCount=0;
  function render(now){
    var p=S.p=readScroll();

    var t1=clamp(p/WIN[1],0,1);
    var t2=clamp((p-WIN[1])/(WIN[2]-WIN[1]),0,1);
    var t3=clamp((p-WIN[2])/(WIN[3]-WIN[2]),0,1);
    var t4=clamp((p-WIN[3])/(WIN[4]-WIN[3]),0,1);
    var t5=clamp((p-WIN[4])/(WIN[5]-WIN[4]),0,1);
    var e3=ease(t3), e5=ease(t5);

    /* ── chrome ── */
    var bi=0; for(var i=0;i<5;i++) if(p>=WIN[i]) bi=i;
    if(chromeProg)chromeProg.style.width=(p*100)+'%';
    if(beatRead)setT(beatRead,BEATS[bi]+' · '+String(Math.round(p*100)).padStart(3,'0')+'%');
    for(var i2=0;i2<5;i2++){
      if(beatRail[i2])beatRail[i2].classList.toggle('on',i2===bi);
      if(caps[i2])caps[i2].classList.toggle('on',i2===bi);
    }
    if(onBeat&&bi!==lastBeat){lastBeat=bi;onBeat(bi,BEATS[bi],p)}

    /* ── parallax ── */
    var pf=RM?0:1;
    gPaper.setAttribute('transform','translate('+(S.mx*4*pf)+','+(S.my*3*pf)+')');
    gFar.setAttribute('transform','translate('+(S.mx*8*pf)+','+(S.my*6*pf)+')');
    var midPX=S.mx*16*pf, midPY=S.my*12*pf;
    var nearPX=S.mx*26*pf, nearPY=S.my*20*pf;

    /* ── 01 DRAW ── */
    strokes.forEach(function(e,i){
      var lp=clamp(t1*1.55-(i*0.035),0,1); lp=ease(lp);
      if(e.__dashed) e.setAttribute('stroke-opacity',(lp*0.55).toFixed(3));
      else e.setAttribute('stroke-dashoffset',(e.__L*(1-lp)).toFixed(1));
    });
    for(var rr=0;rr<ribos.length;rr++){
      var rp=clamp(t1*2.0-(rr*0.02),0,1);
      ribos[rr].setAttribute('fill-opacity',(rp*0.45).toFixed(3));
    }
    frame.setAttribute('opacity',(clamp(t1*3,0,1)*(1-e3*0.75)).toFixed(3));

    /* specimen transform: recedes and shrinks as the questions take over */
    var sx=-300*e3, sc=1-0.30*e3;
    var fileLift=e5*-40;
    gMid.setAttribute('transform','translate('+(900+sx+midPX)+','+(450+midPY+fileLift)+') scale('+sc+') translate(-900,-450)');
    gFar.setAttribute('transform','translate('+(S.mx*8*pf+sx*0.98)+','+(S.my*6*pf)+') scale('+sc+')');
    gFar.setAttribute('transform-origin','900 450');

    var focusDim=1-0.42*Math.max(S.emailFocus,S.passFocus);
    gMid.setAttribute('opacity',(clamp(t1*3,0,1)*(1-0.55*e3)*(1-0.85*e5)*focusDim).toFixed(3));

    /* ── password security ring ── */
    var C=2*Math.PI*308;
    var closed=clamp(S.passLen/10,0,1)*C;
    secRing.setAttribute('stroke-dasharray',closed.toFixed(1)+' '+(C-closed).toFixed(1));
    secRing.setAttribute('stroke-dashoffset',(-C*0.25).toFixed(1));
    secRing.setAttribute('stroke-opacity',(S.passFocus*0.85).toFixed(3));

    /* ── 02 LABEL + 03 ASK ── */
    var verified=0;
    labels.forEach(function(l,i){
      var lp=clamp(t2*1.7-(i*0.115),0,1);
      l.lead.setAttribute('stroke-dashoffset',(l.lead.__L*(1-ease(lp))).toFixed(1));
      l.anchorDot.setAttribute('opacity',(clamp(lp*4,0,1)*(1-e3)).toFixed(3));
      var pop=clamp((lp-0.62)/0.38,0,1);
      var popS=1.55-0.55*ease(pop);
      l.tagG.setAttribute('opacity',(pop*(1-ease(clamp(t3*1.6,0,1)))).toFixed(3));
      l.tagG.setAttribute('transform','translate('+l.tx+','+l.ty+') scale('+popS.toFixed(3)+') translate('+(-l.tx)+','+(-l.ty)+')');
      l.lead.setAttribute('stroke-opacity',(0.55*(1-ease(clamp(t3*1.4,0,1)))).toFixed(3));

      /* fly to chip position */
      var c=ease(clamp(t3*1.65-(i*0.11),0,1));
      var fromX=l.tx-CHIP_W/2, fromY=l.ty-CHIP_H/2;
      var toX=CHIP_X, toY=CHIP_Y0+i*(CHIP_H+CHIP_GAP);
      var cx=fromX+(toX-fromX)*c, cy=fromY+(toY-fromY)*c;
      var arc=Math.sin(c*Math.PI)*-38;
      /* FILE: collapse the stack */
      var fileY=cy+((450-CHIP_H/2)-cy)*e5;
      var fileX=cx+((900-CHIP_W/2)-cx)*e5;
      var fileS=(0.28+0.72*c)*(1-0.55*e5);
      l.chip.setAttribute('transform','translate('+(fileX+nearPX).toFixed(1)+','+(fileY+arc+nearPY+i*e5*6).toFixed(1)+') scale('+fileS.toFixed(3)+')');
      l.chip.setAttribute('opacity',(c*(1-0.92*e5)).toFixed(3));

      /* ── 04 VERIFY ── */
      var v=clamp(t4*2.0-(i*0.155),0,1);
      var rejected=(i===3);
      var punch=Math.max(0,1-Math.abs(v-0.16)*6);
      l.mark.setAttribute('font-size',(28+18*punch).toFixed(1));
      l.mark.setAttribute('opacity',clamp(v*3,0,1).toFixed(3));
      l.verd.setAttribute('opacity',clamp(v*3,0,1).toFixed(3));
      l.conf.setAttribute('width',(177*clamp(v*1.6,0,1)*(rejected&&v<0.6?0.42:1)).toFixed(1));
      if(rejected && v>0.02 && v<0.60){
        l.mark.textContent='✕'; l.mark.setAttribute('fill','var(--red)');
        l.verd.textContent='REJECTED'; l.verd.setAttribute('fill','var(--red)');
        l.conf.setAttribute('fill','var(--red)');
        l.confT.textContent='conf 0.41';
        var jit=(v<0.5)?Math.sin(v*90)*3:0;
        l.chip.setAttribute('transform',l.chip.getAttribute('transform')+' translate('+jit.toFixed(2)+',0)');
        if(l.__state!=='bad'){ l.__state='bad'; var w=wrap(l.base,44); l.q1.textContent=w[0]; l.q2.textContent=w[1];
          l.q1.setAttribute('fill-opacity',.45); l.q2.setAttribute('fill-opacity',.45); }
      } else {
        l.mark.textContent='✓'; l.mark.setAttribute('fill','var(--b2)');
        l.verd.textContent='VERIFIED'; l.verd.setAttribute('fill','var(--b2)');
        l.conf.setAttribute('fill','var(--b2)');
        l.confT.textContent=v>0.02?('conf 0.9'+(2+i%6)):'';
        var want=(rejected&&v>=0.60)?'fixed':'ok';
        if(l.__state!==want){
          l.__state=want;
          var txt=(want==='fixed')?QS_FIX:l.base;
          var w2=wrap(txt,44); l.q1.textContent=w2[0]; l.q2.textContent=w2[1];
          l.q1.setAttribute('fill-opacity',1); l.q2.setAttribute('fill-opacity',1);
          if(want==='fixed'){ l.q1.setAttribute('fill','var(--ink)'); l.q2.setAttribute('fill','var(--ink)'); }
        }
      }
      if(v>=1) verified++;
    });

    setHead.setAttribute('opacity',(clamp(t3*2.2,0,1)*(1-e5)).toFixed(3));
    setHead.setAttribute('transform','translate('+nearPX.toFixed(1)+','+nearPY.toFixed(1)+')');
    shR.textContent=verified+' / 6 VERIFIED';
    shR.setAttribute('fill',verified===6?'var(--b2)':'currentColor');

    /* ── 05 FILE ── */
    wm.setAttribute('opacity',(e5*0.95).toFixed(3));
    wmSub.setAttribute('opacity',(clamp((t5-0.35)/0.65,0,1)).toFixed(3));
    gMark.setAttribute('transform','translate('+nearPX*0.5+','+(26-26*e5+nearPY*0.5)+')');

    if(!stopped)raf=requestAnimationFrame(render);
  }

  /* reduced motion: hold the final formation, no scroll dependency */
  if(RM){
    readScroll=function(){return 1};
  }
  raf=requestAnimationFrame(render);

  function onVis() {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    } else if (!stopped && !raf) {
      raf = requestAnimationFrame(render)
    }
  }
  document.addEventListener('visibilitychange', onVis)

  return {
    setEmailFocus: function (v) {
      S.emailFocus = v ? 1 : 0
    },
    setPassFocus: function (v) {
      S.passFocus = v ? 1 : 0
    },
    setPassLen: function (n) {
      S.passLen = n || 0
    },
    setScrub: function (v) {
      S.scrub = v == null ? null : v < 0 ? 0 : v > 1 ? 1 : v
    },
    progress: function () {
      return S.p
    },
    destroy: function () {
      stopped = true
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      window.removeEventListener('mousemove', onMouse)
      document.removeEventListener('visibilitychange', onVis)
      if (svg.parentNode === host) host.removeChild(svg)
    },
  }
}
