# Updating the Metro Studios site

You never need to touch the page files. Everything that changes lives in one file,
**`content.js`**, in the same folder as `index.html`. Edit it, save it, upload it over the old one, and
every page updates.

When you are done, open **`yourdomain.com/content-check/`**. It reads `content.js`, tells you in plain
English if there is a typo (and which line), checks that your screenshots exist, and shows what the site
will display.

## Before you start

* Edit `content.js` in **Notepad, TextEdit (plain text mode) or VS Code**. Not Word or Google Docs: they
  swap in curly quotes, which break the file.
* Text goes in `"straight double quotes"`.
* Things in a list `[ ... ]` or a group `{ ... }` are separated by **commas**.
* A line starting with `//` is a note to you and is ignored. Delete the `//` to switch an example on.
* Write plain text. No HTML.

If you are unsure, copy an example that already works and change the words.

## Add someone to the team

Find the role in the `team` section and put them inside its `members` list:

```js
{
  name: "Scripters",
  description: "Write the Luau behind every system, from vehicles to votes.",
  open: true,
  members: [
    { name: "Sam", username: "SamRobloxName", title: "Lead scripter" },
    "Another Person"
  ]
},
```

`username` and `title` are optional. A username becomes a link to their Roblox profile. A plain
`"Name"` in quotes works too. When you have people listed, set `note: ""` to remove the
"Full roster coming soon." line.

## Change a role, or whether you are recruiting

Each role has a `description`, and `open: true` puts a "Recruiting" tag on it. The sentence in the
"Want to help build the next one?" boxes is `team.hiring`. Set it to `""` to hide those boxes.

To add a role, copy one whole `{ name: ..., members: [] }` block, paste it after another with a comma
between them, and change the words.

## Change a game's status or release date

In `games`, find the game and change two lines:

```js
"project-alba": {
  status: "testing",
  release: "Spring 2027",
  play: "",
  ...
```

`status` is one of `"live"`, `"soon"`, `"testing"` or `"dev"`. It updates the label on the home page,
the games lists, the game's page and its facts box. `release` can be any text. When a game goes live,
paste its Roblox link into `play` and a **Play on Roblox** button appears on its page.

## Post news or an update

In `news`, copy a whole post (from `{` to `}`) and paste it above the others with a comma after it:

```js
{
  date: "2026-11-02",
  game: "project-alba",
  title: "First test drive",
  text: "The first route is drivable in Studio.",
  items: ["Added a tachometer", "Fixed steering at low speed"]
},
```

`game` is `"westbrook-county"`, `"project-alba"`, `"oath-of-caledonia"`, or `""` for studio-wide news.
`items` and `text` are both optional; use either or both. `link` adds a "Read more" link. Newest posts are
shown first (set by `date`, written year-month-day). The latest post shows in full on the game's page,
older ones sit under "Earlier updates", and the three newest appear on the home page.

## Add screenshots

1. Put the picture in `assets/img/screenshots/`. Around 1600 pixels wide, JPG or WebP, under 400 KB
   keeps the site quick. Avoid spaces in the file name.
2. Add a line under that game's `screenshots` list:

```js
screenshots: [
  { image: "assets/img/screenshots/alba-1.jpg", caption: "Testing the first route" },
  { image: "assets/img/screenshots/alba-2.jpg", caption: "Early night lighting" }
]
```

Write the path without a leading slash, exactly as above. A "Screenshots" section appears on the game's page as soon as there is at least one. Clicking a picture
opens it full size.

## Change Discord or Roblox group links

At the top of `content.js`, `links.discord` and `links.group` are used by every button and the footer.
(The Discord link is currently the Westbrook County server.) If you leave one as `""`, its buttons are
hidden.

## Things that are not in content.js

The wording on the pages (what each game is about, the Westbrook County departments and features, the
About text) is in each page's `index.html`. You can edit those directly, or ask Claude to change them.

## If something looks wrong

* **Page shows old content:** hard refresh (Ctrl+F5 / Cmd+Shift+R). Some hosts and CDNs keep `content.js`
  for a few minutes or hours; Cloudflare has a "Purge cache" button.
* **Something is missing:** run `/content-check/`. An unknown field name (for example `memebers`) is
  ignored silently by the site but flagged there.
* **The whole file is broken:** the site keeps showing the last saved version of each page until you fix
  it, so visitors never see a blank page. `/content-check/` shows the line number.
