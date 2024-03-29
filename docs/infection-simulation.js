/*
 *  infection-simulation.js - v0.0.1
 *  HTML5 canvas infection simulation.
 *  https://github.com/eschmar/infection-simulation
 *
 *  @author:   Marcel Eschmann, @eschmar
 *  @license:  MIT License
 */
;(function ($, window, document, undefined) {
    "use strict";

    // default config
    var defaults = {
        size: 50,
        probabilityToInfectNeighbour: 0.1,
        lengthOfIllness: [2, 6],
        probabilityOfDeath: 0.05,
        colors: {
            initial: '#ececec',
            immune: '#969320',
            sick: '#AA3939',
            dead: '#333333'
        },
        transparent: true,
        speed: 50,
        onClick: false
    };

    var states = {
        initial: 'initial',
        immune: 'immune',
        sick: 'sick',
        dead: 'dead'
    };

    // runtime variables
    var ctx,
        xLength,
        yLength,
        population,
        future,
        timer,
        alive;

    // constructor
    function InfectionSimulation (element, options) {
        this.element = element;

        // merge settings with defaults
        this.settings = $.extend({}, defaults, options);

        this.states = states;
        this.init();
        this.future = $.extend(true, [], this.population);
    }

    $.extend(InfectionSimulation.prototype, {
        init: function (){
            this.ctx = this.element.getContext('2d');

            var cellSize = 2;
            if (this.settings.size <= 120) {
                cellSize = 10;
            }else if (this.settings.size <= 240) {
                cellSize = 6;
            }else if (this.settings.size <= 360) {
                cellSize = 4;
            }

            // set the cell size
            this.xLength = cellSize;
            this.yLength = cellSize;

            // resizse the canvas
            this.element.width = this.settings.size * this.xLength;
            this.element.height = this.settings.size * this.yLength;

            // reset cells
            for (var i = 0; i < this.settings.size; i++) {
                for (var j = 0; j < this.settings.size; j++) {
                    this.resetCell(i, j);
                }
            }

            // init array
            this.population = [];
            for (var i = 0; i < this.settings.size; i++) {
                this.population[i] = [];
            }

            // init onclick event
            if (this.settings.onClick) {
                this.initOnClick();
            }
        },

        /**
         *  Triggers custom handler on click/touch
         */
        initOnClick: function() {
            var self = this;
            $(self.element).on('click touchstart', function(event) {
                var offset, left, top;
                offset = $(self.element).offset();
                left = event.pageX - offset.left;
                top = event.pageY - offset.top;
                self.settings.onClick(self, Math.floor(left / self.xLength), Math.floor(top / self.yLength));
                event.stopPropagation();
            });
        },

        /**
         *  Triggers sickness on a cell.
         */
        contaminateCell: function(x, y, force) {
            if (typeof force == 'undefined') { force = false; }
            var randomLength = this.getRandomInt(this.settings.lengthOfIllness);
            this.future[x][y] = randomLength;

            if (force) {
                this.population[x][y] = randomLength;
            }

            this.updateCellColor('sick', x, y);
        },

        /**
         *  Update a cell's color according to its state.
         */
        updateCellColor: function(state, x, y) {
            var color = this.settings.colors[state];
            this.ctx.fillStyle = color;
            this.ctx.fillRect(
                x*this.xLength+1, 
                y*this.yLength+1, 
                this.xLength-1, 
                this.yLength-1
            );
        },

        /**
         *  Mark a single cell as sick.
         */
        markAsSick: function(x, y) {
            this.updateCellColor('sick', x, y);
        },

        /**
         *  Mark a single cell as immune.
         */
        markAsImmune: function(x, y) {
            this.updateCellColor('immune', x, y);
        },

        /**
         *  Mark a single cell as dead.
         */
        markAsDead: function(x, y) {
            this.updateCellColor('dead', x, y);
        },

        /**
         *  Reset a single cell.
         */
        resetCell: function(x, y) {
            this.updateCellColor('initial', x, y);
        },

        /**
         *  Helper function returning a boolean based on the given probability.
         */
        getRandomAnswer: function(probability) {
            var random;
            if (window.crypto) {
                var values = new Uint32Array(1);
                window.crypto.getRandomValues(values);
                var random = (values[0] % 100) / 100;
            }else {
                random = Math.random();
            }

            return random < probability;
        },

        /**
         *  Helper function returning an intenger between min and max.
         */
        getRandomInt: function(minMax) {
            var min = Math.ceil(minMax[0]);
            var max = Math.floor(minMax[1]);
            return Math.floor(Math.random() * (max - min)) + min;
        },

        /**
         *  Contamination is modeled as follows:
         *  - The disease to be simulated is spread by direct contact between individuals.
         *  - An individual is ill for a random number of days...
         *  - during which time there is a probability that the individual infects each of 
         *    its direct neighbors (normally 8) in the population.
         *  - An individual that gets infected one day you cannot infect other individuals the same day.
         *  - Every day an individual is ill, there is also a probability that the individual dies.
         *  - An individual who dies is not contagious.
         *  - A sick person cannot be infected.
         *  - An individual who has been ill but recovered, i.e. who is healthy, is immune and cannot be infected again.
         */
        live: function(x, y){
            // if not infected, do nothing
            if (!Number.isInteger(this.population[x][y])) {
                return;
            }

            // currently infected
            var daysToBeSick = this.population[x][y];

            // cell overcomes sickness
            if (daysToBeSick <= 0) {
                this.future[x][y] = this.states.immune;

            // cell dies
            }else if (daysToBeSick > 0 && this.getRandomAnswer(this.settings.probabilityOfDeath)) {
                this.future[x][y] = this.states.dead;

            // cell continues to be sick
            }else {
                this.future[x][y] = daysToBeSick - 1;
            }

            this.infectNeighboursOf(x, y);
        },

        /**
         *  Tries to infect all neighbours.
         */
        infectNeighboursOf: function(x, y) {
            // visit all neighbours
            var t, s;
            for (var i = -1; i < 2; i++) {
                for (var j = -1; j < 2; j++) {
                    t = (x + i + this.settings.size) % this.settings.size;
                    s = (y + j + this.settings.size) % this.settings.size;

                    // skip x,y itself
                    if (x == t && y == s) { continue; }

                    // cell has not been sick, yet.
                    if (typeof this.population[t][s] == 'undefined') {
                        if (this.getRandomAnswer(this.settings.probabilityToInfectNeighbour)) {
                            this.contaminateCell(t, s);
                        }
                    }
                }
            }
        },

        /**
         *  Advance one step in time.
         */
        advance: function() {
            // hard copy current population
            this.future = $.extend(true, [], this.population);

            // live life
            for (var i = 0; i < this.settings.size; i++) {
                for (var j = 0; j < this.settings.size; j++) {
                    this.live(i, j);
                }
            }

            // update view
            for (var i = 0; i < this.settings.size; i++) {
                for (var j = 0; j < this.settings.size; j++) {
                    if (this.population[i][j] !== this.future[i][j]) {
                        if (Number.isInteger(this.future[i][j])) {
                            this.markAsSick(i, j);
                        }else if (this.future[i][j] === this.states.dead) {
                            this.markAsDead(i, j);
                        }else if (this.future[i][j] === this.states.immune) {
                            this.markAsImmune(i, j);
                        }
                    }
                }
            }
            
            // back to the future
            this.population = this.future;
        },

        /**
         *  Reset the simulation.
         */
        reset: function() {
            this.init();

            // reset cells
            for (var i = 0; i < this.settings.size; i++) {
                for (var j = 0; j < this.settings.size; j++) {
                    this.resetCell(i, j);
                }
            }
        },

        /**
         *  (Un)freeze time.
         */
        toggle: function() {
            if (!this.alive) {
                var self = this;
                this.timer = setInterval(function() {
                    self.advance();
                }, this.settings.speed);
                this.alive = true;
            }else {
                clearInterval(this.timer);
                this.alive = false;
            }
        },

        updateSettings: function(options) {
            var updateTimer = false;
            if (options.speed && options.speed != this.settings.speed && this.alive) {
                updateTimer = true;
            }

            // merge settings with new values
            this.settings = $.extend({}, this.settings, options);

            if (updateTimer) {
                this.toggle();
                this.toggle();
            }
        }
    });

    // plugin wrapper
    $.fn["infectionSimulation"] = function ( options ) {
        return this.each(function() {
            if (!$.data(this, "infectionSimulation")) {
                $.data(this, "infectionSimulation", new InfectionSimulation(this, options));
            }
        });
    };
})(jQuery, window, document);