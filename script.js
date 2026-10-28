(function(){
var $=function(i){return document.getElementById(i)};
function fmt(x){return isFinite(x)?x.toLocaleString('pt-BR',{maximumFractionDigits:Math.abs(x)>=1?2:3}):'–'}
function col(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function parseNum(s){var m=String(s).replace(/,/g,'.').replace(/−/g,'-').trim().match(/^[-+]?\s*\d*\.?\d+(?:e[-+]?\d+)?/i);return m?Number(m[0].replace(/\s/g,'')):NaN}
var TOL=0.03,uid=0,Q=null,C={};

/* ---------- árvore do circuito (série e paralelo) ---------- */
function L(k,v){return {k:'L',id:++uid,kind:k,val:v}}
function S(){return {k:'S',id:++uid,c:[].slice.call(arguments)}}
function Pp(){return {k:'P',id:++uid,c:[].slice.call(arguments)}}
function z(n){return n.kind==='R'?n.val:1/n.val}
function zEq(n){if(n.k==='L')return z(n);var a=n.c.map(zEq);return n.k==='S'?a.reduce(function(s,v){return s+v},0):1/a.reduce(function(s,v){return s+1/v},0)}
function disp(k,zv){return k==='R'?zv:1/zv}
function clone(n){return JSON.parse(JSON.stringify(n))}
function leaves(n,a){a=a||[];if(n.k==='L')a.push(n);else n.c.forEach(function(c){leaves(c,a)});return a}
function ready(n){if(n.k==='L')return null;if(n.c.every(function(c){return c.k==='L'}))return n;for(var i=0;i<n.c.length;i++){var r=ready(n.c[i]);if(r)return r}return null}
function repl(n,id,x){if(n.id===id)return x;if(n.k!=='L')n.c=n.c.map(function(c){return repl(c,id,x)});return n}
function walk(n,f,m){m[n.id]={f:f};if(n.k==='L')m[n.id].v=f*z(n);else if(n.k==='S'){n.c.forEach(function(c){walk(c,f,m)});m[n.id].v=n.c.reduce(function(a,c){return a+m[c.id].v},0)}else{var ze=zEq(n);m[n.id].v=f*ze;n.c.forEach(function(c){walk(c,f*ze/zEq(c),m)})}return m}
function path(n,id){if(n.id===id)return [n];if(n.k==='L')return null;for(var i=0;i<n.c.length;i++){var r=path(n.c[i],id);if(r)return [n].concat(r)}return null}
function pw(n,f){if(n.k==='L')return f*f*z(n);if(n.k==='S')return Math.max.apply(null,n.c.map(function(c){return pw(c,f)}));var ze=zEq(n);return Math.max.apply(null,n.c.map(function(c){return pw(c,f*ze/zEq(c))}))}

/* ---------- modos e geradores ---------- */
var RP=[5,10,12,15,20,24,30,40,60],CP=[10,20,30,40,60,100],PA=[[10,10],[20,20],[20,30],[10,40],[12,24],[15,30],[30,60],[40,60],[60,60],[24,24]],PT=[[10,10,10],[20,20,20],[30,30,30],[12,12,12]];
function lv(k){return L(k,pick(k==='R'?RP:CP))}
function pr(k,n){return Pp.apply(null,(n===3?pick(PT):pick(PA)).map(function(v){return L(k,v)}))}
var MODES=[
 {n:'Resistores em série',ic:'🔗',d:'Soma das resistências e lei de Ohm',k:'R',g:function(k){return S(lv(k),lv(k),lv(k))}},
 {n:'Resistores em paralelo',ic:'🔀',d:'Resistência equivalente do paralelo',k:'R',g:function(k){return pr(k,pick([2,3]))}},
 {n:'Circuito misto',ic:'🧩',d:'Série e paralelo juntos',k:'R',g:function(k){return pick([function(){return S(lv(k),pr(k,2))},function(){return Pp(S(lv(k),lv(k)),lv(k))},function(){return S(lv(k),pr(k,2),lv(k))}])()}},
 {n:'Misto avançado',ic:'🧠',d:'Ramos dentro de ramos',k:'R',g:function(k){return pick([function(){return S(pr(k,2),pr(k,2))},function(){return Pp(lv(k),S(lv(k),pr(k,2)))},function(){return S(lv(k),Pp(lv(k),S(lv(k),lv(k))))}])()}},
 {n:'Capacitores em CC',ic:'🔋',d:'Série, paralelo, carga e tensão',k:'C',g:function(k){return pick([function(){return S(lv(k),lv(k))},function(){return pr(k,2)},function(){return S(lv(k),pr(k,2))},function(){return Pp(S(lv(k),lv(k)),lv(k))}])()}}];
var ST={pts:0,done:[0,0,0,0,0]};
try{var sv=JSON.parse(localStorage.getItem('lab-circuitos'));if(sv&&sv.done)ST=sv}catch(e){}
function save(){try{localStorage.setItem('lab-circuitos',JSON.stringify(ST))}catch(e){}}

function novo(i){
 var m=MODES[i],k=m.k,t=m.g(k),V=pick([12,24,48,60,120]);leaves(t).forEach(function(l,j){l.name=k+(j+1)});
 var tg=pick(leaves(t));
 Q={mi:i,k:k,V:V,V0:V,orig:clone(t),tree:t,hl:null,b:0,tries:0,seen:false,done:false,tgt:tg.id,open:false,cnt:{p:0,s:0},log:[],sel:null,f0:V/zEq(t),msg:''};
 $('menu').hidden=true;$('lbgame').hidden=false;$('lblab').hidden=true;$('lbvs').value=100;
 $('lbpt').textContent=m.n;$('lbptx').textContent='Uma fonte de '+V+' V alimenta o circuito abaixo. '+(k==='R'?'Reduza o circuito até achar a resistência equivalente, depois a corrente total e os dados de um resistor.':'Reduza o circuito até achar a capacitância equivalente, depois a carga total e os dados de um capacitor.');
 $('lbinfo').textContent='Toque na chave para abrir o circuito e nos componentes para ver os dados.';Q.hl=(ready(Q.tree)||{}).id;render();window.scrollTo(0,0)}

/* ---------- etapas ---------- */
function lst(a){return a.length>1?a.slice(0,-1).join(', ')+' e '+a[a.length-1]:a[0]}
function curStep(){
 var k=Q.k,R=k==='R',u=R?'Ω':'µF';
 if(Q.tree.k!=='L'){
  var g=ready(Q.tree),par=g.k==='P',nm=g.c.map(function(l){return l.name}),vs=g.c.map(function(l){return l.val}),ans=disp(k,zEq(g)),sum=(R&&!par)||(!R&&par),ky=par?'p':'s',what=R?'resistência':'capacitância';
  var h,f;if(sum){h='As '+(R?'resistências':'capacitâncias')+' se somam.';f=vs.join(' + ')}
  else if(vs.length===2){h='Para dois elementos, use produto sobre soma.';f='('+vs[0]+' · '+vs[1]+') / ('+vs[0]+' + '+vs[1]+')'}
  else{h='Some os inversos e inverta o resultado.';f='1 / ('+vs.map(function(v){return '1/'+v}).join(' + ')+')'}
  return {q:'Qual é a '+what+' equivalente '+(par?'do paralelo entre ':'da associação em série de ')+lst(nm)+'?',l:k+ky+(Q.cnt[ky]+1),u:u,a:ans,h:h,f:f,g:g,ky:ky}}
 var T=leaves(Q.orig).filter(function(l){return l.id===Q.tgt})[0],wk=walk(Q.orig,Q.V0/zEq(Q.orig),{}),w=wk[T.id],pth=path(Q.orig,T.id),tn=(R?'resistor ':'capacitor ')+T.name;
 if(Q.b===0)return {q:R?'Qual é a corrente total fornecida pela fonte?':'Qual é a carga total armazenada pelo circuito?',l:R?'I':'Q',u:R?'A':'µC',a:Q.V0/zEq(Q.orig),h:R?'Lei de Ohm com a resistência equivalente: I = V / Req.':'Carga total: Q = Ceq · V.',f:R?'I = '+Q.V0+' / '+fmt(zEq(Q.orig)):'Q = '+fmt(1/zEq(Q.orig))+' · '+Q.V0};
 if(Q.b===1){var ln=pth.map(function(n){if(n.k==='L')return n.name+': V = '+fmt(wk[n.id].v)+' V';return (n.k==='S'?'Série':'Paralelo')+' (eq. '+fmt(disp(k,zEq(n)))+' '+u+'): '+(n.k==='S'?(R?'I':'Q')+' = '+fmt(wk[n.id].f)+(R?' A':' µC'):'V = '+fmt(wk[n.id].v)+' V')}).join('  →  ');
  return {q:'O circuito voltou ao original. Qual é a tensão no '+tn+'?',l:'V'+T.name,u:'V',a:w.v,h:'Siga o caminho da corrente: em série a corrente (ou carga) é a mesma e as tensões se somam; no paralelo a tensão é a mesma.',f:ln}}
 return {q:R?'Qual é a corrente no '+tn+'?':'Qual é a carga no '+tn+'?',l:(R?'I':'Q')+T.name,u:R?'A':'µC',a:w.f,h:R?'Lei de Ohm no próprio resistor: I = V / R.':'No próprio capacitor: Q = C · V.',f:R?'I = '+fmt(w.v)+' / '+T.val:'Q = '+T.val+' · '+fmt(w.v)}}
function ansTxt(s){return fmt(s.a)+' '+s.u}
function render(){
 var h=Q.log.map(function(t){return '<div class="st ok">'+t+'</div>'}).join('');
 if(!Q.done){var s=curStep(),n=Q.log.length+1;
  h+='<div class="st cur"><b>Etapa '+n+'</b><p>'+s.q+'</p><div class="ans"><input id="lbai" autocomplete="off" inputmode="decimal" aria-label="Sua resposta" placeholder="sua resposta"><span class="u">'+s.u+'</span><button class="btn" id="lbchk" type="button">Responder</button></div><div id="lbfb" class="fb"></div><details><summary>Dica</summary><div>'+s.h+'</div></details><details><summary>Conta com os seus números</summary><div>'+s.f+'</div></details><button class="btn alt" id="lbrev" type="button" hidden style="margin:4px 0 0">Ver resposta</button></div>'}
 $('lbsteps').innerHTML=h;
 if(Q.done)return;
 $('lbchk').addEventListener('click',check);$('lbai').addEventListener('keydown',function(e){if(e.key==='Enter')check()});$('lbrev').addEventListener('click',reveal)}
function fb(m,k){var e=$('lbfb');if(e){e.textContent=m;e.className='fb '+(k||'')}}
function advance(s){
 Q.log.push('✔ <b>'+s.l+'</b> = '+ansTxt(s));Q.tries=0;Q.seen=false;
 if(s.g){var lf=L(Q.k,s.a);lf.name=s.l;lf.born=performance.now()/1000;Q.cnt[s.ky]++;Q.tree=repl(Q.tree,s.g.id,lf);Q.hl=(ready(Q.tree)||{}).id;
  Q.msg='Substituí '+lst(s.g.c.map(function(l){return l.name}))+' por '+s.l+' = '+ansTxt(s)+'.';$('lbinfo').textContent=Q.msg}
 else{Q.b++;if(Q.b===1){Q.tree=clone(Q.orig);var t=performance.now()/1000;leaves(Q.tree).forEach(function(l){l.born=t});Q.sel=Q.tgt;$('lbinfo').textContent='O circuito voltou ao original. O componente marcado é o que você vai analisar.'}
  if(Q.b>=3){Q.done=true;Q.sel=null;ST.done[Q.mi]++;$('lblab').hidden=false;$('lbvl').textContent=fmt(Q.V)+' V';$('lbinfo').textContent='Pronto! Agora mexa no circuito: mude a tensão, abra a chave e toque nos componentes.'}}
 render()}
function check(){
 var s=curStep(),v=parseNum($('lbai').value);if(isNaN(v))return fb('Digite um número.','bad');
 if(Math.abs(v-s.a)<=Math.max(TOL*Math.abs(s.a),1e-9)){ST.pts+=Q.tries===0?10:5;save();advance(s)}
 else{Q.tries++;fb('Ainda não. Confira a unidade e o arredondamento, ou abra a dica.','bad');if(Q.tries>=2)$('lbrev').hidden=false}}
function reveal(){var s=curStep();if(Q.seen)return advance(s);Q.seen=true;fb('Resposta: '+ansTxt(s)+'. Conta: '+s.f,'good');$('lbrev').textContent='Próxima etapa'}

/* ---------- desenho ---------- */
var LW=76,LH=64,G=14,BUS=16,PG=12;
function meas(n){
 if(n.k==='L'){n.m={w:LW,h:LH,ay:LH/2};return n.m}
 n.c.forEach(meas);
 if(n.k==='S'){var up=0,dn=0,w=0;n.c.forEach(function(c){up=Math.max(up,c.m.ay);dn=Math.max(dn,c.m.h-c.m.ay);w+=c.m.w});n.m={w:w+G*(n.c.length-1),h:up+dn,ay:up}}
 else{var w2=0,h=0;n.c.forEach(function(c){w2=Math.max(w2,c.m.w);c.dy=h;h+=c.m.h+PG});h-=PG;var a=n.c[0],b=n.c[n.c.length-1];n.m={w:w2+2*BUS,h:h,ay:(a.m.ay+b.dy+b.m.ay)/2}}
 return n.m}
function mix(a,b,t){var p=function(h){h=h.replace('#','');return [0,2,4].map(function(i){return parseInt(h.substr(i,2),16)})},A=p(a),B=p(b);return 'rgb('+A.map(function(v,i){return Math.round(v+(B[i]-v)*t)}).join(',')+')'}
function pc(v){return mix(C.cold,C.hot,Math.max(0,Math.min(1,v/(C.V||1))))}
function seg(x1,y1,x2,y2,f,va,vb){var X=C.x;if(Math.hypot(x2-x1,y2-y1)<0.5)return;var g=X.createLinearGradient(x1,y1,x2,y2);g.addColorStop(0,pc(va));g.addColorStop(1,pc(vb));X.strokeStyle=g;X.lineWidth=3;X.lineCap='round';X.beginPath();X.moveTo(x1,y1);X.lineTo(x2,y2);X.stroke();if(f>1e-12&&C.dots)C.sg.push([x1,y1,x2,y2,f,(va+vb)/2])}
function bus(xb,ya,an,fs,out,v){
 var U=[],D=[];an.forEach(function(a,j){if(a<ya-0.5)U.push(j);else if(a>ya+0.5)D.push(j)});
 U.sort(function(a,b){return an[b]-an[a]});D.sort(function(a,b){return an[a]-an[b]});
 [U,D].forEach(function(G2){var rem=0;G2.forEach(function(j){rem+=fs[j]});var cur=ya;
  if(out)G2.forEach(function(j){seg(xb,cur,xb,an[j],rem,v,v);rem-=fs[j];cur=an[j]});
  else{var arr=G2.slice().reverse(),acc=0;arr.forEach(function(j,k){acc+=fs[j];seg(xb,an[j],xb,k<arr.length-1?an[arr[k+1]]:ya,acc,v,v)})}})}
function leaf(n,x,y,f,drop,vin){
 var X=C.x,m=n.m,cx=x+m.w/2,ya=y+m.ay,x1=x+10,x2=x+m.w-10,R=n.kind==='R',i;
 C.hits.push({x:x,y:y,w:m.w,h:m.h,n:n});
 if(Q.sel===n.id){X.strokeStyle=C.acc;X.lineWidth=2;X.setLineDash([5,4]);X.strokeRect(x+3,y+3,m.w-6,m.h-6);X.setLineDash([])}
 if(R){var gl=C.pmax>0?Math.min(1,f*drop/C.pmax):0;if(gl>0.03){X.globalAlpha=0.1+0.35*gl;X.fillStyle=C.hot;X.beginPath();X.arc(cx,ya,26,0,7);X.fill();X.globalAlpha=1}
  X.strokeStyle=C.ink;X.lineWidth=2.5;X.lineJoin='round';X.beginPath();X.moveTo(x1,ya);for(i=0;i<6;i++)X.lineTo(x1+(x2-x1)*(i+0.5)/6,ya+(i%2?8:-8));X.lineTo(x2,ya);X.stroke()}
 else{X.fillStyle=C.card;X.fillRect(cx-6,ya-3,12,6);X.lineWidth=4;X.lineCap='butt';X.strokeStyle=pc(vin);X.beginPath();X.moveTo(cx-5,ya-17);X.lineTo(cx-5,ya+17);X.stroke();X.strokeStyle=pc(vin-drop);X.beginPath();X.moveTo(cx+5,ya-17);X.lineTo(cx+5,ya+17);X.stroke();X.lineCap='round'}
 X.fillStyle=C.ink;X.textAlign='center';X.font='600 12px "IBM Plex Sans",sans-serif';X.fillText(n.name,cx,ya-20);X.font='11px "IBM Plex Sans",sans-serif';X.fillText(fmt(n.val)+(R?' Ω':' µF'),cx,ya+23);
 if(C.lab){X.fillStyle=C.acc;X.font='600 11px "IBM Plex Sans",sans-serif';X.fillText(fmt(drop)+' V',cx,ya+35)}
 if(n.born&&C.t-n.born<0.9){var k=(C.t-n.born)/0.9;X.strokeStyle=C.acc;X.globalAlpha=1-k;X.lineWidth=3;X.beginPath();X.arc(cx,ya,18+34*k,0,7);X.stroke();X.globalAlpha=1}}
function dr(n,x,y,f,vin){
 var m=n.m,ya=y+m.ay,vout,X=C.x;
 if(Q.hl===n.id&&!Q.done){X.strokeStyle=C.acc;X.lineWidth=2;X.globalAlpha=0.45+0.4*Math.sin(C.t*5);X.setLineDash([6,5]);X.strokeRect(x-4,y-6,m.w+8,m.h+12);X.setLineDash([]);X.globalAlpha=1}
 if(n.k==='L'){var drop=f*z(n);vout=vin-drop;seg(x,ya,x+m.w,ya,f,vin,vout);leaf(n,x,y,f,drop,vin);return vout}
 if(n.k==='S'){var cx=x,v=vin;n.c.forEach(function(c,i){if(i)seg(cx-G,ya,cx,ya,f,v,v);v=dr(c,cx,y+m.ay-c.m.ay,f,v);cx+=c.m.w+G});return v}
 var ze=zEq(n),W=m.w-2*BUS,xl=x+BUS,xr=x+m.w-BUS;vout=vin-f*ze;
 var fs=n.c.map(function(c){return f*ze/zEq(c)}),an=n.c.map(function(c){return y+c.dy+c.m.ay});
 seg(x,ya,xl,ya,f,vin,vin);seg(xr,ya,x+m.w,ya,f,vout,vout);bus(xl,ya,an,fs,true,vin);bus(xr,ya,an,fs,false,vout);
 n.c.forEach(function(c,j){var cx=xl+(W-c.m.w)/2;seg(xl,an[j],cx,an[j],fs[j],vin,vin);dr(c,cx,y+c.dy,fs[j],vin);seg(cx+c.m.w,an[j],xr,an[j],fs[j],vout,vout)});
 return vout}
function draw(t){
 var tr=Q.tree,m=meas(tr),Bx=34,xs=Bx+54,Wl=xs+m.w+30+24,Hl=56+m.h+86,c=$('lbcv'),w=Math.max(240,c.parentNode.clientWidth-32),s=Math.min(1.25,w/Wl),dpr=window.devicePixelRatio||1,h=Math.ceil(Hl*s);
 if(c._w!==w||c._h!==h){c.width=w*dpr;c.height=h*dpr;c.style.height=h+'px';c._w=w;c._h=h}
 var X=c.getContext('2d'),ox=Math.max(0,(w/s-Wl)/2);X.setTransform(dpr*s,0,0,dpr*s,ox*dpr*s,0);X.clearRect(-ox-2,0,w/s+ox+4,h/s+2);
 var V=Q.V,ze=zEq(tr),f=Q.open?0:V/ze,ytop=56+m.ay,ybot=56+m.h+36,xe=xs+m.w,xR=xe+30,yb=(ytop+ybot)/2,sx=(Bx+xR)/2,hot=col('--hot'),cold=col('--cold'),ink=col('--ink');
 C={x:X,t:t,sg:[],hits:[],V:V,hot:hot,cold:cold,ink:ink,acc:col('--acc'),card:col('--card'),lab:Q.done,open:Q.open,dots:Q.k==='R'&&!Q.open,pmax:pw(tr,f)};
 c._s=s;c._ox=ox;c._sw={x:sx,y:ybot};
 X.fillStyle=col('--line');for(var gx=10;gx<Wl;gx+=22)for(var gy=10;gy<Hl;gy+=22){X.fillRect(gx,gy,1.5,1.5)}
 seg(Bx,yb-26,Bx,ytop,f,V,V);seg(Bx,ytop,xs,ytop,f,V,V);
 var vo=dr(tr,xs,56,f,V);
 seg(xe,ytop,xR,ytop,f,vo,vo);seg(xR,ytop,xR,ybot,f,vo,vo);seg(xR,ybot,sx+22,ybot,f,vo,vo);seg(sx-22,ybot,Bx,ybot,f,0,0);seg(Bx,ybot,Bx,yb+26,f,0,0);
 // chave
 X.fillStyle=ink;[-22,22].forEach(function(d){X.beginPath();X.arc(sx+d,ybot,3.5,0,7);X.fill()});
 X.strokeStyle=C.acc;X.lineWidth=3.5;X.lineCap='round';X.beginPath();X.moveTo(sx-22,ybot);if(Q.open)X.lineTo(sx+14,ybot-22);else X.lineTo(sx+22,ybot);X.stroke();
 X.fillStyle=C.acc;X.textAlign='center';X.font='600 11px "IBM Plex Sans",sans-serif';X.fillText(Q.open?'chave aberta':'chave fechada',sx,ybot+20);
 // bateria
 X.strokeStyle=ink;X.lineWidth=3;X.beginPath();X.moveTo(Bx,yb-26);X.lineTo(Bx,yb-18);X.moveTo(Bx,yb+12);X.lineTo(Bx,yb+26);X.stroke();
 [[yb-18,15,3],[yb-9,8,5],[yb+3,15,3],[yb+12,8,5]].forEach(function(p){X.lineWidth=p[2];X.beginPath();X.moveTo(Bx-p[1],p[0]);X.lineTo(Bx+p[1],p[0]);X.stroke()});
 X.font='700 15px "IBM Plex Sans",sans-serif';X.fillStyle=hot;X.textAlign='center';X.fillText('+',Bx-24,yb-14);X.fillStyle=cold;X.fillText('−',Bx-24,yb+18);
 X.fillStyle=C.card;X.strokeStyle=C.acc;X.lineWidth=2;X.beginPath();X.rect(Bx+12,yb-13,44,26);X.fill();X.stroke();X.fillStyle=C.acc;X.font='700 13px "IBM Plex Sans",sans-serif';X.fillText(fmt(V)+' V',Bx+34,yb+5);
 // elétrons
 if(C.dots)C.sg.forEach(function(g){var dx=g[2]-g[0],dy=g[3]-g[1],len=Math.hypot(dx,dy),sp=18,spd=Math.min(160,22+70*Math.sqrt(g[4]/Q.f0)),off=(t*spd)%sp;
  for(var d=off;d<len;d+=sp){var px=g[0]+dx*d/len,py=g[1]+dy*d/len,cl=pc(g[5]);X.globalAlpha=0.28;X.fillStyle=cl;X.beginPath();X.arc(px,py,6,0,7);X.fill();X.globalAlpha=1;X.beginPath();X.arc(px,py,3,0,7);X.fill()}})}

/* ---------- toques no desenho ---------- */
$('lbcv').addEventListener('click',function(e){
 if(!Q)return;var r=this.getBoundingClientRect(),px=(e.clientX-r.left)/this._s-this._ox,py=(e.clientY-r.top)/this._s;
 if(Math.hypot(px-this._sw.x,py-this._sw.y)<34){Q.open=!Q.open;$('lbinfo').textContent=Q.open?'Chave aberta: o circuito está interrompido e não circula corrente.':'Chave fechada: o circuito está funcionando.';return}
 (C.hits||[]).forEach(function(h){if(px>=h.x&&px<=h.x+h.w&&py>=h.y&&py<=h.y+h.h){var n=h.n,R=n.kind==='R',w=walk(Q.tree,Q.V/zEq(Q.tree),{})[n.id];Q.sel=n.id;
  $('lbinfo').textContent=Q.done?(R?n.name+' = '+fmt(n.val)+' Ω: tensão '+fmt(w.v)+' V, corrente '+fmt(w.f)+' A, potência '+fmt(w.f*w.v)+' W.':n.name+' = '+fmt(n.val)+' µF: tensão '+fmt(w.v)+' V, carga '+fmt(w.f)+' µC, energia '+fmt(0.5*n.val*w.v*w.v)+' µJ.'):n.name+' = '+fmt(n.val)+(R?' Ω':' µF')+(n.name.length>2?' (equivalente que você calculou)':'')+'.'}})});
$('lbvs').addEventListener('input',function(){Q.V=Q.V0*Number(this.value)/100;$('lbvl').textContent=fmt(Q.V)+' V'});

/* ---------- menu e controle ---------- */
function sair(){Q=null;$('lbgame').hidden=true;$('menu').hidden=false;save();if(window.__estMenu)window.__estMenu();window.scrollTo(0,0)}
$('lbback').addEventListener('click',sair);$('lbmenu2').addEventListener('click',sair);$('lbagain').addEventListener('click',function(){novo(Q.mi)});
function frame(ts){if(Q)draw(ts/1000);requestAnimationFrame(frame)}
requestAnimationFrame(frame);
window.__lab={novo:novo,MODES:MODES,ST:ST};
})();

(function(){
var $=function(i){return document.getElementById(i)};
function fmt(x){if(!isFinite(x))return '–';return x.toLocaleString('pt-BR',{maximumFractionDigits:Math.abs(x)>=1?2:3})}
function col(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
var D=Math.PI/180,TOL=0.03;
function cxs(z){return fmt(z.re)+(z.im<0?' − j':' + j')+fmt(Math.abs(z.im))}
function pol(z){return fmt(Math.hypot(z.re,z.im))+'∠'+fmt(Math.atan2(z.im,z.re)/D)+'°'}
function o(r){return fmt(r)+' Ω'}
function st(q,l,u,a,h,f,at){return {q:q,l:l,u:u,a:a,h:h,f:f,at:at||0}}
function stc(q,l,a,h,f,u){return {q:q,l:l,u:u||'',a:a,h:h,f:f,cx:1}}
var RV=[10,15,20,22,27,33,47,56,68,100];

/* ---------- geradores de problemas ---------- */
function dcSerie(){var V=pick([12,24,48,110,127,220]),R=[pick(RV),pick(RV),pick(RV)],Rq=R[0]+R[1]+R[2],I=V/Rq;
 return {tt:'Circuito série em CC',txt:'Uma fonte de '+V+' V alimenta três resistores em série: R1 = '+o(R[0])+', R2 = '+o(R[1])+' e R3 = '+o(R[2])+'.',
 circ:{src:V+' V',ser:R.map(function(r,i){return ['R'+(i+1),o(r)]})},fin:{vals:R.map(function(r){return fmt(I*r)+' V'}),center:'I = '+fmt(I)+' A',I:I,pw:R.map(function(r){return I*I*r}),info:R.map(function(r,i){return 'R'+(i+1)+' = '+o(r)+': tensão '+fmt(I*r)+' V, corrente '+fmt(I)+' A, potência '+fmt(I*I*r)+' W.'})},
 steps:[st('Qual é a resistência equivalente do circuito?','Req','Ω',Rq,'Em série, as resistências se somam.','Req = '+R.join(' + ')),
 st('Qual é a corrente que circula no circuito?','I','A',I,'Lei de Ohm com a tensão da fonte e a resistência equivalente.','I = V / Req = '+V+' / '+Rq),
 st('Qual é a tensão sobre o resistor R2?','V2','V',I*R[1],'A mesma corrente passa por todos os resistores. Multiplique pela resistência de R2.','V2 = I · R2 = '+fmt(I)+' · '+R[1]),
 st('Qual é a potência fornecida pela fonte?','P','W',V*I,'Potência é tensão vezes corrente.','P = V · I = '+V+' · '+fmt(I))]}}
function dcMisto(){var pr=pick([[20,30],[10,40],[30,60],[40,60],[15,30],[20,20],[12,24],[60,60]]),R1=pick([5,10,15,20,25]),V=pick([12,24,48,60,120]),R2=pr[0],R3=pr[1],Rp=R2*R3/(R2+R3),Rq=R1+Rp,I=V/Rq,Vp=I*Rp;
 return {tt:'Circuito misto em CC',txt:'Uma fonte de '+V+' V alimenta R1 = '+o(R1)+' em série com a associação em paralelo de R2 = '+o(R2)+' e R3 = '+o(R3)+'.',
 circ:{src:V+' V',ser:[['R1',o(R1)]],par:[['R2',o(R2)],['R3',o(R3)]]},fin:{vals:[fmt(I*R1)+' V'],par:[fmt(Vp/R2)+' A',fmt(Vp/R3)+' A'],center:'I = '+fmt(I)+' A',I:I,Ib:[Vp/R2,Vp/R3],pw:[I*I*R1,Vp*Vp/R2,Vp*Vp/R3],info:['R1 = '+o(R1)+': tensão '+fmt(I*R1)+' V, corrente '+fmt(I)+' A, potência '+fmt(I*I*R1)+' W.','R2 = '+o(R2)+': tensão '+fmt(Vp)+' V, corrente '+fmt(Vp/R2)+' A, potência '+fmt(Vp*Vp/R2)+' W.','R3 = '+o(R3)+': tensão '+fmt(Vp)+' V, corrente '+fmt(Vp/R3)+' A, potência '+fmt(Vp*Vp/R3)+' W.']},
 steps:[st('Qual é a resistência equivalente do paralelo (R2 com R3)?','Rp','Ω',Rp,'Para dois resistores em paralelo, use produto sobre soma.','Rp = (R2 · R3) / (R2 + R3) = ('+R2+' · '+R3+') / '+(R2+R3)),
 st('Qual é a resistência equivalente total?','Req','Ω',Rq,'R1 está em série com o paralelo: some os dois.','Req = R1 + Rp = '+R1+' + '+fmt(Rp)),
 st('Qual é a corrente total fornecida pela fonte?','I','A',I,'Lei de Ohm com a resistência equivalente total.','I = V / Req = '+V+' / '+fmt(Rq)),
 st('Qual é a tensão sobre o paralelo?','Vp','V',Vp,'A corrente total passa pela resistência equivalente do paralelo.','Vp = I · Rp = '+fmt(I)+' · '+fmt(Rp)),
 st('Qual é a corrente no resistor R2?','I2','A',Vp/R2,'No paralelo, a tensão é a mesma. Aplique a Lei de Ohm em R2.','I2 = Vp / R2 = '+fmt(Vp)+' / '+R2)]}}
function cxConv(){var t=pick([[3,4],[6,8],[5,12],[8,6],[12,5],[4,3]]),k=pick([1,2,5,10]),a=t[0]*k,b=t[1]*k*pick([1,-1]),z={re:a,im:b},m=Math.hypot(a,b),ang=Math.atan2(b,a)/D,
 r=pick([10,20,50]),th=pick([30,45,60,120,-30,-45,-60]),w={re:r*Math.cos(th*D),im:r*Math.sin(th*D)};
 return {tt:'Retangular e polar',txt:'Dado z = '+cxs(z)+', ache o módulo e o ângulo. Depois, faça o caminho inverso com w = '+r+'∠'+th+'°.',
 diag:{t:'arg',pts:[{z:z,l:'z'},{z:w,l:'w'}]},leg:'z e w no plano complexo: módulo = comprimento da seta, ângulo = inclinação em relação ao eixo real.',
 steps:[st('Qual é o módulo de z?','|z|','',m,'Pitágoras: raiz da soma dos quadrados da parte real e da imaginária.','|z| = √('+a+'² + '+b+'²)'),
 st('Qual é o ângulo de z, em graus?','θ','°',ang,'Arco tangente de (parte imaginária / parte real). Observe o quadrante.','θ = arctg('+b+' / '+a+')',0.6),
 stc('Escreva w = '+r+'∠'+th+'° na forma retangular (a + jb).','w',w,'Parte real = r·cos θ e parte imaginária = r·sen θ.','w = '+r+'·cos('+th+'°) + j·'+r+'·sen('+th+'°)')]}}
function cxOps(){var r=function(){return pick([1,2,3,4,5,6,7,8,9])*pick([1,-1])},z1={re:Math.abs(r()),im:r()},z2={re:Math.abs(r()),im:r()},
 s={re:z1.re+z2.re,im:z1.im+z2.im},p={re:z1.re*z2.re-z1.im*z2.im,im:z1.re*z2.im+z1.im*z2.re},d=z2.re*z2.re+z2.im*z2.im,q={re:(z1.re*z2.re+z1.im*z2.im)/d,im:(z1.im*z2.re-z1.re*z2.im)/d};
 return {tt:'Operações com complexos',txt:'Dados z1 = '+cxs(z1)+' e z2 = '+cxs(z2)+', calcule as operações pedidas.',
 diag:{t:'arg',pts:[{z:z1,l:'z1'},{z:z2,l:'z2'},{z:s,l:'z1+z2'}]},leg:'As setas mostram z1, z2 e a soma.',
 steps:[stc('Escreva o conjugado de z1.','z1*',{re:z1.re,im:-z1.im},'O conjugado troca o sinal da parte imaginária.','z1* = '+z1.re+' − ('+z1.im+')j'),
 stc('Calcule z1 + z2.','z1+z2',s,'Some as partes reais entre si e as imaginárias entre si.','('+z1.re+' + '+z2.re+') + j('+z1.im+' + '+z2.im+')'),
 stc('Calcule z1 · z2.','z1·z2',p,'Use a distributiva e lembre que j² = −1.','(a·c − b·d) + j(a·d + b·c)'),
 stc('Calcule z1 / z2.','z1/z2',q,'Multiplique em cima e embaixo pelo conjugado de z2.','z1·conj(z2) / |z2|²')]}}
function circAC(V,f,items){return {ac:1,src:V+' V · '+f+' Hz',ser:items}}
function rlc(){var V=pick([110,127,220]),f=pick([50,60]),R=pick([10,15,20,30,40]),Lm=pick([20,40,50,80,100]),Cu=pick([50,100,150,200]),w=2*Math.PI*f,XL=w*Lm/1000,XC=1e6/(w*Cu),X=XL-XC,Z=Math.hypot(R,X),I=V/Z,ph=Math.atan2(X,R)/D,
 Zc={re:R,im:X},Ic={re:I*Math.cos(ph*D),im:-I*Math.sin(ph*D)},VL={re:-XL*Ic.im,im:XL*Ic.re};
 return {tt:'Circuito RLC em série',txt:'Um circuito RLC série é ligado a '+V+' V, '+f+' Hz, com R = '+o(R)+', L = '+Lm+' mH e C = '+Cu+' µF. Tome a tensão da fonte como referência angular (V∠0°).',
 circ:circAC(V,f,[['R',o(R)],['L',Lm+' mH'],['C',Cu+' µF']]),fin:{vals:[fmt(I*R)+' V',fmt(I*XL)+' V',fmt(I*XC)+' V'],center:'I = '+fmt(I)+' A',I:I,pw:[I*I*R,0,0],info:['R = '+o(R)+': tensão '+fmt(I*R)+' V (em fase com a corrente), potência '+fmt(I*I*R)+' W.','L = '+Lm+' mH: XL = '+o(XL)+', tensão '+fmt(I*XL)+' V (adiantada 90° da corrente), potência ativa 0 W.','C = '+Cu+' µF: XC = '+o(XC)+', tensão '+fmt(I*XC)+' V (atrasada 90° da corrente), potência ativa 0 W.']},
 diag:{t:'ph',V:V,I:I,phi:ph*D},leg:ph>0.5?'Circuito indutivo: a corrente está atrasada em relação à tensão.':ph<-0.5?'Circuito capacitivo: a corrente está adiantada em relação à tensão.':'Circuito em ressonância: tensão e corrente em fase.',
 steps:[stc('Quais são os complexos? Escreva a impedância complexa do indutor, ZL.','ZL',{re:0,im:XL},'O indutor é um imaginário puro positivo: ZL = jXL, com XL = 2·π·f·L (L em henry, ou seja, mH ÷ 1000).','ZL = j · 2π · '+f+' · '+Lm/1000,'Ω'),
 stc('Escreva a impedância complexa do capacitor, ZC.','ZC',{re:0,im:-XC},'O capacitor é um imaginário puro negativo: ZC = −jXC, com XC = 1 / (2·π·f·C) (C em farad, ou seja, µF ÷ 1.000.000).','ZC = −j / (2π · '+f+' · '+Cu+'e-6)','Ω'),
 stc('Escreva a impedância total Z = R + ZL + ZC.','Z',Zc,'Some os complexos: reais com reais (só o R) e imaginários com imaginários.','Z = '+R+' + j'+fmt(XL)+' − j'+fmt(XC),'Ω'),
 stc('Qual é a corrente complexa I? (tensão como referência, V∠0°)','I',Ic,'Divida V∠0° pela impedância Z. Na forma polar, divida os módulos e subtraia os ângulos.','I = '+V+'∠0° / ('+pol(Zc)+')','A'),
 stc('Qual é a tensão complexa no indutor, VL = I · ZL?','VL',VL,'Lei de Ohm com complexos. Na forma polar, multiplique os módulos e some os ângulos (ZL tem +90°).','VL = ('+pol(Ic)+') · ('+fmt(XL)+'∠90°)','V'),
 st('Qual é o fator de potência?','FP','',R/Z,'É o cosseno do ângulo de Z, ou a razão entre a parte real de Z e o módulo de Z.','FP = cos φ = R / |Z| = '+R+' / '+fmt(Z))]}}
function capCA(){var V=pick([110,127,220]),f=pick([50,60]),Cu=pick([10,20,47,100]),XC=1e6/(2*Math.PI*f*Cu),I=V/XC;
 return {tt:'Capacitor em CA',txt:'Um capacitor de '+Cu+' µF é ligado a uma fonte de '+V+' V, '+f+' Hz. Tome a tensão como referência (V∠0°).',
 circ:circAC(V,f,[['C',Cu+' µF']]),fin:{vals:[fmt(V)+' V'],center:'I = '+fmt(I)+' A',I:I,pw:[0],info:['C = '+Cu+' µF: XC = '+o(XC)+', tensão '+fmt(V)+' V, corrente '+fmt(I)+' A adiantada 90°, potência ativa 0 W.']},
 diag:{t:'ph',V:V,I:I,phi:-Math.PI/2},leg:'No capacitor, a corrente está 90° adiantada em relação à tensão.',
 steps:[stc('Quais são os complexos? Escreva a impedância complexa do capacitor, ZC.','ZC',{re:0,im:-XC},'O capacitor é um imaginário puro negativo: ZC = −jXC, com XC = 1 / (2·π·f·C), C em farad.','ZC = −j / (2π · '+f+' · '+Cu+'e-6)','Ω'),
 stc('Qual é a corrente complexa I = V / ZC?','I',{re:0,im:I},'Divida V∠0° por ZC (ângulo −90°). Os ângulos se subtraem: a corrente fica adiantada.','I = '+V+'∠0° / '+fmt(XC)+'∠−90° = '+fmt(I)+'∠90°','A'),
 st('Qual é a potência reativa Q do capacitor?','Q','VAr',V*I,'Em um elemento puramente reativo, Q = V · I.','Q = V · I = '+V+' · '+fmt(I))]}}
function fpCorr(){var Pu=pick([3,5.5,7.5,11]),eta=pick([0.85,0.88,0.9,0.92]),V=pick([127,220,380]),f=60,fp1=pick([0.7,0.75,0.8,0.82]),fp2=pick([0.92,0.95]),
 P=Pu/eta,S1=P/fp1,Q1=Math.sqrt(S1*S1-P*P),S2=P/fp2,Q2=Math.sqrt(S2*S2-P*P),Qc=Q1-Q2,Xc=V*V/(Qc*1000),C=1e6/(2*Math.PI*f*Xc);
 return {tt:'Correção do fator de potência',txt:'Um motor monofásico de '+fmt(Pu)+' kW (potência útil), rendimento '+fmt(eta*100)+'%, '+V+' V, '+f+' Hz, opera com FP '+fmt(fp1)+'. Deseja-se corrigir para '+fmt(fp2)+' com um banco de capacitores.',
 diag:{t:'tri',P:P,Q1:Q1,Q2:Q2,S1:S1,S2:S2,f1:fp1,f2:fp2},leg:'Triângulo de potências antes (laranja) e depois (azul). O capacitor fornece Qc e reduz o ângulo φ.',
 steps:[st('Qual é a potência ativa absorvida da rede?','P','kW',P,'A potência útil é menor que a absorvida por causa do rendimento.','P = Pútil / η = '+fmt(Pu)+' / '+eta),
 st('Qual é a potência aparente na situação 1?','S1','kVA',S1,'S = P / FP.','S1 = '+fmt(P)+' / '+fp1),
 st('Qual é a potência reativa na situação 1?','Q1','kVAr',Q1,'Triângulo de potências: Q = √(S² − P²).','Q1 = √('+fmt(S1)+'² − '+fmt(P)+'²)'),
 st('Qual é a potência aparente na situação 2?','S2','kVA',S2,'Mesma fórmula, com o FP desejado.','S2 = '+fmt(P)+' / '+fp2),
 st('Qual é a potência reativa na situação 2?','Q2','kVAr',Q2,'Q = √(S² − P²) com S2.','Q2 = √('+fmt(S2)+'² − '+fmt(P)+'²)'),
 st('Qual é a potência do banco de capacitores?','Qc','kVAr',Qc,'O capacitor tem que retirar a diferença entre o reativo de antes e o de depois.','Qc = Q1 − Q2 = '+fmt(Q1)+' − '+fmt(Q2)),
 st('Qual é a reatância capacitiva do banco?','Xc','Ω',Xc,'Xc = V² / Qc, com Qc em VAr (kVAr × 1000).','Xc = '+V+'² / '+fmt(Qc*1000)),
 st('Qual é a capacitância do banco?','C','µF',C,'C = 1 / (2·π·f·Xc). O resultado em farad é pequeno, converta para µF.','C = 1 / (2π · '+f+' · '+fmt(Xc)+')')]}}
function triPot(){var V=pick([127,220]),I=pick([10,15,20,25,30]),fp=pick([0.6,0.7,0.8,0.9]),S=V*I/1000,P=S*fp,Q=Math.sqrt(S*S-P*P);
 return {tt:'Triângulo de potências',txt:'Uma carga monofásica em '+V+' V consome '+I+' A, com fator de potência '+fp+' (atrasado).',
 diag:{t:'tri',P:P,Q1:Q,Q2:null,S1:S,f1:fp},leg:'Triângulo de potências da carga: P na base, Q na vertical e S na hipotenusa.',
 steps:[st('Qual é a potência aparente S?','S','kVA',S,'Tensão vezes corrente.','S = V · I = '+V+' · '+I),
 stc('Escreva a potência complexa S = P + jQ (em kVA).','S (complexa)',{re:P,im:Q},'Parte real: P = S·FP. Parte imaginária: Q = √(S² − P²), positiva em carga indutiva.','P = '+fmt(S)+' · '+fp+' = '+fmt(P)+' e Q = √('+fmt(S)+'² − '+fmt(P)+'²)','kVA'),
 st('Qual é o ângulo φ, em graus?','φ','°',Math.acos(fp)/D,'φ é o arco cosseno do fator de potência.','φ = arccos('+fp+')',0.6)]}}
var BR=[10,16,20,25,32,40,50,63,80,100,125],TAB=[[1.5,17.5],[2.5,24],[4,32],[6,41],[10,57],[16,76],[25,101],[35,125]],RHO=0.0172,SQ3=Math.sqrt(3);
function stx(){var s=st.apply(null,arguments);s.ex=1;return s}
function brk(i){return BR.filter(function(b){return b>=i})[0]}
function inf(n,r,v,i){return n+' = '+o(r)+': tensão '+fmt(v)+' V, corrente '+fmt(i)+' A, potência '+fmt(v*i)+' W.'}
function mag1(){var B=pick([0.2,0.4,0.5,0.8,1.2]),Ac=pick([100,200,250,400,500]),A=Ac/1e4;
 return {tt:'Fluxo magnético',txt:'Uma bobina tem área de '+Ac+' cm² e é atravessada perpendicularmente por um campo de densidade de fluxo B = '+B+' T.',
 steps:[st('Qual é a área em m²?','A','m²',A,'1 m² = 10.000 cm². Divida por 10.000.','A = '+Ac+' / 10000'),
 st('Qual é o fluxo magnético Φ, em mWb?','Φ','mWb',B*A*1000,'Φ = B · A (campo perpendicular). 1 Wb = 1000 mWb.','Φ = '+B+' · '+A+' = '+fmt(B*A)+' Wb')]}}
function mag2(){var N=pick([50,100,200,500]),dP=pick([2,4,5,10]),dt=pick([10,20,50,100]),e1=dP/dt;
 return {tt:'Lei de Faraday',txt:'Uma bobina de '+N+' espiras sofre uma variação de fluxo de '+dP+' mWb em '+dt+' ms.',
 steps:[st('Qual é a variação de fluxo por tempo (ΔΦ/Δt), em V?','ΔΦ/Δt','V',e1,'Divida a variação de fluxo (mWb) pelo tempo (ms). mWb/ms dá volts.','ΔΦ/Δt = '+dP+' / '+dt),
 st('Qual é a tensão induzida na bobina?','e','V',N*e1,'Lei de Faraday: multiplique pelo número de espiras. O sinal negativo da lei de Lenz só indica o sentido.','e = N · ΔΦ/Δt = '+N+' · '+fmt(e1))]}}
function mag3(){var B=pick([0.2,0.5,0.8,1]),I=pick([5,10,20,50]),Lc=pick([0.2,0.5,1]),th=pick([90,30,45,60]),F=B*I*Lc*Math.sin(th*D),d=pick([0.1,0.2,0.5]);
 return {tt:'Força sobre condutor',txt:'Um condutor de '+Lc+' m, com '+I+' A, está em um campo de B = '+B+' T, formando '+th+'° com as linhas de campo.',
 steps:[st('Qual é a força sobre o condutor?','F','N',F,'F = B · I · L · sen θ.','F = '+B+' · '+I+' · '+Lc+' · sen('+th+'°)'),
 st('Qual é o trabalho realizado se o condutor se desloca '+d+' m na direção da força?','W','J',F*d,'Trabalho é força vezes deslocamento.','W = '+fmt(F)+' · '+d)]}}
function mag4(){var N=pick([200,500,1000]),I=pick([0.5,1,2,5]),lc=pick([10,20,25,50]),Fm=N*I,H=Fm/(lc/100);
 return {tt:'Solenoide',txt:'Um solenoide com '+N+' espiras e comprimento de '+lc+' cm conduz '+I+' A (núcleo de ar, µ0 = 4π·10⁻⁷ H/m).',
 steps:[st('Qual é a força magnetomotriz?','Fmm','A·e',Fm,'Fmm = N · I.','Fmm = '+N+' · '+I),
 st('Qual é a intensidade de campo H, em A/m?','H','A/m',H,'H = N · I / ℓ, com ℓ em metros.','H = '+Fm+' / '+(lc/100)),
 st('Qual é a densidade de fluxo B, em mT?','B','mT',4*Math.PI*1e-7*H*1000,'B = µ0 · H. Multiplique por 1000 para mT.','B = 4π·10⁻⁷ · '+fmt(H)+' · 1000')]}}
function senoide(){var Vp=pick([100,170,220,311]),f=pick([50,60]),t=pick([1,2,3,4]),w=2*Math.PI*f,vt=Vp*Math.sin(w*t/1000);
 return {tt:'Valores da senoide',txt:'Uma tensão senoidal v(t) = '+Vp+'·sen(ωt) V tem frequência de '+f+' Hz.',diag:{t:'wave',Vp:Vp,f:f},leg:'Duas voltas da senoide. O tracejado mostra o valor eficaz, que é menor que o pico.',
 steps:[st('Qual é o período T, em ms?','T','ms',1000/f,'O período é o inverso da frequência. Multiplique por 1000 para ms.','T = 1000 / '+f),
 st('Qual é a velocidade angular ω, em rad/s?','ω','rad/s',w,'ω = 2·π·f.','ω = 2π · '+f),
 st('Qual é o valor eficaz da tensão?','Vef','V',Vp/Math.SQRT2,'Valor eficaz = valor de pico dividido por raiz de 2.','Vef = '+Vp+' / √2'),
 st('Qual é o valor médio de meio ciclo?','Vmed','V',2*Vp/Math.PI,'Média de meio ciclo = 2·Vp/π (cerca de 0,637·Vp).','Vmed = 2 · '+Vp+' / π'),
 st('Qual é o valor instantâneo em t = '+t+' ms?','v(t)','V',vt,'Calcule o ângulo ωt em radianos e use o seno (calculadora em radianos).','v = '+Vp+' · sen('+fmt(w*t/1000)+' rad)',0.5)]}}
function divTen(){var V=pick([12,24,48,120]),R1=pick(RV),R2=pick(RV),Rq=R1+R2,I=V/Rq,V2=V*R2/Rq;
 return {tt:'Divisor de tensão',txt:'Dois resistores em série, R1 = '+o(R1)+' e R2 = '+o(R2)+', são ligados a uma fonte de '+V+' V.',
 circ:{src:V+' V',ser:[['R1',o(R1)],['R2',o(R2)]]},fin:{vals:[fmt(I*R1)+' V',fmt(V2)+' V'],center:'I = '+fmt(I)+' A',I:I,pw:[I*I*R1,I*I*R2],info:[inf('R1',R1,I*R1,I),inf('R2',R2,V2,I)]},
 steps:[st('Qual é a tensão em R2, pelo divisor de tensão?','V2','V',V2,'A tensão se divide na proporção das resistências. R2 recebe a fatia R2/(R1+R2).','V2 = V · R2 / (R1 + R2) = '+V+' · '+R2+' / '+Rq),
 st('Qual é a tensão em R1?','V1','V',V-V2,'Kirchhoff: a soma das quedas de tensão é igual à tensão da fonte.','V1 = V − V2 = '+V+' − '+fmt(V2))]}}
function divCor(){var It=pick([2,3,6,10]),R1=pick([10,20,30,60]),R2=pick([10,20,40,60]),I1=It*R2/(R1+R2);
 return {tt:'Divisor de corrente',txt:'Uma corrente total de '+It+' A chega a dois resistores em paralelo: R1 = '+o(R1)+' e R2 = '+o(R2)+'.',
 steps:[st('Qual é a corrente em R1, pelo divisor de corrente?','I1','A',I1,'No paralelo, a corrente maior passa pela menor resistência: R1 recebe a fatia R2/(R1+R2).','I1 = I · R2 / (R1 + R2) = '+It+' · '+R2+' / '+(R1+R2)),
 st('Qual é a corrente em R2?','I2','A',It-I1,'Kirchhoff dos nós: as correntes dos ramos somam a corrente total.','I2 = I − I1 = '+It+' − '+fmt(I1)),
 st('Qual é a tensão sobre o paralelo?','V','V',I1*R1,'Os dois resistores têm a mesma tensão. Aplique Ohm em R1.','V = I1 · R1 = '+fmt(I1)+' · '+R1)]}}
function kirNos(){var a=pick([2,3,4,5]),b=pick([1,2,3,4]),c=pick([1,2,3]);
 return {tt:'Kirchhoff: lei dos nós',txt:'Em um nó chegam as correntes I1 = '+a+' A e I2 = '+b+' A. Saem do nó I3 = '+c+' A e uma corrente desconhecida I4.',
 steps:[st('Qual é a soma das correntes que chegam ao nó?','ΣI entra','A',a+b,'Some as correntes que entram.','I1 + I2 = '+a+' + '+b),
 st('Qual é a corrente I4 que sai?','I4','A',a+b-c,'Lei dos nós: a soma das correntes que entram é igual à das que saem.','I4 = (I1 + I2) − I3 = '+(a+b)+' − '+c)]}}
function thev(){var V=pick([12,24,48]),R1=pick([10,20,30]),R2=pick([20,30,60]),RL=pick([10,20,40]),Vt=V*R2/(R1+R2),Rt=R1*R2/(R1+R2),IL=Vt/(Rt+RL),Rp=R2*RL/(R2+RL),I=V/(R1+Rp),Vp=I*Rp;
 return {tt:'Teorema de Thévenin',txt:'Uma fonte de '+V+' V alimenta R1 = '+o(R1)+' em série com R2 = '+o(R2)+' em paralelo com a carga RL = '+o(RL)+'. Use Thévenin visto pela carga RL.',
 circ:{src:V+' V',ser:[['R1',o(R1)]],par:[['R2',o(R2)],['RL',o(RL)]]},fin:{vals:[fmt(I*R1)+' V'],par:[fmt(Vp/R2)+' A',fmt(Vp/RL)+' A'],center:'I = '+fmt(I)+' A',I:I,Ib:[Vp/R2,Vp/RL],pw:[I*I*R1,Vp*Vp/R2,Vp*Vp/RL],info:[inf('R1',R1,I*R1,I),inf('R2',R2,Vp,Vp/R2),inf('RL',RL,Vp,Vp/RL)]},
 steps:[st('Qual é a tensão de Thévenin (Vth), com RL retirada?','Vth','V',Vt,'Sem RL, R1 e R2 formam um divisor de tensão. Vth é a tensão em R2.','Vth = V · R2 / (R1 + R2) = '+V+' · '+R2+' / '+(R1+R2)),
 st('Qual é a resistência de Thévenin (Rth)?','Rth','Ω',Rt,'Desligue a fonte (curto-circuito). Vista pela carga, R1 fica em paralelo com R2.','Rth = (R1 · R2) / (R1 + R2) = ('+R1+' · '+R2+') / '+(R1+R2)),
 st('Qual é a corrente na carga RL?','IL','A',IL,'Circuito equivalente: Vth em série com Rth e RL.','IL = Vth / (Rth + RL) = '+fmt(Vt)+' / '+fmt(Rt+RL)),
 st('Qual é a tensão na carga RL?','VL','V',IL*RL,'Lei de Ohm na carga.','VL = IL · RL = '+fmt(IL)+' · '+RL)]}}
function wheat(){var R1=pick([10,20,30,100]),R2=pick([10,20,50,100]),R3=pick([20,40,60,200]),Rx=R2*R3/R1;
 return {tt:'Ponte de Wheatstone',txt:'Uma ponte de Wheatstone está equilibrada (tensão zero no detector) com R1 = '+o(R1)+', R2 = '+o(R2)+' e R3 = '+o(R3)+'. A condição de equilíbrio é R1/R2 = R3/Rx.',
 steps:[st('Qual é a razão R1/R2?','R1/R2','',R1/R2,'Divida R1 por R2.','R1/R2 = '+R1+' / '+R2),
 st('Qual é o valor da resistência desconhecida Rx?','Rx','Ω',Rx,'Do equilíbrio: Rx = R2 · R3 / R1.','Rx = '+R2+' · '+R3+' / '+R1)]}}
function fio(){var Lm=pick([20,30,50,80]),Sc=pick([1.5,2.5,4,6,10]),I=pick([10,16,20,25]),V=pick([127,220]),R=2*RHO*Lm/Sc,dV=R*I;
 return {tt:'Resistência do fio e queda de tensão',txt:'Uma carga de '+I+' A é ligada a '+V+' V por fio de cobre (ρ = 0,0172 Ω·mm²/m) de '+Sc+' mm², a '+Lm+' m de distância (considere ida e volta).',
 steps:[st('Qual é a resistência total do fio (ida e volta)?','R','Ω',R,'R = ρ · comprimento / seção. O comprimento é o dobro da distância.','R = 0,0172 · (2 · '+Lm+') / '+Sc),
 st('Qual é a queda de tensão no fio?','ΔV','V',dV,'Lei de Ohm na resistência do fio.','ΔV = R · I = '+fmt(R)+' · '+I),
 st('Qual é a queda de tensão percentual?','ΔV%','%',dV/V*100,'Divida a queda pela tensão da fonte e multiplique por 100.','ΔV% = '+fmt(dV)+' / '+V+' · 100'),
 st('Qual é a potência perdida no fio?','Pperda','W',R*I*I,'Efeito Joule: P = R · I².','P = '+fmt(R)+' · '+I+'²')]}}
function ener(){var ap=pick([['chuveiro',5500],['ar-condicionado',1500],['forno elétrico',2200],['ferro de passar',1200]]),h=pick([0.5,2,4,8]),tar=pick([0.8,0.9,1]),V=pick([127,220]),kd=ap[1]*h/1000;
 return {tt:'Consumo e custo de energia',txt:'Um '+ap[0]+' de '+ap[1]+' W, ligado a '+V+' V, funciona '+h+' h por dia durante 30 dias. A tarifa é R$ '+fmt(tar)+' por kWh.',
 steps:[st('Qual é a corrente do aparelho?','I','A',ap[1]/V,'Potência dividida pela tensão (carga resistiva).','I = '+ap[1]+' / '+V),
 st('Qual é a energia consumida por dia?','Edia','kWh',kd,'Energia = potência (em kW) vezes tempo (em h).','E = '+(ap[1]/1000)+' · '+h),
 st('Qual é a energia consumida em 30 dias?','Emês','kWh',kd*30,'Multiplique pelos 30 dias.','E = '+fmt(kd)+' · 30'),
 st('Qual é o custo no mês?','Custo','R$',kd*30*tar,'Energia do mês vezes a tarifa.','C = '+fmt(kd*30)+' · '+fmt(tar))]}}
function triY(){var VL=pick([220,380,440]),R=pick([10,20,22,30]),Vf=VL/SQ3,If=Vf/R;
 return {tt:'Trifásico em estrela',txt:'Três resistores de '+o(R)+' ligados em estrela em uma rede trifásica de tensão de linha '+VL+' V.',diag:{t:'s3'},leg:'As três tensões de fase, defasadas de 120°.',
 steps:[st('Qual é a tensão de fase?','Vf','V',Vf,'Em estrela, a tensão de linha é √3 vezes a de fase.','Vf = VL / √3 = '+VL+' / 1,732'),
 st('Qual é a corrente de fase?','If','A',If,'Ohm em cada resistor, com a tensão de fase.','If = Vf / R = '+fmt(Vf)+' / '+R),
 st('Qual é a corrente de linha?','IL','A',If,'Em estrela, a corrente de linha é igual à de fase.','IL = If = '+fmt(If)),
 st('Qual é a potência total?','P','W',3*Vf*If,'Some a potência das três fases: P = 3 · Vf · If.','P = 3 · '+fmt(Vf)+' · '+fmt(If))]}}
function triD(){var VL=pick([220,380,440]),R=pick([10,20,22,30]),If=VL/R;
 return {tt:'Trifásico em triângulo',txt:'Três resistores de '+o(R)+' ligados em triângulo em uma rede trifásica de tensão de linha '+VL+' V.',diag:{t:'s3'},leg:'As três tensões de fase, defasadas de 120°.',
 steps:[st('Qual é a tensão em cada resistor (tensão de fase)?','Vf','V',VL,'Em triângulo, cada carga fica ligada entre duas linhas: Vf = VL.','Vf = VL = '+VL),
 st('Qual é a corrente de fase?','If','A',If,'Ohm em cada resistor.','If = Vf / R = '+VL+' / '+R),
 st('Qual é a corrente de linha?','IL','A',SQ3*If,'Em triângulo, a corrente de linha é √3 vezes a de fase.','IL = √3 · If = 1,732 · '+fmt(If)),
 st('Qual é a potência total?','P','W',3*VL*If,'P = 3 · Vf · If.','P = 3 · '+VL+' · '+fmt(If))]}}
function tri3(){var VL=pick([220,380]),IL=pick([10,20,30,50]),fp=pick([0.8,0.85,0.9]),S=SQ3*VL*IL/1000,P=S*fp;
 return {tt:'Potência trifásica',txt:'Uma carga trifásica equilibrada em '+VL+' V (linha) consome '+IL+' A de linha, com FP '+fp+'.',diag:{t:'s3'},leg:'As três tensões de fase, defasadas de 120°.',
 steps:[st('Qual é a potência aparente?','S','kVA',S,'S = √3 · VL · IL (divida por 1000 para kVA).','S = 1,732 · '+VL+' · '+IL),
 st('Qual é a potência ativa?','P','kW',P,'P = S · FP.','P = '+fmt(S)+' · '+fp),
 st('Qual é a potência reativa?','Q','kVAr',Math.sqrt(S*S-P*P),'Q = √(S² − P²).','Q = √('+fmt(S)+'² − '+fmt(P)+'²)')]}}
function trf(){var V1=pick([220,380]),V2=pick([12,24,48,110]),S=pick([100,200,500,1000]),N1=pick([500,1000,2000]),eta=pick([0.9,0.95,0.98]),a=V1/V2;
 return {tt:'Transformador',txt:'Um transformador de '+V1+' V / '+V2+' V tem '+N1+' espiras no primário e alimenta uma carga resistiva de '+S+' W. Rendimento de '+fmt(eta*100)+'%.',
 steps:[st('Qual é a relação de transformação a = V1/V2?','a','',a,'A relação entre as tensões é a mesma das espiras.','a = '+V1+' / '+V2),
 st('Quantas espiras tem o secundário?','N2','espiras',N1/a,'N1/N2 = V1/V2, então N2 = N1 / a.','N2 = '+N1+' / '+fmt(a)),
 st('Qual é a corrente no secundário?','I2','A',S/V2,'Carga resistiva: I = P / V.','I2 = '+S+' / '+V2),
 st('Qual é a corrente no primário (transformador ideal)?','I1','A',S/V1,'A potência é a mesma dos dois lados: I1 = P / V1.','I1 = '+S+' / '+V1),
 st('Qual é a potência perdida no transformador?','Pperda','W',S/eta-S,'A potência absorvida é Psaída/η. A perda é a diferença.','Perda = '+S+' / '+eta+' − '+S)]}}
function mot1(){var f=pick([50,60]),p=pick([2,4,6,8]),ns=120*f/p,n=Math.round(ns*(1-pick([0.02,0.03,0.04,0.05]))),Pu=pick([1.5,3,5.5,7.5,11,15]),w=2*Math.PI*n/60;
 return {tt:'Motor: velocidade e conjugado',txt:'Um motor de indução de '+p+' polos, '+f+' Hz, gira a '+n+' rpm entregando '+fmt(Pu)+' kW no eixo.',
 steps:[st('Qual é a velocidade síncrona?','ns','rpm',ns,'ns = 120 · f / polos.','ns = 120 · '+f+' / '+p),
 st('Qual é o escorregamento, em %?','s','%',(ns-n)/ns*100,'s = (ns − n) / ns, vezes 100.','s = ('+ns+' − '+n+') / '+ns+' · 100'),
 st('Qual é a velocidade angular do eixo, em rad/s?','ω','rad/s',w,'ω = 2·π·n / 60, com n em rpm.','ω = 2π · '+n+' / 60'),
 st('Qual é o conjugado no eixo?','T','N·m',Pu*1000/w,'Potência = conjugado · ω, então T = P / ω (P em watts).','T = '+(Pu*1000)+' / '+fmt(w))]}}
function mot2(){var cv=pick([5,10,15,20,30]),VL=pick([220,380]),eta=pick([0.85,0.9,0.92]),fp=pick([0.8,0.85,0.88]),k=pick([6,7,8]),Pk=cv*0.7355,Pa=Pk/eta,In=Pa*1000/(SQ3*VL*fp);
 return {tt:'Motor: corrente e partida',txt:'Motor trifásico de '+cv+' cv, '+VL+' V, rendimento '+fmt(eta*100)+'%, FP '+fp+'. A corrente de partida direta é '+k+' vezes a nominal. (1 cv = 0,7355 kW)',
 steps:[st('Qual é a potência útil em kW?','Pu','kW',Pk,'Multiplique os cv por 0,7355.','Pu = '+cv+' · 0,7355'),
 st('Qual é a potência elétrica absorvida, em kW?','Pabs','kW',Pa,'Potência absorvida = útil / rendimento.','Pabs = '+fmt(Pk)+' / '+eta),
 st('Qual é a corrente nominal?','In','A',In,'Trifásico: P = √3 · VL · I · FP, então I = P / (√3 · VL · FP).','In = '+fmt(Pa*1000)+' / (1,732 · '+VL+' · '+fp+')'),
 st('Qual é a corrente de partida direta?','Ip','A',k*In,'Vezes a corrente nominal.','Ip = '+k+' · '+fmt(In)),
 st('Qual é a corrente de partida com chave estrela-triângulo?','IpYΔ','A',k*In/3,'Na estrela, a corrente de partida cai para um terço.','IpYΔ = '+fmt(k*In)+' / 3')]}}
function inst1(){var ap=pick([['chuveiro',5500,1],['ar-condicionado',2200,0.9],['forno elétrico',4400,1],['torneira elétrica',3500,1]]),V=pick([127,220]),Ib=ap[1]/(V*ap[2]),i=0;
 while(i<TAB.length-1&&TAB[i][1]<Ib)i++;var In=brk(Ib);while(i<TAB.length-1&&In>TAB[i][1])i++;var sc=TAB[i][0];
 return {tt:'Condutor e disjuntor',txt:'Circuito monofásico de '+V+' V para um '+ap[0]+' de '+ap[1]+' W (FP '+ap[2]+'). Tabela (método B1, PVC, 2 condutores): 1,5 mm² = 17,5 A; 2,5 = 24 A; 4 = 32 A; 6 = 41 A; 10 = 57 A; 16 = 76 A; 25 = 101 A. Disjuntores: 10, 16, 20, 25, 32, 40, 50, 63, 80 A.',
 steps:[st('Qual é a corrente de projeto Ib?','Ib','A',Ib,'Ib = P / (V · FP).','Ib = '+ap[1]+' / ('+V+' · '+ap[2]+')'),
 stx('Qual é a menor seção de condutor (em mm²) que suporta Ib? Use a tabela.','Seção','mm²',sc,'Escolha a menor seção cuja capacidade (Iz) seja maior ou igual a Ib.','Ib = '+fmt(Ib)+' A, então a seção é '+sc+' mm² (Iz = '+TAB[i][1]+' A)'),
 stx('Qual é o disjuntor adequado?','In','A',In,'Regra: Ib ≤ In ≤ Iz. Pegue o menor disjuntor padrão que seja maior ou igual a Ib.','Ib = '+fmt(Ib)+' A, e o disjuntor padrão seguinte é '+In+' A (≤ '+TAB[i][1]+' A)')]}}
function inst2(){var V=pick([127,220]),fd=pick([0.6,0.7,0.8]),cs=[['iluminação',pick([400,600,800])],['tomadas',pick([1500,2200,2500])],['chuveiro',pick([4400,5500,6800])],['ar-condicionado',pick([1200,1500,2200])]],Pt=cs.reduce(function(s,c){return s+c[1]},0),Pd=Pt*fd,Id=Pd/V;
 return {tt:'Quadro de cargas',txt:'Quadro de '+V+' V com os circuitos: '+cs.map(function(c){return c[0]+' '+c[1]+' W'}).join(', ')+'. Fator de demanda: '+fd+'. Disjuntores gerais: 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125 A.',
 steps:[st('Qual é a potência instalada total?','Pinst','W',Pt,'Some a potência de todos os circuitos.','P = '+cs.map(function(c){return c[1]}).join(' + ')),
 st('Qual é a demanda (potência considerada)?','Pdem','W',Pd,'Demanda = potência instalada · fator de demanda.','Pdem = '+Pt+' · '+fd),
 st('Qual é a corrente de demanda?','Idem','A',Id,'I = P / V (considere FP = 1).','I = '+fmt(Pd)+' / '+V),
 stx('Qual é o disjuntor geral?','In','A',brk(Id),'Escolha o menor disjuntor padrão maior ou igual à corrente de demanda.','Idem = '+fmt(Id)+' A, então o disjuntor é '+brk(Id)+' A')]}}
function inst3(){var a=pick([4,5,6,8]),b=pick([3,4,5]),E=pick([150,300,500]),Fl=pick([1600,2000,3000]),A=a*b,Ft=E*A/(0.6*0.8),N=Math.ceil(Ft/Fl);
 return {tt:'Iluminação (método dos lumens)',txt:'Uma sala de '+a+' m × '+b+' m precisa de '+E+' lux. Cada luminária fornece '+Fl+' lm. Fator de utilização 0,6 e fator de depreciação 0,8.',
 steps:[st('Qual é a área da sala?','A','m²',A,'Comprimento vezes largura.','A = '+a+' · '+b),
 st('Qual é o fluxo luminoso total necessário?','Φ','lm',Ft,'Φ = E · A / (u · d).','Φ = '+E+' · '+A+' / (0,6 · 0,8)'),
 stx('Quantas luminárias são necessárias? (arredonde para cima)','N','',N,'Divida o fluxo total pelo fluxo de cada luminária e arredonde para cima.','N = '+fmt(Ft)+' / '+Fl+' = '+fmt(Ft/Fl)+', arredondando, '+N)]}}
function led(){var Vc=pick([5,9,12]),Vl=pick([2,3.3]),I=pick([10,15,20]),R=(Vc-Vl)/(I/1000);
 return {tt:'Resistor para LED',txt:'Um LED de '+Vl+' V e '+I+' mA é ligado a uma fonte de '+Vc+' V com um resistor em série.',
 steps:[st('Qual é a tensão sobre o resistor?','VR','V',Vc-Vl,'A fonte se divide entre o LED e o resistor.','VR = '+Vc+' − '+Vl),
 st('Qual é o valor do resistor?','R','Ω',R,'Ohm com a corrente em ampères (mA ÷ 1000).','R = '+fmt(Vc-Vl)+' / '+(I/1000)),
 st('Qual é a potência dissipada no resistor, em mW?','P','mW',(I/1000)*(I/1000)*R*1000,'P = R · I². Multiplique por 1000 para mW.','P = '+fmt(R)+' · '+(I/1000)+'² · 1000')]}}
function ret(){var Ve=pick([12,24,127]),f=60,Vp=Ve*Math.SQRT2;
 return {tt:'Retificador',txt:'Uma fonte de '+Ve+' V eficazes, '+f+' Hz, alimenta um retificador (ignore a queda nos diodos).',
 steps:[st('Qual é a tensão de pico?','Vp','V',Vp,'Pico = eficaz · √2.','Vp = '+Ve+' · 1,414'),
 st('Qual é a tensão média na saída com retificador de meia onda?','Vdc','V',Vp/Math.PI,'Meia onda: Vdc = Vp / π.','Vdc = '+fmt(Vp)+' / π'),
 st('Qual é a tensão média com retificador de onda completa?','Vdc','V',2*Vp/Math.PI,'Onda completa: Vdc = 2·Vp / π.','Vdc = 2 · '+fmt(Vp)+' / π'),
 st('Qual é a frequência da ondulação na onda completa?','fr','Hz',2*f,'A onda completa tem o dobro da frequência da rede.','fr = 2 · '+f)]}}
function rc(){var R=pick([1000,2200,4700,10000]),Cu=pick([10,47,100]),V=pick([5,12]),tau=R*Cu*1e-6;
 return {tt:'Circuito RC',txt:'Um resistor de '+R+' Ω e um capacitor de '+Cu+' µF em série, ligados a '+V+' V (capacitor descarregado no início).',
 steps:[st('Qual é a constante de tempo τ, em ms?','τ','ms',tau*1000,'τ = R · C. Com C em farad, o resultado vem em segundos.','τ = '+R+' · '+Cu+'e-6 · 1000'),
 st('Qual é a tensão no capacitor depois de 1 τ?','Vc','V',V*(1-Math.exp(-1)),'Na carga, em t = τ o capacitor chega a 63,2% da tensão da fonte.','Vc = '+V+' · (1 − e⁻¹)'),
 st('Qual é a frequência de corte do filtro RC, em Hz?','fc','Hz',1/(2*Math.PI*tau),'fc = 1 / (2·π·R·C).','fc = 1 / (2π · '+fmt(tau)+')')]}}
function bin(){var a=Math.floor(Math.random()*200)+20,bs=a.toString(2),b=Math.floor(Math.random()*200)+20,bb=b.toString(2),tm=bs.split('').reverse().map(function(d,i){return d==='1'?Math.pow(2,i):0}).filter(Boolean).reverse().join(' + '),s2=stx('Converta o decimal '+b+' para binário. Digite só os dígitos 0 e 1.','bin','',Number(bb),'Divida por 2 repetidamente e anote os restos, lendo de baixo para cima.',b+' em binário = '+bb);s2.raw=bb;
 return {tt:'Sistemas de numeração',txt:'Conversões entre binário e decimal.',
 steps:[stx('Converta o binário '+bs+' para decimal.','dec','',a,'Cada dígito vale uma potência de 2, da direita para a esquerda: 1, 2, 4, 8, 16... Some onde há 1.',bs+' = '+tm+' = '+a),s2]}}
var T=[{n:'Corrente contínua',ic:'🔋',d:'Ohm, série, paralelo e potência',g:[dcSerie,dcMisto]},
 {n:'Números complexos',ic:'➕',d:'Retangular, polar e operações',g:[cxConv,cxOps]},
 {n:'CA: RLC e capacitores',ic:'〰️',d:'Impedâncias complexas, corrente e FP',g:[rlc,capCA]},
 {n:'Potência e fator de potência',ic:'💡',d:'P, Q, S, FP e banco de capacitores',g:[fpCorr,triPot]},
 {n:'Magnetismo',ic:'🧲',d:'Fluxo, Faraday, força e solenoide',g:[mag1,mag2,mag3,mag4]},
 {n:'Senoide (CA básica)',ic:'🌊',d:'Período, ω, eficaz, médio e instantâneo',g:[senoide]},
 {n:'Kirchhoff e teoremas',ic:'🧩',d:'Divisores, nós, Thévenin e ponte',g:[divTen,divCor,kirNos,thev,wheat]},
 {n:'Fios, energia e custo',ic:'💰',d:'Queda de tensão, perdas e kWh',g:[fio,ener]},
 {n:'Trifásico',ic:'🔺',d:'Estrela, triângulo e potência',g:[triY,triD,tri3]},
 {n:'Transformador e motores',ic:'⚙️',d:'Espiras, rpm, conjugado e partida',g:[trf,mot1,mot2]},
 {n:'Instalações elétricas',ic:'🏠',d:'Condutor, disjuntor, quadro e luz',g:[inst1,inst2,inst3]},
 {n:'Eletrônica e digital',ic:'🔌',d:'LED, retificador, RC e binário',g:[led,ret,rc,bin]}];

/* ---------- leitura das respostas ---------- */
function parseNum(s){var m=String(s).replace(/,/g,'.').replace(/−/g,'-').trim().match(/^[-+]?\s*\d*\.?\d+(?:e[-+]?\d+)?/i);return m?Number(m[0].replace(/\s/g,'')):NaN}
function parseCx(s){s=String(s).replace(/\s/g,'').replace(/,/g,'.').replace(/−/g,'-').replace(/°/g,'').replace(/i/g,'j');
 var p=s.match(/^([-+]?\d*\.?\d+)[∠<@]([-+]?\d*\.?\d+)$/);if(p){var r=+p[1],a=+p[2]*D;return {re:r*Math.cos(a),im:r*Math.sin(a)}}
 var t=s.match(/[-+]?[^-+]+/g);if(!t)return null;var re=0,im=0;
 for(var k=0;k<t.length;k++){var q=t[k];if(q.indexOf('j')>=0){var u=q.replace('j','');if(u===''||u==='+')u='1';else if(u==='-')u='-1';var v=Number(u);if(isNaN(v))return null;im+=v}else{var w=Number(q);if(isNaN(w))return null;re+=w}}
 return {re:re,im:im}}
function ansTxt(s){if(s.raw)return s.raw;return s.cx?cxs(s.a)+'  =  '+pol(s.a):fmt(s.a)+(s.u?' '+s.u:'')}

/* ---------- desenhos ---------- */
function setup(c,h){var dpr=window.devicePixelRatio||1,w=Math.max(220,c.parentNode.clientWidth-32);
 if(c._w!==w||c._h!==h){c.width=w*dpr;c.height=h*dpr;c.style.height=h+'px';c._w=w;c._h=h}
 var x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);return {x:x,w:w,h:h}}
function drawCircuit(c,s,fin,ts,done){
 var g=setup(c,fin?230:190),x=g.x,W=g.w,H=g.h,ink=col('--ink'),acc=col('--acc'),card=col('--card'),L=40,Rr=W-24,T=44,B=fin?H-62:H-40,my=(T+B)/2,n=s.ser.length,hp=!!s.par,xa=Rr-90,end=hp?xa:Rr,t=(ts||0)/1000,open=!!(fin&&s.open),sx=(L+end)/2;
 var ln=function(a,b,c2,d){x.beginPath();x.moveTo(a,b);x.lineTo(c2,d);x.stroke()};
 var F='"IBM Plex Sans",sans-serif',mx=fin&&fin.pw?Math.max.apply(null,fin.pw):0;
 c._hit=[];c._sw=fin?{x:sx,y:B,r:34}:null;c.style.cursor=fin?'pointer':'default';
 var bx=function(cx,cy,w,h,a,b,i){var sel=fin&&s.sel===i;x.fillStyle=card;x.fillRect(cx-w/2,cy-h/2,w,h);
  if(fin&&done&&mx>0&&!open&&fin.pw[i]>0){x.globalAlpha=0.4*fin.pw[i]/mx;x.fillStyle=acc;x.fillRect(cx-w/2,cy-h/2,w,h);x.globalAlpha=1}
  x.strokeStyle=sel?acc:ink;x.lineWidth=sel?3:2;x.strokeRect(cx-w/2,cy-h/2,w,h);x.lineWidth=2;x.strokeStyle=ink;
  x.fillStyle=ink;x.textAlign='center';x.font='600 11px '+F;x.fillText(a,cx,cy-2);x.font='11px '+F;x.fillText(b,cx,cy+11);c._hit.push({x:cx,y:cy,w:w,h:h,i:i})};
 var dots=function(pts,I){var len=[0],i;for(i=1;i<pts.length;i++)len.push(len[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  var tot=len[len.length-1],sp=16,off=s.ac?9*Math.sin(t*3.2):(t*Math.min(150,30+60*Math.sqrt(I)));
  x.fillStyle=acc;for(var d=((off%sp)+sp)%sp;d<tot;d+=sp){var k=1;while(k<len.length-1&&len[k]<d)k++;var u=(d-len[k-1])/(len[k]-len[k-1]);
   x.beginPath();x.arc(pts[k-1][0]+(pts[k][0]-pts[k-1][0])*u,pts[k-1][1]+(pts[k][1]-pts[k-1][1])*u,3,0,7);x.fill()}};
 x.lineWidth=2;x.strokeStyle=ink;x.fillStyle=ink;x.textAlign='center';x.font='11px '+F;
 ln(L,T,Rr,T);if(fin){ln(L,B,sx-22,B);ln(sx+22,B,Rr,B)}else ln(L,B,Rr,B);
 if(s.ac){ln(L,T,L,my-16);ln(L,my+16,L,B);x.beginPath();x.arc(L,my,16,0,7);x.stroke();x.font='18px sans-serif';x.fillText('~',L,my+6)}
 else{ln(L,T,L,my-5);ln(L,my+5,L,B);ln(L-14,my-5,L+14,my-5);x.lineWidth=4;ln(L-7,my+5,L+7,my+5);x.lineWidth=2}
 x.font='11px '+F;x.fillStyle=ink;x.textAlign='center';x.fillText(s.src,L+12,B+18);
 if(hp){ln(xa,T,xa,B);ln(Rr,T,Rr,B)}else ln(Rr,T,Rr,B);
 if(fin){
  x.fillStyle=ink;[-22,22].forEach(function(d){x.beginPath();x.arc(sx+d,B,3.5,0,7);x.fill()});
  x.strokeStyle=acc;x.lineWidth=3;if(open)ln(sx-22,B,sx+14,B-22);else ln(sx-22,B,sx+22,B);x.lineWidth=2;x.strokeStyle=ink;
  x.fillStyle=acc;x.font='600 11px '+F;x.fillText(open?'chave aberta (toque)':'chave fechada (toque)',sx,B+32);
  if(!open){var I=fin.I;
   if(hp){dots([[L,my-8],[L,T],[xa,T]],I);dots([[xa,T],[xa,B]],fin.Ib[0]);dots([[xa,T],[Rr,T],[Rr,B]],fin.Ib[1]);dots([[Rr,B],[xa,B]],fin.Ib[1]);dots([[xa,B],[L,B],[L,my+8]],I)}
   else dots([[L,my-8],[L,T],[Rr,T],[Rr,B],[L,B],[L,my+8]],I)}}
 var xs=[];s.ser.forEach(function(p,i){var cx=L+20+(end-L-40)*(i+1)/(n+1);xs.push(cx);bx(cx,T,48,30,p[0],p[1],i)});
 if(hp)s.par.forEach(function(p,k){bx(k?Rr:xa,my,44,40,p[0],p[1],n+k)});
 if(fin&&done){x.fillStyle=acc;x.font='600 12px '+F;
  (fin.vals||[]).forEach(function(v,i){x.textAlign='center';x.fillText(open?'0 V':v,xs[i],T+30)});
  x.textAlign='right';(fin.par||[]).forEach(function(v,k){x.fillText(open?'0 A':v,(k?Rr:xa)-8,my+40)});
  x.textAlign='center';x.font='600 14px '+F;x.fillText(open?'I = 0 A':fin.center,(L+end)/2,my+5)}}
function dPh(c,d,ts){
 var g=setup(c,240),x=g.x,W=g.w,H=g.h,acc=col('--acc'),cu=col('--cur'),mut=col('--mut'),line=col('--line');
 var th=ts/1000*Math.PI*0.5,phi=d.phi,R0=Math.min(H*0.36,W*0.2),cx=R0+26,cy=H/2-8,Lv=R0*0.9,Li=R0*0.6,wx=cx+R0+40,wl=W-wx-8,ppr=wl/(4*Math.PI);
 x.lineWidth=1;x.strokeStyle=line;x.beginPath();x.arc(cx,cy,R0,0,7);x.moveTo(cx-R0,cy);x.lineTo(cx+R0,cy);x.moveTo(cx,cy-R0);x.lineTo(cx,cy+R0);x.moveTo(wx,cy);x.lineTo(W-8,cy);x.stroke();
 var vx=cx+Lv*Math.cos(th),vy=cy-Lv*Math.sin(th),ia=th-phi,ix=cx+Li*Math.cos(ia),iy=cy-Li*Math.sin(ia);
 x.setLineDash([3,4]);x.strokeStyle=acc;x.beginPath();x.moveTo(vx,vy);x.lineTo(wx,vy);x.stroke();x.strokeStyle=cu;x.beginPath();x.moveTo(ix,iy);x.lineTo(wx,iy);x.stroke();x.setLineDash([]);
 x.lineWidth=3;[[acc,vx,vy,'V'],[cu,ix,iy,'I']].forEach(function(a){x.strokeStyle=a[0];x.fillStyle=a[0];x.beginPath();x.moveTo(cx,cy);x.lineTo(a[1],a[2]);x.stroke();x.beginPath();x.arc(a[1],a[2],5,0,7);x.fill();x.font='600 13px "IBM Plex Sans",sans-serif';x.textAlign='center';x.fillText(a[3],a[1]+(a[1]-cx)*0.12,a[2]+(a[2]-cy)*0.12+4)});
 x.lineWidth=2;x.strokeStyle=mut;x.beginPath();x.arc(cx,cy,R0*0.3,-th,-th+phi,phi<0);x.stroke();
 x.lineWidth=2.5;[[acc,Lv,0],[cu,Li,phi]].forEach(function(a){x.strokeStyle=a[0];x.beginPath();for(var px=0;px<=wl;px+=2){var y=cy-a[1]*Math.sin(th-a[2]-px/ppr);px?x.lineTo(wx+px,y):x.moveTo(wx+px,y)}x.stroke()});
 x.fillStyle=mut;x.font='13px "IBM Plex Sans",sans-serif';x.textAlign='left';x.fillText('V = '+fmt(d.V)+' V   I = '+fmt(d.I)+' A   φ = '+fmt(phi/D)+'°',8,H-6)}
function dTri(c,d){
 var g=setup(c,250),x=g.x,W=g.w,H=g.h,acc=col('--acc'),bad=col('--bad'),ink=col('--ink'),ox=44,oy=H-34,s=Math.min((W-ox-120)/d.P,(oy-34)/d.Q1),ex=ox+d.P*s,y1=oy-d.Q1*s,two=d.Q2!=null,y2=two?oy-d.Q2*s:oy;
 var ln=function(a,b,c2,e){x.beginPath();x.moveTo(a,b);x.lineTo(c2,e);x.stroke()};
 x.font='13px "IBM Plex Sans",sans-serif';x.lineWidth=2;x.strokeStyle=ink;ln(ox,oy,ex,oy);ln(ex,oy,ex,y2);
 if(two){x.strokeStyle=acc;x.lineWidth=5;x.globalAlpha=0.55;ln(ex,y2,ex,y1);x.globalAlpha=1;x.lineWidth=2}else{x.strokeStyle=ink;ln(ex,oy,ex,y1)}
 x.strokeStyle=bad;ln(ox,oy,ex,y1);x.beginPath();x.arc(ox,oy,60,-Math.atan2(d.Q1,d.P),0);x.stroke();
 if(two){x.strokeStyle=acc;ln(ox,oy,ex,y2);x.beginPath();x.arc(ox,oy,40,-Math.atan2(d.Q2,d.P),0);x.stroke()}
 x.fillStyle=ink;x.textAlign='center';x.fillText('P = '+fmt(d.P)+' kW',(ox+ex)/2,oy+20);
 x.textAlign='left';x.fillStyle=bad;x.fillText('Q = '+fmt(d.Q1)+' kVAr',ex+8,y1+4);x.fillText('S = '+fmt(d.S1)+' kVA',ex+8,y1-12);
 if(two){x.fillStyle=acc;x.fillText('Q2 = '+fmt(d.Q2)+' kVAr',ex+8,y2+4);x.textAlign='right';x.fillText('Qc = '+fmt(d.Q1-d.Q2)+' kVAr',ex-8,(y1+y2)/2+4)}
 x.textAlign='left';x.fillStyle=bad;x.fillText('φ = '+fmt(Math.atan2(d.Q1,d.P)/D)+'°',8,18);if(two){x.fillStyle=acc;x.fillText('φ2 = '+fmt(Math.atan2(d.Q2,d.P)/D)+'°',8,36)}}
function dArg(c,d){
 var g=setup(c,250),x=g.x,W=g.w,H=g.h,cx=W/2,cy=H/2,mx=1,my=1,cs=[col('--acc'),col('--cur'),col('--bad')],ink=col('--ink'),mut=col('--mut');
 d.pts.forEach(function(p){mx=Math.max(mx,Math.abs(p.z.re));my=Math.max(my,Math.abs(p.z.im))});var s=Math.min((W/2-70)/mx,(H/2-26)/my);
 x.lineWidth=1;x.strokeStyle=mut;x.beginPath();x.moveTo(8,cy);x.lineTo(W-8,cy);x.moveTo(cx,10);x.lineTo(cx,H-10);x.stroke();
 x.fillStyle=mut;x.font='12px "IBM Plex Sans",sans-serif';x.textAlign='left';x.fillText('Re',W-26,cy-6);x.fillText('Im',cx+6,18);
 d.pts.forEach(function(p,k){var ex=cx+p.z.re*s,ey=cy-p.z.im*s;x.strokeStyle=cs[k%3];x.fillStyle=cs[k%3];x.lineWidth=3;x.beginPath();x.moveTo(cx,cy);x.lineTo(ex,ey);x.stroke();x.beginPath();x.arc(ex,ey,5,0,7);x.fill();
  x.font='600 12px "IBM Plex Sans",sans-serif';x.textAlign=ex>=cx?'left':'right';x.fillText(p.l+' = '+cxs(p.z),ex+(ex>=cx?8:-8),ey+(ey>cy?14:-8))})}

function dWave(c,d){
 var g=setup(c,230),x=g.x,W=g.w,H=g.h,acc=col('--acc'),cu=col('--cur'),mut=col('--mut'),mid=H/2,A=H*0.36,ml=50,pw=W-ml-10,ve=d.Vp/Math.SQRT2;
 x.lineWidth=1;x.strokeStyle=col('--line');x.beginPath();x.moveTo(ml,mid);x.lineTo(ml+pw,mid);x.stroke();
 x.setLineDash([4,4]);x.strokeStyle=cu;[1,-1].forEach(function(s){var y=mid-s*A*ve/d.Vp;x.beginPath();x.moveTo(ml,y);x.lineTo(ml+pw,y);x.stroke()});x.setLineDash([]);
 x.lineWidth=2.5;x.strokeStyle=acc;x.beginPath();for(var i=0;i<=pw;i+=2){var y2=mid-A*Math.sin(i/pw*4*Math.PI);i?x.lineTo(ml+i,y2):x.moveTo(ml+i,y2)}x.stroke();
 x.fillStyle=mut;x.font='12px "IBM Plex Sans",sans-serif';x.textAlign='right';x.fillText('+'+d.Vp,ml-4,mid-A+4);x.fillText('−'+d.Vp,ml-4,mid+A+4);x.fillText('0',ml-4,mid+4);
 x.textAlign='left';x.fillStyle=acc;x.fillText('Vp = '+d.Vp+' V',ml+6,16);x.fillStyle=cu;x.fillText('Vef = '+fmt(ve)+' V (tracejado)',ml+6,32)}
function dS3(c,d,ts){
 var g=setup(c,230),x=g.x,W=g.w,H=g.h,cs=[col('--acc'),col('--cur'),col('--bad')],mid=H/2,A=H*0.36,pw=W-20,th=ts/1000*Math.PI*0.6;
 x.lineWidth=1;x.strokeStyle=col('--line');x.beginPath();x.moveTo(10,mid);x.lineTo(W-10,mid);x.stroke();
 [0,1,2].forEach(function(k){x.strokeStyle=cs[k];x.lineWidth=2.5;x.beginPath();for(var i=0;i<=pw;i+=2){var y=mid-A*Math.sin(th-i/pw*4*Math.PI-k*2.0944);i?x.lineTo(10+i,y):x.moveTo(10+i,y)}x.stroke();x.fillStyle=cs[k];x.font='600 12px "IBM Plex Sans",sans-serif';x.textAlign='left';x.fillText('fase '+'ABC'[k],12+k*64,16)})}
/* ---------- jogo ---------- */
var cur=null,S={pts:0,done:[0,0,0,0]};
try{var sv=JSON.parse(localStorage.getItem('estudo-eletro'));if(sv&&sv.done)S=sv}catch(e){}
function save(){try{localStorage.setItem('estudo-eletro',JSON.stringify(S))}catch(e){}}
function menu(){
 var lb=window.__lab,card=function(t,i,n,cl){return '<button class="mc'+cl+'" type="button" data-i="'+i+'"><span class="mi">'+t.ic+'</span><b>'+t.n+'</b><small>'+t.d+'</small><small>Resolvidos: '+n+'</small></button>'};
 $('menu').innerHTML='<p class="note">Pontos acumulados: <b>'+S.pts+'</b></p>'+(lb?'<h2>🔌 Laboratório de circuitos (animado)</h2><div class="menu">'+lb.MODES.map(function(t,i){return card(t,i,lb.ST.done[i]||0,' lbc')}).join('')+'</div>':'')+'<h2>📚 Exercícios por assunto</h2><div class="menu">'+T.map(function(t,i){return i?card(t,i,S.done[i]||0,''):''}).join('')+'</div>';
 Array.prototype.forEach.call(document.querySelectorAll('.mc'),function(b){b.addEventListener('click',function(){var i=Number(b.dataset.i);if(b.classList.contains('lbc'))lb.novo(i);else abrir(i)})})}
window.__estMenu=menu;
function abrir(i){cur={ti:i,p:pick(T[i].g)(),i:0,tries:0,done:false,seen:false};$('menu').hidden=true;$('game').hidden=false;$('res').hidden=true;$('chint').hidden=!(cur.p.circ&&cur.p.fin);$('cinfo').textContent='';
 $('pt').textContent=cur.p.tt;$('ptx').textContent=cur.p.txt;$('c1').style.display=cur.p.circ?'block':'none';render();window.scrollTo(0,0)}
function fb(m,k){var e=$('fb');if(e){e.textContent=m;e.className='fb '+(k||'')}}
function render(){
 var p=cur.p,n=p.steps.length,h='';
 p.steps.forEach(function(s,k){
  if(k<cur.i)h+='<div class="st ok">✔ <b>'+s.l+'</b> = '+ansTxt(s)+'</div>';
  else if(k===cur.i&&!cur.done)h+='<div class="st cur"><b>Etapa '+(k+1)+' de '+n+'</b><p>'+s.q+'</p><div class="ans"><input id="ai" autocomplete="off" aria-label="Sua resposta" placeholder="'+(s.cx?'ex.: 30+j40 ou 50∠53,1°':'sua resposta')+'"><span class="u">'+(s.u||'')+'</span><button class="btn" id="chk" type="button">Responder</button></div><div id="fb" class="fb"></div><details><summary>Dica</summary><div>'+s.h+'</div></details><details><summary>Fórmula com os seus números</summary><div>'+s.f+'</div></details><button class="btn alt" id="rev" type="button" hidden style="margin:4px 0 0">Ver resposta</button></div>'});
 $('steps').innerHTML=h;
 if(cur.done)return;
 $('chk').addEventListener('click',check);$('ai').addEventListener('keydown',function(e){if(e.key==='Enter')check()});$('rev').addEventListener('click',reveal);$('ai').focus({preventScroll:true})}
function next(){cur.i++;cur.tries=0;cur.seen=false;if(cur.i>=cur.p.steps.length)finish();else render()}
function check(){
 var s=cur.p.steps[cur.i],raw=$('ai').value,ok;
 if(s.cx){var z=parseCx(raw);if(!z)return fb('Formato não reconhecido. Use 30+j40 ou 50∠53,1°.','bad');ok=Math.hypot(z.re-s.a.re,z.im-s.a.im)<=Math.max(TOL*Math.hypot(s.a.re,s.a.im),0.05)}
 else{var v=parseNum(raw);if(isNaN(v))return fb('Digite um número.','bad');ok=s.ex?Math.abs(v-s.a)<1e-9:Math.abs(v-s.a)<=Math.max(TOL*Math.abs(s.a),s.at,1e-9)}
 if(ok){S.pts+=cur.tries===0?10:5;save();next()}
 else{cur.tries++;fb('Ainda não. Confira a unidade, o arredondamento e abra a dica se precisar.','bad');if(cur.tries>=2)$('rev').hidden=false}}
function reveal(){
 if(cur.seen)return next();
 var s=cur.p.steps[cur.i];cur.seen=true;fb('Resposta: '+ansTxt(s)+'. Conta: '+s.f,'good');$('rev').textContent='Próxima etapa'}
function finish(){
 cur.done=true;S.done[cur.ti]=(S.done[cur.ti]||0)+1;save();render();var p=cur.p;
 $('sum').innerHTML=p.steps.map(function(s){return '<div class="box"><small>'+s.l+'</small><b>'+ansTxt(s).split('  =  ')[0]+'</b></div>'}).join('');
 $('c2').style.display=p.diag?'block':'none';$('leg').textContent=p.leg||'';$('res').hidden=false;if(p.circ&&p.fin)$('chint').hidden=false;(p.circ?$('c1'):$('res')).scrollIntoView({behavior:'smooth'})}
$('back').addEventListener('click',sair);$('menu2').addEventListener('click',sair);$('again').addEventListener('click',function(){abrir(cur.ti)});
function sair(){cur=null;$('game').hidden=true;$('menu').hidden=false;menu();window.scrollTo(0,0)}
$('c1').addEventListener('click',function(e){
 if(!cur||!cur.p.circ||!cur.p.fin)return;var r=this.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top,s=cur.p.circ,c=this;
 if(c._sw&&Math.hypot(px-c._sw.x,py-c._sw.y)<c._sw.r){s.open=!s.open;$('cinfo').textContent=s.open?'Chave aberta: o circuito está interrompido e não circula corrente.':'Chave fechada: o circuito está funcionando.';return}
 (c._hit||[]).forEach(function(h){if(Math.abs(px-h.x)<=h.w/2&&Math.abs(py-h.y)<=h.h/2){s.sel=h.i;var cp=s.ser.concat(s.par||[])[h.i];$('cinfo').textContent=cur.done?cur.p.fin.info[h.i]:cp[0]+' = '+cp[1]+'.'}})});
function loop(ts){
 if(cur){if(cur.p.circ)drawCircuit($('c1'),cur.p.circ,cur.p.fin||null,ts,cur.done);
  if(cur.done&&cur.p.diag){var d=cur.p.diag;({ph:dPh,tri:dTri,arg:dArg,wave:dWave,s3:dS3})[d.t]($('c2'),d,ts)}}
 requestAnimationFrame(loop)}
$('theme').addEventListener('click',function(){var r=document.documentElement,d=r.getAttribute('data-theme')?r.getAttribute('data-theme')==='dark':matchMedia('(prefers-color-scheme:dark)').matches;r.setAttribute('data-theme',d?'light':'dark')});
menu();requestAnimationFrame(loop);
})();
