/* DongBook · 共用互動：進度條 / 回頂部 / scroll-spy / 手機卡片表 / 行動清單記進度 / 複製提示詞 / Mermaid 圖 */
(function(){
  "use strict";

  /* 進度條（動態插入，頁面不用放 markup）*/
  var bar=document.createElement('div'); bar.className='progressbar'; document.body.appendChild(bar);

  /* 回頂部按鈕 */
  var top=document.createElement('button'); top.className='totop'; top.type='button';
  top.setAttribute('aria-label','回到頂端'); top.textContent='↑'; document.body.appendChild(top);
  top.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});

  function onScroll(){
    var h=document.documentElement;
    var sc=h.scrollTop||document.body.scrollTop||0;
    var max=(h.scrollHeight-h.clientHeight)||1;
    bar.style.width=(sc/max*100)+'%';
    top.classList.toggle('show', sc>500);
  }
  window.addEventListener('scroll',onScroll,{passive:true}); onScroll();

  /* scroll-spy：捲到哪一章，第二層導覽自動高亮 */
  var r2=[].slice.call(document.querySelectorAll('.topnav .row.r2 a[href^="#"]'));
  var map={}; r2.forEach(function(a){ map[a.getAttribute('href').slice(1)]=a; });
  var secs=[]; Object.keys(map).forEach(function(id){var s=document.getElementById(id); if(s)secs.push(s);});
  if(window.IntersectionObserver && secs.length){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(!e.isIntersecting) return;
        var a=map[e.target.id]; if(!a) return;
        r2.forEach(function(x){x.classList.remove('here');});
        a.classList.add('here');
        /* 只橫向捲動導覽列本身，不影響頁面捲動 */
        var row=a.parentElement;
        row.scrollLeft = a.offsetLeft - row.clientWidth/2 + a.clientWidth/2;
      });
    },{rootMargin:'-45% 0px -50% 0px',threshold:0});
    secs.forEach(function(s){io.observe(s);});
  }

  /* 手機卡片式表格：只處理「第一列是完整表頭列（整列都是 th）」的表格，
     否則第一列其實是資料、拿來當標籤會出錯 → 那種就維持一般可橫捲表格 */
  [].slice.call(document.querySelectorAll('table')).forEach(function(t){
    var rows=t.rows; if(!rows || !rows.length) return;
    var headRow=rows[0];
    var allTh=headRow.cells.length>0 &&
      [].every.call(headRow.cells,function(c){return c.tagName==='TH';});
    if(!allTh) return;               // 沒有乾淨的表頭列就不卡片化
    var heads=[];
    for(var i=0;i<headRow.cells.length;i++) heads.push(headRow.cells[i].textContent.trim());
    headRow.classList.add('thr');
    for(var r=1;r<rows.length;r++){
      var cells=rows[r].cells;
      for(var c=0;c<cells.length;c++){ if(heads[c]) cells[c].setAttribute('data-label',heads[c]); }
    }
    t.classList.add('cardify');
  });

  /* 行動清單進度＋記住（key 前綴由 <body data-todo-prefix> 提供，全帳號唯一）*/
  var PREFIX=document.body.getAttribute('data-todo-prefix')||'';
  var boxes=[].slice.call(document.querySelectorAll('.todo input'));
  var prog=document.getElementById('prog');
  function upd(){var d=0;boxes.forEach(function(b){if(b.checked)d++});if(prog)prog.textContent=d+' / '+boxes.length;}
  boxes.forEach(function(b){
    try{ if(PREFIX && localStorage.getItem(PREFIX+b.dataset.k)==='1') b.checked=true; }catch(e){}
    b.addEventListener('change',function(){
      try{ if(PREFIX) localStorage.setItem(PREFIX+b.dataset.k, b.checked?'1':'0'); }catch(e){}
      upd();
    });
  });
  upd();

  /* 複製提示詞按鈕（AI 顧問頁）*/
  function fallbackCopy(text,done){
    try{var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
      document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);done();}catch(e){}
  }
  [].slice.call(document.querySelectorAll('.copy')).forEach(function(btn){
    btn.addEventListener('click',function(){
      var pre=btn.parentElement.querySelector('pre'); if(!pre) return;
      var text=pre.innerText;
      function done(){var o='複製提示詞';btn.textContent='✓ 已複製';btn.classList.add('done');
        setTimeout(function(){btn.textContent=o;btn.classList.remove('done');},1600);}
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(done,function(){fallbackCopy(text,done);});
      } else { fallbackCopy(text,done); }
    });
  });
})();

