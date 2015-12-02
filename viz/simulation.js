function Simulation(properties, rules) {
  // These define the simulation.

  // String Array of property names which each actor must have.
  this.properties = properties;
  // Array of Rules which get executed.
  this.rules = rules;

  // Actors involved in the simulation.
  this.actors = [];

  this.currentStep = 0;
  this.currentRule = 0;
}

Simulation.prototype.addActor = function(properties) {
  // Ensure that all properties are valid.
  if (!this.validateActorProperties_(properties)) {
    return;
  }
  this.actors.push(new Actor(properties));
};

Simulation.prototype.step = function() {
  // Execute the current rule.
  var rule = this.rules[this.currentRule];
  this.executeRule_(rule);

  // Go to the next rule.
  this.currentRule += 1;
  // Loop back to the first rule if we just finished the last rule.
  if (this.currentRule >= this.rules.length) {
    this.currentRule = 0;
    this.currentStep += 1;
  }
};

Simulation.prototype.executeRule_ = function(rule) {
  var action = rule.action;
  console.log('Executing rule: %s (%f * %s)', rule.label, action.value, action.property);

  // Apply this rule to all actors.
  for (var i = 0; i < this.actors.length; i++) {
    var actor = this.actors[i];
    actor.total += action.value * actor[action.property];
  }
};

Simulation.prototype.validateActorProperties_ = function(properties) {
  // Check that all specified properties are valid.
  for (var p in properties) {
    if (this.properties.indexOf(p) < 0) {
      // This is an invalid property.
      console.error('Found an invalid property: %s', p);
      return false;
    }
  }
  
  // Check that all simulation properties are specified.
  for (var i = 0; i < this.properties.length; i++) {
    if (!properties[this.properties[i]]) {
      // A property is not defined.
      console.error('Required property not specified: %s', p);
      return false;
    }
  }
  return true;
};
