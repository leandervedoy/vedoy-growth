import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRegistration, parseProfile, sameOrigin, ValidationError } from '../../lib/progress/validation.ts';

const valid = { displayName:'Kari Nord', organizationName:'Nabolaget', organizationKind:'association', email:'kari@example.org', password:'et langt prøvepassord', emailUpdates:false, smsUpdates:false, phone:'', privacyAccepted:true };

test('a person can register an organization without either notification channel',()=>{
  const r=parseRegistration(valid); assert.equal(r.emailUpdates,false); assert.equal(r.smsUpdates,false); assert.equal(r.phone,null); assert.equal(r.organizationKind,'association');
});
test('email and SMS consent are independent and phone is normalized',()=>{
  const r=parseRegistration({...valid,smsUpdates:true,phone:'+47 987 65 432'}); assert.equal(r.emailUpdates,false); assert.equal(r.smsUpdates,true); assert.equal(r.phone,'+4798765432');
});
test('string booleans are rejected rather than creating consent',()=>{
  assert.throws(()=>parseRegistration({...valid,emailUpdates:'false'}),ValidationError);
});
test('SMS requires an international phone number',()=>{
  assert.throws(()=>parseRegistration({...valid,smsUpdates:true,phone:'98765432'}),ValidationError);
});
test('withdrawing SMS clears the phone regardless of submitted old number',()=>{
  const r=parseProfile({...valid,phone:'+4798765432',smsUpdates:false}); assert.equal(r.phone,null);
});
test('notification choice is not a condition of account creation but privacy notice is required',()=>{
  assert.doesNotThrow(()=>parseRegistration(valid)); assert.throws(()=>parseRegistration({...valid,privacyAccepted:false}),ValidationError);
});
test('rejects missing data, invalid email, short passwords and unsupported organization types',()=>{
  for(const patch of [{displayName:''},{organizationName:' '},{email:'invalid'},{password:'short'},{organizationKind:'admin'}]) assert.throws(()=>parseRegistration({...valid,...patch}),ValidationError);
});
test('limits field lengths and refuses non-object bodies',()=>{
  assert.throws(()=>parseRegistration(null),ValidationError); assert.throws(()=>parseRegistration({...valid,displayName:'x'.repeat(121)}),ValidationError);
});
test('requires same-origin mutation requests and rejects absent or unrelated Origin',()=>{
  assert.equal(sameOrigin(new Request('https://growth.example/api/auth/register',{headers:{Origin:'https://growth.example'}})),true);
  assert.equal(sameOrigin(new Request('https://growth.example/api/auth/register',{headers:{Origin:'https://evil.example'}})),false);
  assert.equal(sameOrigin(new Request('https://growth.example/api/auth/register')),false);
});
