(function(root,factory){const engine=factory();if(typeof module==='object'&&module.exports)module.exports=engine;else root.WealthEngine=engine})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d,clamp=(n,min,max)=>Math.max(min,Math.min(max,finite(n))), rate=(n)=>clamp(n,-99,1000)/100;
function calculate(input){
const c=Math.max(0,finite(input.capital)),months=Math.max(1,Math.min(600,Math.round(finite(input.years,5)*12))), years=months/12,protect=Math.min(c,Math.max(0,finite(input.protect))),budget=Math.min(c-protect,Math.max(0,finite(input.budget))),deploy=budget*clamp(input.deploy,0,100)/100,initialCash=c-deploy,interestTax=clamp(input.interestTax,0,100)/100,exitTax=clamp(input.exitTax,0,100)/100,spendGrowth=rate(input.spendGrowth),incomeGrowth=rate(input.incomeGrowth),cpi=rate(input.inflation),baseIncome=Math.max(0,finite(input.income)),baseSpend=Math.max(0,finite(input.expenses)),reserveYield=clamp(input.yield,0,30)/100,dist=clamp(input.distribution,0,30)/100,fee=Math.max(0,finite(input.fees)),useIncome=!!input.useIncome;
let cash=initialCash,asset=deploy,basis=deploy,totalTaxes=0,totalSpend=0,totalIncome=0,totalContributions=0,shortfall=0,interestEarned=0,distributionEarned=0,peak=c,maxDD=0,assetIndex=1,assetPeak=1,assetDD=0,feesPaid=0,deposits=0,withdrawals=0,assetPriceGain=0,breach=false,history=[{month:0,nominal:c,real:c,benchmark:c,protected:protect}],benchmark=c,benchmarkShortfall=0,benchTax=0;
const path=Array.isArray(input.path)?input.path:[],rf=Array.isArray(input.reservePath)?input.reservePath:[],cp=Array.isArray(input.inflationPath)?input.inflationPath:[];
const totalGain=clamp(input.gain,-100,10000)/100,step=totalGain===-1?-1:Math.pow(1+totalGain,1/months)-1;
let priceIndex=1,personalIndex=1,yearOneInvestmentIncome=0,yearOneSpending=0,yearOneIncome=0,contributedReal=0;
for(let i=0;i<months;i++){
const y=i/12,inf=Number.isFinite(cp[i])?Math.max(-.95,cp[i]):Math.pow(1+cpi,1/12)-1;
const spend=baseSpend*personalIndex, income=baseIncome*Math.pow(1+incomeGrowth,y);
totalSpend+=spend;totalIncome+=income;
const cashRate=Number.isFinite(rf[i])?clamp(rf[i],0,30)/100:reserveYield, mr=Math.pow(1+cashRate,1/12)-1;
const grossInterest=Math.max(0,cash-protect)*mr, taxI=grossInterest*interestTax, netI=grossInterest-taxI;
const distGross=Math.max(0,asset)*dist/12, taxD=distGross*interestTax,netD=distGross-taxD;
cash+=netI+netD;totalTaxes+=taxI+taxD;interestEarned+=netI;distributionEarned+=netD;
const bGross=Math.max(0,benchmark-protect)*mr,bTax=bGross*interestTax;benchmark+=bGross-bTax;benchTax+=bTax;
if(i<12){yearOneInvestmentIncome+=netI+netD;yearOneSpending+=spend;yearOneIncome+=income}
const flow=useIncome?income-spend:0,actualFlow=Math.max(-cash,flow);totalContributions+=actualFlow;contributedReal+=actualFlow/priceIndex;deposits+=Math.max(0,actualFlow);withdrawals+=Math.max(0,-actualFlow);shortfall+=Math.max(0,actualFlow-flow);cash+=actualFlow;
if(flow<0&&benchmark+flow<0){benchmarkShortfall+=-(benchmark+flow);benchmark=0}else benchmark+=flow;
if(cash<protect*personalIndex)breach=true;
const change=Number.isFinite(path[i])?Math.max(-1,path[i]):step;assetPriceGain+=asset*change;asset*=1+change;assetIndex*=1+change;assetPeak=Math.max(assetPeak,assetIndex);assetDD=Math.max(assetDD,1-assetIndex/assetPeak);
priceIndex*=1+inf;personalIndex*=Math.pow(1+spendGrowth,1/12);
let nav=cash+asset;
peak=Math.max(peak,nav);maxDD=peak>0?Math.max(maxDD,1-nav/peak):0;
if(i===months-1){const tradeCost=deploy>0?Math.min(fee,asset):0, gain=asset-basis-tradeCost,taxG=Math.max(0,gain)*exitTax;totalTaxes+=taxG;feesPaid=tradeCost;cash+=Math.max(0,asset-tradeCost-taxG);asset=0;nav=cash}
history.push({month:i+1,nominal:nav,real:nav/priceIndex,benchmark,protected:protect*personalIndex});
}
const nominal=cash,real=nominal/priceIndex,realGain=real-c-contributedReal,benchmarkReal=benchmark/priceIndex,yearlySpend=yearOneSpending,yearlyIncome=yearOneIncome,coverage=yearlySpend>0?yearOneInvestmentIncome/yearlySpend:null,afterTaxReserve=reserveYield*(1-interestTax),realReserve=(1+afterTaxReserve)/(1+cpi)-1,requiredYield=interestTax<1?Math.max(0,cpi/(1-interestTax)):null,annualSpend=baseSpend*12,requiredCapital=afterTaxReserve>0?annualSpend/afterTaxReserve:null, netIncomeGap=yearlyIncome+yearOneInvestmentIncome-yearlySpend;
const netInvestmentGain=nominal-c-totalContributions,grossInvestmentGain=netInvestmentGain+totalTaxes+feesPaid;return {months,years,startingCapital:c,deploy,nominal,real,realGain,benchmark,benchmarkReal,delta:nominal-benchmark,totalTaxes,totalSpend,totalIncome,totalContributions,deposits,withdrawals,feesPaid,netInvestmentGain,grossInvestmentGain,assetPriceGain,assetDrawdown:deploy>0?assetDD:null,contributedReal,shortfall,benchmarkShortfall,interestEarned,distributionEarned,coverage,yearOneInvestmentIncome,yearlySpend,yearlyIncome,netIncomeGap,realReserve,requiredYield,requiredCapital,maxDD,breach,history,inflationFactor:priceIndex,benchTax,afterTaxReserve};
}

