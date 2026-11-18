# ValetNoPay

Find parking in Münster that stays free and legally allowed for your whole stay.
Live public beta: https://vale-ntins-tag.github.io/valetnopay/

Real places stay in "Needs checking" until all stay rules are verified. Pins
marked as demos are fictional and only test the filters. There is no live
vacant-space feed: a match means only that the recorded rules fit your stay.
Check signs and temporary restrictions before parking.

## Repository layout

- `index.html`, `sw.js` (repository root): the deployed website, served by
  GitHub Pages from the main branch. These are build outputs - do not edit
  them directly.
- `app/`: the editable React + Vite source, the bundle builder and the test
  scripts.

## Make a change and publish it

Requires Node.js 20+, npm and Python 3.

```sh
cd app
npm ci
npm run build          # produces app/dist/
python3 bundle.py      # produces app/publish/index.html and app/publish/sw.js
```

Test before publishing (needs a Chrome/Chromium binary):

```sh
node check.cjs         # core behaviour at 320/390/1280 px, local build
node check-map.cjs     # map width, wheel zoom and reset, local build
node check-pinch.cjs   # two-finger pinch zoom, local build
node check-offline.cjs # offline reload and saved data, local build
```

Publish:

```sh
cp publish/index.html ../index.html
cp publish/sw.js ../sw.js
git add -A && git commit -m 'Describe the change'
git push
```

GitHub Pages deploys the root files automatically; the site updates about a
minute after the push. Verify the live site afterwards:

```sh
node check-live.cjs        # live site behaviour and layout
node check-live-map.cjs    # live map width and wheel zoom
node check-live-offline.cjs # live offline behaviour
```

## Undo a bad release

Every published state is a commit on the main branch. To roll back:

```sh
git log --oneline          # find the last good commit
git revert <bad-commit>    # or: git checkout <good-commit> -- index.html sw.js
git push
```

## Data rules

Parking rules live in `app/src/real.json`. Never invent rules: anything not
confirmed by the named source stays out, and the place stays in
"Needs checking". Update the `checked` date when you re-verify a place.
