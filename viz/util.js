Util = window.Util || {};

/**
 * Given a simulation, calculates the gini coefficient for the world.
 */
Util.calculateGini = function(simulation) {
  var actors = simulation.actors;
  var numer = 0;
  var denom = 0;
  for (var i = 0; i < actors.length; i++) {
    for (var j = 0; j < actors.length; j++) {
      numer += Math.abs(actors[i].total - actors[j].total);
      denom += actors[i].total;
    }
  }
  return 0.5 * numer / denom;
}

Util.uniquifyArray = function(a) {
  var seen = {};
  return a.filter(function(item) {
    return seen.hasOwnProperty(item) ? false : (seen[item] = true);
  });
}

Util.removeArrayItem = function(a, item) {
  var index = a.indexOf(item);
  if (index == -1) {
    console.warn('Attempt to remove non-existen item \'%s\' from array', item);
    return;
  }
  a.splice(index, 1);
}

Util.appendArrays = function(a1, a2) {
  var out = a1.slice();
  for (var i = 0; i < a2.length; i++) {
    out.push(a2[i]);
  }
  return Util.uniquifyArray(out);
};
