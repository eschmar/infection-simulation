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
            initial: 'white',
            immune: '#969320',
            sick: '#641560',
            dead: '#000000'
        },
        colorEmpty: '#fafafa',
        transparent: true,
        speed: 100,
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
    }

    $.extend(InfectionSimulation.prototype, {
        init: function (){
            this.ctx = this.element.getContext('2d');
            this.xLength = Math.floor((this.element.width) / this.settings.size);
            this.yLength = Math.floor((this.element.height) / this.settings.size);

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

        forceUpdateCell: function(state, x, y) {
            if (state === this.states.sick) {
                this.future[x][y] = this.getRandomInt(this.settings.lengthOfIllness[0], this.settings.lengthOfIllness[1]);
            }else {
                this.future[x][y] = state;
            }

            this.updateCellColor(state, x, y);
        },

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

        markAsImmune: function(x, y) {
            this.updateCellColor('immune', x, y);
        },

        markAsDead: function(x, y) {
            this.updateCellColor('dead', x, y);
        },

        getRandomAnswer: function(probability) {
            return Math.random() < probability;
        },

        getRandomInt: function(min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
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
            if (!Number.isInteger(this.population[x][y])) {
                return;
            }

            // visit all neighbours
            var t, s;
            for (var i = -1; i < 2; i++) {
                for (var j = -1; j < 2; j++) {
                    t = (x + i + this.settings.size) % this.settings.size;
                    s = (y + j + this.settings.size) % this.settings.size;

                    if (typeof this.population[t][s] == 'undefined') {
                        // An individual is ill for a random number of days during which time there is a probability that the individual infects each of its direct neighbors (normally 8) in the population. 
                        if (this.getRandomAnswer(this.settings.probabilityToInfectNeighbour)) {
                            this.future[t][s] = this.getRandomInt(this.settings.lengthOfIllness[0], this.settings.lengthOfIllness[1]);
                        }
                    }else if (Number.isInteger(this.population[t][s])) {
                        this.future[t][s] = this.population[t][s] - 1;

                        if (this.population[t][s] == 0) {
                            // An individual who has been ill but recovered, i.e. who is healthy, is immune and cannot be infected again.
                            this.future[t][s] = this.states.immune;
                        }else if (this.getRandomAnswer(this.settings.probabilityOfDeath)) {
                            // Every day an individual is ill, there is also a probability that the individual dies. 
                            this.future[t][s] = this.states.dead;
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