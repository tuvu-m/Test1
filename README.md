# Suomi–English Flashcards 🇫🇮 → 🇬🇧

A category-based Finnish–English flashcard game inspired by [ykimock.fi](https://ykimock.fi)
and the vocabulary themes of the **Suomen mestari** textbook series (YKI / beginner–intermediate level).

Around **1000 cards** across ~25 topics. Every card hides its explanation until you flip it:

- **Sanaluokka** — word type (substantiivi, verbi, adjektiivi, …)
- **Esimerkkilause** — an example sentence in Finnish, with English translation
- **Käyttövihje** — a usage note (inflection / genitive stem, consonant gradation,
  case government, register, common collocations)

## Features

- **Category picker** with per-topic progress bars and a live search filter.
- **Flashcard mode** — tap / space to flip, then mark *Osaan* (know) or *En osaa* (don't know).
  Previous / next / shuffle, plus a review-your-mistakes round at the end.
- **Quiz mode** — 4-option multiple choice with instant feedback and a score.
- **Direction toggle** — study FI → EN or EN → FI.
- **Progress saved** in the browser (`localStorage`); reset any time.
- **Light / dark theme**, responsive down to phone width, keyboard shortcuts.

Keyboard (flashcard mode): `Space`/`Enter` flip · `←`/`→` prev/next · `1` don't know · `2` know.

## Run it

No build step or server needed — just open the file:

```
open index.html      # macOS
xdg-open index.html  # Linux
```

## Project structure

```
index.html            # app shell / markup
assets/css/styles.css # styles (light + dark, responsive)
assets/js/app.js       # game logic (vanilla JS, no dependencies)
data/cards.js          # generated card data → window.FLASHCARDS
cards-src/*.json       # source vocabulary, grouped by category set
tools/build-cards.js   # combines cards-src/*.json → data/cards.js (validates & dedupes)
```

## Editing / adding cards

Edit the JSON in `cards-src/` (each card needs `fi, en, type, example_fi, example_en, note`),
then regenerate the data file:

```
node tools/build-cards.js cards-src data/cards.js
```

The build validates required fields and word types, removes duplicate headwords, and
orders the categories in a Suomen-mestari-style progression.
