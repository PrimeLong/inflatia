import{i as e,n as t}from"./rolldown-runtime-CNOWq4Kh.js";import{i as n,t as r}from"./react-B8XoyoxP.js";import{n as i,t as a}from"./typo-BOH6T4ws.js";function o(e,t){return{"--ds-paper":e.paper,"--ds-card":e.card,"--ds-card2":e.card2,"--ds-ink":e.ink,"--ds-ink2":e.ink2,"--ds-ink3":e.ink3,"--ds-rule":e.rule,"--ds-rule2":e.rule2,"--ds-ok":e.ok,"--ds-ok-ink":e.okInk,"--ds-ok-bg":e.okBg,"--ds-bad":e.bad,"--ds-bad-ink":e.badInk,"--ds-bad-bg":e.badBg,"--ds-ok-btn":e.okBtn||e.ok,"--ds-bad-btn":e.badBtn||e.bad,"--ds-gold":e.gold,"--ds-gold-soft":e.goldSoft,"--ds-blue":e.blue||e.selRule,"--ds-sel":e.sel,"--ds-sel-ink":e.selInk,"--ds-sel-rule":e.selRule,"--ds-warm-btn":e.warmBtn||e.selInk,"--ds-shade":e.shade,"--u":t||e.accent,"--ds-head":s.sans,"--ds-news":s.serif,"--ds-sans":s.sans,"--ds-mono":s.mono,colorScheme:e.isDark?`dark`:`light`}}var s,c,l,u,d,f,p,m,h,g,_,v,y,b,x,S,C,ee,te,w,ne,T,E,D,O,k,A,j,re,M,N,P,F,I,L,R;function z(){return(z=t((()=>{s={serif:`'PT Serif','Iowan Old Style','Palatino Linotype',Georgia,serif`,sans:`'PT Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif`,mono:`'PT Mono','SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace`},c={paper:{isDark:!1,paper:`#FFFAF3`,card:`#FFFFFF`,card2:`#FFF1E2`,ink:`#26201C`,ink2:`#5A5049`,ink3:`#6E645B`,rule:`#F1E4D3`,rule2:`#E2CBAE`,ok:`#147A45`,okInk:`#13693A`,okBg:`#E3F7EA`,bad:`#BF3A2B`,badInk:`#A3271A`,badBg:`#FFE9E4`,okBtn:`#147A45`,badBtn:`#D13B1F`,gold:`#9A6300`,goldSoft:`#F4B740`,sel:`#FFEAD6`,selInk:`#8A3E08`,selRule:`#F0883A`,warmBtn:`#C2490B`,blue:`#2A5FBF`,shade:`rgba(160,90,30,.14)`,accent:`#C2490B`},ink:{isDark:!0,paper:`#14181C`,card:`#1C2227`,card2:`#242B32`,ink:`#EEE7D7`,ink2:`#BDB5A5`,ink3:`#A29A8B`,rule:`#353D45`,rule2:`#4D5660`,ok:`#62B882`,okInk:`#AEE3C1`,okBg:`#1B3226`,bad:`#E2806F`,badInk:`#F4BCB2`,badBg:`#3A221E`,okBtn:`#2B7048`,badBtn:`#A23E32`,gold:`#D8B25A`,goldSoft:`#B8964A`,sel:`#3A2B1D`,selInk:`#F2DCBC`,selRule:`#C98A55`,blue:`#8FB3E0`,shade:`rgba(0,0,0,.45)`,accent:`#C98A55`}},l={scarcity:{place:`Мастерская`,building:`workshop`,color:`#4D7C0F`,region:`industry`,at:[306,576],note:`хлеб или станки`},"supply-demand":{place:`Рынок`,building:`market`,color:`#C2490B`,region:`capital`,at:[320,220],note:`кофе, мука и цены`},consumer:{place:`Универмаг`,building:`store`,color:`#B0198F`,region:`capital`,at:[785,300],note:`выбор покупателя`},elasticity:{place:`Кофейня`,building:`cafe`,color:`#C21E56`,region:`agri`,at:[440,180],note:`реакция на цену`},production:{place:`Завод`,building:`factory`,color:`#B25E00`,region:`industry`,at:[660,345],note:`труд и капитал`},costs:{place:`Пекарня`,building:`bakery`,color:`#9A6300`,region:`agri`,at:[715,505],note:`издержки и прибыль`},"competition-monopoly":{place:`Биржа`,building:`exchange`,color:`#C9372C`,region:`finance`,at:[610,590],note:`конкуренция и монополия`},monopolistic:{place:`Ярмарка`,building:`fair`,color:`#9B2C8F`,region:`agri`,at:[490,615],note:`похожие товары`},oligopoly:{place:`Картель`,building:`factory`,color:`#577A00`,region:`mining`,at:[425,530],note:`несколько крупных`},power:{place:`Парламент`,building:`ministry`,color:`#8C2337`,region:`capital`,at:[306,576],note:`власть и государство`},labor:{place:`Биржа труда`,building:`ministry`,color:`#A9561A`,region:`industry`,at:[212,462],note:`зарплаты и занятость`},household:{place:`Сберкасса`,building:`savings`,color:`#9E3D74`,region:`periphery`,at:[190,345],note:`доход, расход и копилка`},"market-failures":{place:`Порт`,building:`port`,color:`#D13B1F`,region:`port`,at:[585,180],note:`внешние эффекты и налоги`},gdp:{place:`Статуправление`,building:`tower`,color:`#A65A00`,region:`capital`,at:[330,445],note:`как считают ВВП`},"money-banks":{place:`Банк`,building:`bank`,color:`#8F6A00`,region:`finance`,at:[690,215],note:`деньги и кредит`},inflation:{place:`Гастроном`,building:`grocery`,color:`#C2304F`,region:`capital`,at:[800,175],note:`цены и корзина`},"is-lm":{place:`Казначейство`,building:`bank`,color:`#7A7000`,region:`capital`,at:[335,345],note:`ставка и выпуск`},"ad-as":{place:`Промзона`,building:`factory`,color:`#B83A1C`,region:`industry`,at:[450,290],note:`спрос и предложение в целом`},phillips:{place:`Профсоюз`,building:`ministry`,color:`#5E7E0E`,region:`industry`,at:[590,290],note:`инфляция и безработица`},policy:{place:`Центробанк`,building:`bank`,color:`#A3305E`,region:`capital`,at:[620,410],note:`ставка и бюджет`},growth:{place:`Электростанция`,building:`factory`,color:`#BF4E14`,region:`port`,at:[525,470],note:`модель Солоу`},"open-economy":{place:`Таможня`,building:`port`,color:`#A85A12`,region:`port`,at:[430,440],note:`курс и торговля`},"public-debt":{place:`Министерство`,building:`ministry`,color:`#B3123F`,region:`capital`,at:[440,365],note:`долг государства`},inequality:{place:`Рабочий квартал`,building:`store`,color:`#B0453A`,region:`periphery`,at:[535,370],note:`доходы и бедность`}},u={start:[[230,284],[245,215]]},d=e=>l[e]||{place:`Город`,building:`store`,color:`#6B4357`,region:`capital`,at:[496,372],note:``},f=e=>d(e).color,p={vermilion:`#D13B1F`,tangerine:`#C2490B`,amber:`#B25E00`,gold:`#9A6300`,leaf:`#4D7C0F`,olive:`#577A00`,raspberry:`#C21E56`,rose:`#C2304F`,fuchsia:`#B0198F`,plum:`#9B2C8F`,coral:`#C9372C`,garnet:`#B3123F`},m=p.garnet,h=e=>({isDark:e.isDark!==!1,paper:e.bg,card:e.panel,card2:e.panelAlt||e.panel,ink:e.text,ink2:e.muted,ink3:e.faint,rule:e.border,rule2:e.borderStrong||e.border,ok:e.teal,okInk:e.text,okBg:e.tealDim||e.panelAlt,bad:e.rust,badInk:e.text,badBg:e.rustDim||e.panelAlt,gold:e.gold,goldSoft:e.goldSoft,sel:e.sel||e.panelAlt,selInk:e.selText||e.text,selRule:e.selBorder||e.gold,shade:`rgba(0,0,0,.4)`,accent:e.gold}),g=e=>({bg:e.paper,bgVignette:e.paper,panel:e.card,panelAlt:e.card2,panelRaised:e.card,border:e.rule,borderStrong:e.rule2,hairline:e.rule,text:e.ink,muted:e.ink2,faint:e.ink3,paper:e.card2,paperText:e.ink,paperMuted:e.ink2,paperRule:e.rule2,gold:e.gold,goldSoft:e.gold,goldDim:`color-mix(in srgb, ${e.gold} 16%, transparent)`,ink:e.isDark?`#0E1114`:`#1C2125`,teal:e.ok,tealDim:e.okBg,rust:e.bad,rustDim:e.badBg,blue:e.blue||e.selRule,blueDim:`color-mix(in srgb, ${e.blue||e.selRule} 14%, ${e.card})`,sel:e.sel,selText:e.selInk,selBorder:e.selRule}),_={get:e=>{try{return localStorage.getItem(e)}catch{return null}},set:(e,t)=>{try{t==null?localStorage.removeItem(e):localStorage.setItem(e,t)}catch{}}},v=()=>_.get(`ems-learn-dark`)===`1`,y=[`chamber`],b=[`ink`,`slate`,`chamber`,`contrast`],x=()=>{let e=_.get(`ems-world-theme`);return b.includes(e)?e:v()?`ink`:`chamber`},S=e=>_.set(`ems-world-theme`,b.includes(e)?e:null),C=e=>{_.set(`ems-learn-dark`,e?`1`:null);let t=_.get(`ems-world-theme`);t&&y.includes(t)===!!e&&_.set(`ems-world-theme`,null)},ee=()=>v()?`learnDark`:`learn`,te=()=>v()?`ink`:`paper`,w=()=>_.get(`ems-learn-music`)===`1`,ne=()=>_.get(`ems-race-offer-off`)!==`1`,T=e=>_.set(`ems-race-offer-off`,e?null:`1`),E=e=>_.set(`ems-learn-music`,e?`1`:null),D=()=>{try{let e=JSON.parse(_.get(`ems-music-paused`)||`null`);return e&&typeof e.id==`string`?e:null}catch{return null}},O=e=>_.set(`ems-music-paused`,e&&e.id?JSON.stringify({id:e.id,offset:Math.max(0,Math.round((e.offset||0)*10)/10)}):null),k=()=>_.get(`ems-learn-sfx`)!==`0`,A=e=>_.set(`ems-learn-sfx`,e?null:`0`),j=()=>_.get(`ems-world-music`)===`1`,re=e=>_.set(`ems-world-music`,e?`1`:null),M={calm:`#3E7C6B`,boom:`#C2780B`,slump:`#4D5D86`,stag:`#8A6A3C`,crisis:`#B03A2E`,frost:`#3E86A8`,war:`#6B4A3A`,campaign:`#B0466B`,stabilization:`#3F6E9E`,authoritarian:`#5B4A7A`,totalitarian:`#4A4A4A`,wave:`#6A5AC0`},N=()=>{try{let e=JSON.parse(_.get(`ems-music-likes`)||`[]`);return Array.isArray(e)?e.filter(e=>typeof e==`string`).slice(0,200):[]}catch{return[]}},P=e=>{let t=N(),n=t.includes(e)?t.filter(t=>t!==e):[...t,e];return _.set(`ems-music-likes`,n.length?JSON.stringify(n):null),n},F=()=>_.get(`ems-world-sfx`)!==`0`,I=e=>_.set(`ems-world-sfx`,e?null:`0`),L=()=>{let e=parseFloat(_.get(`ems-world-volume`));return Number.isFinite(e)&&e>=0&&e<=1?e:.6},R=e=>_.set(`ems-world-volume`,String(e))})))()}function ie(e){let t=String(e||`/`).split(`/`).filter(Boolean).map(e=>{try{return decodeURIComponent(e)}catch{return e}});if(!t.length||t.length===1&&t[0]===`index.html`)return{tab:`path`,chapter:null};let n=W[t[0]];return!n||n===`path`?null:n===`book`?t.length<=2?{tab:n,chapter:t[1]||null}:null:t.length===1?{tab:n,chapter:null}:null}function ae({tab:e=`path`,chapter:t=null,page:n=null}={}){let r=U[e]||`/`,i=t||(n&&n.kind===`chapter`?n.id:null);return e===`book`&&i?`${r}/${encodeURIComponent(i)}`:r}function oe(e){return!e||e.tab!==`book`?null:e.chapter?e.page&&e.page.kind===`chapter`&&e.page.id===e.chapter?e.page:{kind:`chapter`,id:e.chapter}:e.page&&e.page.kind!==`chapter`?e.page:{kind:`toc`}}function se(e){let t=e.history,n=e.location,r=[],i=new Set,a=0,o=0,s=0,c=!1,l=null,u=()=>t.state&&t.state.ems?t.state:null,d=()=>`${n.pathname}${n.search||``}${n.hash||``}`,f=()=>{let t=e.document;if(!t||!t.querySelector)return;let r=`${n.origin||``}${n.pathname}`,i=t.querySelector(`link[rel="canonical"]`);i&&i.setAttribute(`href`,r);let a=t.querySelector(`meta[property="og:url"]`);a&&a.setAttribute(`content`,r)},p=(e,n,r)=>{r?t.replaceState(e,``,n):t.pushState(e,``,n),o=e.i,f()},m=()=>{let e=u();e?e.d?p({...e,d:0,top:null},d(),!0):o=e.i:p({ems:!0,i:0,d:0,top:null,page:null},d(),!0)};m(),f();try{t.scrollRestoration=`manual`}catch{}let h=()=>{let e=u()||{},t=ie(n.pathname);return{...t||{tab:`path`,chapter:null},known:!!t,page:e.page||null}},g=()=>{l=null;let e=s;s=0,c=!1,e>0&&t.go(-e)},_=(e,{replace:t=!1}={})=>{let r=u()||{i:o,d:0},i=`${ae(e)}${e.keepSearch&&n.search||``}`,a=e.page&&e.page.kind!==`toc`?e.page:null,l=i===`${n.pathname}${e.keepSearch&&n.search||``}`&&JSON.stringify(a)===JSON.stringify(r.page||null);if(l&&!r.d)return;let d=r.d>0;p({ems:!0,i:t||d||l?r.i:r.i+1,d:0,top:null,page:a},i,t||d||l),s=0,c=!1},v=e=>{a+=1;let t=`${Date.now().toString(36)}-${a}`;r.push({id:t,close:e});let n=u()||{i:o,page:null},i=s>0;return i&&--s,p({ems:!0,i:i?n.i:n.i+1,d:r.length,top:t,page:n.page||null},d(),i),t},y=t=>{let n=r.findIndex(e=>e.id===t);if(!(n<0)){if(s===0){let e=u();c=!!e&&e.d>0&&e.top===r[r.length-1].id}r.splice(n,1),c&&(s+=1,l??=e.setTimeout(g,0))}},b=()=>{let e=u();e||=(m(),u());let n=e.i<o;o=e.i;let a=!1;for(;r.length>e.d&&!a;){let e=r.pop();try{a=e.close()===!1}catch{}if(a){r.push(e);let t=u();p({ems:!0,i:t.i+1,d:r.length,top:e.id,page:t.page||null},d(),!1)}}if(!a&&e.d>r.length&&n&&e.i>0){t.back();return}f();let s=h();i.forEach(e=>e(s))};return e.addEventListener(`popstate`,b),{current:h,navigate:_,openLayer:v,closeLayer:y,subscribe:e=>(i.add(e),()=>i.delete(e)),depth:()=>r.length,back:()=>{let e=u();return e&&e.i>0?(t.back(),!0):!1},destroy:()=>{e.removeEventListener(`popstate`,b),l!=null&&e.clearTimeout(l)}}}function B(){return G||(G=typeof window>`u`||!window.history||!window.history.pushState?{current:()=>({tab:`path`,chapter:null,known:!0,page:null}),navigate:()=>{},openLayer:()=>null,closeLayer:()=>{},subscribe:()=>()=>{},depth:()=>0,back:()=>!1,destroy:()=>{}}:se(window),G)}function V(e,t){let n=(0,H.useRef)(t);n.current=t,(0,H.useEffect)(()=>{if(!e)return;let t=B().openLayer(()=>n.current?n.current():void 0);return()=>B().closeLayer(t)},[e])}var H,U,W,G;function K(){return(K=t((()=>{H=n(),U={path:`/`,book:`/book`,league:`/league`,shop:`/shop`,profile:`/profile`,world:`/world`,news:`/news`},Object.keys(U),W=Object.fromEntries(Object.entries(U).map(([e,t])=>[t.slice(1),e])),G=null})))()}function ce(e=typeof document<`u`?document:null){if(Q||!e)return;Q=!0;let t=new WeakMap;e.addEventListener(`pointerover`,e=>{if(e.pointerType&&e.pointerType!==`mouse`)return;let n=e.target&&e.target.closest?e.target.closest(Z):null;if(!n)return;let r=t.get(n)||{};r.timer||n.classList.contains(`ds-shining`)||r.until&&Date.now()<r.until||(r.timer=setTimeout(()=>{r.timer=null,n.isConnected&&n.matches(`:hover`)&&(n.classList.add(`ds-shining`),r.done=setTimeout(()=>{n.classList.remove(`ds-shining`),r.until=Date.now()+X.rest},X.run+80))},X.wait),t.set(n,r))}),e.addEventListener(`pointerout`,e=>{let n=e.target&&e.target.closest?e.target.closest(Z):null;if(!n||e.relatedTarget&&n.contains(e.relatedTarget))return;let r=t.get(n);r&&r.timer&&(clearTimeout(r.timer),r.timer=null)}),e.addEventListener(`animationend`,e=>{if(e.animationName!==`ds-shine`||!e.target.classList)return;e.target.classList.remove(`ds-shining`);let n=t.get(e.target);n&&(clearTimeout(n.done),n.until=Date.now()+X.rest)})}function le(){return q.useEffect(()=>{ce()},[]),(0,J.jsx)(`style`,{children:Y})}function ue({theme:e=`paper`,world:t=null,accent:n,page:r=!1,className:i=``,style:a,children:s,...l}){let u=t?h(t):c[e]||c.paper;return(0,J.jsxs)(`div`,{className:`ds ${u.isDark?`ds-dark`:``} ${r?`ds-page`:``} ${i}`,style:{...o(u,n),...a},"data-ds-theme":t?`world`:e,...l,children:[(0,J.jsx)(le,{}),s]})}function de({variant:e=`primary`,wide:t=!1,small:n=!1,icon:r=null,className:i,children:a,type:o=`button`,...s}){return(0,J.jsxs)(`button`,{type:o,className:$(`ds-btn`,e!==`primary`&&`ds-btn--${e}`,t&&`ds-btn--wide`,n&&`ds-btn--small`,i),...s,children:[r&&(0,J.jsx)(r,{size:n?15:18,"aria-hidden":`true`}),a]})}function fe({label:e,icon:t,size:n=24,className:r,...i}){return(0,J.jsx)(`button`,{type:`button`,className:$(`ds-icon-btn`,r),"aria-label":e,...i,children:(0,J.jsx)(t,{size:n,"aria-hidden":`true`})})}function pe({flat:e=!1,as:t=`div`,className:n,children:r,...i}){return(0,J.jsx)(t,{className:$(`ds-card`,e&&`ds-card--flat`,n),...i,children:r})}function me({icon:e,tone:t,title:n,text:r,right:i=null,className:a,disabled:o,...s}){return(0,J.jsxs)(`button`,{type:`button`,className:$(`ds-card`,`ds-card--button`,a),disabled:o,...s,children:[e&&(0,J.jsx)(`span`,{style:{width:44,height:44,borderRadius:12,background:t||`var(--u)`,color:`#fff`,display:`flex`,alignItems:`center`,justifyContent:`center`,flexShrink:0,boxShadow:`inset 0 0 0 2px rgba(255,255,255,.25)`},children:(0,J.jsx)(e,{size:22,"aria-hidden":`true`})}),(0,J.jsxs)(`span`,{style:{flex:1,minWidth:0},children:[(0,J.jsx)(`span`,{className:`ds-h3`,style:{display:`block`},children:n}),r&&(0,J.jsx)(`span`,{className:`ds-sub`,style:{fontSize:14},children:r})]}),i]})}function he({eyebrow:e,title:t,sub:n,level:r=1,look:a=r,children:o,className:s,...c}){let l=`h${r}`;return(0,J.jsxs)(`div`,{className:s,...c,children:[e&&(0,J.jsx)(`div`,{className:`ds-eyebrow`,style:{marginBottom:4},children:e}),(0,J.jsx)(l,{className:a===1?`ds-h1`:a===2?`ds-h2`:`ds-h3`,children:i(t)}),n&&(0,J.jsx)(`div`,{className:`ds-sub`,style:{fontSize:15,marginTop:4},children:i(n)}),o]})}function ge({on:e,label:t,onChange:n,...r}){return(0,J.jsx)(`button`,{type:`button`,role:`switch`,"aria-checked":e,"aria-label":t,className:`ds-toggle`,onClick:()=>n(!e),...r})}function _e({label:e,...t}){return(0,J.jsxs)(`label`,{className:`ds-label`,children:[e,(0,J.jsx)(`input`,{className:`ds-field`,...t})]})}function ve({ok:e,stamp:t,say:n=null,plain:r=!1,children:i,className:a,...o}){return(0,J.jsx)(`div`,{className:$(`ds-answer`,e?`ok`:`bad`,a),...o,children:(0,J.jsxs)(`div`,{style:{maxWidth:560,margin:`0 auto`},children:[n&&!t?(0,J.jsx)(`span`,{className:`ds-answer-say`,"data-testid":`infla-say`,children:n}):(0,J.jsx)(`span`,{className:r?`ds-answer-say`:`ds-answer-stamp`,children:t||(e?`Верно`:`Не совсем`)}),i]})})}function ye({label:e,onClose:t,children:n,testid:r,returnTo:i=null,...a}){V(!0,t);let o=q.useRef(null),s=q.useRef(t);s.current=t;let c=q.useRef(i);return c.current=i,q.useEffect(()=>{let e=o.current,t=document.activeElement;e&&!e.contains(document.activeElement)&&e.focus({preventScroll:!0});let n=t=>{if(t.key===`Escape`){t.stopPropagation(),s.current();return}if(t.key!==`Tab`)return;let n=[...e.querySelectorAll(we)].filter(e=>e.getClientRects().length);if(!n.length){t.preventDefault();return}let r=n[0],i=n[n.length-1],a=document.activeElement;t.shiftKey&&(a===r||a===e)?(t.preventDefault(),i.focus()):!t.shiftKey&&a===i&&(t.preventDefault(),r.focus())};return e.addEventListener(`keydown`,n),()=>{e.removeEventListener(`keydown`,n);let r=c.current&&c.current()||t;r&&r.isConnected&&r.focus&&r!==document.body&&r.focus({preventScroll:!0})}},[]),(0,J.jsx)(`div`,{className:`ds-sheet-back`,onClick:t,"data-testid":r?`${r}-back`:void 0,children:(0,J.jsx)(`div`,{className:`ds-sheet ds-rise`,role:`dialog`,"aria-modal":`true`,"aria-label":e,tabIndex:-1,ref:o,"data-testid":r,onClick:e=>e.stopPropagation(),...a,children:n})})}function be({back:e=null,title:t,right:n=null,main:r=!1}){return(0,J.jsxs)(`div`,{className:`ds-topbar`,children:[e,t&&(0,J.jsx)(r?`h1`:`div`,{className:`ds-topbar-title`,children:t}),n]})}function xe({tabs:e,active:t,onTab:n,onReselect:r=null,label:i=`Разделы`,children:a=null}){return(0,J.jsxs)(`nav`,{"aria-label":i,"data-testid":`bottom-nav`,className:`ds-nav`,children:[a,(0,J.jsx)(`div`,{className:`ds-nav-in`,children:e.map(e=>{let i=t===e.id,a=e.icon;return(0,J.jsxs)(`button`,{type:`button`,"aria-current":i?`page`:void 0,"data-tab":e.id,"data-nav-target":i||e.menu?void 0:`tab:${e.id}`,"aria-haspopup":e.menu?`menu`:void 0,"aria-expanded":e.menu?!!e.open:void 0,onClick:()=>{i?r&&r(e.id):n(e.id)},children:[(0,J.jsx)(a,{size:22,strokeWidth:i?2.2:1.7,"aria-hidden":`true`}),(0,J.jsxs)(`span`,{children:[e.label,e.lock&&(0,J.jsx)(`span`,{className:`ds-sr`,children:` — откроется позже`})]}),e.dot&&(0,J.jsx)(`i`,{className:`ds-nav-dot`,"aria-hidden":`true`}),e.lock&&(0,J.jsx)(`i`,{className:`ds-nav-lock`,"aria-hidden":`true`,"data-testid":`nav-lock`,children:(0,J.jsxs)(`svg`,{viewBox:`0 0 24 24`,width:`11`,height:`11`,fill:`none`,stroke:`currentColor`,strokeWidth:`2.6`,strokeLinecap:`round`,children:[(0,J.jsx)(`rect`,{x:`5`,y:`11`,width:`14`,height:`10`,rx:`2`}),(0,J.jsx)(`path`,{d:`M8 11V8a4 4 0 0 1 8 0v3`})]})})]},e.id)})})]})}var q,J,Y,X,Z,Q,$,Se,Ce,we;function Te(){return(Te=t((()=>{q=e(n(),1),z(),a(),K(),J=r(),Y=`
  .ds { background: var(--ds-paper); color: var(--ds-ink); font-family: var(--ds-sans); font-size: 16px; line-height: 1.5; -webkit-tap-highlight-color: transparent; --u-ink: color-mix(in srgb, var(--u) 80%, #000); }
  /* цвет юнита как текст — чуть темнее самого цвета: на светлых подложках контраст не ниже 4,5:1 */
  .ds.ds-dark { --u-ink: color-mix(in srgb, var(--u) 42%, #fff); }
  .ds *, .ds *::before, .ds *::after { box-sizing: border-box; }
  /* фон страницы — ровная бумага: подсветка сверху растягивалась на всю высоту длинной страницы
     (глава учебника) и гасла к низу видимыми полосами */
  /* высота — экран без полосы уведомления о памяти браузера, если она стоит в потоке над страницей (src/privacy.jsx) */
  .ds-page { min-height: calc(100vh - var(--ems-notice-h, 0px)); background-color: var(--ds-paper); }
  .ds :focus-visible { outline: 3px solid var(--ds-sel-rule); outline-offset: 2px; }

  /* типографика */
  .ds-h1 { font-family: var(--ds-head); font-weight: 700; font-size: 28px; line-height: 1.15; margin: 0; letter-spacing: -.015em; }
  .ds-h2 { font-family: var(--ds-head); font-weight: 700; font-size: 22px; line-height: 1.2; margin: 0; letter-spacing: -.01em; }
  .ds-h3 { font-family: var(--ds-head); font-weight: 700; font-size: 18px; line-height: 1.25; margin: 0; }
  .ds-eyebrow { font: 700 12px/1.3 var(--ds-sans); letter-spacing: .14em; text-transform: uppercase; color: var(--u-ink); }
  .ds-sub { color: var(--ds-ink2); }
  .ds-faint { color: var(--ds-ink3); }
  .ds-num { font-family: var(--ds-mono); font-variant-numeric: tabular-nums; }
  .ds-text { font-size: 17px; line-height: 1.55; }
  .ds-text p { margin: 0 0 10px; }
  .ds-rule { border: none; border-top: 1px solid var(--ds-rule); margin: 12px 0; }

  /* кнопка — объёмная: снизу кромка темнее цвета, нажатие опускает кнопку на её высоту */
  .ds-btn { --b: var(--u); --edge: color-mix(in srgb, var(--b) 68%, #000); position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 50px; padding: 12px 24px;
    border: none; border-radius: 14px; font: 700 16px/1.2 var(--ds-head); letter-spacing: .04em; text-transform: uppercase; color: #fff; background: var(--b); cursor: pointer;
    box-shadow: 0 4px 0 var(--edge); margin-bottom: 4px;
    transition: transform .08s ease, box-shadow .08s ease, filter .15s; }
  .ds-btn:hover:not(:disabled) { filter: brightness(1.06) saturate(1.05); }
  /* основная кнопка: при наведении по ней пробегает блик (в покое он за краем кнопки и не виден). Запускает
     его installShine ниже: только если мышь задержалась на кнопке, и, раз начавшись, блик доходит до
     конца — даже если мышь тут же ушла; провели мимо или туда-сюда — кнопка не мигает */
  .ds-btn:not(.ds-btn--ghost):not(.ds-btn--secondary)::after { content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
    background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, .3) 50%, transparent 65%) no-repeat; background-size: 250% 100%; background-position: 130% 0; }
  .ds-btn.ds-shining::after { animation: ds-shine .75s ease-out; }
  @keyframes ds-shine { from { background-position: 130% 0 } to { background-position: -30% 0 } }
  .ds-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 0 0 var(--edge); }
  /* «Мир» в тёмной теме: основная кнопка — светлое золото, на нём белый текст не читается — тёмная тушь */
  .ds.ds-dark[data-ds-theme="world"] .ds-btn:not(.ds-btn--secondary):not(.ds-btn--ghost):not(.ds-btn--ok):not(.ds-btn--bad):not(:disabled) { color: #1B1204; }
  .ds-btn:disabled { background: var(--ds-card2); color: var(--ds-ink3); box-shadow: 0 4px 0 var(--ds-rule2); cursor: default; }
  .ds-btn--secondary { background: var(--ds-card); color: var(--u-ink); box-shadow: inset 0 0 0 2px var(--ds-rule2), 0 4px 0 var(--ds-rule2); }
  .ds-btn--secondary:active:not(:disabled) { box-shadow: inset 0 0 0 2px var(--ds-rule2), 0 0 0 var(--ds-rule2); }
  .ds-btn--ghost { background: none; color: var(--u-ink); box-shadow: none; min-height: 40px; padding: 8px 10px; margin-bottom: 0; border-radius: 10px;
    font: 700 15px/1.3 var(--ds-sans); letter-spacing: 0; text-transform: none; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }
  .ds-btn--ghost:active:not(:disabled) { transform: none; box-shadow: none; }
  .ds-btn--ok { --b: var(--ds-ok-btn); }
  .ds-btn--bad { --b: var(--ds-bad-btn); }
  /* «Дальше» после ошибки — тёплый мандарин (не красный); в тёмной теме — светлая тушь выбора, текст тёмный */
  .ds-btn--warm { --b: var(--ds-warm-btn); }
  .ds-dark .ds-btn--warm { color: #2A1D05; }
  .ds-btn--wide { width: 100%; }
  .ds-btn--small { min-height: 38px; padding: 7px 16px; font-size: 13.5px; border-radius: 12px; box-shadow: 0 3px 0 var(--edge); margin-bottom: 3px; }
  .ds-btn--small:active:not(:disabled) { transform: translateY(3px); }
  .ds-btn--secondary.ds-btn--small { box-shadow: inset 0 0 0 2px var(--ds-rule2), 0 3px 0 var(--ds-rule2); }
  /* тихая кнопка остаётся тихой и маленькой: без объёмной кромки */
  .ds-btn--ghost.ds-btn--small { box-shadow: none; margin-bottom: 0; }
  .ds-btn--ghost.ds-btn--small:active:not(:disabled) { transform: none; opacity: .75; }
  .ds-icon-btn { background: none; border: none; color: var(--ds-ink2); width: 42px; height: 42px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
  .ds-icon-btn:hover { background: var(--ds-card2); }
  .ds-icon-btn { transition: background-color .15s, transform .1s; }
  .ds-icon-btn:active { transform: scale(.9); }

  /* карточка-документ, панель, строки */
  /* текст только для чтения с экрана: подписи к значкам и числам */
  .ds-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
  .ds-card { background: var(--ds-card); border: 2px solid var(--ds-rule); border-radius: 18px; padding: 16px;
    box-shadow: 0 2px 0 var(--ds-rule), 0 6px 18px -10px var(--ds-shade); }
  .ds-card--flat { box-shadow: 0 2px 0 var(--ds-rule); }
  .ds-card--button { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; font: inherit; color: inherit; cursor: pointer; margin: 10px 0; }
  .ds-card--button { transition: transform .15s ease, box-shadow .15s ease, border-color .15s; }
  .ds-card--button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 0 var(--ds-rule), 0 10px 22px -12px var(--ds-shade); }
  .ds-card--button:hover:not(:disabled) > span:first-child { animation: ds-wiggle .5s ease-in-out .25s; }
  .ds-card--button:active:not(:disabled) { transform: translateY(1px); }
  .ds-card--button:disabled { opacity: .6; cursor: default; }
  .ds-panel { background: var(--ds-card2); border-radius: 14px; padding: 12px 14px; }
  .ds-row { display: flex; justify-content: space-between; gap: 10px; font-size: 15px; padding: 6px 0; border-bottom: 1px dotted var(--ds-rule2); }
  .ds-row:last-child { border-bottom: none; }
  .ds-row > span:first-child { color: var(--ds-ink2); }
  .ds-row > b { font-family: var(--ds-mono); font-weight: 700; }
  .ds-badge { display: inline-flex; align-items: center; gap: 4px; font: 700 12px/1 var(--ds-sans); letter-spacing: .06em; text-transform: uppercase; padding: 5px 9px; border: none; border-radius: 999px;
    color: var(--u-ink); background: color-mix(in srgb, var(--u) 12%, var(--ds-card)); }

  /* варианты ответа, плитки, клавиши */
  .ds-opt { display: block; width: 100%; text-align: left; padding: 13px 16px; margin: 8px 0; font: 16px/1.45 var(--ds-sans); color: var(--ds-ink);
    background: var(--ds-card); border: 2px solid var(--ds-rule2); border-radius: 14px; cursor: pointer; transition: border-color .12s, background .12s, transform .06s, box-shadow .06s;
    --edge: var(--ds-rule2); box-shadow: 0 3px 0 var(--edge); }
  /* нажатие только сдвигает плитку и прячет кромку — размеры не меняются, соседи не прыгают
     (раньше утоньшалась нижняя рамка: в шторке, прижатой к низу, от этого «проседали» кнопки выше) */
  .ds-opt:hover:not(:disabled) { background: color-mix(in srgb, var(--u) 4%, var(--ds-card)); }
  .ds-opt:active:not(:disabled) { transform: translateY(2px); box-shadow: 0 1px 0 var(--edge); }
  .ds-opt[aria-pressed="true"], .ds-opt[aria-checked="true"] { --edge: color-mix(in srgb, var(--u) 75%, var(--ds-card)); border-color: var(--edge); background: color-mix(in srgb, var(--u) 11%, var(--ds-card)); color: var(--ds-ink); }
  .ds-opt.right { --edge: var(--ds-ok); border-color: var(--ds-ok); background: var(--ds-ok-bg); color: var(--ds-ink); }
  .ds-opt.wrong { --edge: var(--ds-sel-rule); border-color: var(--ds-sel-rule); background: color-mix(in srgb, var(--ds-sel-rule) 12%, var(--ds-card)); color: var(--ds-ink); }
  /* верно/неверно видно не только по цвету: значок справа (вместо пунктирной рамки) */
  .ds-opt.right, .ds-opt.wrong { position: relative; padding-right: 40px; }
  .ds-opt.right::after, .ds-opt.wrong::after { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font: 700 18px/1 var(--ds-sans); }
  .ds-opt.right::after { content: '✓'; color: var(--ds-ok); }
  .ds-opt.wrong::after { content: '✕'; color: var(--ds-sel-ink); }
  .ds-opt:disabled { cursor: default; }
  .ds-chip { display: inline-flex; align-items: center; justify-content: center; gap: 4px; min-width: 44px; padding: 8px 13px; margin: 4px; font: 15px/1.3 var(--ds-sans); color: var(--ds-ink);
    background: var(--ds-card); border: 2px solid var(--ds-rule2); border-radius: 12px; cursor: pointer; --edge: var(--ds-rule2); box-shadow: 0 2px 0 var(--edge); transition: transform .06s, box-shadow .06s; }
  .ds-chip:active:not(:disabled) { transform: translateY(2px); box-shadow: 0 0 0 var(--edge); }
  .ds-chip[aria-pressed="true"], .ds-opt[aria-pressed="true"], .ds-opt[aria-checked="true"] { animation: ds-pop .26s cubic-bezier(.3,1.6,.5,1); }
  .ds-chip[aria-pressed="true"] { --edge: color-mix(in srgb, var(--u) 75%, var(--ds-card)); border-color: var(--edge); background: color-mix(in srgb, var(--u) 11%, var(--ds-card)); color: var(--ds-ink); }
  .ds-chip.right { --edge: var(--ds-ok); border-color: var(--ds-ok); }
  .ds-key { padding: 13px 0; font: 20px var(--ds-mono); color: var(--ds-ink); background: var(--ds-card); border: 2px solid var(--ds-rule2); border-radius: 12px; cursor: pointer;
    box-shadow: 0 3px 0 var(--ds-rule2); transition: transform .06s, box-shadow .06s; }
  .ds-key:active:not(:disabled) { transform: translateY(2px); box-shadow: 0 1px 0 var(--ds-rule2); }

  /* поля и переключатели */
  .ds-field { width: 100%; padding: 12px 14px; font: 16px var(--ds-sans); color: var(--ds-ink); background: var(--ds-card); border: 2px solid var(--ds-rule2); border-radius: 12px; }
  .ds-field:focus { outline: none; border-color: var(--u); background: color-mix(in srgb, var(--u) 5%, var(--ds-card)); }
  .ds-label { display: block; font: 700 13px/1.3 var(--ds-sans); letter-spacing: .04em; color: var(--ds-ink2); margin-bottom: 14px; }
  .ds-label > input { margin-top: 6px; }
  .ds-toggle { width: 48px; height: 28px; border-radius: 14px; border: 1px solid var(--ds-rule2); background: var(--ds-card2); position: relative; cursor: pointer; flex-shrink: 0; }
  .ds-toggle { transition: background-color .2s ease, border-color .2s ease; }
  .ds-toggle::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: var(--ds-card); border: 1px solid var(--ds-rule2); transition: left .28s cubic-bezier(.3,1.5,.5,1), width .15s; }
  .ds-toggle:active::after { width: 24px; }
  .ds-toggle[aria-checked="true"]:active::after { left: 19px; }
  .ds-toggle[aria-checked="true"] { background: var(--u); border-color: var(--u); }
  .ds-toggle[aria-checked="true"]::after { left: 23px; }

  /* плашка ответа — яркая полоса снизу с отметкой */
  .ds-answer { padding: 14px 16px calc(14px + env(safe-area-inset-bottom)); border-top: 3px solid var(--ds-rule2); border-radius: 18px 18px 0 0; }
  .ds-answer.ok { background: var(--ds-ok-bg); border-top-color: var(--ds-ok); }
  /* после ошибки — тёплый нейтральный тон, а не красный (docs/mechanics.md, «Обратная связь») */
  .ds-answer.bad { background: color-mix(in srgb, var(--ds-sel-rule) 14%, var(--ds-card)); border-top-color: var(--ds-sel-rule); }
  .ds-answer-stamp { display: inline-block; font: 700 14px/1 var(--ds-head); letter-spacing: .1em; text-transform: uppercase; padding: 7px 12px 6px; border: 2.5px solid currentColor;
    border-radius: 999px; transform: rotate(-3deg); }
  .ds-answer.ok .ds-answer-stamp { color: var(--ds-ok-ink); }
  .ds-answer.bad .ds-answer-stamp { color: var(--ds-sel-ink); }
  .ds-answer-say { display: inline-block; font: 700 19px/1.3 var(--ds-head); animation: ds-stamp .32s ease-out 1 both; }
  /* на светлой плашке ответа — тёмные оттенки «верно/неверно»: контраст не ниже 4,5:1 */
  .ds-answer.ok .ds-answer-say { color: var(--ds-ok-ink); }
  .ds-answer.bad .ds-answer-say { color: var(--ds-sel-ink); }

  /* шторка снизу, верхняя панель, нижняя панель вкладок */
  .ds-sheet-back { position: fixed; inset: 0; z-index: 320; background: rgba(28,20,8,.48); display: flex; align-items: flex-end; justify-content: center; animation: ds-fade .2s ease-out; }
  .ds-sheet { width: 100%; max-width: 560px; background: var(--ds-card); border-radius: 24px 24px 0 0; padding: 18px 18px calc(18px + env(safe-area-inset-bottom));
    box-shadow: 0 -10px 30px rgba(60,30,0,.18); }
  .ds-topbar { display: flex; align-items: center; gap: 8px; min-height: 52px; }
  .ds-topbar-title { font: 700 17px/1.2 var(--ds-head); flex: 1; min-width: 0; margin: 0; }
  .ds-sheet:focus { outline: none; }
  .ds-nav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 120; background: var(--ds-card); border-top: 2px solid var(--ds-rule);
    padding-bottom: env(safe-area-inset-bottom); }
  .ds-nav-in { display: flex; max-width: 560px; margin: 0 auto; }
  .ds-nav button { flex: 1; min-width: 0; background: none; border: none; cursor: pointer; padding: 10px 2px 8px; display: flex; flex-direction: column; align-items: center; gap: 3px;
    color: var(--ds-ink3); font: 700 12px/1.1 var(--ds-sans); letter-spacing: .04em; position: relative; }
  .ds-nav button[aria-current="page"] { color: var(--u-ink); cursor: default; }
  @media (max-width: 380px) { .ds-nav button { font-size: 12px; letter-spacing: 0; } }
  .ds-nav button[aria-current="page"]::before { content: ''; position: absolute; top: 5px; width: 52px; height: 30px; border-radius: 10px; background: color-mix(in srgb, var(--u) 13%, transparent); }
  .ds-nav button > * { position: relative; }
  /* меню «⋯» над нижней панелью: выбор из двух — Мир или Профиль */
  .ds-nav .ds-more { position: absolute; bottom: calc(100% + 8px); right: max(8px, calc(50% - 272px)); z-index: 121; min-width: 200px; padding: 6px; display: flex; flex-direction: column; gap: 2px;
    background: var(--ds-card); border: 2px solid var(--ds-rule); border-radius: 16px; box-shadow: 0 12px 30px rgba(60, 30, 0, .18); }
  .ds-nav .ds-more button { flex: none; flex-direction: row; justify-content: flex-start; gap: 12px; padding: 12px 14px; min-height: 48px; border-radius: 12px; color: var(--ds-ink); font: 700 15.5px var(--ds-sans); letter-spacing: 0; cursor: pointer; }
  .ds-nav .ds-more button:hover, .ds-nav .ds-more button:focus-visible { background: var(--ds-card2); }
  /* открытый пункт меню «Ещё» подсвечен: фон цвета юнита, полоска слева и «сейчас открыто» — подпись вкладки при этом не меняется */
  .ds-nav .ds-more button[aria-current="page"] { color: var(--u-ink); background: color-mix(in srgb, var(--u) 13%, var(--ds-card)); box-shadow: inset 4px 0 0 var(--u); }
  .ds-nav .ds-more button[aria-current="page"] small { color: var(--u-ink); font-weight: 700; }
  .ds-nav .ds-more button[aria-current="page"]::before { display: none; }
  .ds-nav .ds-more small { display: block; font: 400 12.5px var(--ds-sans); color: var(--ds-ink3); }
  .ds-nav .ds-more button > span { text-align: left; }
  .ds-nav .ds-more { animation: ds-more-in .2s cubic-bezier(.2,1.2,.4,1) both; transform-origin: 90% 100%; }
  .ds-nav .ds-more button { animation: ds-rise .25s ease-out both; }
  .ds-nav .ds-more button:nth-child(2) { animation-delay: .04s; } .ds-nav .ds-more button:nth-child(3) { animation-delay: .08s; }
  @keyframes ds-more-in { from { opacity: 0; transform: translateY(8px) scale(.94) } to { opacity: 1; transform: none } }
  /* новое за вкладкой: точка на значке и плашка в меню «⋯» */
  /* точка — поверх значка: у детей кнопки position: relative, и без «button >» точка уезжала под подпись, в нижний угол */
  .ds-nav button > .ds-nav-lock { position: absolute; top: 5px; left: calc(50% + 6px); width: 17px; height: 17px; border-radius: 50%; display: grid; place-items: center; background: var(--ds-card); color: var(--ds-ink2); box-shadow: 0 0 0 1.5px var(--ds-rule2); }
  .ds-nav button > .ds-nav-dot { position: absolute; top: 7px; left: calc(50% + 8px); width: 9px; height: 9px; border-radius: 50%; background: var(--ds-bad-btn); box-shadow: 0 0 0 2px var(--ds-card); }
  .ds-new { display: inline-block; margin-left: 6px; padding: 2px 7px; border-radius: 999px; background: var(--ds-bad-btn); color: #fff; font: 700 12px/1.3 var(--ds-sans); letter-spacing: .04em; vertical-align: 1px; }
  /* значок вкладки чуть подпрыгивает, когда её выбрали */
  .ds-nav button[aria-current="page"] > svg { animation: ds-tab-hop .32s cubic-bezier(.3,1.6,.5,1) both; }
  @keyframes ds-tab-hop { 0% { transform: translateY(0) scale(1) } 45% { transform: translateY(-3px) scale(1.1) } 100% { transform: none } }
  /* подложка выбранной вкладки выпрыгивает с пружинкой; точка «новое» мягко зовёт кольцом */
  .ds-nav button[aria-current="page"]::before { animation: ds-pill .42s cubic-bezier(.3, 1.5, .5, 1) backwards; }
  @keyframes ds-pill { from { opacity: 0; transform: scale(.45, .6) } }
  .ds-nav-dot::after { content: ''; position: absolute; inset: 0; border-radius: 50%; background: inherit; animation: ds-ping 2.2s cubic-bezier(0, 0, .2, 1) 1s infinite; }
  @keyframes ds-ping { 0% { transform: scale(1); opacity: .7 } 70%, 100% { transform: scale(2.6); opacity: 0 } }
  .ds-new { animation: ds-badge .5s cubic-bezier(.3, 1.6, .5, 1) .15s backwards; }
  @keyframes ds-badge { from { transform: scale(.3) rotate(-12deg); opacity: 0 } }
  .ds-icon-btn svg { transition: transform .25s cubic-bezier(.3, 1.4, .5, 1); }
  .ds-icon-btn:hover svg { transform: scale(1.1) rotate(-6deg); }
  .ds-nav button:active > svg { transform: scale(.88); }

  /* короткие анимации по делу */
  @keyframes ds-shake { 0%, 100% { transform: translateX(0) } 25% { transform: translateX(-6px) } 50% { transform: translateX(5px) } 75% { transform: translateX(-3px) } }
  @keyframes ds-rise { 0% { transform: translateY(14px); opacity: 0 } 100% { transform: translateY(0); opacity: 1 } }
  @keyframes ds-fade { from { opacity: 0 } to { opacity: 1 } }
  @keyframes ds-pop { 0% { transform: scale(1) } 45% { transform: scale(1.045) } 100% { transform: scale(1) } }
  @keyframes ds-wiggle { 0%, 100% { transform: rotate(0) } 30% { transform: rotate(-8deg) scale(1.06) } 65% { transform: rotate(5deg) } }
  @keyframes ds-stamp { 0% { transform: scale(1.7) rotate(-14deg); opacity: 0 } 60% { transform: scale(.94) rotate(-4deg); opacity: 1 } 100% { transform: scale(1) rotate(-4deg); opacity: 1 } }
  @keyframes ds-flash { 0% { box-shadow: inset 0 0 0 999px color-mix(in srgb, var(--ds-ok) 22%, transparent) } 100% { box-shadow: inset 0 0 0 999px transparent } }
  .ds-shake { animation: ds-shake .36s ease-in-out 1; }
  .ds-rise { animation: ds-rise .22s ease-out 1; }
  .ds-flash { animation: ds-flash .5s ease-out 1; }
  .ds-answer .ds-answer-stamp { animation: ds-stamp .32s ease-out 1 both; }
  @media (prefers-reduced-motion: reduce) {
    .ds, .ds *, .ds *::before, .ds *::after { animation: none !important; transition: none !important; }
  }
`,X={wait:220,run:750,rest:900},Z=`.ds-btn:not(.ds-btn--ghost):not(.ds-btn--secondary):not(:disabled)`,Q=!1,$=(...e)=>e.filter(Boolean).join(` `),Se=({className:e,children:t,...n})=>(0,J.jsx)(`div`,{className:$(`ds-panel`,e),...n,children:t}),Ce=({label:e,value:t,...n})=>(0,J.jsxs)(`div`,{className:`ds-row`,...n,children:[(0,J.jsx)(`span`,{children:e}),(0,J.jsx)(`b`,{children:t})]}),we=`button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])`})))()}export{w as A,O as B,M as C,te as D,g as E,d as F,R as G,re as H,ne as I,j as J,P as K,C as L,ee as M,N,z as O,D as P,E as R,c as S,u as T,I as U,T as V,S as W,x as X,F as Y,L as Z,K as _,_e as a,m as b,me as c,ye as d,xe as f,oe as g,Te as h,ue as i,k as j,v as k,Se as l,be as m,de as n,he as o,ge as p,f as q,pe as r,fe as s,ve as t,Ce as u,B as v,l as w,s as x,V as y,A as z};