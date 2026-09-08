/* Claim queued SMS jobs so polling cannot create parallel sends. */
var PMT_BASE_SMS_JOBS_=pmtSmsJobs_;
pmtSmsJobs_=function(session){
  const out=PMT_BASE_SMS_JOBS_(session);try{
    const parsed=JSON.parse(out.getContent());if(!parsed||!parsed.ok||!Array.isArray(parsed.items))return out;
    const s=pmtEnsureSmsJobSchema_(),r=s.getDataRange().getValues(),ids=parsed.items.map(x=>String(x.id));
    for(let i=1;i<r.length;i++)if(ids.indexOf(String(r[i][0]))>=0&&['Queued','Retry'].indexOf(String(r[i][5]||''))>=0){s.getRange(i+1,6).setValue('Sending');s.getRange(i+1,9).setValue(now_());}
    return J({ok:true,items:parsed.items.filter(x=>x&&['Queued','Retry'].indexOf(String(x.status||''))>=0)});
  }catch(e){return out;}
};
