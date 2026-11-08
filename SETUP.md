# Staff area setup

The staff page lives at `/staff/` (not linked from the public site). Discord login needs a small server, so this
part runs on **Cloudflare Pages** (free). GitHub Pages alone cannot do it.

## 1. Discord application
1. https://discord.com/developers/applications -> New Application.
2. OAuth2 -> copy the **Client ID** and **Client Secret**.
3. OAuth2 -> Redirects -> add `https://YOUR-DOMAIN/api/callback` (exactly).
4. Your own Discord ID: Discord settings -> Advanced -> Developer Mode on, then right-click yourself -> Copy User ID.

## 2. Cloudflare Pages
1. Workers & Pages -> Create -> Pages -> connect this GitHub repo. No build command, output directory `/`.
2. Storage & Databases -> KV -> create a namespace (e.g. `metro-staff`).
3. Your Pages project -> Settings -> Bindings -> add **KV namespace**, variable name **`STAFF`**.
4. Settings -> Variables and Secrets (add as secrets):
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `SESSION_SECRET`  (any long random string, 32+ characters)
   - `OWNER_DISCORD_ID`  (your Discord user ID; this account is the owner and can always log in)
   - (Optional) `DISCORD_GUILD_ID` and `DISCORD_STAFF_ROLE_ID` override the server and staff role built into the code. Right now they are set to the Metro Studios server (1464024797263429645) and staff role (1464024797695705203). Several role IDs can be comma-separated.
5. Redeploy. Visit `/staff/` and log in with Discord.

## How it works
- Only members of your Discord server who have the staff role can log in (checked at every login, sessions last 24 hours). Everyone else is turned away, and if someone loses the role their account is removed from the list the next time they try to log in. Then give them a game or role (Admin tab -> People).
- Owner only: add/delete games and roles, tick games/roles per person, post announcements, add links, remove people.
- Game leads (anyone you give the **Game lead** role): get a "My team" tab to add people to, or remove them from, the games they lead and set their roles, and can post announcements and links for their own games. They cannot touch the owner, other leads, or the games/roles lists.
- Staff: see only their own games' tasks, bugs, links and announcements; add tasks/bugs, move them across the board,
  delete their own. The Update writer builds a news block to paste into `content.js`.
- Deleting a game also deletes its tasks, bugs, announcements and links.
- Default games and roles are created on first use; change them in Admin.

## TikToks, campaign claims and payments
- **TikToks tab**: every staff member sees the list, but only people with the **Marketing** role (and the owner) can press "I made this" (once per TikTok). The owner approves
  or rejects (and can change the Robux amount), sends the Robux, then presses Mark paid.
- **Marketing tab** (people with the **Marketing** role): submit a campaign with a description, proof links and up to
  4 screenshots. The owner sees the proof, approves or rejects with an optional note, and marks it paid.
- **Payments tab**: staff save their Roblox username and see what they are owed. The owner sets the default Robux
  per TikTok and per campaign, can override either rate for each person, and presses Mark paid per person after
  sending the Robux. The rate is fixed when a claim is made, and you can change one claim's amount when approving it.
- Add a **Marketing** role under Admin -> Roles if it is not in the list (the name must be exactly "Marketing").

### Getting new TikToks onto the list automatically
TikTok does not offer a free way for a website to watch an account for new videos. Instead, the site has a webhook
that any automation tool can call when a new TikTok appears. Add a secret `INGEST_TOKEN` in Cloudflare (any long
random string), then have your tool send a POST request to:

    https://YOUR-DOMAIN/api/ingest/tiktok?token=YOUR_INGEST_TOKEN
    body (JSON): {"url": "https://www.tiktok.com/@account/video/123..."}

Tools such as Zapier, Make or IFTTT can do this if they offer a trigger for your TikTok account. Until that is set
up, the owner, leads and Marketing staff can paste a link with the **Add TikTok** box. The site fetches the title and
thumbnail from TikTok automatically.

## Optional: get a Discord message when staff claim something

1. In Discord, open a private channel for yourself → **Edit Channel → Integrations → Webhooks → New Webhook → Copy Webhook URL**.
2. In Cloudflare, open your Pages project → **Settings → Variables and Secrets** and add a secret named `NOTIFY_WEBHOOK` with that URL.
3. Redeploy. From then on a message appears whenever someone claims a TikTok or a campaign. It never pings anyone.
