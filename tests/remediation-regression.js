const fs = require('node:fs');
const assert = require('node:assert/strict');

const read = p => fs.readFileSync(p, 'utf8');
const customer = read('public/assets/js/customer-account.js');
const workerEntry = read('worker-entry.js');
const headers = read('public/_headers');
const wrangler = read('wrangler.jsonc');
const remediation = read('backend/ZZZZZZZZZZZZZZZZZZZZ_Remediation.gs');

assert.match(customer, /Auth.*POST-only/i);
assert.doesNotMatch(customer, /searchParams\.set\(['"]customer_token/);
assert.match(customer, /JSON\.stringify\(\{action,payload,customer_token:token\(\)\}\)/);

assert.match(workerEntry, /Content-Security-Policy/);
assert.match(workerEntry, /redirect:\s*'manual'/);
assert.match(workerEntry, /IMAGE_REDIRECT_NOT_ALLOWED/);
assert.match(workerEntry, /PMT_IMAGE_HOSTS/);
assert.match(wrangler, /"main"\s*:\s*"worker-entry\.js"/);
assert.match(headers, /Content-Security-Policy:/);

assert.match(remediation, /pbkdf2-sha256/);
assert.match(remediation, /PMT_PASSWORD_KDF_ITERATIONS_\s*=\s*100000/);
assert.match(remediation, /PMT_ORDER_TRANSITIONS_/);
assert.match(remediation, /ORDER_TRANSITION_INVALID/);
assert.match(remediation, /getRange\(i\+1,5\)/);
assert.match(remediation, /PMT_PUBLIC_MEDIA_FOLDER_ID/);
assert.match(remediation, /visibility:'public-media'/);
assert.match(remediation, /ztCredentialLogin_=function/);
assert.match(remediation, /ztBridgeCredentialLogin_=function/);

assert.equal(fs.existsSync('admin'), false, 'legacy duplicate root admin tree must be removed');
console.log('Remediation regression tests passed');
