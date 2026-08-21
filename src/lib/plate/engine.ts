// @ts-nocheck
/* ==================================================================
   THE PLATE STAGE

   Eight self-drawing scientific diagrams — globe, cell, atom, circuit,
   orbit, water cycle, neuron, network — sharing ONE fixed inventory of
   ink. A scene is not a picture: it is an instruction telling the same
   strands where to sit. Advancing does not erase one plate and draw the
   next, it tells the ink to become the next idea and lets it travel
   across the page to get there.

   Pure SVG, every stroke generated from numbers. No WebGL, no image
   assets, no fetches. render() is a pure function of its position in
   the sequence, so scrubbing is exact and running it backwards
   un-draws every stroke in the order it was drawn.

   Two placements, one engine:

     · the homepage  — position comes from scroll, plates alternate
       sides, and each one throws off a column of question cards
     · the sign-in panel — position comes from a clock (`autoplay`),
       every plate is pinned to one anchor (`anchorX`) so the morph
       happens in place, and the card column is off (`chips: false`)
   ================================================================== */

export type PlateHandle = {
  /** 0..1 — how present the annotation layers are (callouts, cards). */
  setPresence(v: number): void
  /** Hold a fixed position in the sequence, or null to resume. */
  setScrub(v: number | null): void
  /** Ink memory: the same strand a few frames of progress ago. */
  setEcho(on: boolean): void
  /** Progress across the whole sequence, 0..1. */
  progress(): number
  /** Re-read the section anchors after a layout change. */
  remeasure(): void
  destroy(): void
}

export type PlateOptions = {
  /** Selector for the scene anchors. One section per plate. */
  sectionSelector?: string
  /** Drive the sequence from a clock instead of scroll: seconds per plate. */
  autoplay?: number
  /** Pin every plate to this x in the viewBox instead of alternating. */
  anchorX?: number
  /** Render the question-card column. Default true. */
  chips?: boolean
  /** The stage's viewBox and fit. Defaults to the full-bleed backdrop. */
  viewBox?: string
  preserveAspectRatio?: string
  /** Ids of the page's chrome. Any of them may be absent. */
  ids?: { progress?: string; crumb?: string; pct?: string; rail?: string }
  /** Prefix for the breadcrumb readout. */
  crumbPrefix?: string
  /** 'premium' — a calmer, more orchestrated flight: hierarchy releases in
      a deeper cascade, quintic easing, restrained travel arcs, colour held
      until landing. For placements where the morph is the entertainment. */
  flight?: 'standard' | 'premium'
  /** Fade each section's first child in and out with its own plate. */
  choreograph?: boolean
  /** Play exactly these plate keys, in this order. Omit for the
      homepage sequence. The sign-in page passes its own three. */
  only?: string[]
  /** Fired when the settled plate changes. */
  onScene?: (index: number, name: string, progress: number) => void
}

