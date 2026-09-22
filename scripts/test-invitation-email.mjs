import {readFileSync} from "node:fs";
import ts from "typescript";
import assert from "node:assert/strict";
const source=readFileSync("supabase/functions/send-invitation/index.ts","utf8").replace(/^import .*;\n/,"");
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
function harness({valid=true,configured=true,allowed=true,providerOk=true}={}){
 let handler;const calls=[];const sends=[];
 const env={SUPABASE_URL:"https://test.invalid",SUPABASE_SERVICE_ROLE_KEY:"server-only",...(configured?{RESEND_API_KEY:"fake",INVITATION_FROM:"Dilemme <invite@example.test>"}:{})};
 new Function("createClient","Deno","fetch",compiled)(
 ()=>({auth:{getUser:async()=>({data:{user:valid?{id:"sender",email_confirmed_at:"today"}:null},error:valid?null:{}})},rpc:async(name,params)=>{calls.push({name,params});return name.startsWith("claim")?{data:{email:"friend@example.test",token:"secret-invite",attempt:"attempt",kind:"friend"},error:allowed?null:{message:"denied"}}:{error:null};}}),
 {env:{get:key=>env[key]},serve:fn=>handler=fn},
 async(url,options)=>{sends.push({url,options});return {ok:providerOk};});
 return {run:()=>handler(new Request("https://function.invalid",{method:"POST",headers:{Authorization:"Bearer user-token","Content-Type":"application/json"},body:JSON.stringify({id:"12345678-1234-1234-1234-123456789abc",email:"ignored@example.test"})})),calls,sends};
}
for(const opts of [{valid:false},{configured:false},{allowed:false}]){
 const h=harness(opts);assert.notEqual((await h.run()).status,200);assert.equal(h.sends.length,0);
}
const ok=harness();assert.equal((await ok.run()).status,200);
assert.deepEqual(JSON.parse(ok.sends[0].options.body).to,["friend@example.test"]);
assert.equal(ok.sends[0].options.headers["Idempotency-Key"],"dilemme-invite/attempt");
assert.equal(ok.calls[0].params.p_sender,"sender");
assert.equal(ok.calls[1].params.p_sent,true);
const failed=harness({providerOk:false});assert.equal((await failed.run()).status,502);assert.equal(failed.calls[1].params.p_sent,false);
console.log("Email handler passed: authentication, configuration, ownership, trusted recipient, provider failure and idempotency.");
