(function(){
  const $ = (id)=>document.getElementById(id);
  const { makeProblem, formatNumber, nearlyEqual } = window.MathTrain;

  function parseNumber(input){
    const s = String(input).trim(); if(!s) return NaN;
    if (/^-?\d+\/-?\d+$/.test(s)){ const [a,b]=s.split('/').map(Number); if (b===0) return NaN; return a/b; }
    if (/^[\+\-]?\d*\.?\d+(e[\+\-]?\d+)?$/i.test(s)) return Number(s);
    if (/^[0-9\.\+\-\*\/\^\(\)\sπpie]+$/i.test(s)){
      let expr = s.replace(/π/gi, Math.PI).replace(/\be\b/g, Math.E).replace(/\^/g, '**');
      try{ const val = Function('"use strict"; return ('+expr+')')(); return typeof val==="number" && isFinite(val) ? val : NaN; }catch{ return NaN; }
    }
    return NaN;
  }

  function typeset(el){
    if (window.MathJax && MathJax.typesetPromise && window.__mjxReady){
      try{ if (MathJax.typesetClear){ MathJax.typesetClear([el]); } }catch(_){}
      MathJax.typesetPromise([el]).catch(()=>{});
    } else {
      (window.__mjxQueue || (window.__mjxQueue=[])).push(el);
    }
  }

  const state = { running:false, queue:[], total:10, index:0, current:null, skill:"mixed" };

  function startSession(skill){
    state.running=true; state.skill=skill; state.index=0; state.queue=[]; state.total = (skill==="mixed") ? 10 : 8;
    for (let i=0;i<state.total;i++){ state.queue.push(makeProblem(skill==="mixed" ? "mixed" : skill)); }
    document.querySelectorAll("#skills .card button").forEach(b=>b.disabled=true);
    $("session").classList.add("open");
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
    try{ window.scrollTo(0,0); }catch(_){ }
    nextProblem();
  }

  function endSession(){
    $("sessionBar").style.width = "100%";
    openFeedback(`Session complete — nice work!`, ()=>{
      document.querySelectorAll("#skills .card button").forEach(b=>b.disabled=false);
      $("session").classList.remove("open");
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    }, 'Finish');
  }

  function nextProblem(){
    if (window.MathJax && MathJax.typesetClear) { try{ MathJax.typesetClear([$("problemCard")]); }catch(_){} }
    if (state.index>=state.total){ endSession(); return; }
    const p = state.queue[state.index]; state.current = p;
    $("skillTag").textContent = p.skill.charAt(0).toUpperCase()+p.skill.slice(1);
    $("progressTag").textContent = `${state.index+1} / ${state.total}`;
    $("prompt").innerHTML = p.prompt;
    $("hint").style.display="none"; $("hint").innerHTML = p.hint || "";
    $("feedbackModal").classList.remove('open');
    $("sessionBar").style.width = Math.round((state.index/state.total)*100) + "%";
    const sessionEl = $("session"), cardEl = $("problemCard");
    try{ sessionEl.scrollTo({top:0, behavior:'instant'}); }catch(_){ try{ sessionEl.scrollTop = 0; }catch(__){} }
    try{ cardEl.scrollTo({top:0, behavior:'instant'}); }catch(_){ try{ cardEl.scrollTop = 0; }catch(__){} }
    $("instruction").textContent = "Choose the correct answer.";
    const area = $("mcqArea"); area.innerHTML="";
    p.choices.forEach((c,i)=>{
      const btn=document.createElement("button"); btn.className="secondary";
      const isMatrix = /\\\begin\{bmatrix\}|\\\begin\{pmatrix\}/.test(c);
      btn.innerHTML = isMatrix ? `\\\[${c}\\\]` : `\\(${c}\\)`;
      btn.addEventListener("click", ()=> checkMCQ(i));
      area.appendChild(btn);
    });
    $("mcqArea").style.display="grid"; $("inputArea").style.display="none";
    typeset($("problemCard"));
  }

  function openFeedback(html, onNext, nextLabel='Next'){
    const modal = $("feedbackModal");
    $("feedback").innerHTML = html;
    const nextBtn=$("nextFeedbackBtn"), closeBtn=$("closeFeedbackBtn");
    nextBtn.textContent = nextLabel;
    nextBtn.onclick = ()=>{ modal.classList.remove('open'); if (onNext) onNext(); };
    closeBtn.onclick = ()=>{ modal.classList.remove('open'); };
    modal.classList.add('open');
    typeset(modal);
  }

  function checkNumeric(){
    const p = state.current; if (!p) return; const val = parseNumber($("answerInput").value);
    const ok = nearlyEqual(val, p.answer);
    if (ok){ openFeedback(`✅ Correct! ${p.explain ? '<br>'+p.explain : ''}`, ()=>{ state.index++; nextProblem(); }); }
    else {
      state.queue.push(makeProblem(p.skill)); state.total++; $("progressTag").textContent = `${state.index+1} / ${state.total}`;
      openFeedback(`❌ Not quite. ${p.explain ? '<br>'+p.explain : ''}<br><span class=\"subtle\">Expected approximately ${formatNumber(p.answer)}.</span>`, null, 'Continue');
    }
  }

  function checkMCQ(idx){
    const p = state.current; if (!p) return; const correct = idx===p.correctIndex;
    if (correct){ openFeedback(`✅ Correct! ${p.explain ? '<br>'+p.explain : ''}`, ()=>{ state.index++; nextProblem(); }); }
    else {
      state.queue.push(makeProblem(p.skill)); state.total++; $("progressTag").textContent = `${state.index+1} / ${state.total}`;
      openFeedback(`❌ Not quite. ${p.explain ? '<br>'+p.explain : ''}`, null, 'Continue');
    }
  }

  document.querySelectorAll("#skills .card button").forEach(btn=>{ btn.addEventListener("click", ()=> startSession(btn.dataset.skill)); });
  $("hintBtn").addEventListener("click", toggleHint);
  $("skipBtn").addEventListener("click", ()=>{ state.index++; nextProblem(); });
  $("homeBtn").addEventListener("click", ()=>{
    state.running=false;
    document.querySelectorAll("#skills .card button").forEach(b=>b.disabled=false);
    $("session").classList.remove("open");
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
    try{ window.scrollTo(0,0); }catch(_){ }
  });
  $("session").addEventListener('click', (e)=>{
    if (e.target === $("session")) { $("homeBtn").click(); }
  });

  function toggleHint(){ const h=$("hint"); h.style.display = h.style.display==="none" ? "block" : "none"; typeset(h); }

  typeset(document.body);
})();
