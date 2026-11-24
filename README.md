# 🐍 Snake Game

A classic Snake game built with vanilla HTML, CSS, and JavaScript — no frameworks, no dependencies. Designed as a teaching example.

## Features

- Arrow-key controls (⬆ ⬇ ⬅ ➡)
- Smooth gradient snake with a glowing head and eyes
- Food spawning with score increment
- Progressive speed-up as your score grows
- Best score saved in `localStorage`
- Wall and self-collision → Game Over
- Start / Restart buttons and an intro overlay
- Headless Node test harnesses that verify the game logic without a browser

## How to run

Open `index.html` in any modern browser. That's it — no build step, no server required.

Or run a quick static server:

```bash
python -m http.server 8080
```

Then visit http://localhost:8080.

## Testing

The logic is verified headlessly in Node with a mocked DOM:

```bash
node test_logic.js
node test_food.js
node test_restart.js
```

All 15 checks currently pass.

## Project structure

```
snake-game/
├── index.html      # Page structure + canvas
├── style.css       # Styling and layout
├── script.js       # Game logic and rendering
├── test_logic.js   # Movement / collision / game-over tests
├── test_food.js    # Food + score tests
└── test_restart.js # Restart / reset tests
```