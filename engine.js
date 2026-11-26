(function(root,factory){const engine=factory();if(typeof module==='object'&&module.exports)module.exports=engine;else root.WealthEngine=engine})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d,clamp=(n,min,max)=>Math.max(min,Math.min(max,finite(n))), rate=(n)=>clamp(n,-99,1000)/100;
function calculate(input){
const c=Math.max(0,finite(input.capital)),months=Math.max(1,Math.min(600,Math.round(finite(input.years,5)*12))), years=months/12,protect=Math.min(c,Math.max(0,finite(input.protect))),budget=Math.min(c-protect,Math.max(0,finite(input.budget))),deploy=budget*clamp(input.deploy,0,100)/100,initialCash=c-deploy,interestTax=clamp(input.interestTax,0,100)/100,exitTax=clamp(input.exitTax,0,100)/100,spendGrowth=rate(input.spendGrowth),incomeGrowth=rate(input.incomeGrowth),cpi=rate(input.inflation),baseIncome=Math.max(0,finite(input.income)),baseSpend=Math.max(0,finite(input.expenses)),reserveYield=clamp(input.yield,0,30)/100,dist=clamp(input.distribution,0,30)/100,fee=Math.max(0,finite(input.fees)),useIncome=!!input.useIncome;
let cash=initialCash,asset=deploy,basis=deploy,totalTaxes=0,totalSpend=0,totalIncome=0,totalContributions=0,shortfall=0,interestEarned=0,distributionEarned=0,peak=c,maxDD=0,breach=false,history=[{month:0,nominal:c,real:c,benchmark:c,protected:protect}],benchmark=c,benchmarkShortfall=0,benchTax=0;
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
const flow=useIncome?income-spend:0;totalContributions+=flow;contributedReal+=flow/priceIndex;
if(flow<0&&cash+flow<0){shortfall+=-(cash+flow);cash=0}else cash+=flow;
if(flow<0&&benchmark+flow<0){benchmarkShortfall+=-(benchmark+flow);benchmark=0}else benchmark+=flow;
if(cash<protect*personalIndex)breach=true;
const change=Number.isFinite(path[i])?Math.max(-1,path[i]):step;asset*=1+change;
priceIndex*=1+inf;personalIndex*=Math.pow(1+spendGrowth,1/12);
let nav=cash+asset;
peak=Math.max(peak,nav);maxDD=peak>0?Math.max(maxDD,1-nav/peak):0;
if(i===months-1){const tradeCost=deploy>0?Math.min(fee,asset):0, gain=asset-basis-tradeCost,taxG=Math.max(0,gain)*exitTax;totalTaxes+=taxG;cash+=Math.max(0,asset-tradeCost-taxG);asset=0;nav=cash}
history.push({month:i+1,nominal:nav,real:nav/priceIndex,benchmark,protected:protect*personalIndex});
}
const nominal=cash,real=nominal/priceIndex,realGain=real-c-contributedReal,benchmarkReal=benchmark/priceIndex,yearlySpend=yearOneSpending,yearlyIncome=yearOneIncome,coverage=yearlySpend>0?yearOneInvestmentIncome/yearlySpend:null,afterTaxReserve=reserveYield*(1-interestTax),realReserve=(1+afterTaxReserve)/(1+cpi)-1,requiredYield=interestTax<1?Math.max(0,cpi/(1-interestTax)):null,annualSpend=baseSpend*12,requiredCapital=afterTaxReserve>0?annualSpend/afterTaxReserve:null, netIncomeGap=yearlyIncome+yearOneInvestmentIncome-yearlySpend;
return {months,years,deploy,nominal,real,realGain,benchmark,benchmarkReal,delta:nominal-benchmark,totalTaxes,totalSpend,totalIncome,totalContributions,contributedReal,shortfall,benchmarkShortfall,interestEarned,distributionEarned,coverage,yearOneInvestmentIncome,yearlySpend,yearlyIncome,netIncomeGap,realReserve,requiredYield,requiredCapital,maxDD,breach,history,inflationFactor:priceIndex,benchTax,afterTaxReserve};
}
return {calculate};
});
