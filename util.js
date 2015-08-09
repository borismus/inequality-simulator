var Util = {};

/**
 * Normal distribution implementation. Polar form of the Box-Muller
 * transformation.
 */
Util.getRandomNormal = function(mean, sd) {
  return mean + (this.gaussRandom_() * sd);
};

/*
 * Returns random number in normal distribution centering on 0.
 * ~95% of numbers returned should fall between -2 and 2
 *
 * From http://stackoverflow.com/questions/75677/converting-a-uniform-distribution-to-a-normal-distribution?rq=1
 */
Util.gaussRandom_ = function() {
    var u = 2*Math.random()-1;
    var v = 2*Math.random()-1;
    var r = u*u + v*v;
    /*if outside interval [0,1] start over*/
    if(r == 0 || r > 1) return this.gaussRandom_();

    var c = Math.sqrt(-2*Math.log(r)/r);
    return u*c;

    /* todo: optimize this algorithm by caching (v*c) 
     * and returning next time gaussRandom() is called.
     * left out for simplicity */
};


module.exports = Util;
