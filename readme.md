# Infection Simulation
Converts any HTML5 canvas element to a stage for an adapted form of [Conway's game of life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life). Instead of seeing the spread of population, simulation depicts the spread of an infection. Written as a jQuery plugin.

## Usage
```js
// init simulation on canvas object
var $simulation = $('#canvas');
$simulation.infectionSimulation({});

// get instance
var simulation = $simulation.data("gameOfLife");

// start simulation
game.toggle();
```
