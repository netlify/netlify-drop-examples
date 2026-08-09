# Link in bio

One page for your name, a short bio, and every link you want to hand out. Made
for the single URL a social profile gives you, so one address covers everywhere
else you can be found.

You do not need to know how to build websites to use this. The page is already
finished. Your job is to swap in your own words and links, which you do by
typing over the text in a file, the same way you would edit a document. Nothing
to install, nothing to sign up for, and no way to break it that a quick undo
will not fix.

## Make it yours

Open the folder and double-click `index.html`. It opens in your browser, which
is the same thing visitors will see. Then open that same file in any text editor
to change it. TextEdit or Notepad will do; a free editor like
[VS Code](https://code.visualstudio.com/) makes it easier to read.

Search the file for `EDIT ME` and you will land on each part meant to be
changed. Those notes are written for you and never show up on the page.

| What you want to change      | Search for                            |
| ---------------------------- | ------------------------------------- |
| Your name, role, location    | `EDIT ME: your name`                  |
| Your links                   | `EDIT ME: your links`                 |
| Other profiles you are on    | `EDIT ME: your other profiles`        |
| The title in the browser tab | `EDIT ME: your page title`            |
| Colors, fonts, spacing       | the top of `styles.css`               |
| Your picture                 | `assets/avatar.svg`                   |

Change the words between the tags, not the tags themselves. In a line like
`<span class="link__title">Portfolio</span>`, "Portfolio" is yours to replace.
To add another link, copy one whole block from `<li>` to `</li>`, paste it below,
and edit the copy.

Save the file and refresh the browser to see the change.

To use a photo instead of the illustrated avatar, put it in the `assets` folder
and change `assets/avatar.svg` in `index.html` to your file's name. Square
pictures work best.

## Publish it

Drag this folder onto [app.netlify.com/drop](https://app.netlify.com/drop) and
you will get a live web address in seconds. No account needed to start. To
update the page later, change the files and drag the folder over again.

## What's in here

```
index.html      the page itself: all of your words and links
styles.css      how it looks: colors, fonts, spacing
script.js       the light/dark switch and the copy-link button
assets/         your picture
favicon.svg     the small icon in the browser tab
```

You may also see a `manifest.json`. It belongs to the gallery this project came
from. Your copy does not need it, so leave it or delete it as you prefer.

## Good to know

- Light and dark both work. The page follows whichever your device is set to,
  and the switch in the corner overrides it and remembers your choice.
- It works with a keyboard and with screen readers, so people who cannot use a
  mouse or cannot see the page can still get through it.
- The numbers beside the links (`01`, `02`, and so on) are decoration. If you
  add or reorder links, renumber them yourself.
