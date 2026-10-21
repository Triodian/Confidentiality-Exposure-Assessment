// Settings for this deployment. None of these are secrets.

// Cloudflare Access (sign-in). Found in Cloudflare Zero Trust:
//   teamDomain: Settings → Custom pages → Team domain
//   aud:        Access → Applications → the application that covers confidentiality.triodian.com → "Application Audience (AUD) Tag"
// SET-UP STEP 2: create the Access application for this app's addresses and paste its AUD tag here, or set the Worker
// variables ACCESS_TEAM_DOMAIN and ACCESS_AUD, which override these values.
export const ACCESS = {
  teamDomain: 'damian-hickey-30c.cloudflareaccess.com',
  aud: 'REPLACE-WITH-THE-ACCESS-AUD-TAG',
};

// First administrator(s). While the user list has no active administrator, these people are
// added as administrators the first time they sign in. After that, admins are managed in /admin.
export const BOOTSTRAP_ADMINS = ['damian.hickey@triodian.com'];
