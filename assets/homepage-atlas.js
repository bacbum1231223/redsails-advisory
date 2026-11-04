(()=>{
'use strict';
const STYLE_MARKUP='<link rel="stylesheet" href="assets/governance-atlas.css?v=experience-19"><link rel="stylesheet" href="assets/homepage-atlas.css?v=experience-19">';
const host=document.createElement('section');host.id='redsails-atlas-host';host.setAttribute('aria-label','RedSails Governance Atlas');
const root=host.attachShadow({mode:'open'});
root.innerHTML=STYLE_MARKUP+`<div class="atlas-shell" id="atlas-main">
 <div class="atlas-layout">
  <section class="atlas-intro" id="atlas-intro"></section>
  <section class="atlas-visual" aria-label="3D governance model">
   <div id="atlas-view-controls" class="atlas-view-controls"></div>
   <div id="atlas-stage" class="atlas-stage" tabindex="0" role="group">
    <canvas aria-hidden="true"></canvas><div id="atlas-nodes" class="atlas-nodes"></div>
    <span class="atlas-coordinate" aria-hidden="true">REDSAILS / GOVERNANCE ATLAS — 01</span>
   </div>
   <div id="atlas-scene-controls" class="atlas-scene-controls"></div><div id="atlas-selection" class="atlas-selection" role="group" aria-labelledby="atlas-selection-name"></div>
   <div id="atlas-story" class="atlas-story"></div>
  </section>
 </div>
 <section id="atlas-detail" class="atlas-detail" aria-labelledby="atlas-detail-title"></section>
 <aside id="atlas-note" class="atlas-note" style="margin-top:25px"></aside>
 <p id="atlas-status" class="atlas-status" role="status" aria-live="polite"></p>
 <a class="atlas-home-next" href="#service-intro"><span>REDSAILS / STRATEGIC ADVISORY</span><b></b></a>
</div>`;
let atlas,covered,scheduled=false;
function coverage(){scheduled=false;const r=host.getBoundingClientRect(),header=document.querySelector('.header')?.getBoundingClientRect().bottom||0,next=r.top<=header+1&&r.bottom>=innerHeight;document.body.classList.toggle('atlas-covers-viewport',next);if(next!==covered){covered=next;document.dispatchEvent(new CustomEvent('redsails:atlas-coverage',{detail:{covered:next}}));}}
function queueCoverage(){if(!scheduled){scheduled=true;requestAnimationFrame(coverage);}}
function sync(){const target=document.getElementById('top');if(!target)return;if(host.parentElement!==target)target.append(host);const lang=document.documentElement.lang==='en'?'en':'vi';host.lang=lang;root.querySelector('.atlas-home-next b').textContent=lang==='vi'?'Khám phá dịch vụ RedSails ↓':'Explore RedSails services ↓';if(!atlas)atlas=window.RedSailsGovernanceAtlas.mount(root,{embedded:true,lang});else{atlas.setLanguage(lang);atlas.refresh();}queueCoverage();}
root.addEventListener('click',e=>{if(e.target.closest('[data-home-brief]')){document.dispatchEvent(new CustomEvent('redsails:brief-open',{detail:{service:e.target.closest('[data-home-brief]').dataset.briefService}}));return;}if(e.target.closest('[data-home-services]')){e.preventDefault();root.querySelector('#atlas-detail')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});root.querySelector('#atlas-detail-title')?.focus({preventScroll:true});return;}if(e.target.closest('.atlas-home-next')){e.preventDefault();document.getElementById('service-intro')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}});
document.addEventListener('redsails:render',sync);
document.addEventListener('scroll',queueCoverage,{passive:true});window.addEventListener('resize',queueCoverage,{passive:true});new ResizeObserver(queueCoverage).observe(host);
sync();
})();
