// Override the initial helper with entropy derived only from Apps Script UUID generation.
ztRand_=function(n){const d=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,token_(),Utilities.Charset.UTF_8);let x=0;for(let i=0;i<6;i++)x=(x*256+(d[i]&255))>>>0;return String(x%Math.pow(10,n)).padStart(n,'0');};