export function mountPlateStage(host: HTMLElement, opts: PlateOptions = {}): PlateHandle {
  var SECTION_SELECTOR = opts.sectionSelector || '[data-section]'
  var AUTOPLAY = opts.autoplay || 0
  var ANCHOR_X = opts.anchorX == null ? null : opts.anchorX
  var CHIPS = opts.chips !== false
  var VIEWBOX = opts.viewBox || '0 0 1600 900'
  var FIT = opts.preserveAspectRatio || 'xMidYMid slice'
  var IDS = opts.ids || {}
  var CRUMB_PREFIX = opts.crumbPrefix != null ? opts.crumbPrefix : 'DIAGRAMMIND // '
  var CHOREOGRAPH = !!opts.choreograph
  var PREMIUM = opts.flight === 'premium'
  var onScene = opts.onScene || null
  var lastSettled = -1
  var uiP = 1
  var stopped = false
  var raf = 0

  var NS='http://www.w3.org/2000/svg';
  var clamp=function(v,a,b){return Math.max(a,Math.min(b,v))};
  var ease=function(t){return 1-Math.pow(1-t,3)};
  var RM=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function E(tag,attrs,parent){
    var e=document.createElementNS(NS,tag);
    if(attrs)for(var k in attrs)e.setAttribute(k,attrs[k]);
    if(parent)parent.appendChild(e);
    return e;
  }
  function ray(cx,cy,r0,r1,n,out){
    for(var i=0;i<n;i++){var a=i*Math.PI*2/n;
      out.push(['line',{x1:(cx+Math.cos(a)*r0).toFixed(1),y1:(cy+Math.sin(a)*r0).toFixed(1),
        x2:(cx+Math.cos(a)*r1).toFixed(1),y2:(cy+Math.sin(a)*r1).toFixed(1)},2]);}
  }

  /* ══════════════════════════════════════════════════════════
     THE SEVEN PLATES
     Each authored in local coords around (0,0) and dropped at
     the stage anchor. Every shape is generated from numbers —
     the entire "asset budget" of this page is this array.
     ══════════════════════════════════════════════════════════ */
  /* scene 1 — the world. Oceans blue, land green, shallows pale, ice white.
     The land sweeps around the sphere; the graticule is the frame it turns in. */
  var S_GLOBE=[];
  (function(){
    var R=250, SEA='var(--f-ocean)', LAND='var(--f-land)', L2='var(--f-land2)',
        SHAL='var(--f-sea)', ICE='var(--f-ice)', GRID='var(--w-sky)';
    S_GLOBE.push(['circle',{cx:0,cy:0,r:R,fill:SEA,'fill-opacity':.95,stroke:'currentColor'},3.2]);
    [[0,250,46],[-125,216,40],[125,216,40],[-216,125,23],[216,125,23]].forEach(function(L){
      S_GLOBE.push(['ellipse',{cx:0,cy:L[0],rx:L[1],ry:L[2],fill:'none',stroke:GRID},1.3]);
    });
    [106,192,241].forEach(function(rx){
      S_GLOBE.push(['ellipse',{cx:0,cy:0,rx:rx,ry:R,fill:'none',stroke:GRID},1.3]);
    });
    S_GLOBE.push(['line',{x1:0,y1:-R-22,x2:0,y2:R+22,stroke:'currentColor','stroke-dasharray':'8 9'},1.6]);
    /* land */
    [['M-150 -170 C -110 -196, -58 -180, -46 -140 C -28 -119, -60 -100, -70 -72 C -96 -54, -121 -76, -133 -106 C -156 -126, -170 -150, -150 -170 Z',LAND],
     ['M-72 -18 C -47 -28, -34 2, -43 32 C -49 72, -68 106, -85 92 C -93 60, -97 20, -72 -18 Z',LAND],
     ['M20 -120 C 60 -136, 96 -120, 92 -88 C 101 -50, 70 -10, 52 30 C 40 60, 20 55, 14 25 C 4 -10, -3 -60, 20 -120 Z',LAND],
     ['M96 -180 C 151 -196, 206 -160, 196 -119 C 180 -94, 140 -100, 118 -78 C 96 -61, 73 -78, 78 -108 C 72 -141, 70 -168, 96 -180 Z',LAND],
     ['M150 90 C 181 77, 209 92, 202 117 C 196 141, 165 149, 146 132 C 133 118, 134 98, 150 90 Z',LAND],
     ['M-70 -212 C -39 -225, -13 -212, -20 -190 C -31 -175, -58 -180, -70 -196 Z',ICE],
     ['M120 -150 C 146 -159, 169 -146, 160 -127 C 148 -115, 123 -122, 120 -150 Z',L2],
     ['M36 -70 C 59 -79, 75 -62, 64 -43 C 49 -33, 33 -48, 36 -70 Z',L2],
     ['M126 66 C 151 57, 173 66, 166 83 C 151 93, 127 84, 126 66 Z',SHAL],
     ['M-116 -46 C -95 -55, -77 -44, -86 -27 C -103 -19, -119 -32, -116 -46 Z',SHAL]
    ].forEach(function(c){
      S_GLOBE.push(['path',{d:c[0],fill:c[1],'fill-opacity':.95,stroke:'currentColor'},2.2]);
    });
    /* polar caps */
    S_GLOBE.push(['ellipse',{cx:0,cy:-232,rx:108,ry:24,fill:ICE,'fill-opacity':.95,stroke:'currentColor'},2]);
    S_GLOBE.push(['ellipse',{cx:0,cy:232,rx:108,ry:24,fill:ICE,'fill-opacity':.95,stroke:'currentColor'},2]);
    /* No orbit ring. The plate is the Earth, and the Earth does not
       have one — a decorative ellipse cutting across the sphere reads
       as a planetary ring to anyone who looks at it for a second,
       which is exactly the wrong thing to teach from a diagram whose
       whole job is being literally true. */
  })();

  var S_CELL=[
    ['ellipse',{cx:0,cy:0,rx:272,ry:242},3.2],
    ['ellipse',{cx:0,cy:0,rx:245,ry:216,'stroke-dasharray':'9 11'},1.8],
    ['circle',{cx:-82,cy:-58,r:100},2.6],
    ['circle',{cx:-82,cy:-58,r:112,'stroke-dasharray':'6 9'},1.6],
    ['circle',{cx:-102,cy:-80,r:34},2.4],
    ['path',{d:'M-140 -30 C -108 -64, -100 -8, -62 -36 S -22 -70, -8 -32'},1.8],
    ['path',{d:'M-128 -100 C -98 -128, -76 -84, -38 -110'},1.6],
    ['ellipse',{cx:146,cy:116,rx:66,ry:31,transform:'rotate(-24 146 116)'},2.6],
    ['path',{d:'M100 128 q 14 -20 26 2 q 12 -22 26 0 q 12 -22 26 2',transform:'rotate(-24 146 116)'},1.6],
    ['ellipse',{cx:-144,cy:174,rx:58,ry:27,transform:'rotate(17 -144 174)'},2.6],
    ['path',{d:'M-184 182 q 13 -18 24 2 q 11 -20 24 0 q 11 -20 24 2',transform:'rotate(17 -144 174)'},1.6],
    ['circle',{cx:158,cy:-122,r:53},2.6],
    ['path',{d:'M130 -150 q 22 14 44 -4'},1.5],
    ['path',{d:'M-44 47 C 12 74, 64 34, 116 56 S 168 90, 176 76'},2.2],
    ['path',{d:'M-129 44 C -138 92, -126 140, -100 169'},1.8],
    ['path',{d:'M64 -218 q 46 -26 92 -4'},2],
    ['path',{d:'M78 -196 q 44 -24 88 -4'},2],
    ['path',{d:'M92 -174 q 42 -22 84 -4'},2],
    ['line',{x1:-262,y1:-58,x2:-96,y2:58},1.2],
    ['line',{x1:248,y1:-36,x2:62,y2:70},1.2],
    /* ribosomes studding the ER, and a vesicle pinching off the membrane */
    ['circle',{cx:10,cy:64,r:6},1.6],
    ['circle',{cx:70,cy:44,r:6},1.6],
    ['circle',{cx:140,cy:68,r:6},1.6],
    ['circle',{cx:-128,cy:96,r:6},1.6],
    ['circle',{cx:196,cy:-150,r:15},1.8]
  ];

  var S_ATOM=[
    ['ellipse',{cx:0,cy:0,rx:252,ry:94},2.4],
    ['ellipse',{cx:0,cy:0,rx:252,ry:94,transform:'rotate(60)'},2.4],
    ['ellipse',{cx:0,cy:0,rx:252,ry:94,transform:'rotate(120)'},2.4],
    ['circle',{cx:-9,cy:-7,r:17},2.8],
    ['circle',{cx:11,cy:9,r:17},2.8],
    ['circle',{cx:7,cy:-16,r:15},2.4],
    ['circle',{cx:252,cy:0,r:11},2.6],
    ['circle',{cx:-126,cy:-218,r:11},2.6],
    ['circle',{cx:-126,cy:218,r:11},2.6],
    ['circle',{cx:-172,cy:252,r:47},2.4],
    ['circle',{cx:-52,cy:252,r:47},2.4],
    ['line',{x1:-132,y1:246,x2:-92,y2:246},2.4],
    ['line',{x1:-132,y1:258,x2:-92,y2:258},2.4],
    ['line',{x1:176,y1:-246,x2:306,y2:-246},2],
    ['line',{x1:194,y1:-206,x2:306,y2:-206},2],
    ['line',{x1:212,y1:-166,x2:306,y2:-166},2],
    ['path',{d:'M306 -226 L306 -242'},1.6],
    ['path',{d:'M299 -235 L306 -226 L313 -235'},1.8],
    /* an inner dashed shell, one electron per outer shell, and a photon */
    ['circle',{cx:0,cy:0,r:150,'stroke-dasharray':'6 9'},1.4],
    ['circle',{cx:-218,cy:-47,r:11},2.6],
    ['circle',{cx:68,cy:212,r:11},2.6],
    ['circle',{cx:7,cy:150,r:11},2.6],
    ['path',{d:'M-96 -150 q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0'},1.6]
  ];

  var S_CIRCUIT=[
    ['path',{d:'M-250 -170 H-90'},2.6],
    ['path',{d:'M90 -170 H250'},2.6],
    ['path',{d:'M250 -170 V-60'},2.6],
    ['path',{d:'M250 60 V170'},2.6],
    ['path',{d:'M250 170 H40'},2.6],
    ['path',{d:'M-40 170 H-250'},2.6],
    ['path',{d:'M-250 170 V60'},2.6],
    ['path',{d:'M-250 -60 V-170'},2.6],
    ['path',{d:'M-90 -170 l18 -26 l24 52 l24 -52 l24 52 l24 -52 l24 52 l24 -52 l18 26'},2.8],
    ['path',{d:'M250 -60 V-8 M210 -8 H290 M210 14 H290 M250 14 V60'},2.8],
    ['circle',{cx:0,cy:170,r:38},2.8],
    ['path',{d:'M-27 143 L27 197 M27 143 L-27 197'},2],
    ['path',{d:'M-250 -60 V-22 M-280 -22 H-220 M-268 -6 H-232 M-280 10 H-220 M-268 26 H-232 M-250 26 V60'},2.8],
    ['circle',{cx:-250,cy:-170,r:6},2],
    ['circle',{cx:250,cy:-170,r:6},2],
    ['path',{d:'M0 208 V236 M-26 236 H26 M-16 248 H16 M-7 260 H7'},2.4],
    ['path',{d:'M-150 -122 H-86'},1.8],
    ['path',{d:'M120 -122 H184'},1.8],
    ['path',{d:'M-99 -131 L-86 -122 L-99 -113'},2],
    ['path',{d:'M171 -131 L184 -122 L171 -113'},2],
    ['path',{d:'M-250 74 a 11 11 0 0 1 0 22 a 11 11 0 0 1 0 22 a 11 11 0 0 1 0 22'},2.6],
    ['path',{d:'M146 -170 L188 -196'},2.6],
    ['circle',{cx:146,cy:-170,r:5},2.2],
    ['circle',{cx:190,cy:-170,r:5},2.2],
    ['path',{d:'M-168 156 L-168 184 L-138 170 Z'},2.6],
    ['path',{d:'M-138 154 L-138 186'},2.6],
    /* a voltmeter on the battery wire, and an open switch on the top run */
    ['circle',{cx:-250,cy:0,r:20},1.8],
    ['path',{d:'M-258 -7 L-250 8 L-242 -7'},1.6],
    ['path',{d:'M-190 -170 L-156 -190'},1.8]
  ];

  var S_ORBIT=[['circle',{cx:0,cy:0,r:52},3]];
  ray(0,0,64,92,12,S_ORBIT);
  S_ORBIT=S_ORBIT.concat([
    ['ellipse',{cx:0,cy:0,rx:124,ry:54},2],
    ['ellipse',{cx:0,cy:0,rx:186,ry:80},2],
    ['ellipse',{cx:0,cy:0,rx:250,ry:108},2],
    ['ellipse',{cx:0,cy:0,rx:318,ry:136},1.8],
    ['circle',{cx:114,cy:-21,r:10},2.4],
    ['circle',{cx:-164,cy:36,r:15},2.4],
    ['circle',{cx:204,cy:62,r:19},2.6],
    ['ellipse',{cx:204,cy:62,rx:36,ry:12,transform:'rotate(-14 204 62)'},1.8],
    ['circle',{cx:-286,cy:-60,r:12},2.4],
    /* the belt — six bodies on their own ring between the two outer orbits */
    ['circle',{cx:265,cy:42,r:3.5},1.4],
    ['circle',{cx:49,cy:120,r:3.5},1.4],
    ['circle',{cx:-216,cy:78,r:3.5},1.4],
    ['circle',{cx:-265,cy:-42,r:3.5},1.4],
    ['circle',{cx:-49,cy:-120,r:3.5},1.4],
    ['circle',{cx:216,cy:-78,r:3.5},1.4],
    /* a dwarf on the innermost orbit */
    ['circle',{cx:-117,cy:-18,r:6},2]
  ]);

  var S_CYCLE=[
    ['path',{d:'M-336 192 q 42 -16 84 0 t 84 0 t 84 0 t 84 0 t 84 0'},2.4],
    ['path',{d:'M-336 220 q 42 -16 84 0 t 84 0 t 84 0 t 84 0 t 84 0'},2],
    ['path',{d:'M-336 248 q 42 -16 84 0 t 84 0 t 84 0 t 84 0 t 84 0'},1.6],
    ['path',{d:'M-336 192 L-196 -44 L-104 70 L-44 -12 L124 192 Z'},2.8],
    ['path',{d:'M-220 -5 L-196 -44 L-172 -5 L-196 8 Z'},1.8],
    ['path',{d:'M-186 -24 C -156 40, -206 92, -156 192'},1.8],
    ['circle',{cx:254,cy:-214,r:44},2.6]
  ];
  ray(254,-214,56,84,10,S_CYCLE);
  S_CYCLE=S_CYCLE.concat([
    ['path',{d:'M-64 -184 a 47 47 0 0 1 90 -18 a 41 41 0 0 1 68 24 a 35 35 0 0 1 -9 68 H-50 a 41 41 0 0 1 -14 -74 Z'},2.8],
    ['path',{d:'M-32 -82 v36 M8 -76 v42 M48 -82 v36 M88 -72 v32'},2],
    ['path',{d:'M172 152 C 214 92, 152 42, 194 -18'},2],
    ['path',{d:'M254 132 C 296 72, 234 32, 272 -28'},1.8],
    ['path',{d:'M-260 120 C -230 70, -280 40, -244 -10'},1.8],
    ['path',{d:'M183 -3 L194 -18 L205 -1'},2],
    ['path',{d:'M261 -13 L272 -28 L283 -11'},1.9],
    ['path',{d:'M-255 5 L-244 -10 L-233 7'},1.9],
    /* two pines on the slope, and wind crossing above the cloud */
    ['path',{d:'M-60 64 L-52 42 L-44 64 Z'},1.6],
    ['path',{d:'M-53 64 v 9'},1.4],
    ['path',{d:'M-6 104 L 2 82 L 10 104 Z'},1.6],
    ['path',{d:'M-1 104 v 9'},1.4],
    ['path',{d:'M-150 -252 q 30 -16 60 0 q 30 16 60 0'},1.5]
  ]);

  var S_NEURON=[
    ['path',{d:'M-120 0 C -120 -62, -60 -98, 0 -82 C 62 -98, 112 -50, 98 6 C 108 64, 40 102, -14 84 C -82 98, -126 58, -120 0 Z'},3],
    ['circle',{cx:-12,cy:2,r:31},2.4],
    ['circle',{cx:-12,cy:2,r:13},2],
    ['path',{d:'M-118 -24 C -180 -62, -222 -42, -272 -82'},2.2],
    ['path',{d:'M-246 -64 l-34 -6 M-246 -64 l-2 -32'},1.8],
    ['path',{d:'M-88 -68 C -132 -132, -182 -142, -208 -198'},2.2],
    ['path',{d:'M-192 -170 l-30 -10 M-192 -170 l4 -32'},1.8],
    ['path',{d:'M-104 54 C -162 98, -202 94, -240 148'},2.2],
    ['path',{d:'M-216 124 l-32 4 M-216 124 l-6 30'},1.8],
    ['path',{d:'M-6 -86 C -14 -152, -40 -172, -34 -232'},2],
    ['path',{d:'M98 6 C 182 6, 202 -10, 286 -10'},2.8],
    ['ellipse',{cx:152,cy:4,rx:35,ry:21},2.2],
    ['ellipse',{cx:224,cy:-2,rx:35,ry:21},2.2],
    ['ellipse',{cx:296,cy:-10,rx:35,ry:21},2.2],
    ['path',{d:'M332 -10 C 364 -10, 370 -50, 404 -58'},2.2],
    ['path',{d:'M332 -10 C 370 -10, 376 22, 408 32'},2.2],
    ['path',{d:'M332 -10 C 360 -10, 360 -80, 386 -98'},2.2],
    ['circle',{cx:408,cy:-62,r:10},2],
    ['circle',{cx:414,cy:34,r:10},2],
    ['circle',{cx:390,cy:-102,r:10},2],
    ['path',{d:'M-30 -110 H14'},1.5],
    ['path',{d:'M5 -117 L14 -110 L5 -103'},1.7],
    /* vesicles riding the axon, and a collateral that branches away */
    ['circle',{cx:180,cy:4,r:5},1.6],
    ['circle',{cx:252,cy:-2,r:5},1.6],
    ['circle',{cx:310,cy:-10,r:5},1.6],
    ['path',{d:'M224 -2 C 252 44, 300 64, 342 74'},2],
    ['circle',{cx:342,cy:74,r:8},2.2]
  ];

  /* scene 7 — a feed-forward network: forward pass and backpropagation.
     Four layers, fully connected, generated from the layer sizes alone. */
  var S_NET=[];
  (function(){
    var LAY=[3,4,4,2], X=[-250,-85,80,245], GAP=[80,78,78,90];
    var NODE=['var(--f-sky)','var(--f-cloud)','var(--f-amber)','var(--f-mito)'];
    var EDGE=['var(--w-blue)','var(--w-teal)','var(--w-orange)'];
    var pos=LAY.map(function(n,l){
      var ys=[];
      for(var k=0;k<n;k++)ys.push((k-(n-1)/2)*GAP[l]);
      return ys;
    });
    /* weights first, so the nodes print on top of them */
    for(var l=0;l<LAY.length-1;l++){
      for(var a=0;a<LAY[l];a++)for(var b=0;b<LAY[l+1];b++){
        var strong=((a*7+b*3+l*5)%9)<3;
        S_NET.push(['line',{x1:X[l],y1:pos[l][a],x2:X[l+1],y2:pos[l+1][b],
          stroke:strong?EDGE[l]:'currentColor','stroke-opacity':strong?0.9:0.34},
          strong?2.1:1.1]);
      }
    }
    for(var l2=0;l2<LAY.length;l2++)
      for(var k2=0;k2<LAY[l2];k2++)
        S_NET.push(['circle',{cx:X[l2],cy:pos[l2][k2],r:18,
          fill:NODE[l2],'fill-opacity':.95,stroke:'currentColor'},2.6]);
    /* the error travelling back through one weight */
    S_NET.push(['path',{d:'M228 -66 C 190 -104, 140 -60, 104 -96',stroke:'var(--w-red)'},2.4]);
    S_NET.push(['path',{d:'M118 -84 L104 -96 L118 -108',stroke:'var(--w-red)'},2.4]);
    /* the loss bracket at the output */
    S_NET.push(['path',{d:'M282 -78 L300 -78 L300 78 L282 78',stroke:'var(--w-red)'},2.2]);
    S_NET.push(['circle',{cx:300,cy:0,r:11,fill:'var(--f-mito)','fill-opacity':.95,
      stroke:'var(--w-red)'},2.4]);
  })();

  /* ══════════════════════════════════════════════════════════
     THE AUXILIARY PLATES — sign-in only.

     The sign-in page used to replay the homepage's eight plates.
     Two problems with that: the first thing a returning user sees
     is a rerun of the marketing page, and the globe is the single
     most recognisable drawing in the product, so the two pages read
     as the same page. These three are drawn to the same rules —
     ink first, colour last, every stroke generated from numbers —
     but share no subject with the homepage, and they are drawn from
     three different disciplines on purpose: optics, structures,
     anatomy. Same pipeline, nothing in common.

     They are tagged `aux`, so the homepage never sees them; the
     sign-in page asks for them by key.
     ══════════════════════════════════════════════════════════ */

  /* scene A — the converging lens. Object beyond 2F, so the real
     image lands inverted and reduced between F' and 2F'. The ray
     construction is the actual construction, not three lines that
     look like one: f = 110, u = -300, therefore v = +174 and the
     image height is 0.58 of the object's. Every ray below passes
     through (174, 70) because the arithmetic says it must. */
  var S_LENS=[
    ['line',{x1:-344,y1:0,x2:344,y2:0,'stroke-dasharray':'12 9'},1.5],
    ['path',{d:'M0 -172 C 44 -112, 44 112, 0 172 C -44 112, -44 -112, 0 -172 Z'},3.2],
    ['line',{x1:0,y1:-214,x2:0,y2:214,'stroke-dasharray':'6 9'},1.4],
    ['circle',{cx:-110,cy:0,r:8},2.4],
    ['circle',{cx:110,cy:0,r:8},2.4],
    ['circle',{cx:-220,cy:0,r:5.5},1.8],
    ['circle',{cx:220,cy:0,r:5.5},1.8],
    ['line',{x1:-300,y1:0,x2:-300,y2:-120},3.2],
    ['path',{d:'M-313 -98 L-300 -126 L-287 -98'},3.2],
    ['line',{x1:174,y1:0,x2:174,y2:70},3.2],
    ['path',{d:'M163 50 L174 76 L185 50'},3.2],
    ['line',{x1:-300,y1:-120,x2:0,y2:-120},2],
    ['line',{x1:0,y1:-120,x2:300,y2:207},2],
    ['line',{x1:-300,y1:-120,x2:300,y2:120},2],
    ['line',{x1:-300,y1:-120,x2:0,y2:69.5,'stroke-dasharray':'9 7'},1.7],
    ['line',{x1:0,y1:69.5,x2:300,y2:69.5,'stroke-dasharray':'9 7'},1.7],
    ['line',{x1:300,y1:-176,x2:300,y2:176},2.4],
    ['path',{d:'M300 -140 L326 -164 M300 -60 L326 -84 M300 20 L326 -4 M300 100 L326 76'},1.5],
    ['line',{x1:-22,y1:-190,x2:22,y2:-190},2.2],
    ['line',{x1:-22,y1:190,x2:22,y2:190},2.2],
    ['line',{x1:-344,y1:268,x2:344,y2:268},2],
    ['path',{d:'M-300 256 L-300 280 M-220 258 L-220 278 M-110 258 L-110 278 M0 254 L0 282 M110 258 L110 278 M220 258 L220 278 M300 256 L300 280'},1.5],
    ['path',{d:'M-330 -196 C -306 -150, -306 -70, -330 -24'},1.6],
    ['path',{d:'M-300 -196 C -276 -150, -276 -70, -300 -24'},1.6]
  ];

  /* scene B — a Warren truss. Pinned at one end, on a roller at the
     other, which is the whole reason a bridge does not tear itself
     apart when the deck warms up. Three point loads on the top
     chord; the diagonals alternate tension and compression, which
     is what the colour pass says. */
  var S_TRUSS=[
    ['line',{x1:-320,y1:120,x2:-160,y2:120},3.2],
    ['line',{x1:-160,y1:120,x2:0,y2:120},3.2],
    ['line',{x1:0,y1:120,x2:160,y2:120},3.2],
    ['line',{x1:160,y1:120,x2:320,y2:120},3.2],
    ['line',{x1:-160,y1:-60,x2:0,y2:-60},3.2],
    ['line',{x1:0,y1:-60,x2:160,y2:-60},3.2],
    ['line',{x1:-320,y1:120,x2:-160,y2:-60},2.6],
    ['line',{x1:-160,y1:-60,x2:0,y2:120},2.6],
    ['line',{x1:0,y1:120,x2:160,y2:-60},2.6],
    ['line',{x1:160,y1:-60,x2:320,y2:120},2.6],
    ['line',{x1:-160,y1:120,x2:-160,y2:-60},2.3],
    ['line',{x1:0,y1:120,x2:0,y2:-60},2.3],
    ['line',{x1:160,y1:120,x2:160,y2:-60},2.3],
    ['line',{x1:-352,y1:150,x2:352,y2:150},2.8],
    ['path',{d:'M-330 150 L-348 176 M-250 150 L-268 176 M-170 150 L-188 176 M-90 150 L-108 176 M-10 150 L-28 176 M70 150 L52 176 M150 150 L132 176 M230 150 L212 176 M310 150 L292 176'},1.5],
    ['path',{d:'M-320 120 L-354 182 L-286 182 Z'},2.6],
    ['path',{d:'M-354 182 L-372 206 M-330 182 L-348 206 M-306 182 L-324 206 M-286 182 L-304 206'},1.5],
    ['circle',{cx:304,cy:150,r:16},2.3],
    ['circle',{cx:338,cy:150,r:16},2.3],
    ['line',{x1:278,y1:170,x2:366,y2:170},2.3],
    ['path',{d:'M278 170 L260 194 M304 170 L286 194 M330 170 L312 194 M360 170 L342 194'},1.5],
    ['line',{x1:-160,y1:-172,x2:-160,y2:-74},2.8],
    ['path',{d:'M-173 -96 L-160 -68 L-147 -96'},2.8],
    ['line',{x1:0,y1:-196,x2:0,y2:-74},2.8],
    ['path',{d:'M-13 -96 L0 -68 L13 -96'},2.8],
    ['line',{x1:160,y1:-172,x2:160,y2:-74},2.8],
    ['path',{d:'M147 -96 L160 -68 L173 -96'},2.8],
    ['circle',{cx:-320,cy:120,r:9},2.3],
    ['circle',{cx:-160,cy:120,r:9},2.3],
    ['circle',{cx:0,cy:120,r:9},2.3],
    ['circle',{cx:160,cy:120,r:9},2.3],
    ['circle',{cx:320,cy:120,r:9},2.3],
    ['circle',{cx:-160,cy:-60,r:9},2.3],
    ['circle',{cx:0,cy:-60,r:9},2.3],
    ['circle',{cx:160,cy:-60,r:9},2.3],
    ['line',{x1:-320,y1:244,x2:320,y2:244,'stroke-dasharray':'11 8'},1.5],
    ['path',{d:'M-320 230 L-320 258 M320 230 L320 258 M0 232 L0 256'},1.5],
    ['path',{d:'M-380 212 C -286 226, -186 200, -86 214 S 140 230, 258 208 S 358 218, 388 210'},1.9]
  ];

  /* scene C — the four-chamber heart. Deoxygenated blue on the
     drawing's left, oxygenated red on its right, which is the
     anatomical convention and also the only way the flow arrows
     make sense without a legend. The apex points down-left; a
     valentine points down-centre, and that is the difference
     between a diagram and a sticker. */
  var S_HEART=[
    ['path',{d:'M-16 -232 C 112 -246, 208 -158, 202 -34 C 196 76, 122 172, 14 238 C -58 272, -142 216, -180 122 C -214 38, -200 -108, -114 -184 C -84 -212, -50 -230, -16 -232 Z'},3.2],
    ['path',{d:'M-16 -244 C 124 -258, 226 -168, 220 -32 C 214 84, 132 186, 16 248','stroke-dasharray':'10 9'},1.7],
    ['path',{d:'M10 -212 C 44 -122, 30 6, -40 156'},2.7],
    ['path',{d:'M-142 -132 C -74 -100, -12 -110, 4 -152'},2.2],
    ['path',{d:'M20 -142 C 80 -108, 142 -104, 178 -132'},2.2],
    ['path',{d:'M-136 -102 C -108 -20, -84 66, -34 140'},2.2],
    ['path',{d:'M42 -96 C 92 -14, 108 68, 60 158'},2.2],
    ['path',{d:'M28 -226 C 34 -292, 104 -326, 144 -286 C 168 -260, 164 -226, 142 -208'},2.9],
    ['path',{d:'M64 -224 C 70 -272, 114 -294, 136 -272 C 150 -258, 146 -234, 130 -222'},2.1],
    ['path',{d:'M-44 -220 C -64 -282, -124 -300, -156 -268'},2.7],
    ['path',{d:'M-158 -272 C -182 -292, -210 -292, -228 -278'},2.1],
    ['path',{d:'M-150 -282 C -142 -306, -120 -318, -96 -314'},2.1],
    ['path',{d:'M-118 -196 C -150 -240, -162 -276, -156 -300'},2.7],
    ['path',{d:'M-172 88 C -222 118, -244 158, -240 202'},2.7],
    ['path',{d:'M186 -138 C 226 -156, 258 -150, 282 -128'},1.9],
    ['path',{d:'M182 -102 C 224 -98, 256 -82, 272 -56'},1.9],
    ['path',{d:'M-106 -126 L-86 -94 L-66 -126 L-46 -94 L-26 -126'},2.1],
    ['path',{d:'M48 -120 L68 -90 L88 -120 L108 -90 L128 -120'},2.1],
    ['path',{d:'M40 -214 L56 -238 L72 -214 L88 -238 L104 -214'},2.1],
    ['path',{d:'M-96 -224 L-80 -248 L-64 -224 L-48 -248 L-32 -224'},2.1],
    ['path',{d:'M-8 -168 C -60 -138, -96 -58, -92 36'},1.9],
    ['path',{d:'M-60 -102 C -20 -76, 6 -28, 12 36'},1.7],
    ['path',{d:'M-86 -90 L-72 -28 M-58 -94 L-50 -24'},1.5],
    ['path',{d:'M58 -86 L66 -24 M94 -88 L86 -20'},1.5],
    ['path',{d:'M-212 -62 C -174 -36, -156 4, -156 46'},2.3],
    ['path',{d:'M-170 30 L-156 58 L-142 30'},2.3],
    ['path',{d:'M106 -256 C 140 -278, 170 -268, 184 -240'},2.3],
    ['path',{d:'M168 -250 L192 -234 L186 -262'},2.3],
    ['path',{d:'M-54 208 L-32 236'},1.6]
  ];

  /* ══════════════════════════════════════════════════════════
     SCENE TABLE
     ══════════════════════════════════════════════════════════ */
  var SCENES=[
    {key:'GLOBE',  name:'THE GLOBE',       shapes:S_GLOBE, clip:{id:'globe',from:10,to:19},
     anchors:[[-60,-90],[190,150],[0,-232]],
     tags:[[-300,-190],[250,250],[150,-290]],
     qs:[[1,'Remember','Name the landmass indicated at 01.'],
         [4,'Analyze','Why is the ocean at 02 warmer on its western edge?'],
         [3,'Apply','Predict the effect on sea level if 03 halves.']]},

    {key:'CELL',   name:'THE CELL',        shapes:S_CELL,
     anchors:[[-82,-58],[146,116],[158,-122]],
     tags:[[-330,-210],[330,240],[352,-238]],
     qs:[[1,'Remember','Name the organelle at 01 and state its function.'],
         [3,'Apply','Predict what fails if the membrane at 02 stops selecting.'],
         [5,'Evaluate','Judge which organelle limits growth first, and why.']]},

    {key:'ATOM',   name:'THE ATOM',        shapes:S_ATOM,
     anchors:[[0,0],[252,0],[-112,252]],
     tags:[[-6,-300],[350,-70],[-340,300]],
     qs:[[2,'Understand','Explain why the outer shell governs bonding here.'],
         [4,'Analyze','Which bond breaks first under heat? Justify from the figure.'],
         [6,'Create','Design a stable variant that uses one fewer electron.']]},

    {key:'CIRCUIT',name:'THE CIRCUIT',     shapes:S_CIRCUIT,
     anchors:[[0,-194],[250,4],[0,170]],
     tags:[[-60,-300],[380,60],[190,270]],
     qs:[[1,'Remember','Identify the component at 01 and give its unit.'],
         [4,'Analyze','The lamp dims. Which single failure best explains it?'],
         [3,'Apply','Compute the current if the resistance doubles.']]},

    {key:'ORBIT',  name:'THE ORBIT',       shapes:S_ORBIT,
     anchors:[[0,0],[204,62],[-286,-60]],
     tags:[[-40,-250],[330,190],[-360,-160]],
     qs:[[2,'Understand','Explain why the outermost body has the longest period.'],
         [5,'Evaluate','Judge which orbit best suits a survey mission, and why.'],
         [3,'Apply','Predict the effect on period if the central mass doubles.']]},

    {key:'CYCLE',  name:'THE WATER CYCLE', shapes:S_CYCLE,
     anchors:[[10,-160],[254,-214],[60,206]],
     tags:[[-140,-290],[352,-300],[300,262]],
     qs:[[1,'Remember','Label the stage at which water leaves the surface.'],
         [4,'Analyze','Clearing the slope at 03 — trace the downstream effect.'],
         [6,'Create','Design one intervention that increases retention here.']]},

    {key:'NEURON', name:'THE NEURON',      shapes:S_NEURON, ox:-170,
     anchors:[[-12,2],[224,-2],[408,-62]],
     tags:[[-260,-250],[210,-190],[430,-190]],
     qs:[[2,'Understand','Explain the role of the sheath at 02 in conduction.'],
         [3,'Apply','Predict conduction speed if that sheath is lost.'],
         [5,'Evaluate','Judge which pathway is most vulnerable, and why.']]},

    {key:'NET',    name:'THE NETWORK',     shapes:S_NET,   anchors:[], tags:[], qs:[], finale:true},

    /* --- auxiliary plates: sign-in only, never on the homepage --- */
    {key:'LENS',   name:'THE LENS',        shapes:S_LENS,  aux:true,
     anchors:[[0,0],[110,0],[174,44]],
     tags:[[-300,-250],[300,-190],[330,240]],
     qs:[[2,'Understand','Explain why the image at 03 is inverted.'],
         [3,'Apply','Predict where the image moves if the object nears 02.'],
         [4,'Analyze','Which ray fixes the image height, and why?']]},

    {key:'TRUSS',  name:'THE TRUSS',       shapes:S_TRUSS, aux:true,
     anchors:[[-160,-60],[-320,120],[320,120]],
     tags:[[-300,-250],[-340,250],[330,250]],
     qs:[[1,'Remember','Name the support drawn at 03 and state what it releases.'],
         [4,'Analyze','Which diagonals carry tension under the loads at 01?'],
         [5,'Evaluate','Judge whether the span is safe if 02 seizes.']]},

    {key:'HEART',  name:'THE HEART',       shapes:S_HEART, aux:true,
     anchors:[[-100,-40],[100,-40],[100,-280]],
     tags:[[-320,-230],[320,140],[300,-290]],
     qs:[[1,'Remember','Name the chamber at 01 and the vessel it empties into.'],
         [4,'Analyze','Trace the path from 01 to 03 and name every valve crossed.'],
         [6,'Create','Design a test that would reveal a leak at 02.']]}
  ];

  /* Which plates this mount actually plays. `only` names them in
     order — the sign-in page asks for its own three. Otherwise the
     auxiliary plates are dropped, so the homepage keeps exactly one
     plate per scroll section and the anchor maths still lines up. */
  SCENES = (opts.only && opts.only.length)
    ? opts.only.map(function(k){
        for(var z=0;z<SCENES.length;z++) if(SCENES[z].key===k) return SCENES[z];
        return null;
      }).filter(Boolean)
    : SCENES.filter(function(sc){ return !sc.aux });
  if(SCENES.length<2) SCENES=[SCENES[0]||{key:'GLOBE',name:'THE GLOBE',shapes:S_GLOBE,anchors:[],tags:[],qs:[]}];
  var N=SCENES.length;

  /* The vertical band of the 1600×900 viewBox that survives both the
     `slice` crop on a short window and the fixed chrome bar over the
     top of it. Every plate mount is sized and placed inside this. */
  var SAFE_T=118, SAFE_B=818, BAND=SAFE_B-SAFE_T;
  var STAGE_X=1040,STAGE_Y=452;
  /* PAD_Y came down from 54. The mount is a frame around a drawing,
     not a room the drawing stands in the middle of — and every pixel
     of air inside it is a pixel the frame's own top and bottom rules
     have to find somewhere on a cropped stage. */
  var PAD_X=44, PAD_Y=34;
  var LEVELS=['Remember','Understand','Apply','Analyze','Evaluate','Create'];

  /* Greedy wrap into at most `lines` lines of at most `n` characters. The
     last line absorbs whatever is left, so nothing is ever silently
     dropped off the end of a question. */
  function wrap(s,n,lines){
    lines=lines||2;
    var w=s.split(' '), out=[''], k=0;
    for(var i=0;i<w.length;i++){
      var next=(out[k]?out[k]+' ':'')+w[i];
      if(out[k]&&next.length>n&&k<lines-1){k++;out[k]=w[i]}
      else out[k]=next;
    }
    while(out.length<lines)out.push('');
    return out;
  }

  /* ══════════════════════════════════════════════════════════
     THE COLOUR PASS
     Every plate is drawn in ink first, then inked in — the fill
     only starts arriving in the last third of each stroke's own
     draw, so you always see the line before the colour. Keyed by
     stroke index so the geometry above stays pure line data.
     [ fill, fill-opacity, stroke ]
     ══════════════════════════════════════════════════════════ */
  function R(m,a,b,spec){for(var i=a;i<=b;i++)m[i]=spec;return m}
  var W=function(n){return 'var(--w-'+n+')'};
  var CMAP={
    GLOBE:(function(){var m={};
      m[1]=[null,0,W('amber')];       /* the equator          */
      m[2]=[null,0,W('sky')];   m[3]=[null,0,W('sky')];
      m[4]=[null,0,W('teal')];  m[5]=[null,0,W('teal')];
      R(m,6,8,[null,0,W('sky')]);     /* meridians            */
      m[9]=[null,0,W('violet')];      /* the axis             */
      R(m,10,19,[null,0,W('green')]); /* land, inked in green */
      R(m,20,21,[null,0,W('teal')]);  /* ice caps             */
      return m;})(),

    CELL:(function(){var m={};
      /* RECOLOURED. The old pass gave the cytoplasm a heavy 50% sand
         wash and then drew the mitochondria in the same red at the same
         50%, so the one organelle the plate is really about sank into
         its own background, and the ribosomes — also red — read as bits
         of it that had broken off. Every organelle now owns a hue
         nobody else uses, and the cytoplasm drops to a wash faint
         enough to be a ground rather than a competitor. */
      m[0]=[W('amber'),.16,W('teal')];  /* cytoplasm + plasma membrane */
      m[1]=[null,0,W('teal')];          /* inner membrane              */
      m[2]=[W('violet'),.30,null];      /* nucleus                     */
      m[3]=[null,0,W('violet')];        /* nuclear envelope            */
      m[4]=[W('blue'),.88,W('blue')];   /* nucleolus                   */
      m[5]=[null,0,W('violet')]; m[6]=[null,0,W('violet')];  /* chromatin */
      m[7]=[W('orange'),.58,W('red')];  /* mitochondrion — the subject */
      m[8]=[null,0,W('red')];           /* its cristae                 */
      m[9]=[W('orange'),.58,W('red')];
      m[10]=[null,0,W('red')];
      m[11]=[W('sky'),.46,W('blue')];   /* vacuole                     */
      m[12]=[null,0,W('blue')];
      m[13]=[null,0,W('green')]; m[14]=[null,0,W('green')]; /* ER       */
      R(m,15,17,[null,0,W('amber')]);   /* golgi                       */
      R(m,18,19,[null,0,W('sky')]);     /* cytoskeleton                */
      R(m,20,23,[W('violet'),.92,W('violet')]); /* ribosomes           */
      m[24]=[W('green'),.48,W('green')];/* vesicle                     */
      return m;})(),

    ATOM:(function(){var m={};
      m[0]=[null,0,W('blue')]; m[1]=[null,0,W('teal')]; m[2]=[null,0,W('violet')];
      m[3]=[W('red'),.92,null]; m[4]=[W('blue'),.92,null]; m[5]=[W('amber'),.92,null];
      m[18]=[null,0,W('sky')];        /* the inner shell      */
      R(m,6,8,[W('teal'),.95,W('teal')]);
      R(m,19,21,[W('teal'),.95,W('teal')]);    /* electrons   */
      m[22]=[null,0,W('amber')];      /* the photon           */
      m[9]=[W('green'),.45,W('green')]; m[10]=[W('sky'),.45,W('sky')];
      R(m,11,12,[null,0,W('orange')]);
      R(m,13,15,[null,0,W('orange')]);
      m[16]=[null,0,W('red')];
      return m;})(),

    CIRCUIT:(function(){var m={};
      R(m,0,7,[null,0,W('grey')]);    /* wires                */
      m[8]=[null,0,W('orange')];      /* resistor             */
      m[9]=[null,0,W('blue')];        /* capacitor            */
      m[10]=[W('amber'),.85,null];    /* lamp                 */
      m[11]=[null,0,W('red')];
      m[12]=[null,0,W('red')];        /* battery              */
      R(m,13,14,[W('red'),.95,W('red')]);
      m[15]=[null,0,W('teal')];       /* ground               */
      R(m,16,19,[null,0,W('teal')]);  /* current arrows       */
      m[20]=[null,0,W('orange')];     /* inductor             */
      m[21]=[null,0,W('sky')];        /* the sense branch     */
      R(m,22,23,[W('sky'),.9,W('sky')]);
      R(m,24,25,[null,0,W('violet')]);/* the meter marks      */
      m[26]=[null,0,W('violet')];     /* voltmeter            */
      m[27]=[null,0,W('violet')];
      m[28]=[null,0,W('amber')];      /* switch lever         */
      return m;})(),

    ORBIT:(function(){var m={};
      m[0]=[W('red'),.95,W('red')];   /* ☉ THE SUN IS RED     */
      R(m,1,12,[null,0,W('red')]);    /* rays                 */
      m[13]=[null,0,W('sky')]; m[14]=[null,0,W('teal')];
      m[15]=[null,0,W('green')]; m[16]=[null,0,W('violet')];
      m[17]=[W('sky'),.92,null];
      m[18]=[W('green'),.92,null];
      m[19]=[W('amber'),.92,null];
      m[20]=[null,0,W('amber')];      /* ring                 */
      m[21]=[W('violet'),.92,null];
      R(m,22,27,[W('amber'),.85,W('amber')]); /* the belt     */
      m[28]=[W('teal'),.9,W('teal')]; /* the dwarf            */
      return m;})(),

    CYCLE:(function(){var m={};
      R(m,0,2,[null,0,W('blue')]);    /* sea                  */
      m[3]=[W('sand'),.78,null];      /* mountain             */
      m[4]=[W('cream'),.95,null];     /* snow cap             */
      m[5]=[null,0,W('blue')];        /* river                */
      m[6]=[W('red'),.92,W('red')];   /* the sun, red again   */
      R(m,7,16,[null,0,W('red')]);    /* rays                 */
      m[17]=[W('sky'),.38,null];      /* cloud                */
      m[18]=[null,0,W('blue')];       /* rain                 */
      R(m,19,24,[null,0,W('teal')]);  /* evaporation          */
      m[25]=[W('green'),.9,W('green')]; m[27]=[W('green'),.9,W('green')]; /* pines */
      m[26]=[null,0,W('grey')]; m[28]=[null,0,W('grey')];
      m[29]=[null,0,W('sky')];        /* wind                 */
      return m;})(),

    NEURON:(function(){var m={};
      m[0]=[W('pink'),.45,null];      /* soma                 */
      m[1]=[W('violet'),.60,null];
      m[2]=[W('blue'),.92,null];
      R(m,3,9,[null,0,W('violet')]);  /* dendrites            */
      m[10]=[null,0,W('amber')];      /* the axon             */
      R(m,11,13,[W('amber'),.62,W('orange')]); /* myelin      */
      R(m,14,16,[null,0,W('teal')]);  /* terminal branches    */
      R(m,17,19,[W('teal'),.92,W('teal')]);
      m[20]=[null,0,W('red')];        /* signal               */
      R(m,22,24,[W('amber'),.9,W('amber')]);  /* vesicles     */
      m[25]=[null,0,W('teal')];       /* collateral           */
      m[26]=[W('teal'),.92,W('teal')];
      return m;})(),

    /* --- auxiliary plates --- */
    LENS:(function(){var m={};
      m[0]=[null,0,W('grey')];        /* principal axis        */
      m[1]=[W('sky'),.42,W('blue')];  /* the lens itself       */
      m[2]=[null,0,W('violet')];      /* the lens plane        */
      m[3]=[W('red'),.92,W('red')];   /* F and F′              */
      m[4]=[W('red'),.92,W('red')];
      m[5]=[W('grey'),.85,W('grey')]; /* 2F and 2F′            */
      m[6]=[W('grey'),.85,W('grey')];
      R(m,7,8,[null,0,W('green')]);   /* the object            */
      R(m,9,10,[null,0,W('orange')]); /* the real image        */
      R(m,11,12,[null,0,W('amber')]); /* parallel → focal ray  */
      m[13]=[null,0,W('teal')];       /* the centre ray        */
      R(m,14,15,[null,0,W('violet')]);/* focal → parallel ray  */
      R(m,16,17,[null,0,W('grey')]);  /* the screen            */
      R(m,18,19,[null,0,W('grey')]);  /* the mount             */
      R(m,20,21,[null,0,W('sand')]);  /* the optical bench     */
      R(m,22,23,[null,0,W('sky')]);   /* incoming wavefronts   */
      return m;})(),

    TRUSS:(function(){var m={};
      R(m,0,3,[null,0,W('blue')]);    /* bottom chord — tension     */
      R(m,4,5,[null,0,W('teal')]);    /* top chord — compression    */
      R(m,6,9,[null,0,W('orange')]);  /* diagonals                  */
      R(m,10,12,[null,0,W('green')]); /* verticals                  */
      R(m,13,14,[null,0,W('sand')]);  /* the deck                   */
      R(m,15,16,[null,0,W('grey')]);  /* the pin                    */
      R(m,17,20,[null,0,W('grey')]);  /* the roller                 */
      R(m,21,26,[null,0,W('red')]);   /* the loads                  */
      R(m,27,34,[W('amber'),.95,W('amber')]); /* the joints         */
      R(m,35,36,[null,0,W('grey')]);  /* the span dimension         */
      m[37]=[null,0,W('sky')];        /* the water below            */
      return m;})(),

    HEART:(function(){var m={};
      m[0]=[W('pink'),.34,W('red')];  /* the myocardium         */
      m[1]=[null,0,W('grey')];        /* the pericardium        */
      m[2]=[null,0,W('red')];         /* the septum             */
      m[3]=[null,0,W('blue')];        /* right AV boundary      */
      m[4]=[null,0,W('red')];         /* left AV boundary       */
      m[5]=[null,0,W('blue')];        /* right ventricle        */
      m[6]=[null,0,W('red')];         /* left ventricle         */
      R(m,7,8,[null,0,W('red')]);     /* the aortic arch        */
      R(m,9,11,[null,0,W('blue')]);   /* the pulmonary trunk    */
      m[12]=[null,0,W('blue')];       /* superior vena cava     */
      m[13]=[null,0,W('blue')];       /* inferior vena cava     */
      R(m,14,15,[null,0,W('red')]);   /* the pulmonary veins    */
      R(m,16,19,[null,0,W('amber')]); /* the four valves        */
      R(m,20,21,[null,0,W('orange')]);/* the coronaries         */
      R(m,22,23,[null,0,W('grey')]);  /* chordae tendineae      */
      R(m,24,25,[null,0,W('blue')]);  /* deoxygenated inflow    */
      R(m,26,27,[null,0,W('red')]);   /* oxygenated outflow     */
      m[28]=[null,0,W('grey')];       /* the apex tick          */
      return m;})()
  };


  /* ══════════════════════════════════════════════════════════════════
     THE INK SYSTEM
     ------------------------------------------------------------------
     The page owns a FIXED INVENTORY OF INK: 52 persistent strands, each
     carrying 32 points. It is created once, at load, and never destroyed.

     A "scene" is not a drawing — it is an instruction telling those same
     52 strands where to sit. CELL is one configuration. ATOM is another.
     Scrolling does not erase a plate and draw the next one; it tells the
     ink to become the next idea, and the ink travels across the page to
     get there.

          Scene geometry
               ↓  normalizeScene()      primitives → sampled polylines
               ↓  allocateStrands()     → exactly 52 strands, 32 pts each
               ↓  correspond()          greedy least-cost source→target
               ↓  align()               reversal + rotational phase
               ↓  morph()               bezier flow field + hierarchy
               ↓  smoothPath()          Catmull-Rom w/ corner preservation
               ↓  render(scrollProgress)

     render() is a pure function of scroll position. Same number in,
     same picture out — forwards, backwards, or frozen.
     ══════════════════════════════════════════════════════════════════ */

  var UID='pl'+Math.floor(Math.random()*1e9).toString(36);
  var STRANDS=0, PTS=34;
  var ART_Y=452, ART_X_RIGHT=1040, ART_X_LEFT=560;
  var CHIP_W=300, CHIP_H=134, CHIP_GAP=18, CHIP_Y0=140;
  var CHIP_X_RIGHT=1180, CHIP_X_LEFT=22;

  /* Plates alternate sides so the ink has somewhere to travel to. Pin
     them to one anchor instead (ANCHOR_X) and the same morph happens in
     place — which is what the sign-in panel wants. */
  function sideOf(i){return ANCHOR_X!==null?'right':((i%2===0)?'right':'left')}
  function artX(i){return ANCHOR_X!==null?ANCHOR_X:(sideOf(i)==='right'?ART_X_RIGHT:ART_X_LEFT)}
  function chipX(i){return sideOf(i)==='right'?CHIP_X_RIGHT:CHIP_X_LEFT}

  /* ---- deterministic pseudo-random. Never Math.random() at render. ---- */
  function hsh(a,b){var x=Math.sin(a*127.1+b*311.7)*43758.5453;return x-Math.floor(x)}
  function smoothstep(e0,e1,x){var t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t)}
  function easeInOutCubic(t){return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
  function easeInOutQuint(t){return t<0.5?16*t*t*t*t*t:1-Math.pow(-2*t+2,5)/2}

  /* ---- theme-aware colour resolution ---- */
  var colCache={};
  function hexRGB(v){
    v=(v||'').trim();
    if(v[0]==='#'){
      if(v.length===4)v='#'+v[1]+v[1]+v[2]+v[2]+v[3]+v[3];
      return [parseInt(v.slice(1,3),16),parseInt(v.slice(3,5),16),parseInt(v.slice(5,7),16)];
    }
    var m=/rgba?\(([^)]+)\)/.exec(v);
    if(m){var a=m[1].split(',');return [+a[0],+a[1],+a[2]]}
    return [10,10,10];
  }
  function tokenRGB(tok){
    if(colCache[tok])return colCache[tok];
    var r=hexRGB(getComputedStyle(document.documentElement).getPropertyValue(tok));
    colCache[tok]=r;return r;
  }
  function resolveCol(c){
    if(!c||c==='currentColor')return tokenRGB('--ink');
    var m=/var\((--[\w-]+)\)/.exec(c);
    if(m)return tokenRGB(m[1]);
    return hexRGB(c);
  }
  var themeObs=new MutationObserver(function(){colCache={}});
  themeObs.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','class']});

  /* ══════════════════════════════════════════════════════════
     STAGE — the drafting paper stays put. Only the ink moves.
     ══════════════════════════════════════════════════════════ */
  var svg=E('svg',{viewBox:VIEWBOX,preserveAspectRatio:FIT,'class':'plate-svg'},host);
  var defs=E('defs',{},svg);
  /* SVG grid removed in favor of consistent CSS background grid */
  /* The sphere, as a clip. The land wash is bounded by the globe's own
     silhouette, so no continent can ever spill past the limb. */
  var globeClip=E('clipPath',{id:UID+'globe',clipPathUnits:'userSpaceOnUse'},defs);
  E('circle',{cx:0,cy:0,r:250},globeClip);
  /* plate furniture — moves to the active side, never redrawn */
  /* ---- the plate mount ----
     The frame is a mount, not a crop. It is re-laid-out every frame from
     a size the plate itself asks for, so a wide plate gets a wide plate
     card and nothing is ever drawn outside its own frame. The furniture
     — corner marks, title block, scale bar — is repositioned with it
     rather than baked in at one size. */
  var gFrame=E('g',{},svg);
  var fRect=E('rect',{fill:'none',stroke:'currentColor','stroke-width':2.2,'stroke-opacity':.34},gFrame);
  var fCorner=[[-1,-1],[1,-1],[1,1],[-1,1]].map(function(c){
    return {c:c,el:E('path',{fill:'none',stroke:'currentColor','stroke-width':3,'stroke-opacity':.75},gFrame)};
  });
  var fRule=E('line',{stroke:'currentColor','stroke-width':1.4,'stroke-opacity':.4},gFrame);
  var plateNo=E('text',{'class':'pf-mono','font-size':13,'font-weight':700,
    'letter-spacing':2.4,fill:'currentColor','fill-opacity':.7},gFrame);
  var fMaker=E('text',{'text-anchor':'end','class':'pf-mono','font-size':11,
    'letter-spacing':1.6,fill:'currentColor','fill-opacity':.4},gFrame);
  fMaker.textContent='DIAGRAMMIND · INGEST';
  var fBar1=E('rect',{width:52,height:7,fill:'currentColor','fill-opacity':.55},gFrame);
  var fBar2=E('rect',{width:52,height:7,fill:'none',stroke:'currentColor','stroke-width':1.4,'stroke-opacity':.55},gFrame);
  var scaleT=E('text',{'class':'pf-mono','font-size':10,'letter-spacing':1.3,
    fill:'currentColor','fill-opacity':.42},gFrame);

  var lastFW=-1,lastFH=-1;
  function layoutFrame(fw,fh){
    if(Math.abs(fw-lastFW)<0.5&&Math.abs(fh-lastFH)<0.5)return;
    lastFW=fw; lastFH=fh;
    var hw=fw/2, hh=fh/2, R=function(v){return Math.round(v)};
    setA(fRect,'x',R(-hw)); setA(fRect,'y',R(-hh));
    setA(fRect,'width',R(fw)); setA(fRect,'height',R(fh));
    for(var i=0;i<fCorner.length;i++){
      var c=fCorner[i].c;
      setA(fCorner[i].el,'d','M'+R(c[0]*hw)+' '+R(c[1]*hh-28*c[1])+' L '+R(c[0]*hw)+' '+R(c[1]*hh)+
        ' L '+R(c[0]*hw-28*c[0])+' '+R(c[1]*hh));
    }
    setA(fRule,'x1',R(-hw+14)); setA(fRule,'y1',R(hh-46));
    setA(fRule,'x2',R(-hw+264)); setA(fRule,'y2',R(hh-46));
    setA(plateNo,'x',R(-hw+14)); setA(plateNo,'y',R(hh-22));
    setA(fMaker,'x',R(hw-14));  setA(fMaker,'y',R(hh-22));
    /* The scale bar lives at the head of the plate. Down by the title block
       it kept colliding with whichever callout swung low. */
    setA(fBar1,'x',R(hw-186)); setA(fBar1,'y',R(-hh+30));
    setA(fBar2,'x',R(hw-134)); setA(fBar2,'y',R(-hh+30));
    setA(scaleT,'x',R(hw-186)); setA(scaleT,'y',R(-hh+22));
  }

  var gFills =E('g',{},svg);                                        /* A · fills   */
  var gEcho  =E('g',{fill:'none','stroke-linecap':'round','stroke-linejoin':'round',opacity:0},svg); /* ink memory */
  var gInk   =E('g',{fill:'none','stroke-linecap':'round','stroke-linejoin':'round'},svg);           /* A · strands */
  var gAnn   =E('g',{},svg);                                        /* B · annotation */
  var gLink  =E('g',{fill:'none','stroke-linecap':'round'},svg);    /* B · tag → card leaders */
  var gChips =E('g',{},svg);                                        /* B · question UI */
  var gSet   =E('g',{opacity:0},svg);
  var gDebug =E('g',{opacity:0,fill:'none'},svg);

  var setLine0=E('line',{x1:0,y1:0,x2:CHIP_W,y2:0,stroke:'currentColor','stroke-width':2},gSet);
  var setL=E('text',{x:0,y:-10,'class':'pf-mono','font-size':10,'font-weight':700,
    'letter-spacing':1.8,fill:'currentColor'},gSet);
  var setR=E('text',{x:CHIP_W,y:-10,'text-anchor':'end','class':'pf-mono','font-size':10,
    'letter-spacing':1.4,fill:'var(--b2)'},gSet);

  /* ---- FLAT INK. No gradients: each body gets one chosen colour,
     opaque enough to read as printed ink rather than a wash. ---- */
  (function(){
    var F=function(n){return 'var(--f-'+n+')'};
    function set(k,i,fill,op){var m=CMAP[k];if(!m)return;m[i]=[fill,op,(m[i]&&m[i][2])||null]}
    set('CELL',0,F('cyto'),.95);  set('CELL',2,F('nuc'),.95);   set('CELL',4,F('core'),1);
    set('CELL',7,F('mito'),.95);  set('CELL',9,F('mito'),.95);  set('CELL',11,F('vac'),.95);
    set('ATOM',3,F('mito'),1);    set('ATOM',4,F('core'),1);    set('ATOM',5,F('amber'),1);
    set('ATOM',9,F('green'),.92); set('ATOM',10,F('sky'),.92);
    set('CIRCUIT',10,F('amber'),1);
    set('ORBIT',0,F('sun'),1);    set('ORBIT',17,F('sky'),1);   set('ORBIT',18,F('green'),1);
    set('ORBIT',19,F('amber'),1); set('ORBIT',21,F('nuc'),1);
    set('CYCLE',3,F('mount'),1);  set('CYCLE',4,F('snow'),1);   set('CYCLE',6,F('sun2'),1);
    set('CYCLE',17,F('cloud'),1);
    set('NEURON',0,F('soma'),.95);set('NEURON',1,F('nuc'),1);   set('NEURON',2,F('core'),1);
    set('NEURON',11,F('amber'),.95);set('NEURON',12,F('amber'),.95);set('NEURON',13,F('amber'),.95);
  })();

  /* ══════════════════════════════════════════════════════════
     1 · GEOMETRY NORMALIZER
     Every primitive — path, line, circle, ellipse, rect — becomes
     a sampled polyline. After this step nothing in the system
     knows what kind of shape it used to be.
     ══════════════════════════════════════════════════════════ */
  var gMeasure=E('g',{visibility:'hidden'},svg);

  function normalizeScene(sc){
    var out=[], maxL=0;
    sc.shapes.forEach(function(s,idx){
      var a0=Object.assign({fill:'none',stroke:'currentColor','stroke-width':s[2]},s[1]);
      var col=(CMAP[sc.key]||{})[idx];
      /* a path with several subpaths is several contours — sampling it as
         one would draw phantom lines between the pen-lifts */
      var subs=[a0];
      if(s[0]==='path'&&typeof a0.d==='string'&&(a0.d.match(/M/g)||[]).length>1){
        subs=a0.d.split(/(?=M)/).filter(function(x){return x.trim().length>1})
          .map(function(d){var c=Object.assign({},a0);c.d=d;return c});
      }
      subs.forEach(function(a){
      var e=E(s[0],a,gMeasure);
      var L=0; try{L=e.getTotalLength()}catch(err){L=0}
      if(L<3){e.remove();return}
      var mtx=null;
      try{var tf=e.transform.baseVal.consolidate();if(tf)mtx=tf.matrix}catch(err2){}
      var n=clamp(Math.round(L/5),10,260), pts=new Float64Array(n*2);
      for(var k=0;k<n;k++){
        var pt=e.getPointAtLength(L*k/(n-1)), px=pt.x, py=pt.y;
        if(mtx){var nx=mtx.a*px+mtx.c*py+mtx.e, ny=mtx.b*px+mtx.d*py+mtx.f;px=nx;py=ny}
        pts[k*2]=px; pts[k*2+1]=py;
      }
      var closed=Math.hypot(pts[0]-pts[(n-1)*2],pts[1]-pts[(n-1)*2+1])<2.5;
      if(L>maxL)maxL=L;
      out.push({pts:pts,n:n,L:L,closed:closed,si:idx,
        col:(col&&col[2])?col[2]:((s[1]&&s[1].stroke)||'currentColor'), w:s[2],
        dash:!!(s[1]&&s[1]['stroke-dasharray'])});
      e.remove();
      });
    });
    /* hierarchy — PRIMARY silhouette, SECONDARY structure, DETAIL accents */
    out.forEach(function(c){ c.imp = c.L>maxL*0.55?0 : c.L>maxL*0.17?1 : 2; });
    return out;
  }

  /* ══════════════════════════════════════════════════════════
     2 · STRAND ALLOCATOR
     The 52 strands are shared out by ink length, so a long
     membrane gets many and a tick mark gets one. Long contours
     are split; the split pieces stay adjacent in the pool.
     ══════════════════════════════════════════════════════════ */
  function arcTable(src,n){
    var cum=new Float64Array(n),tot=0;
    for(var i=1;i<n;i++){tot+=Math.hypot(src[i*2]-src[(i-1)*2],src[i*2+1]-src[(i-1)*2+1]);cum[i]=tot}
    return cum;
  }
  /* resample the arc span [a0,a1] of a polyline into PTS evenly spaced points */
  function span(src,n,cum,a0,a1,dst,ax,ay){
    var tot=cum[n-1]||1, s0=a0*tot, s1=a1*tot, seg=1;
    for(var k=0;k<PTS;k++){
      var t=s0+(s1-s0)*(k/(PTS-1));
      while(seg<n-1&&cum[seg]<t)seg++;
      var c0=cum[seg-1],c1=cum[seg],f=(c1-c0)>1e-6?clamp((t-c0)/(c1-c0),0,1):0;
      dst[k*2]  =src[(seg-1)*2]  +(src[seg*2]  -src[(seg-1)*2])*f   +ax;
      dst[k*2+1]=src[(seg-1)*2+1]+(src[seg*2+1]-src[(seg-1)*2+1])*f +ay;
    }
  }

  function metrics(st){
    var cx=0,cy=0,i;
    for(i=0;i<PTS;i++){cx+=st.pts[i*2];cy+=st.pts[i*2+1]}
    st.cx=cx/PTS; st.cy=cy/PTS;
    var len=0,turn=0,pax=0,pay=0;
    for(i=1;i<PTS;i++){
      var dx=st.pts[i*2]-st.pts[(i-1)*2], dy=st.pts[i*2+1]-st.pts[(i-1)*2+1];
      len+=Math.hypot(dx,dy);
      if(i>1){
        var a1=Math.atan2(dy,dx), a0=Math.atan2(pay,pax), d=a1-a0;
        while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI;
        turn+=Math.abs(d);
      }
      pax=dx;pay=dy;
    }
    st.len=len;
    st.curv=len>1?turn/len*100:0;
    st.ang=Math.atan2(st.pts[(PTS-1)*2+1]-st.pts[1],st.pts[(PTS-1)*2]-st.pts[0]);
    return st;
  }

  /* how many of the G slots each contour of a scene gets — every contour
     gets at least one, then the longest are subdivided until the scene
     uses the whole inventory. Pieces of one contour stay adjacent. */
  function shareOut(contours,G){
    var counts=contours.map(function(){return 1});
    var sum=contours.length, g=0;
    while(sum<G&&g++<600){
      var bi=0,bv=-1;
      for(var i=0;i<contours.length;i++){var v=contours[i].L/counts[i];if(v>bv){bv=v;bi=i}}
      counts[bi]++;sum++;
    }
    g=0;
    while(sum>G&&g++<600){
      var wi=-1,wv=Infinity;
      for(var j=0;j<contours.length;j++)if(counts[j]>1){var v=contours[j].L/counts[j];if(v<wv){wv=v;wi=j}}
      if(wi<0)break;counts[wi]--;sum--;
    }
    return counts;
  }

  /* ══════════════════════════════════════════════════════════
     3 · CORRESPONDENCE — matched CONTOUR to CONTOUR, never
     piece to piece. This is what stops the drawing shattering:
     every piece of one line is guaranteed to travel to the same
     destination line, so the line arrives whole.
     ══════════════════════════════════════════════════════════ */
  function contourCost(a,b,axA,axB){
    var dLen=Math.abs(Math.log((a.L+8)/(b.L+8)))/2.2;
    var dCen=Math.hypot((a.cx-axA)-(b.cx-axB),a.cy-b.cy)/560;
    var da=Math.abs(a.ang-b.ang); while(da>Math.PI)da=Math.abs(da-2*Math.PI);
    var dAng=Math.min(da,Math.PI-da)/(Math.PI/2);
    var dCur=Math.abs(a.curv-b.curv)/9;
    var dTop=(a.closed!==b.closed)?1:0;
    var dImp=Math.abs(a.imp-b.imp)/2;
    return 2.0*Math.min(dLen,1.6)+1.5*Math.min(dCen,1.5)+0.9*dAng+0.9*Math.min(dCur,1.5)+0.7*dTop+0.7*dImp;
  }

  /* Assign every source contour a target contour, while guaranteeing that
     every target contour is claimed by at least one source — otherwise
     part of the next diagram would simply never be drawn. */
  function matchContours(A,B,axA,axB){
    var cA=A.length,cB=B.length,i,j;
    var cost=[];
    for(i=0;i<cA;i++){cost.push([]);for(j=0;j<cB;j++)cost[i][j]=contourCost(A[i],B[j],axA,axB)}
    var assign=new Int16Array(cA).fill(-1);
    var claims=new Int16Array(cB);
    /* pass 1 — every target grabs its best free source (coverage) */
    var order=[];
    for(j=0;j<cB;j++)order.push(j);
    order.sort(function(x,y){return B[y].L-B[x].L});
    for(var oi=0;oi<order.length;oi++){
      j=order[oi];
      var best=-1,bv=Infinity;
      for(i=0;i<cA;i++)if(assign[i]<0&&cost[i][j]<bv){bv=cost[i][j];best=i}
      if(best>=0){assign[best]=j;claims[j]++}
    }
    /* pass 2 — leftover sources join their cheapest target */
    for(i=0;i<cA;i++)if(assign[i]<0){
      var bj=0,bv2=Infinity;
      for(j=0;j<cB;j++){var c=cost[i][j]+claims[j]*0.55;if(c<bv2){bv2=c;bj=j}}
      assign[i]=bj;claims[bj]++;
    }
    return {assign:assign,claims:claims};
  }

  /* ---- point-order alignment: reversal + rotational phase.
     Without this a square morphing to a circle twists on its way. ---- */
  function ssd(a,b,off,rev){
    var s=0;
    for(var k=0;k<PTS;k++){
      var idx=rev?(PTS-1-((k+off)%PTS)):((k+off)%PTS);
      var dx=a.pts[k*2]-b.pts[idx*2], dy=a.pts[k*2+1]-b.pts[idx*2+1];
      s+=dx*dx+dy*dy;
    }
    return s;
  }
  function align(a,b){
    var best=Infinity,bo=0,br=false,offs=[0];
    if(b.closed){offs=[];for(var o=0;o<PTS;o+=Math.max(1,Math.round(PTS/12)))offs.push(o)}
    for(var r=0;r<2;r++)for(var oi=0;oi<offs.length;oi++){
      var v=ssd(a,b,offs[oi],r===1);
      if(v<best){best=v;bo=offs[oi];br=(r===1)}
    }
    if(bo===0&&!br)return b;
    var np=new Float64Array(PTS*2);
    for(var k=0;k<PTS;k++){
      var idx=br?(PTS-1-((k+bo)%PTS)):((k+bo)%PTS);
      np[k*2]=b.pts[idx*2];np[k*2+1]=b.pts[idx*2+1];
    }
    b.pts=np;
    return metrics(b);
  }

  /* ══════════════════════════════════════════════════════════
     4 · BUILD — one shared inventory, chained scene to scene
     ══════════════════════════════════════════════════════════ */
  var LEVELS_=LEVELS;

  /* normalise every plate first so the inventory can be sized to the
     busiest one — then no target line ever goes undrawn */
  var raw=SCENES.map(function(sc,i){
    var cs=normalizeScene(sc);
    cs.forEach(function(c){c.cum=arcTable(c.pts,c.n);metricsOfContour(c,artX(i)+(sc.ox||0))});
    return cs;
  });
  function metricsOfContour(c,ax){
    var cx=0,cy=0,i;
    for(i=0;i<c.n;i++){cx+=c.pts[i*2];cy+=c.pts[i*2+1]}
    c.cx=cx/c.n+ax; c.cy=cy/c.n+ART_Y;
    var turn=0,pax=0,pay=0;
    for(i=1;i<c.n;i++){
      var dx=c.pts[i*2]-c.pts[(i-1)*2],dy=c.pts[i*2+1]-c.pts[(i-1)*2+1];
      if(i>1){var a1=Math.atan2(dy,dx),a0=Math.atan2(pay,pax),d=a1-a0;
        while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;turn+=Math.abs(d)}
      pax=dx;pay=dy;
    }
    c.curv=c.L>1?turn/c.L*100:0;
    c.ang=Math.atan2(c.pts[(c.n-1)*2+1]-c.pts[1],c.pts[(c.n-1)*2]-c.pts[0]);
    return c;
  }
  STRANDS=0;
  raw.forEach(function(cs){if(cs.length>STRANDS)STRANDS=cs.length});
  STRANDS=Math.max(STRANDS,24);

  /* scene 0 defines the grouping: which slots belong to which line.
     Every later scene inherits it, so a "group" is a fixed set of slot
     ids for the whole page. */
  function buildFrom(contours,counts,axWorld,order){
    var strands=[],gid=0;
    order.forEach(function(rec){
      var c=contours[rec.ci], n=rec.n, a0=rec.a0, a1=rec.a1;
      for(var p=0;p<n;p++){
        var pts=new Float64Array(PTS*2);
        span(c.pts,c.n,c.cum,a0+(a1-a0)*p/n,a0+(a1-a0)*(p+1)/n,pts,axWorld,ART_Y);
        var st=metrics({pts:pts,col:c.col,w:c.w,dash:c.dash,imp:c.imp,si:c.si,
          closed:c.closed&&n===1&&a0===0&&a1===1,gid:rec.gid,ci:rec.ci});
        st.lcx=st.cx-axWorld; st.lcy=st.cy-ART_Y; st.ox0=axWorld;
        strands.push(st);
      }
    });
    return strands;
  }

  var scenes=[];
  (function(){
    /* --- scene 0 --- */
    var c0=raw[0], ax0=artX(0)+(SCENES[0].ox||0);
    var counts0=shareOut(c0,STRANDS);
    var order0=c0.map(function(c,ci){return {ci:ci,n:counts0[ci],a0:0,a1:1,gid:ci}});
    scenes.push({sc:SCENES[0],i:0,ax:artX(0),contours:c0,
      strands:buildFrom(c0,counts0,ax0,order0),order:order0});

    for(var i=1;i<SCENES.length;i++){
      var prev=scenes[i-1], cur=raw[i];
      var axP=artX(i-1)+(SCENES[i-1].ox||0), axC=artX(i)+(SCENES[i].ox||0);
      /* the previous scene's groups, in slot order */
      /* If the next plate has MORE lines than we currently have groups,
         split the biggest groups until there is one group per target line
         — otherwise some of the next diagram would simply never be drawn
         (that is what left outlines half-finished). Splitting keeps slot
         order and the total ink constant. */
      var groups=prev.order.map(function(g){return {ci:g.ci,n:g.n,a0:g.a0,a1:g.a1,gid:g.gid}});
      var gd=0;
      while(groups.length<cur.length&&gd++<600){
        var bi=-1,bn=1;
        for(var q=0;q<groups.length;q++)if(groups[q].n>bn){bn=groups[q].n;bi=q}
        if(bi<0)break;
        var g0=groups[bi], half=Math.max(1,Math.floor(g0.n/2));
        var mid=g0.a0+(g0.a1-g0.a0)*(half/g0.n);
        groups.splice(bi,1,{ci:g0.ci,n:half,a0:g0.a0,a1:mid,gid:g0.gid},
                            {ci:g0.ci,n:g0.n-half,a0:mid,a1:g0.a1,gid:g0.gid});
      }
      var srcC=groups.map(function(g){return prev.contours[g.ci]});
      var m=matchContours(srcC,cur,axP,axC);
      /* several groups may land on one target line — share its arc out
         between them in order, so together they still draw it whole */
      var used={},seq={};
      for(var gi=0;gi<groups.length;gi++){
        var tj=m.assign[gi];
        used[tj]=(used[tj]||0)+1;
      }
      var orderC=[];
      for(var gi2=0;gi2<groups.length;gi2++){
        var tj2=m.assign[gi2], tot=used[tj2], k=(seq[tj2]||0); seq[tj2]=k+1;
        orderC.push({ci:tj2,n:groups[gi2].n,a0:k/tot,a1:(k+1)/tot,gid:tj2});
      }
      scenes.push({sc:SCENES[i],i:i,ax:artX(i),contours:cur,
        strands:buildFrom(cur,null,axC,orderC),order:orderC});
    }
  })();

  for(var si=1;si<scenes.length;si++)
    for(var k0=0;k0<STRANDS;k0++)
      scenes[si].strands[k0]=align(scenes[si-1].strands[k0],scenes[si].strands[k0]);

  /* One line = one family. Every piece of a contour reads the flow field
     at the SAME point, so they all receive the same displacement and the
     line bends as a whole instead of tearing apart at the splits. */
  scenes.forEach(function(S){
    var acc={};
    S.strands.forEach(function(st){
      var g=acc[st.gid]||(acc[st.gid]={x:0,y:0,n:0});
      g.x+=st.cx;g.y+=st.cy;g.n++;
    });
    S.strands.forEach(function(st){
      var g=acc[st.gid];
      st.gcx=g.x/g.n; st.gcy=g.y/g.n; st.anchorX0=S.ax;
      st.glcx=st.gcx-(S.ax+(S.sc.ox||0)); st.glcy=st.gcy-ART_Y;
    });
    S.lcOf={};
    S.strands.forEach(function(st){if(S.lcOf[st.si]===undefined)S.lcOf[st.si]=st});
  });
  gMeasure.remove();

  /* ---- fills + annotations + chips, one group per scene ---- */
  scenes.forEach(function(S,i){
    var sc=S.sc, ox=sc.ox||0, ax=S.ax;
    S.gf=E('g',{opacity:0,transform:'translate('+(ax+ox)+','+ART_Y+')'},gFills);
    /* A scene may declare a region of itself that is bounded by its own
       silhouette. The globe does: its land wash is clipped to the sphere,
       so a continent rotating toward the limb is foreshortened out of
       sight rather than sliding off the edge of the world.

       Created lazily, on the first shape that needs it, because SVG paints
       in document order — hoisting the clip group to the top of the scene
       would slide every continent underneath its own ocean. */
    S.clipG=null;
    S.fillW={};
    sc.shapes.forEach(function(s,idx){
      var col=(CMAP[sc.key]||{})[idx];
      var declared=s[1]&&s[1].fill&&s[1].fill!=='none';
      var fill=(col&&col[0])?col[0]:(declared?s[1].fill:null);
      if(!fill)return;
      var fo=(col&&col[0])?col[1]:(s[1]['fill-opacity']!==undefined?s[1]['fill-opacity']:1);
      var a=Object.assign({},s[1]); delete a['stroke-dasharray'];
      a.fill=fill;a['fill-opacity']=fo;a.stroke='none';
      var inClip=sc.clip&&idx>=sc.clip.from&&idx<=sc.clip.to;
      if(inClip&&!S.clipG)S.clipG=E('g',{'clip-path':'url(#'+UID+sc.clip.id+')'},S.gf);
      var w=S.fillW[idx]||(S.fillW[idx]=E('g',{},inClip?S.clipG:S.gf));
      var fel=E(s[0],a,w);
      /* A clipped shape is re-projected point by point every frame, exactly
         as its outline is, so the wash and the ink stay welded together as
         the sphere turns. A transform on the wrapper could not do this: the
         projection is not affine. The sampled polyline comes free — the ink
         system already measured this contour. */
      if(inClip){
        for(var ci=0;ci<S.contours.length;ci++){
          var cc=S.contours[ci];
          if(cc.si!==idx)continue;
          var NF=Math.min(72,cc.n), fp=new Float64Array(NF*2);
          for(var q=0;q<NF;q++){
            var t=Math.round(q*(cc.n-1)/(NF-1));
            fp[q*2]=cc.pts[t*2]; fp[q*2+1]=cc.pts[t*2+1];
          }
          (S.liveFills||(S.liveFills=[])).push({el:fel,pts:fp,n:NF,si:idx});
          break;
        }
      }
    });

    S.ga=E('g',{opacity:0,transform:'translate('+(ax+ox)+','+ART_Y+')'},gAnn);
    var inward=(sideOf(i)==='right')?1:-1;
    S.labels=sc.anchors.map(function(an,j){
      var t0=sc.tags[j], lv=sc.qs[j][0];
      /* keep callouts on the art side — never let one collide with the copy */
      var t=[t0[0]*0.70+(inward<0?-1:1)*30, t0[1]*0.88];
      if(inward>0)t[0]=Math.max(t[0],-250); else t[0]=Math.min(t[0],250);
      var mx=an[0]+(t[0]-an[0])*0.45, my=an[1]+(t[1]-an[1])*0.45;
      var lead=E('path',{d:'M'+an[0]+' '+an[1]+' L '+mx.toFixed(0)+' '+my.toFixed(0)+' L '+t[0]+' '+t[1],
        fill:'none',stroke:'currentColor','stroke-width':1.5,'stroke-opacity':.5},S.ga);
      var L=1;try{L=lead.getTotalLength()}catch(e){}
      lead.setAttribute('stroke-dasharray',L);lead.__L=L;
      E('circle',{cx:an[0],cy:an[1],r:5,fill:'currentColor'},S.ga);
      var tg=E('g',{},S.ga);
      E('rect',{x:t[0]-18,y:t[1]-18,width:36,height:36,fill:'var(--b'+lv+')',stroke:'currentColor','stroke-width':2.4},tg);
      E('text',{x:t[0],y:t[1]+6,'text-anchor':'middle','class':'pf-mono','font-size':15,
        'font-weight':700,fill:(lv===3||lv===4)?'#0a0a0a':'#fff'},tg).textContent='0'+(j+1);
      E('text',{x:t[0],y:t[1]+35,'text-anchor':'middle','class':'pf-mono','font-size':9,
        'letter-spacing':1.4,fill:'currentColor','fill-opacity':.55},tg).textContent=LEVELS_[lv-1].toUpperCase();
      return {lead:lead,tg:tg,tx:t[0],ty:t[1]};
    });

    /* ---- the question card ----
       A marked index card: a hard ink shadow under it, a Bloom spine down
       the left, the level printed in mono across a ruled header — and the
       question itself in the teacher's own hand, because that is who
       wrote it. Printed form, handwritten answer: the whole identity of
       the product in one 300px card. */
    S.gc=E('g',{opacity:0,transform:'translate('+chipX(i)+',0)'},gChips);
    S.chips=sc.qs.map(function(qq,j){
      var c=E('g',{transform:'translate(0,'+(CHIP_Y0+j*(CHIP_H+CHIP_GAP))+')'},S.gc);
      /* FULL-TRANSPARENT GLASS, in SVG.
         `backdrop-filter` is not dependable on an SVG shape, so the
         card earns the see-through read the other way: a translucent
         fill instead of a blurred one. At 16% the plate underneath —
         ink, graph paper, the diagram itself — reads straight through
         the card; it stops being a card sitting ON the drawing and
         starts being a pane of glass laid over it. The 2.4px rule
         stays fully opaque — that's the whole bargain with a
         see-through panel, it may lose its fill but never its edge,
         or the text loses its ground to sit on.
         The corner radius matches --r on the HTML side so a question
         card is the same object on both. */
      var CR=10;
      E('rect',{x:5,y:5,width:CHIP_W,height:CHIP_H,rx:CR,fill:'var(--line)','fill-opacity':.28},c);
      E('rect',{x:0,y:0,width:CHIP_W,height:CHIP_H,rx:CR,
        fill:'var(--surface)','fill-opacity':.16,stroke:'currentColor','stroke-width':2.4},c);
      /* The Bloom spine: a rect would round all four corners, so it is
         a path that rounds only the two it shares with the card. */
      E('path',{d:'M11 0 H'+CR+' A'+CR+' '+CR+' 0 0 0 0 '+CR+' V'+(CHIP_H-CR)+
        ' A'+CR+' '+CR+' 0 0 0 '+CR+' '+CHIP_H+' H11 Z',fill:'var(--b'+qq[0]+')'},c);
      E('line',{x1:11,y1:34,x2:CHIP_W,y2:34,stroke:'currentColor','stroke-width':1.5,'stroke-opacity':.3},c);
      E('text',{x:26,y:23,'class':'pf-mono','font-size':10,'font-weight':700,
        'letter-spacing':1.9,fill:'currentColor','fill-opacity':.62},c).textContent=('0'+qq[0]+'  '+qq[1]).toUpperCase();
      E('text',{x:CHIP_W-16,y:23,'text-anchor':'end','class':'pf-mono','font-size':9,'font-weight':700,
        'letter-spacing':1.3,fill:'var(--b2)'},c).textContent='✓ VERIFIED';
      wrap(qq[2],26,3).forEach(function(line,k){
        if(!line)return;
        E('text',{x:26,y:62+k*22,'class':'pf-hand','font-size':21,'font-weight':700,
          fill:'var(--ink)'},c).textContent=line;
      });
      E('rect',{x:26,y:114,width:150,height:6,fill:'none',stroke:'currentColor','stroke-width':1.2,'stroke-opacity':.4},c);
      E('rect',{x:27.5,y:115.5,width:147,height:3,fill:'var(--b2)'},c);
      E('text',{x:186,y:120,'class':'pf-mono','font-size':9,'letter-spacing':1.1,
        fill:'currentColor','fill-opacity':.5},c).textContent='CONF 0.9'+(2+j*3);
      return c;
    });
    /* The leader line from each numbered tag on the diagram to its
       question card — drawn per-card so the reveal loop can grow each
       one independently instead of fading a static line in. */
    S.links=sc.qs.map(function(){
      return E('path',{d:'',fill:'none',stroke:'currentColor','stroke-width':1.5,'stroke-opacity':0},gLink);
    });
  });

  /* ---- the persistent ink ---- */
  var inkEl=[],echoEl=[];
  for(var q1=0;q1<STRANDS;q1++){
    inkEl.push(E('path',{d:'',stroke:'currentColor','stroke-width':2},gInk));
    echoEl.push(E('path',{d:'',stroke:'currentColor','stroke-width':1.4},gEcho));
  }

  /* PARALLEL FLOW.
     Every line rides the SAME curve across the page. There is no per-line
     lane and no per-line arc — the whole drawing sweeps over as one body
     while its shapes morph underneath. The only variation is a whisper
     (±12px, ±0.02 of progress) so it breathes rather than sliding like a
     printed decal. Two pieces of one contour therefore receive virtually
     identical displacement and can never come apart. */
  function flowOf(A,axA){
    var ny=clamp((A.gcy-ART_Y)/330,-1.4,1.4);
    return { lane: ny*12, arc: 0, del: ny*0.020 };
  }

  /* ---- per-pair personality: how the ink behaves in flight ---- */
  var SPAN_X=ANCHOR_X!==null?0:Math.abs(ART_X_RIGHT-ART_X_LEFT);
  var PAIRS=[
    {name:'world → cell',         straighten: 0.10, lane:1.0, bow: -62, ctrl:0.46},
    {name:'organic → geometric',  straighten: 0.06, lane:1.0, bow: -70, ctrl:0.46},
    {name:'orbital → engineered', straighten: 0.40, lane:1.0, bow:  58, ctrl:0.42},
    {name:'engineered → celestial',straighten:-0.22, lane:1.0, bow: -82, ctrl:0.52},
    {name:'celestial → aqueous',  straighten: 0.14, lane:1.0, bow:  74, ctrl:0.48},
    {name:'flow → signal',        straighten:-0.16, lane:1.0, bow: -66, ctrl:0.55},
    {name:'signal → network',     straighten: 0.28, lane:1.0, bow:  62, ctrl:0.44}
  ];

  /* wordmark for the finale */
  var gMark=E('g',{opacity:0},svg);
  E('text',{x:ART_X_RIGHT,y:ART_Y+18,'text-anchor':'middle','class':'pf-disp','font-weight':900,
    'font-size':92,'letter-spacing':-4,fill:'currentColor'},gMark).textContent='DIAGRAMMIND';
  E('text',{x:ART_X_RIGHT,y:ART_Y+56,'text-anchor':'middle','class':'pf-mono','font-size':12.5,
    'letter-spacing':6,fill:'currentColor','fill-opacity':.5},gMark).textContent='ONE SET OF LINES · SEVEN DIAGRAMS';

  /* ══════════════════════════════════════════════════════════
     5 · SCROLL CONTROLLER — progress from real section geometry
     ══════════════════════════════════════════════════════════ */
  var sections=[], anchors=[];
  function measure(){
    sections=[].slice.call(document.querySelectorAll(SECTION_SELECTOR));
    anchors=sections.map(function(s){var r=s.getBoundingClientRect();return r.top+window.scrollY+r.height/2});
  }
  function onResize(){measure();colCache={}}
  measure();
  window.addEventListener('resize',onResize);
  window.addEventListener('load',measure);
  /* Sections grow and shrink as fonts land and accordions open, and there
     is no scroll event for that — a slow re-measure is cheaper than a
     ResizeObserver on eight full-height sections. */
  var reMeasure=window.setInterval(measure,1200);

  var St={scrub:null,mx:0,my:0,p:0,echo:false,debug:false};
  function onMouse(e){
    St.mx=e.clientX/window.innerWidth-.5; St.my=e.clientY/window.innerHeight-.5;
  }
  window.addEventListener('mousemove',onMouse,{passive:true});

  /* Anchors come from the real page, so the sequence stretches to however
     many sections it is pointed at — eight today, mapped one to one. */
  /* Autoplay: a ping-pong walk through the plates, holding on each one
     long enough to read it before the ink travels to the next. Used where
     there is no scroll to be a function of — the sign-in panel. */
  var T0=performance.now();
  function autoPosition(){
    var n=scenes.length;
    if(n<2)return 0;
    var span=2*(n-1);
    var loop=(((performance.now()-T0)/1000)/AUTOPLAY)%span;
    if(loop<0)loop+=span;
    var seg=Math.floor(loop), f=loop-seg;
    /* premium holds longer — the drawing gets read before it is asked to move */
    var hold=PREMIUM?0.58:0.46;
    var x=seg+(f<hold?0:(PREMIUM?easeInOutQuint:easeInOutCubic)((f-hold)/(1-hold)));
    return x<=n-1?x:span-x;
  }

  function scenePosition(){
    if(St.scrub!==null)return St.scrub*(scenes.length-1);
    if(AUTOPLAY>0)return autoPosition();
    var n=anchors.length, last=scenes.length-1;
    if(n<2)return 0;
    var yc=window.scrollY+window.innerHeight*0.5, k=0;
    if(yc<=anchors[0])k=0;
    else if(yc>=anchors[n-1])k=n-1;
    else for(var i=0;i<n-1;i++){
      if(yc>=anchors[i]&&yc<anchors[i+1]){
        var span=anchors[i+1]-anchors[i];
        k=i+(span>0?(yc-anchors[i])/span:0);
        break;
      }
    }
    return clamp(k*last/(n-1),0,last);
  }

  /* ══════════════════════════════════════════════════════════
     6 · MORPH — bezier flow field, hierarchy staggering,
         lane separation, tension, hand-drawn character
     ══════════════════════════════════════════════════════════ */
  var REL=[0.11,0.055,0.0];   /* PRIMARY releases last  */
  var ARR=[0.15,0.075,0.0];   /* PRIMARY arrives first  */
  /* premium flight — the cascade is deeper (structure departs late and
     lands first, details peel off early and drift longest) and each strand
     carries a whisper of deterministic jitter so the classes don't move as
     three rigid battalions */
  var PREL=[0.28,0.13,0.04], PARR=[0.26,0.12,0.03];
  var bufX=new Float64Array(PTS), bufY=new Float64Array(PTS);

  function morphStrand(A,B,localT,k,pair,dir,axA,out){
    /* premium keys the whole schedule to the family being ASSEMBLED.
       Every piece flying at the same target line shares one window, one
       lane and one jitter, so the line travels and lands whole — an
       ellipse that assembles from staggered fragments reads as broken,
       not premium. The standard flight keeps its source-keyed release. */
    var fl=flowOf(A,axA), flB=null;
    if(PREMIUM){
      var ny=clamp((B.gcy-ART_Y)/330,-1.4,1.4);
      flB={lane:ny*12,del:ny*0.020};
    }
    var jit=PREMIUM?(hsh(B.gid*7+1,7)-0.5)*0.05:0;
    var rel=PREMIUM?PREL[B.imp]:REL[A.imp];
    var arr=PREMIUM?PARR[B.imp]:ARR[B.imp];
    var del=flB?flB.del:fl.del;
    var r0=0.10+rel+del+jit;
    var r1=0.92-arr+del-jit;
    var u=smoothstep(r0,r1,localT);
    var uu=PREMIUM?easeInOutQuint(u):easeInOutCubic(u);
    var flow=Math.sin(Math.PI*u);                 /* 0 at both ends, 1 midway */

    /* one shared travel curve for the entire plate. Premium reins the bow
       in — an in-place morph that swoops wide reads as restless, not premium */
    var bowMul=PREMIUM?0.52:1;
    var ctrl=SPAN_X*pair.ctrl*(PREMIUM?0.85:1)+110;
    var lane=(flB?flB.lane:fl.lane)*pair.lane;
    var o1x=dir*ctrl,        o1y=pair.bow*bowMul+lane;
    var o2x=-dir*ctrl*0.94,  o2y=-pair.bow*0.8*bowMul+lane;

    var mt=1-uu, a3=mt*mt*mt, b3=3*mt*mt*uu, c3=3*mt*uu*uu, d3=uu*uu*uu;
    var i;
    for(i=0;i<PTS;i++){
      var ax=A.pts[i*2], ay=A.pts[i*2+1], bx=B.pts[i*2], by=B.pts[i*2+1];
      bufX[i]=a3*ax + b3*(ax+o1x) + c3*(bx+o2x) + d3*bx;
      bufY[i]=a3*ay + b3*(ay+o1y) + c3*(by+o2y) + d3*by;
    }
    /* tension: the line loosens on the way and tightens as it lands */
    var st=pair.straighten*flow;
    if(Math.abs(st)>0.002){
      var x0=bufX[0],y0=bufY[0],x1=bufX[PTS-1],y1=bufY[PTS-1];
      var vx=x1-x0,vy=y1-y0,vv=vx*vx+vy*vy||1;
      for(i=0;i<PTS;i++){
        var t2=((bufX[i]-x0)*vx+(bufY[i]-y0)*vy)/vv;
        var px=x0+vx*t2, py=y0+vy*t2;
        bufX[i]+=(px-bufX[i])*st; bufY[i]+=(py-bufY[i])*st;
      }
    }
    out.u=u; out.flow=flow;
    return u;
  }

  /* living idle — a settled plate is never mathematically frozen.
     Whole-strand drift only; nothing is added while the ink is in flight. */
  function idle(k,amount,phase){
    var w=Math.sin(k*1.7+phase)*amount, w2=Math.cos(k*2.3+phase*0.8)*amount;
    for(var i=0;i<PTS;i++){bufX[i]+=w2*0.7;bufY[i]+=w}
  }


  /* ══════════════════════════════════════════════════════════
     6b · THE LIVING PLATE
     A settled diagram is not a still. Planets orbit, electrons
     run their shells, rain falls, the cell turns. Time-driven —
     but the amplitude is multiplied by how settled the plate is,
     so it is exactly zero while the ink is in flight and the
     morph stays a pure function of scroll.
     ══════════════════════════════════════════════════════════ */
  function RG(a,b){var r=[];for(var i=a;i<=b;i++)r.push(i);return r}
  var LIVE={
    GLOBE:[
      {sh:[10,11,12,13,14,15,16,17,18,19], t:'globe', R:250, sp:0.17,
       /* spread the landmasses right round the sphere, so half of them are
          always on the visible face — and keep each inland feature on the
          same meridian as the land it sits on */
       ph:{10:0, 11:0.42, 12:1.95, 13:3.05, 14:4.05, 15:0.18, 16:3.05, 17:1.95, 18:4.05, 19:0.22}},
      {sh:[0],  t:'bre', px:0, py:0, amp:0.006, sp:0.4}
    ],
    CELL:[
      {sh:[2,3,4,5,6],   t:'rot', px:-82,py:-58, sp: 0.11},
      {sh:[7,8],         t:'swy', px:0,  py:0,   amp:0.16, sp:0.42},
      {sh:[9,10],        t:'swy', px:0,  py:0,   amp:0.20, sp:0.31},
      {sh:[11,12],       t:'swy', px:0,  py:0,   amp:0.14, sp:0.37},
      {sh:[13,14,15,16,17],t:'wave',amp:2.6, sp:0.85},
      {sh:[0,1],         t:'bre', px:0,  py:0,   amp:0.010, sp:0.5}
    ],
    ATOM:[
      /* Six electrons are drawn and only three used to be listed here,
         so half the shell orbited and half sat perfectly still — which
         on a diagram whose entire subject is orbital motion reads as a
         bug, because it is one. 19 and 20 sit on the rot-0 and rot-60
         ellipses; 21 sits on the inner dashed shell, which is circular,
         so it gets rx = ry = 150. Phase is taken from where each one is
         drawn, so they stay spread out instead of stacking up. */
      {sh:[6],  t:'ell', rx:252, ry:94,  rot:0,   sp: 1.05},
      {sh:[7],  t:'ell', rx:252, ry:94,  rot:60,  sp:-0.80},
      {sh:[8],  t:'ell', rx:252, ry:94,  rot:120, sp: 1.30},
      {sh:[19], t:'ell', rx:252, ry:94,  rot:0,   sp: 1.05},
      {sh:[20], t:'ell', rx:252, ry:94,  rot:60,  sp:-0.80},
      {sh:[21], t:'ell', rx:150, ry:150, rot:0,   sp: 1.70},
      {sh:[22],         t:'fall', dist: 34, sp:0.9},
      {sh:[3,4,5],      t:'wave', amp:1.7, sp:2.4},
      {sh:[9,10,11,12], t:'wave', amp:1.2, sp:1.1}
    ],
    CIRCUIT:[
      {sh:[8],     t:'wave', amp:1.3, sp:2.0},
      {sh:[10,11], t:'bre',  px:0, py:170, amp:0.055, sp:1.9}
    ],
    ORBIT:[
      {sh:RG(1,12), t:'rot', px:0, py:0, sp:0.14},
      {sh:[17],     t:'ell', rx:124, ry:54,  rot:0, sp:0.85},
      {sh:[18],     t:'ell', rx:186, ry:80,  rot:0, sp:0.52},
      {sh:[19,20],  t:'ell', rx:250, ry:108, rot:0, sp:0.34},
      {sh:[21],     t:'ell', rx:318, ry:136, rot:0, sp:0.22},
      {sh:[0],      t:'bre', px:0, py:0, amp:0.035, sp:1.05}
    ],
    CYCLE:[
      {sh:[0,1,2],   t:'wave', amp:3.4, sp:1.05},
      {sh:[18],      t:'fall', dist: 46, sp:0.55},
      {sh:[19,20,21,22,23,24],t:'fall', dist:-74, sp:0.30},
      {sh:RG(7,16),  t:'rot',  px:254, py:-214, sp:0.30},
      {sh:[17],      t:'wave', amp:2.4, sp:0.42},
      {sh:[5],       t:'wave', amp:1.7, sp:1.25}
    ],
    NEURON:[
      {sh:RG(3,9),   t:'wave', amp:1.9, sp:0.85},
      {sh:[11,12,13],t:'bre',  px:224, py:-2, amp:0.05, sp:1.5}
    ],
    NET:[
      {sh:[36,37,38],t:'wave', amp:1.4, sp:1.6},
      {sh:[47,48],   t:'bre',  px:245, py:0, amp:0.10, sp:1.7},
      {sh:[52],      t:'bre',  px:300, py:0, amp:0.16, sp:1.7}
    ],

    /* Auxiliary plates. A settled diagram is not a still: light
       arrives, a bridge breathes under load, a heart beats. */
    LENS:[
      {sh:[22,23],   t:'fall', dist: 62, sp:0.5},
      {sh:[11,12,13,14,15], t:'wave', amp:1.1, sp:1.4},
      {sh:[1],       t:'bre',  px:0, py:0, amp:0.018, sp:0.7}
    ],
    TRUSS:[
      {sh:[21,22,23,24,25,26], t:'fall', dist: 14, sp:1.1},
      {sh:[37],      t:'wave', amp:3.2, sp:0.75},
      {sh:RG(27,34), t:'bre',  px:0, py:30, amp:0.02, sp:1.3}
    ],
    HEART:[
      {sh:[0,2],     t:'bre',  px:0, py:0, amp:0.030, sp:1.9},
      {sh:RG(16,19), t:'bre',  px:0, py:-150, amp:0.10, sp:1.9},
      {sh:[24,25,26,27], t:'wave', amp:1.8, sp:1.5},
      {sh:[22,23],   t:'wave', amp:1.3, sp:2.1}
    ]
  };
  var liveIdx={};
  Object.keys(LIVE).forEach(function(k){
    var m={}; LIVE[k].forEach(function(r){r.sh.forEach(function(i){m[i]=r})}); liveIdx[k]=m;
  });
  var DEG=Math.PI/180;

  /* returns an alpha multiplier; mutates bufX/bufY in place */
  function applyLive(key,st,tt,w){
    if(w<0.004)return 1;
    var r=(liveIdx[key]||{})[st.si];
    if(!r)return 1;
    var i,dx=0,dy=0,al=1;
    if(r.t==='rot'||r.t==='swy'){
      var a=(r.t==='swy'?Math.sin(tt*r.sp)*r.amp:tt*r.sp)*w, ca=Math.cos(a), sa=Math.sin(a);
      var px=r.px+st.ox0, py=r.py+ART_Y;
      for(i=0;i<PTS;i++){
        var x=bufX[i]-px, y=bufY[i]-py;
        bufX[i]=px+x*ca-y*sa; bufY[i]=py+x*sa+y*ca;
      }
      return 1;
    }
    if(r.t==='bre'){
      var k=1+r.amp*Math.sin(tt*r.sp)*w;
      var qx=r.px+st.ox0, qy=r.py+ART_Y;
      for(i=0;i<PTS;i++){bufX[i]=qx+(bufX[i]-qx)*k;bufY[i]=qy+(bufY[i]-qy)*k}
      return 1;
    }
    if(r.t==='globe'){
      /* Orthographic spin, resolved PER POINT rather than per shape.
         A point at latitude φ, longitude λ projects to x = R·cosφ·sinλ
         with y — the latitude — untouched, and x² + y² ≤ R² then holds
         for every point, so no landmass can climb off the sphere.

         The previous version took one cosφ from the shape's centroid and
         scaled the whole outline about it. That is only right for a shape
         with no latitude extent; a continent has plenty, and near the limb
         the approximation pushed its far edge straight past the horizon.

         Written as a DELTA against the same point's own reconstruction, so
         at w = 0 — mid-flight, when the strand is nowhere near the sphere —
         it contributes exactly zero instead of teleporting the ink. */
      var GR=r.R||250;
      var dl=((r.ph&&r.ph[st.si]||0)+tt*r.sp)*w;
      var gx=st.ox0, gy=ART_Y, vis=0;
      for(i=0;i<PTS;i++){
        var px=bufX[i]-gx, py=bufY[i]-gy;
        var cfp=Math.sqrt(Math.max(1e-4,1-(py/GR)*(py/GR)));
        var lam0=Math.asin(clamp(px/(GR*cfp),-1,1));
        bufX[i]+=GR*cfp*(Math.sin(lam0+dl)-Math.sin(lam0));
        vis+=Math.cos(lam0+dl);
      }
      return 1-w+w*smoothstep(0.02,0.30,vis/PTS);
    }
    if(r.t==='ell'){
      var rr=r.rot*DEG, cr=Math.cos(-rr), sr=Math.sin(-rr);
      var ux=st.glcx*cr-st.glcy*sr, uy=st.glcx*sr+st.glcy*cr;
      var th0=Math.atan2(uy/r.ry,ux/r.rx), th=th0+tt*r.sp;
      var vx=r.rx*Math.cos(th), vy=r.ry*Math.sin(th);
      var c2=Math.cos(rr), s2=Math.sin(rr);
      dx=(vx*c2-vy*s2-st.glcx)*w; dy=(vx*s2+vy*c2-st.glcy)*w;
    } else if(r.t==='wave'){
      dy=Math.sin(tt*r.sp*2+st.glcx*0.018)*r.amp*w;
      dx=Math.cos(tt*r.sp*1.4+st.glcy*0.02)*r.amp*0.5*w;
    } else if(r.t==='fall'){
      var f=(tt*r.sp)%1; if(f<0)f+=1;
      dy=f*r.dist*w; al=0.25+0.75*Math.sin(Math.PI*f);
    }
    if(dx||dy)for(i=0;i<PTS;i++){bufX[i]+=dx;bufY[i]+=dy}
    return al;
  }
  /* the same motion, as a transform, for that shape's colour fill */
  /* Globe shapes carry their own projected geometry and their own alpha
     (see projectGlobeFills), so the wrapper must add nothing on top. */
  function liveAlpha(key,si,lcx,lcy,tt,w){
    return 1;
  }
  function liveTransform(key,si,lcx,lcy,tt,w){
    var r=(liveIdx[key]||{})[si];
    if(!r||w<0.004)return '';
    if(r.t==='rot'||r.t==='swy')return 'rotate('+((r.t==='swy'?Math.sin(tt*r.sp)*r.amp:tt*r.sp)*w/DEG)+','+r.px+','+r.py+')';
    if(r.t==='bre'){ var k=1+r.amp*Math.sin(tt*r.sp)*w;
      return 'translate('+r.px+','+r.py+') scale('+k.toFixed(4)+') translate('+(-r.px)+','+(-r.py)+')'}
    if(r.t==='globe')return '';
    if(r.t==='ell'){
      var rr=r.rot*DEG, cr=Math.cos(-rr), sr=Math.sin(-rr);
      var ux=lcx*cr-lcy*sr, uy=lcx*sr+lcy*cr;
      var th=Math.atan2(uy/r.ry,ux/r.rx)+tt*r.sp;
      var vx=r.rx*Math.cos(th), vy=r.ry*Math.sin(th), c2=Math.cos(rr), s2=Math.sin(rr);
      return 'translate('+((vx*c2-vy*s2-lcx)*w).toFixed(1)+','+((vx*s2+vy*c2-lcy)*w).toFixed(1)+')';
    }
    if(r.t==='wave')return 'translate('+(Math.cos(tt*r.sp*1.4+lcy*0.02)*r.amp*0.5*w).toFixed(1)+','+
      (Math.sin(tt*r.sp*2+lcx*0.018)*r.amp*w).toFixed(1)+')';
    if(r.t==='fall'){var f=(tt*r.sp)%1;if(f<0)f+=1;return 'translate(0,'+(f*r.dist*w).toFixed(1)+')'}
    return '';
  }

  /* ---- the land, re-projected ----
     x = R·cosφ·sinλ with the latitude left alone. Every point of the wash
     is put through the same orthographic spin its outline gets, and the
     average cosλ across the outline is how much of it is still facing us.
     ------------------------------------------------------------------ */
  var fbuf=[];
  function projectGlobeFills(S,tt,w){
    if(!S.liveFills)return;
    var rules=liveIdx[S.sc.key]||{};
    for(var q=0;q<S.liveFills.length;q++){
      var LF=S.liveFills[q], r=rules[LF.si];
      if(!r||r.t!=='globe')continue;
      var GR=r.R||250, dl=((r.ph&&r.ph[LF.si]||0)+tt*r.sp)*w, vis=0;
      fbuf.length=0;
      for(var z=0;z<LF.n;z++){
        var px=LF.pts[z*2], py=LF.pts[z*2+1];
        var cfp=Math.sqrt(Math.max(1e-4,1-(py/GR)*(py/GR)));
        var lam=Math.asin(clamp(px/(GR*cfp),-1,1))+dl;
        fbuf.push(z?'L':'M',(GR*cfp*Math.sin(lam)).toFixed(1),' ',py.toFixed(1));
        vis+=Math.cos(lam);
      }
      fbuf.push('Z');
      setA(LF.el,'d',fbuf.join(''));
      setA(LF.el,'opacity',smoothstep(0.02,0.30,vis/LF.n).toFixed(3));
    }
  }

  /* ---- travelling sparks: current, nerve signal, graph traffic ---- */
  var SPARK={
    CIRCUIT:[{p:[[-250,-170],[250,-170],[250,170],[-250,170],[-250,-170]],n:5,sp:0.09,r:5,c:'var(--w-teal)'}],
    NEURON :[{p:[[98,6],[152,4],[224,-2],[296,-10],[332,-10],[404,-58]],n:2,sp:0.30,r:6,c:'var(--w-amber)'},
             {p:[[98,6],[152,4],[224,-2],[296,-10],[332,-10],[408,32]],n:2,sp:0.24,r:5,c:'var(--w-amber)'}],
    /* forward activations, then the error travelling back through the same
       weights — that is the whole of backpropagation, as a gesture */
    NET    :[{p:[[-250,0],[-85,-39],[80,39],[245,-45],[300,0]],n:2,sp:0.26,r:6,c:'var(--w-teal)'},
             {p:[[-250,-80],[-85,117],[80,-117],[245,45],[300,0]],n:2,sp:0.21,r:5,c:'var(--w-teal)'},
             {p:[[-250,80],[-85,39],[80,-39],[245,-45],[300,0]],n:1,sp:0.31,r:5,c:'var(--w-teal)'},
             {p:[[300,0],[245,45],[80,117],[-85,-39],[-250,0]],n:2,sp:0.19,r:6,c:'var(--w-red)'},
             {p:[[300,0],[245,-45],[80,39],[-85,117],[-250,-80]],n:1,sp:0.15,r:5,c:'var(--w-red)'}]
  };
  function walk(p,f){
    var seg=[],tot=0,i;
    for(i=1;i<p.length;i++){var d=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);seg.push(d);tot+=d}
    var t=f*tot,acc=0;
    for(i=0;i<seg.length;i++){
      if(acc+seg[i]>=t){var u=seg[i]>0?(t-acc)/seg[i]:0;
        return [p[i][0]+(p[i+1][0]-p[i][0])*u, p[i][1]+(p[i+1][1]-p[i][1])*u]}
      acc+=seg[i];
    }
    return p[p.length-1];
  }
  var gLive=E('g',{},svg);
  scenes.forEach(function(S){
    S.sparks=[];
    var defsS=SPARK[S.sc.key]||[];
    S.gl2=E('g',{opacity:0},gLive);
    defsS.forEach(function(d){
      for(var i=0;i<d.n;i++)
        S.sparks.push({el:E('circle',{r:d.r,fill:d.c,stroke:'currentColor','stroke-width':1.4},S.gl2),
          p:d.p,sp:d.sp,ph:i/d.n});
    });
  });

  /* ---- named callouts: arrows that say what a thing IS ---- */
  var NOTES={
    GLOBE:[[-60,-90,-320,-238,'CONTINENT','green'],[190,150,60,300,'OCEAN','blue'],
           [0,-232,-140,-300,'POLAR ICE','teal'],[-250,0,-330,58,'EQUATOR','amber']],
    CELL:[[-82,-58,-300,-190,'NUCLEUS','violet'],[146,116,90,300,'MITOCHONDRION','red'],
          [0,-248,-215,-318,'CELL MEMBRANE','green'],[158,-122,150,-300,'VACUOLE','blue']],
    ATOM:[[0,0,-235,-235,'NUCLEUS','red'],[252,0,326,-236,'ELECTRON','teal'],
          [-126,-218,120,-300,'ORBITAL SHELL','violet'],[-112,252,-232,286,'COVALENT BOND','green']],
    CIRCUIT:[[0,-194,-290,-285,'RESISTOR','orange'],[250,0,150,-125,'CAPACITOR','blue'],
             [0,170,-290,250,'LAMP','amber'],[-250,0,-330,-95,'BATTERY','red']],
    ORBIT:[[0,0,-215,-240,'THE SUN','red'],[204,62,338,232,'PLANET','amber'],
           [-250,-100,-196,-300,'ORBITAL PATH','violet'],[-286,-60,-330,55,'OUTER BODY','blue']],
    CYCLE:[[254,-214,110,-320,'THE SUN','red'],[10,-184,-300,-250,'CLOUD','blue'],
           [200,60,150,318,'EVAPORATION','teal'],[-186,-24,-330,105,'RUNOFF','green']],
    NEURON:[[-12,2,-70,-255,'SOMA','pink'],[224,-2,300,-215,'MYELIN SHEATH','amber'],
            [404,-58,470,-165,'TERMINAL','teal'],[-208,-198,60,-300,'DENDRITE','violet']],
    NET:[[-250,-80,-270,-238,'INPUT','blue'],[-85,-117,-60,-300,'HIDDEN LAYER','violet'],
         [245,-45,236,-238,'OUTPUT','amber'],[300,0,232,196,'LOSS','red'],
         [165,-80,60,300,'BACKPROPAGATION','red']],

    LENS:[[0,-150,-120,-300,'CONVEX LENS','blue'],[110,0,180,-190,'FOCAL POINT','red'],
          [-300,-70,-330,-235,'OBJECT','green'],[174,44,300,290,'REAL IMAGE','orange']],
    TRUSS:[[0,-60,-40,-250,'TOP CHORD','teal'],[-80,30,-330,-160,'DIAGONAL','orange'],
           [-320,150,-330,264,'PINNED SUPPORT','grey'],[320,150,300,268,'ROLLER','blue']],
    HEART:[[-100,-40,-330,-190,'RIGHT VENTRICLE','blue'],[100,-40,320,120,'LEFT VENTRICLE','red'],
           [100,-290,300,-300,'AORTA','red'],[-86,-110,-330,60,'TRICUSPID VALVE','amber']]
  };
  /* A pen, not a plotter: a shaft that bows and trembles, an arrowhead
     made of two strokes that don't quite match, and a label in the
     teacher's own hand. All of it deterministic — same seed, same wobble. */
  function handLine(x0,y0,x1,y1,seed,bowAmt){
    var dx=x1-x0, dy=y1-y0, len=Math.hypot(dx,dy)||1;
    var nx=-dy/len, ny=dx/len;
    var bow=(hsh(seed,11)-0.5)*len*(bowAmt||0.16);
    var d='M'+x0.toFixed(1)+' '+y0.toFixed(1), N=16;
    for(var i=1;i<=N;i++){
      var t=i/N;
      var off=Math.sin(Math.PI*t)*bow
            + Math.sin(t*6.9+hsh(seed,12)*6.28)*2.4
            + Math.sin(t*15.3+hsh(seed,13)*6.28)*1.1;
      d+=' L'+(x0+dx*t+nx*off).toFixed(1)+' '+(y0+dy*t+ny*off).toFixed(1);
    }
    return d;
  }
  function handHead(ex,ey,ang,seed){
    var l1=13+hsh(seed,21)*5, l2=11+hsh(seed,22)*6;
    var a1=ang-0.40-hsh(seed,23)*0.16, a2=ang+0.44+hsh(seed,24)*0.16;
    var m1x=ex-Math.cos(a1)*l1*0.55+(hsh(seed,25)-0.5)*1.4;
    var m1y=ey-Math.sin(a1)*l1*0.55+(hsh(seed,26)-0.5)*1.4;
    var m2x=ex-Math.cos(a2)*l2*0.55+(hsh(seed,27)-0.5)*1.4;
    var m2y=ey-Math.sin(a2)*l2*0.55+(hsh(seed,28)-0.5)*1.4;
    return 'M'+ex.toFixed(1)+' '+ey.toFixed(1)+' Q'+m1x.toFixed(1)+' '+m1y.toFixed(1)+
           ' '+(ex-Math.cos(a1)*l1).toFixed(1)+' '+(ey-Math.sin(a1)*l1).toFixed(1)+
           ' M'+ex.toFixed(1)+' '+ey.toFixed(1)+' Q'+m2x.toFixed(1)+' '+m2y.toFixed(1)+
           ' '+(ex-Math.cos(a2)*l2).toFixed(1)+' '+(ey-Math.sin(a2)*l2).toFixed(1);
  }
  function handUnderline(x,y,w,seed){
    var d='M'+x.toFixed(1)+' '+y.toFixed(1), N=12;
    for(var i=1;i<=N;i++){
      var t=i/N;
      d+=' L'+(x+w*t).toFixed(1)+' '+(y+Math.sin(t*9.2+hsh(seed,31)*6.28)*1.5+Math.sin(Math.PI*t)*1.8).toFixed(1);
    }
    return d;
  }
  scenes.forEach(function(S,sidx){
    var ns=NOTES[S.sc.key]||[];
    S.gn=E('g',{opacity:0,transform:S.ga.getAttribute('transform')},gAnn);
    S.notes=ns.map(function(n,ni){
      var seed=sidx*37+ni*7+3;
      var ax=n[0],ay=n[1],lx=n[2],ly=n[3];
      var vx=ax-lx, vy=ay-ly, vl=Math.hypot(vx,vy)||1;
      var ex=ax-vx/vl*15, ey=ay-vy/vl*15;
      var sx=lx+vx/vl*12, sy=ly+vy/vl*12;
      var g=E('g',{},S.gn);
      var NC='var(--n-'+(n[5]||'red')+')';
      var ln=E('path',{d:handLine(sx,sy,ex,ey,seed),fill:'none',stroke:NC,
        'stroke-width':1.9,'stroke-opacity':.78,'stroke-linecap':'round','stroke-linejoin':'round'},g);
      var L=1;try{L=ln.getTotalLength()}catch(e){}
      ln.setAttribute('stroke-dasharray',L); ln.__L=L;
      var hd=E('path',{d:handHead(ex,ey,Math.atan2(vy,vx),seed),fill:'none',stroke:NC,
        'stroke-width':2.2,'stroke-opacity':.9,'stroke-linecap':'round'},g);
      var lbl=E('g',{transform:'rotate('+((hsh(seed,41)-0.5)*6).toFixed(2)+','+lx+','+ly+')'},g);
      var tw=E('text',{x:lx,y:ly-7,'text-anchor':(lx<ax?'start':'end'),
        'class':'pf-hand','font-size':20,'font-weight':700,
        fill:NC,'fill-opacity':1},lbl);
      tw.textContent=n[4];
      var wdt=Math.max(38,n[4].length*9.2);
      E('path',{d:handUnderline(lx<ax?lx:lx-wdt,ly+2,wdt,seed),fill:'none',stroke:NC,
        'stroke-width':2,'stroke-opacity':.6,'stroke-linecap':'round'},lbl);
      return {ln:ln,hd:hd,lbl:lbl,g:g};
    });

    /* ---- the size this plate's mount has to be ----
       Measured, not guessed: every sampled point of the drawing, every
       numbered Bloom tag, and every hand-written callout with its own
       underline. The frame then grows to hold all of it, which is why a
       600-wide card no longer crops the water cycle or the neuron. */
    var ox3=S.sc.ox||0;
    var x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
    function grow(x,y){
      if(x<x0)x0=x; if(x>x1)x1=x;
      if(y<y0)y0=y; if(y>y1)y1=y;
    }
    S.contours.forEach(function(c){
      for(var gi=0;gi<c.n;gi++)grow(c.pts[gi*2]+ox3,c.pts[gi*2+1]);
    });
    (S.labels||[]).forEach(function(lo){
      grow(lo.tx+ox3-22,lo.ty-22);
      grow(lo.tx+ox3+22,lo.ty+42);   /* the level caption sits under the tag */
    });
    ns.forEach(function(n){
      var wdt=Math.max(38,n[4].length*9.2);
      grow(n[0]+ox3,n[1]);
      grow(n[2]+ox3+(n[2]<n[0]?wdt+8:-wdt-8),n[3]-26);
      grow(n[2]+ox3,n[3]+10);
    });
    /* The mount is centred on what the plate ACTUALLY occupies rather than
       on the anchor, so an off-centre figure like the neuron gets a card
       that fits it instead of one stretched to twice its longest reach.
       PAD leaves the title block and scale bar their own air; the floors
       stop a compact plate from getting a mount tighter than a card. */
    if(!isFinite(x0)){x0=-260;x1=260;y0=-300;y1=300}
    S.fcx=(x0+x1)/2;
    S.fcy=(y0+y1)/2;
    S.fw=Math.max(620,(x1-x0)+2*PAD_X);
    /* THE SAFE BAND, in one number.
       The stage is drawn into a 1600×900 viewBox with `slice`, so on
       any window shorter than 3:2 the top and bottom are cropped, and
       a fixed chrome bar sits over what is left of the top. A 700px
       floor put the frame's head under that bar; raising the frame to
       fix it pushed its foot off the bottom instead. Neither is a
       clamping problem — the mount was simply taller than the space
       that is guaranteed visible.
       BAND is that space. The mount is sized from the art and a small
       pad, which for every plate in the set lands at or just under the
       band — and it is deliberately NOT hard-capped to it. Capping
       would keep the frame on screen by letting the drawing burst out
       through its own mount, which is the one thing worse than losing
       two pixels off a rule. A plate that genuinely needs more than the
       band gets centred in it instead (see the clamp in the renderer),
       so the overflow is split evenly and invisible. */
    S.fh=Math.max(540,(y1-y0)+2*PAD_Y);
  });

  /* ══════════════════════════════════════════════════════════
     7 · RENDERER — Catmull-Rom with corner preservation, so a
         circuit's right angles stay right angles while a
         membrane stays smooth.
     ══════════════════════════════════════════════════════════ */
  var sb=[], segX=new Float64Array(96), segY=new Float64Array(96), segL=new Float64Array(96);
  function smoothPath(n){
    var i;
    /* segment vectors once — corner detection then costs a dot product,
       not two square roots per knot */
    for(i=0;i<n-1;i++){
      var dx=bufX[i+1]-bufX[i], dy=bufY[i+1]-bufY[i];
      segX[i]=dx; segY[i]=dy; segL[i]=Math.sqrt(dx*dx+dy*dy)||1;
    }
    sb.length=0;
    var R=Math.round;
    sb.push('M',R(bufX[0]),' ',R(bufY[0]));
    for(i=0;i<n-1;i++){
      var k1=(i>0)?smoothstep(-0.1,0.65,(segX[i-1]*segX[i]+segY[i-1]*segY[i])/(segL[i-1]*segL[i])):1;
      var k2=(i<n-2)?smoothstep(-0.1,0.65,(segX[i]*segX[i+1]+segY[i]*segY[i+1])/(segL[i]*segL[i+1])):1;
      var p0x=i>0?bufX[i-1]:bufX[0]-(bufX[1]-bufX[0]), p0y=i>0?bufY[i-1]:bufY[0]-(bufY[1]-bufY[0]);
      var p3x=i<n-2?bufX[i+2]:bufX[n-1]+(bufX[n-1]-bufX[n-2]), p3y=i<n-2?bufY[i+2]:bufY[n-1]+(bufY[n-1]-bufY[n-2]);
      sb.push('C',R(bufX[i]+(bufX[i+1]-p0x)/6*k1),' ',R(bufY[i]+(bufY[i+1]-p0y)/6*k1),' ',
                  R(bufX[i+1]-(p3x-bufX[i])/6*k2),' ',R(bufY[i+1]-(p3y-bufY[i])/6*k2),' ',
                  R(bufX[i+1]),' ',R(bufY[i+1]));
    }
    return sb.join('');
  }
  function corner(ax,ay,bx,by,cx2,cy2){
    var ux=bx-ax,uy=by-ay,vx=cx2-bx,vy=cy2-by;
    var ul=Math.hypot(ux,uy)||1, vl=Math.hypot(vx,vy)||1;
    var c=(ux*vx+uy*vy)/(ul*vl);
    return smoothstep(-0.1,0.65,c);          /* 0 at a hard corner, 1 when straight */
  }

  var st_=[];
  function paint(el,i,d,col,w,dash,op){
    var s=st_[i]||(st_[i]={});
    el.setAttribute('d',d);
    var c='rgb('+col[0]+','+col[1]+','+col[2]+')';
    if(s.c!==c){el.setAttribute('stroke',c);s.c=c}
    var wr=w.toFixed(2); if(s.w!==wr){el.setAttribute('stroke-width',wr);s.w=wr}
    if(s.d!==dash){el.setAttribute('stroke-dasharray',dash?'9 11':'none');s.d=dash}
    var o=op.toFixed(2); if(s.o!==o){el.setAttribute('stroke-opacity',o);s.o=o}
  }

  /* Attribute writes are the expensive part, not the maths: most of the
     eight plates sit at opacity 0 with an unchanged transform every frame.
     Skip any write that would not change anything. (Declared here, hoisted
     to the top of the module — the frame layout above calls it.) */
  function setA(el,k,v){
    var c=el.__c||(el.__c={});
    if(c[k]===v)return;
    c[k]=v; el.setAttribute(k,v);
  }
  function setT(el,k,v){
    var c=el.__c||(el.__c={});
    if(c[k]===v)return;
    c[k]=v; el.textContent=v;
  }

  var SCALES=['6371 km','10 µm','1 Å','5 V','1 AU','1 km','20 µm','\u2207L'];
  var chromeProg=IDS.progress?document.getElementById(IDS.progress):null;
  var crumb=IDS.crumb?document.getElementById(IDS.crumb):null;
  var pctEl=IDS.pct?document.getElementById(IDS.pct):null;
  var railHost=IDS.rail?document.getElementById(IDS.rail):null;
  var railBt=railHost?railHost.querySelectorAll('.bt'):[];
  var mres={};

  function render(){
    var TT=performance.now()/1000;
    var sp=clamp(scenePosition(),0,scenes.length-1);
    var from=clamp(Math.floor(sp),0,scenes.length-2);
    var to=from+1;
    var localT=clamp(sp-from,0,1);
    if(sp>=scenes.length-1){from=scenes.length-2;to=scenes.length-1;localT=1}
    var A=scenes[from], B=scenes[to];
    var pair=PAIRS[from]||PAIRS[0];
    var dir=(B.ax>A.ax)?1:-1;
    var settled=(localT<0.5)?from:to;

    /* ---- chrome. Every handle is optional: the stage is a backdrop
            first, and a page that does not render a rail or a crumb still
            gets the plates. ---- */
    var gp=(scenes.length>1)?sp/(scenes.length-1):0;
    St.p=gp;
    if(chromeProg)chromeProg.style.width=(gp*100)+'%';
    if(pctEl)setT(pctEl,'t',String(Math.round(gp*100)).padStart(3,'0')+'%');
    for(var r=0;r<railBt.length;r++)railBt[r].classList.toggle('on',r===settled);
    if(crumb)setT(crumb,'t',CRUMB_PREFIX+'0'+(settled+1)+' — '+scenes[settled].sc.name);
    setT(plateNo,'t','PLATE 0'+(settled+1)+' · '+scenes[settled].sc.name);
    setT(scaleT,'t',SCALES[settled]||'');
    if(onScene&&settled!==lastSettled){lastSettled=settled;onScene(settled,scenes[settled].sc.name,gp)}

    var pf=RM?0:1;
    // setA(gPaper,'transform','translate('+(St.mx*5*pf)+','+(St.my*4*pf)+')');

    /* ---- how close are we to a settled plate? drives every UI layer ---- */
    var near=[],i;
    for(i=0;i<scenes.length;i++){
      var d=Math.abs(sp-i);
      near.push(1-smoothstep(0.05,0.26,d));
    }
    var chipVis=near[settled];
    var nearFrom=near[from], nearTo=near[to];
    /* The art steps aside for the question column while it is open — by
       however much its own mount actually overlaps it, so a wide plate
       like the neuron clears the cards instead of hiding behind them.
       Capped, because past a point it is walking into the copy instead. */
    var nudge=0;
    if(CHIPS&&chipVis>0.002){
      var Sn=scenes[settled], onRight=sideOf(settled)==='right';
      var ctr=Sn.ax+Sn.fcx, half=Sn.fw/2;
      var over=onRight?(ctr+half)-CHIP_X_RIGHT+22:(CHIP_X_LEFT+CHIP_W+22)-(ctr-half);
      nudge=(onRight?-1:1)*clamp(over,70,200)*chipVis;
    }

    /* ---- fills drain before the flight and return after it ---- */
    for(i=0;i<scenes.length;i++){
      var fo=1-smoothstep(0.03,0.19,Math.abs(sp-i));
      setA(scenes[i].gf,'opacity',fo.toFixed(3));
      var ax0=scenes[i].ax+(scenes[i].sc.ox||0)+(i===settled?nudge:0);
      if(fo>0.002)setA(scenes[i].gf,'transform','translate('+(ax0+St.mx*16*pf).toFixed(1)+','+(ART_Y+St.my*12*pf).toFixed(1)+')');
    }

    /* ---- THE INK ---- */
    var idleAmt=RM?0:(PREMIUM?0.32:0.55)*(1-smoothstep(0.0,0.12,localT))*(1-smoothstep(0.88,1.0,1-localT));
    var phase=(sp*2.1);
    var echoOn=St.echo&&!RM&&localT>0.06&&localT<0.96;
    gEcho.setAttribute('opacity',echoOn?0.085:0);

    for(var k=0;k<STRANDS;k++){
      var sa=A.strands[k], sb2=B.strands[k];
      morphStrand(sa,sb2,localT,k,pair,dir,A.ax,mres);
      var la=1;
      if(nearFrom>0.004)la*=applyLive(A.sc.key,sa,TT,nearFrom*(1-mres.u));
      if(nearTo>0.004)  la*=applyLive(B.sc.key,sb2,TT,nearTo*mres.u);
      if(idleAmt>0.002)idle(k,idleAmt,phase);
      var ca=resolveCol(sa.col), cb=resolveCol(sb2.col);
      /* premium keeps its colour until the line is nearly landed — a strand
         that changes identity mid-air reads as a glitch, one that arrives
         and then colours reads as a decision */
      var ct=smoothstep(PREMIUM?0.34:0.18,PREMIUM?0.94:0.86,localT);
      var col=[Math.round(ca[0]+(cb[0]-ca[0])*ct),
               Math.round(ca[1]+(cb[1]-ca[1])*ct),
               Math.round(ca[2]+(cb[2]-ca[2])*ct)];
      var wdt=sa.w+(sb2.w-sa.w)*ct;
      if(PREMIUM)wdt*=1-0.14*mres.flow;   /* travel light, land full    */
      var op=(0.99-(PREMIUM?0.28:0.20)*mres.flow)*la;
      /* nudge the settled plate along with its fills */
      if(nudge!==0){
        var nA=(from===settled)?nudge*(1-mres.u):0, nB=(to===settled)?nudge*mres.u:0;
        var nn=nA+nB;
        if(nn!==0)for(i=0;i<PTS;i++)bufX[i]+=nn;
      }
      if(pf)for(i=0;i<PTS;i++){bufX[i]+=St.mx*16*pf;bufY[i]+=St.my*12*pf}
      paint(inkEl[k],k,smoothPath(PTS),col,wdt,(ct<0.5?sa.dash:sb2.dash),op);

      if(echoOn){
        /* ink memory — the same strand two frames of progress ago.
           Deterministic: derived from localT, not from history. */
        morphStrand(sa,sb2,clamp(localT-0.018,0,1),k,pair,dir,A.ax,mres);
        if(pf)for(i=0;i<PTS;i++){bufX[i]+=St.mx*16*pf;bufY[i]+=St.my*12*pf}
        echoEl[k].setAttribute('d',smoothPath(PTS));
        echoEl[k].setAttribute('stroke','rgb('+col[0]+','+col[1]+','+col[2]+')');
        echoEl[k].setAttribute('stroke-width',(wdt*0.8).toFixed(2));
      }
    }

    /* ---- the living plate: fills, sparks and callouts ---- */
    for(i=0;i<scenes.length;i++){
      var Sv=scenes[i], wv=near[i];
      if(Sv.liveFills&&wv>0.004)projectGlobeFills(Sv,TT,wv);
      if(Sv.fillW&&wv>0.004){
        for(var fk in Sv.fillW){
          var lc=Sv.lcOf[fk];
          setA(Sv.fillW[fk],'transform',
            liveTransform(Sv.sc.key,+fk,lc?lc.glcx:0,lc?lc.glcy:0,TT,wv));
          setA(Sv.fillW[fk],'opacity',
            liveAlpha(Sv.sc.key,+fk,lc?lc.glcx:0,lc?lc.glcy:0,TT,wv).toFixed(3));
        }
      }
      setA(Sv.gl2,'opacity',(wv*wv*uiP).toFixed(3));
      if(wv>0.02){
        var axs=Sv.ax+(Sv.sc.ox||0)+(i===settled?nudge:0);
        setA(Sv.gl2,'transform','translate('+(axs+St.mx*16*pf).toFixed(1)+','+(ART_Y+St.my*12*pf).toFixed(1)+')');
        for(var sk=0;sk<Sv.sparks.length;sk++){
          var spk=Sv.sparks[sk], ff=(TT*spk.sp+spk.ph)%1; if(ff<0)ff+=1;
          var pos=walk(spk.p,ff);
          setA(spk.el,'cx',pos[0].toFixed(1));
          setA(spk.el,'cy',pos[1].toFixed(1));
          setA(spk.el,'opacity',(0.35+0.65*Math.sin(Math.PI*ff)).toFixed(2));
        }
      }
      var nv=clamp(wv*1.35-0.35,0,1);
      setA(Sv.gn,'opacity',(nv*uiP).toFixed(3));
      if(nv>0.004){
        setA(Sv.gn,'transform',Sv.ga.__c&&Sv.ga.__c.transform||'');
        for(var nk=0;nk<Sv.notes.length;nk++){
          var nt=Sv.notes[nk], np=clamp(nv*1.5-nk*0.16,0,1);
          setA(nt.ln,'stroke-dashoffset',(nt.ln.__L*(1-np)).toFixed(1));
          setA(nt.hd,'opacity',clamp((np-0.72)/0.28,0,1).toFixed(3));
          setA(nt.lbl,'opacity',clamp((np-0.55)/0.45,0,1).toFixed(3));
          setA(nt.g,'opacity',clamp(np*2,0,1).toFixed(3));
        }
      }
    }

    /* ---- annotation layer: leaders retract, tags fade, then return ---- */
    for(i=0;i<scenes.length;i++){
      var S=scenes[i], av=near[i];
      setA(S.ga,'opacity',(av*uiP).toFixed(3));
      if(av>0.002){
        var ax1=S.ax+(S.sc.ox||0)+(i===settled?nudge:0);
        setA(S.ga,'transform','translate('+(ax1+St.mx*20*pf).toFixed(1)+','+(ART_Y+St.my*16*pf).toFixed(1)+')');
        for(var l=0;l<S.labels.length;l++){
          var lo=S.labels[l], lt=clamp(av*1.5-l*0.18,0,1);
          setA(lo.lead,'stroke-dashoffset',(lo.lead.__L*(1-lt)).toFixed(1));
          setA(lo.tg,'opacity',clamp((lt-0.45)/0.55,0,1).toFixed(3));
        }
      }
    }

    /* ---- question set ---- */
    for(i=0;i<scenes.length;i++){
      var cv=(CHIPS&&i===settled&&!scenes[i].sc.finale)?chipVis:0;
      var Si=scenes[i];
      setA(Si.gc,'opacity',(cv*uiP).toFixed(3));
      if(cv>0.002){
        var cxx=chipX(i)+(sideOf(i)==='right'?1:-1)*(1-cv)*40;
        var gcY=St.my*10*pf;
        setA(Si.gc,'transform','translate('+cxx.toFixed(1)+','+gcY.toFixed(1)+')');
        var onRightI=sideOf(i)==='right';
        var ax1=Si.ax+(Si.sc.ox||0)+nudge;
        /* ---- STRICT SEQUENCE: line 1 draws out from the diagram, THEN
           card 1 pops, THEN line 2 draws, THEN card 2 pops — never two
           at once. `cv` is one continuous 0..1 driver; it is cut into
           one equal slot per card, and each slot is itself cut into a
           draw-half and a pop-half, so a later card's slot cannot begin
           until the previous card's slot has finished animating. ---- */
        var nChips=Si.chips.length||1;
        for(var c2=0;c2<Si.chips.length;c2++){
          var segT=clamp(cv*nChips-c2,0,1);          /* this card's own 0..1 window   */
          var lineP=smoothstep(0,0.55,segT);          /* first: the leader line draws  */
          var popT=smoothstep(0.5,1,segT);            /* then: the card pops in        */
          var ez=popT*popT*(3-2*popT);                /* smoothstep — an easeful pop   */
          var riseY=(1-ez)*26;                        /* rises 26px into its slot      */
          var pop=0.90+0.10*ez;                       /* grows from 90% to full size   */
          var baseY=CHIP_Y0+c2*(CHIP_H+CHIP_GAP);
          setA(Si.chips[c2],'opacity',popT.toFixed(3));
          setA(Si.chips[c2],'transform','translate(0,'+(baseY+riseY).toFixed(1)+') scale('+pop.toFixed(3)+')');

          var link=Si.links&&Si.links[c2], lo2=Si.labels&&Si.labels[c2];
          if(link&&lo2){
            if(lineP>0.004){
              var tx1=ax1+lo2.tx, ty1=ART_Y+lo2.ty;
              var edgeX=onRightI?0:CHIP_W;
              /* the line's target is the card's SETTLED slot, so it always
                 draws toward exactly where the card is about to land */
              var fullTx2=cxx+edgeX, fullTy2=gcY+baseY+(CHIP_H/2);
              var tx2=tx1+(fullTx2-tx1)*lineP, ty2=ty1+(fullTy2-ty1)*lineP;
              var mxm=(tx1+tx2)/2;
              setA(link,'d','M'+tx1.toFixed(1)+' '+ty1.toFixed(1)+' C '+mxm.toFixed(1)+' '+ty1.toFixed(1)+
                ', '+mxm.toFixed(1)+' '+ty2.toFixed(1)+', '+tx2.toFixed(1)+' '+ty2.toFixed(1));
              setA(link,'stroke-opacity',(Math.min(1,lineP*3)*0.6*uiP).toFixed(3));
            } else setA(link,'stroke-opacity','0');
          }
        }
      } else if(Si.links){
        for(var lkk=0;lkk<Si.links.length;lkk++)setA(Si.links[lkk],'stroke-opacity','0');
      }
    }
    setA(gSet,'opacity',((CHIPS&&!scenes[settled].sc.finale?chipVis:0)*uiP).toFixed(3));
    setA(gSet,'transform','translate('+chipX(settled)+','+CHIP_Y0+')');
    setT(setL,'t','QUESTION SET');
    setT(setR,'t','3/3 ✓');

    /* ---- plate furniture + finale ---- */
    var fk=smoothstep(0.22,0.82,localT);
    var frameX=(A.ax+A.fcx)+((B.ax+B.fcx)-(A.ax+A.fcx))*fk+nudge;
    var frameY=ART_Y+A.fcy+(B.fcy-A.fcy)*fk;
    var frameH=A.fh+(B.fh-A.fh)*fk;
    /* Keep the mount inside the band it was sized for. Because fh can
       never exceed BAND, this clamp always has somewhere to put it. */
    if(frameH>=BAND) frameY=(SAFE_T+SAFE_B)/2;
    else frameY=clamp(frameY,SAFE_T+frameH/2,SAFE_B-frameH/2);
    layoutFrame(A.fw+(B.fw-A.fw)*fk, frameH);
    setA(gFrame,'transform','translate('+(frameX+St.mx*9*pf).toFixed(1)+','+(frameY+St.my*7*pf).toFixed(1)+')');
    gFrame.setAttribute('opacity',(0.85*(1-smoothstep(0.16,0.5,Math.min(localT,1-localT))*0.85)).toFixed(3));
    gMark.setAttribute('opacity','0');

    /* ---- text choreography: never two full blocks at once. The column
            rides the same scroll number the ink does, so copy and plate
            arrive together. ---- */
    if(CHOREOGRAPH&&sections.length>1){
      var step=(scenes.length-1)/(sections.length-1);
      for(i=0;i<sections.length;i++){
        var dd=sp-i*step, ad=Math.abs(dd);
        var pres=1-smoothstep(0.16,0.62,ad);
        var col2=sections[i].firstElementChild;
        if(col2){
          col2.style.opacity=pres.toFixed(3);
          col2.style.transform='translateY('+(-dd*34).toFixed(1)+'px)';
        }
        if(pres>0.35)sections[i].classList.add('on');
      }
    }

    if(!stopped)raf=requestAnimationFrame(render);
  }

  /* ══════════════════════════════════════════════════════════
     9 · REDUCED MOTION — hold the nearest plate, no flight
     ══════════════════════════════════════════════════════════ */
  if(RM){
    var _sp=scenePosition;
    scenePosition=function(){return Math.round(_sp())};
  }
  raf=requestAnimationFrame(render);

  /* ---- pause while the tab is hidden; a fixed backdrop is otherwise
          always on screen, so there is nothing else worth observing ---- */
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
    setPresence: function (v) {
      uiP = v < 0 ? 0 : v > 1 ? 1 : v
    },
    setScrub: function (v) {
      St.scrub = v == null ? null : v < 0 ? 0 : v > 1 ? 1 : v
    },
    setEcho: function (on) {
      St.echo = !!on
    },
    progress: function () {
      return St.p
    },
    remeasure: measure,
    destroy: function () {
      stopped = true
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      window.clearInterval(reMeasure)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('load', measure)
      window.removeEventListener('mousemove', onMouse)
      document.removeEventListener('visibilitychange', onVis)
      themeObs.disconnect()
      if (svg.parentNode === host) host.removeChild(svg)
    },
  }
}
