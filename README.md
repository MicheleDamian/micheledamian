# Portfolio: Michele Damian

A single-page portfolio for GitHub Pages. Plain HTML and CSS, no build step, no web fonts,
no cookies. No résumé download and no email address anywhere on the page, so crawlers have
nothing to harvest. Each project is a section with its own anchor, so every résumé bullet
can link straight to it:

| Project                                 | Link for the résumé                                |
|-----------------------------------------|----------------------------------------------------|
| Security Agent                          | `https://micheledamian.github.io/#security-agent`  |
| Tennis Robot Vision                     | `https://micheledamian.github.io/#tennis-robot`    |

Once résumés with these links are out, don't rename the `id`s, or old links will stop
jumping to the project.

## Before you publish

Search the files for `TODO` and `class="ph"`. Placeholders render in yellow with a dashed
outline, so any you miss are obvious on the page.

1. **Umami ID** (`index.html`, `<head>`): replace `REPLACE-WITH-YOUR-UMAMI-WEBSITE-ID`.
2. **Security Agent metrics**:
   - Re-ID top-1 accuracy `XX%` and number of crossings `N`
   - Sighting-to-alert latency `X s`
   - Cloud cost per camera per month `$X`
3. **Tennis Robot Vision metrics**:
   - Speed-up of the custom detector over YOLO on the same device `X×`
   - How early the bounce is predicted `X ms`
4. **Videos**: in each project, replace the `.film__placeholder` block with the `<video>` or
   YouTube `<iframe>` snippet sitting in the comment right above it.
5. **Security Agent chat example**: match the person's description and times to the final video.
6. **Tennis Robot Vision "Built with"**: add or remove tools so the list matches what you used.
7. **Domain**: if you don't use `micheledamian.github.io`, update the canonical URL, the
   `og:` tags and Umami's `data-domains`.

## Deploy

1. Create a public repository named `micheledamian.github.io` (your GitHub username, lower case).
2. Push the contents of this folder to its `main` branch.
3. In the repository: Settings, Pages, Build and deployment, Source: *Deploy from a branch*,
   Branch: `main`, folder `/ (root)`.
4. The site is live at `https://micheledamian.github.io/` within a minute or two.

## Video

- Self-hosted: put the MP4 in `assets/video/` and a poster frame in `assets/img/`.
  Keep it under ~20 MB (720p/1080p, H.264). GitHub rejects files over 100 MB.
- YouTube: upload as *Unlisted* and use the `youtube-nocookie.com` embed provided.

## Navigation

- **Top bar**: links to each project. The one you're reading is highlighted.
- **Project rail** (screens 1360 px and wider): a fixed list on the left with a bar per
  project that fills as the reader scrolls through it. It appears once the projects are on
  screen and hides over the opening screen. It is built automatically by `main.js` from
  every `<article class="project">`, using its `data-short` attribute as the label.

## House map (Security Agent)

The street map in "Three cameras. One car, not three." is an inline SVG, not a Google Maps
embed, so it needs no API key, sets no cookies and shows no real address. It shows a corner
house with a camera on the driveway, the side gate and the back gate; the views don't overlap
and stop at the street. `main.js` drives the car along `#map-route` and lights up a camera's
view while the car is inside it, using each `.map__fov`'s `data-x`, `data-y`, `data-dir`,
`data-half` and `data-range`. If you move a camera, update its wedge path, those attributes
and the solid `.map__seen` segments together. With reduced motion (or no JavaScript) the map
shows a still frame: camera 2 sees the car at the back gate.

## Tracking per application

Add a campaign tag before the `#` when you send a résumé, one per company:

```
https://micheledamian.github.io/?utm_campaign=acme#tennis-robot
```

Umami lists it under UTM/campaigns, alongside the visitor's region and city. The site also
records these events: `github-click`, and `security-agent-video-play` / `tennis-robot-video-play`
(self-hosted videos only).

## Adding a project

1. Copy an `<article class="project">` block and paste it where the "Next project goes here"
   comment is.
2. Give it a new `id` (that becomes its `#anchor`), a `data-short` label for the rail, and
   change the `.project__name` line to the project's name.
3. Add a link to it in the top bar (`.nav__links`) and an entry in the opening screen's
   project list (`.index`).

## Files

```
index.html            the page
assets/css/style.css  all styles
assets/js/main.js     project rail, active-link highlighting, video-play tracking, house-map animation
assets/img/           favicon, link-preview image (og-image.png, 1200x630)
.nojekyll             tells GitHub Pages to serve files as-is
```