/* 溯源標記：點重點旁的「」浮出逐字稿原話；點別處或按 Esc 關閉。
   頁面有 CSP（禁行內事件），所以統一在這裡用事件委派處理。 */
(function(){
  if(!document.querySelector('.src-btn')) return;
  function closeAll(){
    [].slice.call(document.querySelectorAll('.src-pop:not([hidden])')).forEach(function(p){
      p.hidden=true; var b=p.previousElementSibling; if(b) b.setAttribute('aria-expanded','false');
    });
  }
  document.addEventListener('click',function(e){
    var t=e.target; if(!t || !t.closest) return;
    var btn=t.closest('.src-btn');
    if(btn){
      /* 行動清單的標記在 <label> 裡，不擋預設行為會順便把 checkbox 勾起來 */
      e.preventDefault(); e.stopPropagation();
      var pop=btn.nextElementSibling; if(!pop) return;
      var wasOpen=!pop.hidden; closeAll();
      if(!wasOpen){
        pop.hidden=false; btn.setAttribute('aria-expanded','true');
        /* 浮窗預設貼著標記左緣往右展開；超出視窗右邊就往左推，推過頭（手機、標記在右側）再拉回來，
           確保整個浮窗都在畫面內。不用「靠右對齊」那招——標記在左半邊時會整片飛出左邊。 */
        pop.style.left='0px';
        var vw=window.innerWidth, r=pop.getBoundingClientRect(), left=0;
        if(r.right>vw-8) left-= (r.right-(vw-8));
        pop.style.left=left+'px';
        r=pop.getBoundingClientRect();
        if(r.left<8){ left+=(8-r.left); pop.style.left=left+'px'; }
      }
      return;
    }
    if(t.closest('.src-pop')) return;   /* 在浮窗裡選字不要關 */
    closeAll();
  });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeAll(); });
})();

/* Mermaid 圖示化（心智圖/魚骨圖/產業鏈）：有 .mermaid 才從 CDN 載入；主題色改讀 :root，跟著換色走 */
(function(){
  if(!document.querySelector('.mermaid')) return;
  var cs=getComputedStyle(document.documentElement);
  function tok(name,fb){ return (cs.getPropertyValue(name)||'').trim() || fb; }
  var accent=tok('--accent','#e3b23c'), ink=tok('--ink','#2b3244'),
      card=tok('--card','#ffffff'), line=tok('--line','#e5e0d5'), bg=tok('--bg','#f7f4ee');
  var CFG={ startOnLoad:false, securityLevel:'loose', theme:'base',
    themeVariables:{
      fontFamily:"'Noto Sans TC',sans-serif", fontSize:'15px',
      primaryColor:card, primaryTextColor:ink, primaryBorderColor:line,
      lineColor:accent, tertiaryColor:bg, tertiaryTextColor:ink
    }};
  var s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.1/mermaid.min.js';
  s.onload=function(){ try{ window.mermaid.initialize(CFG); window.mermaid.run({querySelector:'.mermaid'}); }catch(e){ console.error('mermaid',e); } };
  s.onerror=function(){ document.querySelectorAll('.diagram').forEach(function(d){ d.style.display='none'; }); };
  document.head.appendChild(s);
})();
