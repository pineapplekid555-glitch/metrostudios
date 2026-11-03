/* ============================================================================
   METRO STUDIOS: SITE CONTENT

   This is the only file you need to edit to update the team, game status,
   release dates, news, screenshots and links. Save it, upload it over the old
   one, and every page updates. Afterwards, open  /content-check/  on your site
   and it will tell you if you made a typo.

   THREE RULES
   1. Text goes inside "double quotes" (the plain straight kind, not the curly kind).
   2. Things in a list [ ... ] or a group { ... } are separated by commas.
   3. A line starting with // is a note to you. The site ignores it.
      To switch an example on, delete the // at the start of its lines.

   Write plain text only (no HTML). Edit this file in Notepad, TextEdit (plain
   text mode) or VS Code, never in Word or Google Docs.

   Step-by-step examples: EDITING.md (in the same folder as this file)
   ============================================================================ */

window.SITE = {

  /* ------------------------------------------------------------------ LINKS
     Used by every Discord and Roblox group button and in the footer.        */
  links: {
    discord: "https://discord.gg/dByeJMQQdh",   // currently the Westbrook County Discord
    group:   "https://www.roblox.com/search/communities?keyword=Metro%20Studios"   // swap for your group's page when you have it
  },


  /* ------------------------------------------------------------------ GAMES
     status:  "live"     -> Out now
              "soon"     -> Coming soon
              "testing"  -> In testing
              "dev"      -> In development
     release: anything you like, e.g. "Spring 2027" or "14 March 2027".
              Leave "" if there is no date yet.
     play:    the Roblox link for the game. When it is filled in, a
              "Play on Roblox" button appears on that game's page.
     screenshots: pictures for the game's page (see the example below).      */
  games: {

    "westbrook-county": {
      status: "live",
      release: "",
      play: "https://www.roblox.com/games/86179625322199/Emergency-Westbrook-County",
      website: "https://westbrookcounty.co.uk",
      screenshots: [
        // { image: "assets/img/screenshots/westbrook-1.jpg", caption: "Police pursuit on Main Road" },
      ]
    },

    "project-alba": {
      status: "dev",
      release: "",
      play: "",
      website: "",
      screenshots: [
        // { image: "assets/img/screenshots/alba-1.jpg", caption: "Testing the first route" },
      ]
    },

    "oath-of-caledonia": {
      status: "dev",
      release: "",
      play: "",
      website: "",
      screenshots: [
        // { image: "assets/img/screenshots/oath-1.jpg", caption: "Early look at the campaign screen" },
      ]
    }
  },


  /* ------------------------------------------------------------------- NEWS
     One block per post. Newest posts show first whatever order you write them in.
     date:  year-month-day, e.g. "2026-10-12"
     game:  "westbrook-county", "project-alba", "oath-of-caledonia",
            or "" for studio-wide news
     title: a short headline
     items: a list of changes (optional)
     text:  a sentence or two instead of, or as well as, items (optional)
     link:  a link to read more (optional)

     To add a post, copy a whole { ... }, paste it above the others, change the
     words, and make sure there is a comma after its closing }.             */
  news: [
    {
      date: "2026-10-12",
      game: "westbrook-county",
      title: "Weekly update",
      items: [
        "New police liveries",
        "Seasons added to the game, with fall as the default (customisable in private servers)",
        "Private server API keys and remote access",
        "New police stage 3 ELS pattern and new police lightbars",
        "Upgraded graphics and optimisation for lower-end devices",
        "Custom street light colours in private servers",
        "Changeable licence plates in private servers (UK, US, custom and more)",
        "Fixes for DOT mechanics on trucks, Fire ELS and DMV record changes",
        "Auto shop fix so civilian and police vehicles are no longer mixed up",
        "Anti-exploit upgraded after some false bans",
        "2020 Audi RS6 Avant C8 and 2021 Dodge Durango added to the police team"
      ]
    }
  ],


  /* ------------------------------------------------------------------- TEAM
     note:   a line shown under the roles on the Team page. Use "" to hide it.
     hiring: the sentence shown in the "join us" boxes. Use "" to hide them.
     roles:  each role has a name, a description, and (optionally) people.
             open: true  adds a "Recruiting" tag to the role.
     members can be written two ways:
         { name: "Display name", username: "RobloxUsername", title: "Lead scripter" }
         "Just a name"
     username and title are optional. A username links to the Roblox profile. */
  team: {
    note: "Full roster coming soon.",
    hiring: "We are looking for scripters, builders, modellers and UI designers.",

    roles: [
      {
        name: "Leads",
        description: "Set the direction for each game and keep the whole studio moving the same way.",
        open: false,
        members: [ { name: "Ben", username: "bk_5550", title: "Owner" },
    
          // { name: "Your name", username: "YourRobloxUsername", title: "Founder" },
        ]
      },
      {
        name: "Scripters",
        description: "Write the Luau behind every system, from vehicles to votes.",
        open: true,
        members: []
      },
      {
        name: "Builders",
        description: "Lay out the towns, roads and buildings that players move through.",
        open: true,
        members: []
      },
      {
        name: "Modellers",
        description: "Make the vehicles, props and small details that sell a place.",
        open: true,
        members: []
      },
      {
        name: "UI and graphics",
        description: "Design the menus, HUDs and visuals that players see first.",
        open: true,
        members: []
      },
      {
        name: "Community",
        description: "Look after players, run the Discord and keep servers friendly.",
        open: false,
        members: []
      }
    ]
  }
};
