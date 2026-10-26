const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const storageKey = 'finwise.activity.v1';
const formData = form => Object.fromEntries(new FormData(form).entries());
const formatINR = (n, compact=false) => {
  if (!Number.isFinite(n)) return '₹—';
  if (compact && n >= 10000000) return `₹${(n/10000000).toFixed(2)}Cr`;
  if (compact && n >= 100000) return `₹${(n/100000).toFixed(2)}L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};
const safeNumber = value => Number(value);
let toastTimer;
function toast(message){const node=$('#toast');node.textContent=message;node.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),2600)}
function getHistory(){try{return JSON.parse(localStorage.getItem(storageKey)||'[]')}catch{return []}}
function logActivity(type,title,detail,value=''){
  const entry={type,title,detail,value,at:new Date().toISOString()};
  const items=[entry,...getHistory()].slice(0,8);localStorage.setItem(storageKey,JSON.stringify(items));renderHistory();
  // The Sheets connector is optional and only receives the summary fields below.
  fetch('/.netlify/functions/store-record',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,title,detail,value,at:entry.at})}).catch(()=>{});
}
function renderHistory(){const items=getHistory(),host=$('#activityList');if(!host)return;if(!items.length){host.innerHTML='<div class="empty-state"><span>⌁</span><p>Your activity will show up here once you run a tool.</p></div>';return}host.innerHTML=items.map(x=>`<div class="activity-row"><span class="activity-symbol">${x.type==='EMI'?'▤':x.type==='Credit'?'◉':x.type==='AI'?'✳':'◫'}</span><div class="activity-main"><strong>${escapeHTML(x.title)}</strong><small>${escapeHTML(x.detail)} · ${new Date(x.at).toLocaleDateString()}</small></div><span class="activity-value">${escapeHTML(x.value||'')}</span></div>`).join('')}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const pages={overview:'Overview',eligibility:'Loan eligibility',credit:'Credit health',emi:'EMI calculator',insights:'AI insights'};
function navigate(page){if(!pages[page])return;$$('.page-section').forEach(n=>n.classList.toggle('active',n.id===`page-${page}`));$$('.nav-link[data-page]').forEach(n=>n.classList.toggle('active',n.dataset.page===page));$('#crumbCurrent').textContent=pages[page];history.replaceState(null,'',page==='overview'?'#overview':`#${page}`);$('#sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'smooth'})}
$$('.nav-link[data-page]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.page)));
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.go)));
$$('.tool-card').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.go)));
$('#menuBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
document.addEventListener('click',e=>{if(window.innerWidth<=760&&$('#sidebar').classList.contains('open')&&!$('#sidebar').contains(e.target)&&!$('#menuBtn').contains(e.target))$('#sidebar').classList.remove('open')});
const hash=location.hash.replace('#','');if(pages[hash])navigate(hash);
$('#todayLabel').textContent=`◷  ${new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric'}).format(new Date())}`;
$('#clearHistory').addEventListener('click',()=>{localStorage.removeItem(storageKey);renderHistory();toast('Activity history cleared')});
const dialog=$('#privacyDialog');$('#privacyBtn').addEventListener('click',()=>dialog.showModal());$('#settingsBtn').addEventListener('click',()=>dialog.showModal());$('#helpBtn').addEventListener('click',()=>dialog.showModal());$$('.dialog-close,.dialog-ok').forEach(b=>b.addEventListener('click',()=>dialog.close()));$('#deleteDataBtn').addEventListener('click',()=>{localStorage.removeItem(storageKey);renderHistory();dialog.close();toast('Local activity data deleted')});
renderHistory();
function showError(form,message){$('.form-error',form).textContent=message;return false}
function clearError(form){$('.form-error',form).textContent=''}
$('#eligibilityForm').addEventListener('submit',e=>{
  e.preventDefault();const f=e.currentTarget,d=formData(f);clearError(f);
  const income=safeNumber(d.income),age=safeNumber(d.age),score=safeNumber(d.creditScore),obligations=safeNumber(d.obligations),tenure=safeNumber(d.tenure);
  if(!Number.isFinite(income)||income<10000||income>10000000)return showError(f,'Enter a monthly income between ₹10,000 and ₹1 crore.');
  if(!Number.isInteger(age)||age<18||age>75)return showError(f,'Age must be between 18 and 75.');
  if(!Number.isInteger(score)||score<300||score>900)return showError(f,'Enter a credit score between 300 and 900.');
  if(!d.employment)return showError(f,'Choose an employment type.');
  if(!Number.isFinite(obligations)||obligations<0||obligations>=income)return showError(f,'Existing obligations must be less than your monthly income.');
  const employmentFactor={salaried:1,'self-employed':.88,business:.9,contract:.78}[d.employment]||.8;
  const scoreFactor=score>=800?1:score>=750?.92:score>=700?.82:score>=650?.67:score>=600?.48:.28;
  const ageFactor=age>=21&&age<=55?1:age<21?.82:.7;
  const disposable=Math.max(0,income*.5-obligations);
  const maxEmi=disposable*employmentFactor*scoreFactor*ageFactor;
  const monthlyRate=.12/12,months=tenure*12;
  const principal=maxEmi*(1-Math.pow(1+monthlyRate,-months))/monthlyRate;
  const status=score>=750&&income-obligations>=25000&&age<=60?'Promising starting point':score>=650?'Some factors to review':'More preparation may help';
  const result=$('#eligibilityResult');result.innerHTML=`<div class="result-content"><span class="result-kicker">YOUR PERSONAL ESTIMATE</span><h3>${status}</h3><div class="result-big">${formatINR(principal*.85,true)} – ${formatINR(principal,true)}</div><div class="result-caption">Illustrative loan range · ${tenure}-year tenure</div><div class="result-divider"></div><div class="factor-list"><div class="factor"><span>Estimated comfortable EMI</span><strong>${formatINR(maxEmi)}</strong></div><div class="factor"><span>Credit score range</span><strong>${score>=750?'Strong':score>=700?'Good':score>=650?'Fair':'Needs attention'}</strong></div><div class="factor"><span>Employment profile</span><strong>${d.employment.replace(/-/g,' ')}</strong></div></div><div class="result-tip">${score<700?'A stronger credit profile and lower existing obligations may improve the estimate.':'Compare offers and check the full cost, fees, and terms before applying.'} A lender will make the final decision.</div></div>`;
  $('#readinessMetric').textContent=score>=750&&maxEmi>25000?'Good':'Review';$('#readinessMetric').style.fontSize='23px';logActivity('Loan','Loan eligibility check',`${age} years · ${d.employment}`,formatINR(principal,true));toast('Eligibility estimate ready');
});
$('#creditForm').addEventListener('submit',e=>{e.preventDefault();const f=e.currentTarget,d=formData(f),score=safeNumber(d.score);clearError(f);if(!Number.isInteger(score)||score<300||score>900)return showError(f,'Enter a whole number between 300 and 900.');
  const band=score>=800?'Excellent':score>=750?'Very good':score>=700?'Good':score>=650?'Fair':'Needs attention';const color=score>=750?'#78dfb9':score>=650?'#ffca76':'#ff9292';const guidance=score>=750?'A higher score can help when comparing borrowing options. Keep payment habits steady and review your report for errors.':score>=650?'Focus on consistent on-time payments and keeping card balances manageable. Check your credit report for errors.':'Consider reviewing your credit report for errors and building a consistent payment history. Avoid applying for several new accounts at once.';
  $('#creditResult').innerHTML=`<div class="result-content"><span class="result-kicker">YOUR CREDIT SNAPSHOT</span><div class="result-big" style="color:${color}">${score} <span style="font-size:13px;color:#738090">/ 900</span></div><h3>${band} range</h3><div class="score-track" style="height:6px;margin-top:14px"><span style="width:${Math.max(0,Math.min(100,(score-300)/6))}%;background:${color}"></span></div><div class="result-divider"></div><div class="factor-list"><div class="factor"><span>Range guide</span><strong>${score>=750?'Typically favorable':score>=650?'Room to strengthen':'Improvement may help'}</strong></div><div class="factor"><span>Next focus</span><strong>${d.goal==='loan'?'Payment history & obligations':d.goal==='improve'?'Consistency & utilization':'Review report accuracy'}</strong></div></div><div class="result-tip">${guidance} Range labels are general and may differ by bureau.</div></div>`;
  $('#creditMetric').innerHTML=`${score} <small>/ 900</small>`;$('#scoreTrack').style.width=`${Math.max(0,Math.min(100,(score-300)/6))}%`;logActivity('Credit','Credit score analysis',`${band} · ${score}/900`,band);toast('Credit snapshot ready')});
const emiForm=$('#emiForm');
function calcEMI(){const amount=safeNumber(emiForm.elements.amount.value),rate=safeNumber(emiForm.elements.rate.value),years=safeNumber(emiForm.elements.years.value),err=$('.form-error',emiForm);if(amount<10000||amount>100000000||!Number.isFinite(amount)){err.textContent='Loan amount must be between ₹10,000 and ₹10 crore.';return}if(rate<=0||rate>40||!Number.isFinite(rate)){err.textContent='Interest rate must be between 0.1% and 40%.';return}if(years<1||years>30||!Number.isFinite(years)){err.textContent='Tenure must be between 1 and 30 years.';return}err.textContent='';const n=years*12,r=rate/1200,emi=amount*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1),total=emi*n,interest=total-amount;$('#emiBig').textContent=formatINR(emi);$('#emiYears').textContent=`${years} ${years===1?'year':'years'}`;$('#totalPayable').textContent=formatINR(total,true);$('#principalOut').textContent=formatINR(amount,true);$('#interestOut').textContent=formatINR(interest,true);$('#emiMetric').textContent=formatINR(emi,true);const principalPct=amount/total*100;$('#donut').style.background=`conic-gradient(#72dfb7 0 ${principalPct}%,#927bdd ${principalPct}% 100%)`;}
emiForm.elements.amount.addEventListener('input',e=>{emiForm.elements.amountRange.value=Math.min(10000000,Math.max(10000,safeNumber(e.target.value)||10000));calcEMI()});emiForm.elements.amountRange.addEventListener('input',e=>{emiForm.elements.amount.value=e.target.value;calcEMI()});['rate','years'].forEach(n=>emiForm.elements[n].addEventListener('input',calcEMI));calcEMI();
emiForm.addEventListener('change',()=>{calcEMI();const amount=safeNumber(emiForm.elements.amount.value),emi=safeNumber($('#emiBig').textContent.replace(/[₹,]/g,''));logActivity('EMI','EMI calculation',`${formatINR(amount,true)} · ${emiForm.elements.years.value} years`,formatINR(emi))});
$('#insightForm textarea').addEventListener('input',e=>$('.char-count').textContent=`${e.target.value.length} / 500`);
const offlineTips={budget:['Track spending for a month before changing your habits.','Set aside essentials and savings first, then plan flexible spending.','Choose one small weekly review to keep the plan realistic.'],credit:['Review your bureau report for errors before applying for new credit.','Pay at least the required amount on time and keep balances manageable.','Space out applications so you can compare options without rushing.'],loan:['Compare the total repayment amount, fees, and prepayment terms.','Keep existing monthly obligations in view when choosing a payment.','Ask the lender how rate changes and missed payments are handled.'],saving:['Pick a modest automatic transfer that fits your current budget.','Keep short term emergency savings accessible and separate.','Increase the amount gradually when your income or expenses change.'],debt:['List balances, rates, and minimum payments in one place.','Prioritize required payments and check the cost of each repayment option.','Contact lenders early if a payment may become difficult.']};
$('#insightForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,d=formData(f);clearError(f);if(d.context.length>500)return showError(f,'Please keep your context under 500 characters.');const host=$('#aiResponse'),topicName=$('select[name="topic"] option:checked',f).textContent;host.classList.add('has-response');host.innerHTML='<div class="response-content"><span class="result-kicker">FINWISE AI</span><h3>Thinking through your question…</h3><p>Please wait a moment.</p></div>';
  try{const response=await fetch('/.netlify/functions/financial-tips',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:d.topic,context:d.context})});if(!response.ok)throw new Error('AI service unavailable');const payload=await response.json();if(!payload.tips||!Array.isArray(payload.tips))throw new Error('Unexpected response');renderTips(payload.tips,topicName,'Generated with Claude AI');}
  catch{renderTips(offlineTips[d.topic]||offlineTips.budget,topicName,'General educational tips · AI connection is not configured');}
  logActivity('AI','Financial tips',topicName,'');
});
function renderTips(tips,title,meta){const safe=Array.isArray(tips)?tips.slice(0,5).map(x=>`<li>${escapeHTML(x)}</li>`).join(''):'';$('#aiResponse').innerHTML=`<div class="response-content"><span class="result-kicker">YOUR FINANCIAL TIPS</span><h3>${escapeHTML(title)}</h3><ul>${safe}</ul><div class="response-meta">${escapeHTML(meta)} · General education only</div></div>`;}
