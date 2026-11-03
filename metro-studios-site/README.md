# Metro Studios website

A plain static site (no build step, no framework). Upload the contents of this folder to any static host
(Cloudflare Pages, Netlify, GitHub Pages, your own server) and the pages work at real paths:

    /                      home
    /westbrook-county/     Westbrook County
    /project-alba/         Project Alba
    /oath-of-caledonia/    Oath of Caledonia
    /about/                About
    /team/                 Team
    /content-check/        checks content.js for typos (not linked from the site)

## Hosting

The site uses relative links, so it works whether it sits at the top of a domain (`example.com/`) or in a folder
(`username.github.io/my-repo/`). Upload the *contents* of this folder (so `index.html` and `content.js` end up at the top
level of your site), not the folder itself.

On GitHub Pages: put these files in the root of the repository (or the folder Pages is set to publish), and keep the
empty `.nojekyll` file. If your upload method skips files that start with a dot, add an empty file with that name.

## Updating the site

Open **EDITING.md**. The short version: everything that changes (team, roles, game status and release
dates, news, screenshots, Discord and Roblox links) is in **content.js**. Edit that one file, upload it over
the old one, then visit /content-check/.

## Folder guide

    content.js                 the file you edit
    EDITING.md                 how to edit it, with copy-paste examples
    index.html, */index.html   the pages (wording that rarely changes lives here)
    assets/css/site.css        styling
    assets/js/site.js          fills the pages in from content.js
    assets/img/                logos and photos
    assets/img/screenshots/    put your game screenshots here

## Still to fill in

* **Team members**: add them in content.js (see EDITING.md). The roster is empty for now.
* **Discord**: the Discord button is the Westbrook County invite. Swap in a Metro Studios invite in content.js
  if you have a separate one.
* **Roblox group**: "Find us on Roblox" runs a Roblox search for "Metro Studios". Put your group's link in content.js.
* **Project Alba and Oath of Caledonia**: release dates, play links and screenshots go in content.js when you have them.
* **Social preview image**: once the domain is live, add `og:image` and `canonical` tags to each page's `<head>`
  using your full URL. `assets/img/og-westbrook-county.jpg` is included for this.

## Images

The photos on the Westbrook County pages come from westbrookcounty.co.uk (traffic-stop, fire-station, logo, og-image),
resized for the web.

The intro animation plays once per browser session on the home page and is skipped for visitors who prefer reduced motion.
