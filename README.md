# Half-Heard

A lyric that only comes into focus when you pay attention to it. Made for DIGIHUM 2120 (Digital Creativity), Creative Sprint 7.

Seven lyric lines drift faded and blurred, like a song playing in the background. Press and hold a line until it sharpens, then drag it into an order. No order is correct. Each completed order is printed as a stanza and added to a private trail, so you can compare how your reading changed between passes. The trail lives only in the open page: nothing is saved, counted or sent anywhere.

## Files

| File | What it does |
|---|---|
| `index.html` | Page structure |
| `style.css` | Layout, drifting and blur effects |
| `script.js` | Hold-to-focus, drag and drop, the trail |
| `lyrics.js` | The lyric lines (edit this to change the words) |

## Run it locally

Open `index.html` in a browser. No build step or dependencies.

## Publish with GitHub Pages

1. Create an empty public repository on GitHub named `half-heard` (no README).
2. In this folder, run:
   ```
   git remote add origin https://github.com/YOUR-USERNAME/half-heard.git
   git push -u origin main
   ```
3. On GitHub, open **Settings > Pages**, set **Source** to "Deploy from a branch", choose `main` and `/ (root)`, then **Save**.
4. After a minute the site is live at `https://YOUR-USERNAME.github.io/half-heard/`.

## Credits

- No outside images, fonts or libraries: the page uses system fonts and plain HTML, CSS and JavaScript.
- Code written with assistance from Claude (Anthropic).