function historicalRanges(rows,years){const n=Math.max(1,Math.round(years*12)),samples=[];for(let i=0;i+n<rows.length;i++){const first=rows[i],last=rows[i+n],month=r=>Number(r.date.slice(0,4))*12+Number(r.date.slice(5,7));if(month(last)-month(first)!==n||first.value<=0||last.value<=0)continue;samples.push({gain:(last.value/first.value-1)*100,path:rows.slice(i+1,i+n+1).map((r,j)=>r.value/rows[i+j].value-1),from:first.date,to:last.date})}samples.sort((a,b)=>a.gain-b.gain);if(!samples.length)return null;const pick=p=>samples[Math.round((samples.length-1)*p)];return{count:samples.length,low:pick(.2),middle:pick(.5),high:pick(.8),first:rows[0].date,last:rows.at(-1).date}}
function taxCompare(i){const basis=Math.max(0,finite(i.basis)),proceeds=Math.max(0,finite(i.proceeds)),cost=Math.max(0,finite(i.cost)),loss=Math.max(0,finite(i.loss)),gain=Math.max(0,proceeds-cost-basis),ordinary=clamp(i.ordinary,0,100)/100,long=clamp(i.long,0,100)/100,state=clamp(i.state,0,100)/100,niit=clamp(i.niit,0,100)/100,net=Math.max(0,gain-loss),a=gain*Math.min(1,ordinary+state+niit),b=gain*Math.min(1,long+state+niit),c=net*Math.min(1,long+state+niit);return{gain,net,shortTax:a,longTax:b,offsetTax:c,shortNet:Math.max(0,proceeds-cost-a),longNet:Math.max(0,proceeds-cost-b),offsetNet:Math.max(0,proceeds-cost-c),savings:a-c,unusedLoss:Math.max(0,loss-gain)}}
function legacy(i){const years=Math.max(1,Math.min(80,Math.round(finite(i.years,40)))),start=Math.max(0,finite(i.initial)),monthly=Math.max(0,finite(i.monthly)),fundYears=Math.max(0,Math.round(finite(i.fundYears,20))),delay=Math.max(0,Math.round(finite(i.delay,2))),premium=Math.max(0,finite(i.premium)),ret=clamp(i.return,-99,100)/100,tax=clamp(i.tax,0,100)/100,admin=Math.max(0,finite(i.admin)),policyYears=Math.max(1,Math.round(finite(i.policyYears,20))),illustration=Math.max(0,finite(i.illustration)),inflation=clamp(i.inflation,0,30)/100;
let portfolio=start,basis=start,comparison=start,compBasis=start,buffer=0,totalPremium=0,totalTax=0,paidYears=0,started=false,unfunded=0,paused=0,policyRisk=false,rows=[];
for(let y=1;y<=years;y++){let contribution=y<=fundYears?monthly*12:0;portfolio+=contribution;basis+=contribution;comparison+=contribution;compBasis+=contribution;let rr=i.stress&&y===fundYears+delay+2?-.30:ret;const gain=portfolio*rr;portfolio=Math.max(0,portfolio+gain-admin);comparison=Math.max(0,comparison*(1+rr)-admin);
if(y>fundYears+delay&&premium>0&&paidYears<policyYears){const available=Math.max(0,gain);const desired=Math.max(0,premium*2-buffer);const fraction=portfolio>0?Math.max(0,1-basis/portfolio):0;const gross=Math.min(available,portfolio,desired/Math.max(.00001,1-fraction*tax));const taxDue=gross*fraction*tax;basis=Math.max(0,basis-gross*(1-fraction));portfolio-=gross;buffer+=gross-taxDue;totalTax+=taxDue;if(!started&&buffer>=premium*2)started=true;if(started){if(buffer>=premium){buffer-=premium;totalPremium+=premium;paidYears++}else{unfunded+=premium;policyRisk=true}}else paused++}
rows.push({year:y,portfolio,buffer,totalPremium,paidYears,unfunded,comparison})}
const unrealized=Math.max(0,portfolio-basis),compGain=Math.max(0,comparison-compBasis),marketNet=portfolio-unrealized*tax,compNet=comparison-compGain*tax;const policyValue=paidYears===policyYears&&!policyRisk&&illustration>0?illustration:null;return{rows,portfolio,buffer,totalPremium,totalTax,paidYears,unfunded,paused,started,policyRisk,policyValue,marketNet,compNet,combined:policyValue===null?null:marketNet+buffer+policyValue,realMarketNet:marketNet/Math.pow(1+inflation,years)}}

return {calculate,historicalRanges,taxCompare,legacy};
});
