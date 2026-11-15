# Validation and next steps

## Technical checks

Automated tests, with no game dependencies to install (Node 22 or later):

```bash
node --test tests/regresiones.mjs tests/mecanicas.mjs tests/guardado.mjs
```

- `tests/regresiones.mjs`: empty and invalid DONKI answers; the three DONKI sources in order (flare list, flare notifications with
  strong flares only, CCMC server); a cache that keeps the original query time; an honest historical fallback; bilingual content;
  864 power plans compared with the engine's real progress; hunger, tasks, delayed replies and video calls; and the random emergency
  schedule (the storm is announced 2 sols ahead, never overlaps the solar conjunction, and demo mode keeps a fixed script).
- `tests/mecanicas.mjs`: shielding by sections (roof vs. walls), dose per astronaut and the spacewalk backpack.
- `tests/guardado.mjs`: saving the mission and continuing it later.

`tests/browser.mjs` is the visual test and needs Chrome (see below); it is not part of the command above.

## Balance check: no free safe choice

The challenge asks that no option be "safe" at no cost. We simulated 400 games per strategy (Commander rank, random emergency days):

| Strategy | Result |
|---|---|
| Lab at level 1, always take shelter, never go outside | Always survives, but **only 1 star**: not enough science |
| Lab at level 2, never go outside | 2 or 3 stars, with a risk of blackouts during the dust storm |
| Lab at level 1 plus spacewalks for rocks | 2 or 3 stars, paying with suit oxygen and radiation |
| Never take shelter from flares | **Loses every time** (radiation limit) |

Higher scores require taking some risk, and ignoring radiation always fails. The science goal (60 points for Commander, 35 for Cadet)
was raised from 40 and 25 for this reason: before, the safe strategy earned 3 stars about 85% of the time.

## Changes made after feedback from one player

Feedback on the original link led to these adjustments:

- Start screen with the goal, a three-action loop and an explicit choice of guide in every game. Skipping it does not mark it as completed.
- A separate panel for each building; crew and inventory have their own entries from Base control.
- Pick-up notice of 2.5 seconds, placed so it avoids the HUD and the controls. Full explanations are in the Inventory.
- Greenhouse with harvest, consumption, change in stores and estimated duration. Starting food: 50 for Cadet and 40 for Commander. With
  stores at 20 or less there is a hunger penalty of 3 health per sol; with no food, 10. These are game rules.
- Antenna with an inbox of alerts and replies, the number of pending messages and an explanation of each level. Replies wait if the
  antenna is switched off.

The Chrome tests cover the full guide, one system per building and no overlap of the pick-up notice at 1440×1000, 390×844 and 844×390.
They check that the end-sol button is not cut off on phones. The engine tests cover hunger, receiving tasks, pending replies and video calls.

The next human check should confirm whether players understand food and the antenna without the team explaining them. The original
feedback is evidence of usability problems; these fixes have not been tested with people yet.

The visual test uses the Chrome debugging protocol and Node 22 or later, without Playwright:

1. Serve the project: `python -m http.server 5500 --bind 127.0.0.1`.
2. Open Chrome with a temporary profile, separate from your personal one:

```powershell
$perfilQA = Join-Path (Get-Location) 'node_modules\chrome-qa'
Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -WindowStyle Hidden -ArgumentList @('--headless=new', '--remote-debugging-port=9222', ('--user-data-dir="' + $perfilQA + '"'), '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank')
node tests/browser.mjs
```

The script opens and closes its own tab. It checks the start screen, keeping the name, location, console, events and their results,
timer, help, NASA data, the full demo, the bilingual review and the mobile layout. It saves screenshots in `node_modules/qa/` (outside
Git). The game loads Three.js from a CDN, so the visual test needs access to that CDN.

## Testing with children: pending

No tests with children have been carried out as part of this work. The automated tests check that the game works; they do not show
that players learn.

Test with 3 to 5 participants aged 7 to 12, with an adult present. There is no need to record names or personal information.

Before playing, ask without giving the answer:

1. If electricity runs short, how is that related to the air in the base?
2. What do you lose by protecting everyone in a shelter?
3. Why can't Earth solve an emergency right away?

Watch a short game without saying where to click. Note whether they understand the instructions, where they ask for help and whether
they can explain a consequence. Ask the questions again before showing the answers in the final review; then let them practise with the review.

| Anonymous participant / age range | Answers before (0 to 3) | After, before feedback (0 to 3) | First difficulty | Explains a decision in their own words? |
|---|---|---|---|---|
| A | | | | |
| B | | | | |
| C | | | | |
| D | | | | |
| E | | | | |

Treat the results as an exploratory observation of a small sample. The review counter lets players correct their answers: it is for
practice, not an independent measure of learning.

## Before submitting

- Check the public link in a private window and on a phone.
- Confirm that Cloudflare is serving the reviewed commit: the public site is deployed from `main`, so a push to another branch does not change it.
- Record a walkthrough of `?demo=1&lang=en` and keep the video so the presentation does not depend on the network.
- Confirm the fields, video format and deadline on the Space Apps team page.
- Only add results from users who were actually observed.
