(function(){
  var root=document.querySelector('.hbl-rc'); if(!root) return;
  var $=function(id){return document.getElementById(id);};
  var mg=$('rc-mg'), ml=$('rc-ml'), al=$('rc-al');
  function fmt(n,d){ if(!isFinite(n)) return '—'; var s=n.toLocaleString('en-US',{maximumFractionDigits:d}); return s; }
  function syncChips(){
    root.querySelectorAll('.rc-chips').forEach(function(g){
      var inp=$(g.getAttribute('data-for'));
      g.querySelectorAll('button').forEach(function(b){ b.setAttribute('aria-pressed', String(parseFloat(b.getAttribute('data-v'))===parseFloat(inp.value))); });
    });
  }
  function calc(){
    var m=parseFloat(mg.value), v=parseFloat(ml.value), a=parseFloat(al.value);
    var ok=m>0&&v>0, conc=ok?m/v:NaN;
    $('rc-o-conc').textContent = ok ? fmt(conc,3)+' mg/mL' : '—';
    $('rc-o-unit').textContent = ok ? fmt(conc*10,2)+' mcg' : '—';
    var hasA=ok&&a>0, vol=hasA?a/(conc*1000):NaN, units=vol*100;
    $('rc-o-vol').textContent = hasA ? fmt(vol,3)+' mL · '+fmt(units,1)+' units' : '—';
    $('rc-o-n').textContent = hasA ? fmt(Math.floor(m*1000/a+1e-9),0) : '—';
    $('rc-w-small').classList.toggle('on', hasA && units<2);
    $('rc-w-over').classList.toggle('on', hasA && units>100);
    $('rc-w-big').classList.toggle('on', ok && v>3);
    syncChips();
  }
  root.querySelectorAll('.rc-chips button').forEach(function(b){
    b.addEventListener('click',function(){ $(b.parentNode.getAttribute('data-for')).value=b.getAttribute('data-v'); calc(); });
  });
  [mg,ml,al].forEach(function(i){ i.addEventListener('input',calc); });
  // Deep-link presets, same format as the main calculator: #10mg-2ml-500mcg
  var h=(location.hash||'').match(/^#([\d.]+)mg-([\d.]+)ml(?:-([\d.]+)mcg)?$/i);
  if(h){ mg.value=h[1]; ml.value=h[2]; if(h[3]) al.value=h[3]; }
  calc();
})();
