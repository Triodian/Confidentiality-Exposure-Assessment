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

// First administrator(s): the Worker variable FIRST_ADMINS (comma-separated), set for each deployment by the installer or
// the provisioning script. Nothing is compiled in (security review 15 Nov 2026, S.4). While the deployment has never had an
// administrator, a listed person becomes one on first sign-in; after that the path is closed and admins are managed in /admin.
