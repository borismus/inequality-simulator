function Simulation(rules, opt_properties) {
  // Array of Rules which get executed.
  this.rules = [];
  for (var i = 0; i < rules.length; i++) {
    this.rules.push(new Rule(rules[i]));
  }

  // Properties.
  var properties = opt_properties ? opt_properties : this.getProperties_(this.rules);

  // String Array of property names which each actor must have.
  this.properties = properties;
  this.optionalProperties = ['total'];

  // Actors involved in the simulation.
  this.actors = [];

  this.previousStep = -1;
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
  this.previousRule = this.currentRule;
  // Execute the current rule.
  var rule = this.rules[this.currentRule];
  this.executeRule_(rule);

  // Go to the next rule.
  this.goToNextRule_();

  // Evaluate all subsequent hidden rules if there are any.
  this.executeFutureHiddenRules_();
};

Simulation.prototype.executeRule_ = function(rule) {
  for (var i = 0; i < this.actors.length; i++) {
    var actor = this.actors[i];
    
    // If there are conditionals, they must all be true to evaluate the rule.
    var conds = rule.conditionals;
    var shouldExecute = conds ? this.evalConds_(conds, actor) : true;

    if (shouldExecute) {
      rule.action.evaluate(actor);
    }
  }
};

Simulation.prototype.evalConds_ = function(conds, actor) {
  for (var i = 0; i < conds.length; i++) {
    var cond = conds[i];
    if (!cond.evaluate(actor)) {
      return false;
    }
  }
  return true;
};

Simulation.prototype.executeFutureHiddenRules_ = function() {
  var rule = this.rules[this.currentRule];
  if (rule.hidden) {
    this.step();
  }
};

Simulation.prototype.goToNextRule_ = function() {
  this.currentRule += 1;

  // Loop back to the first rule if we just finished the last rule.
  if (this.currentRule >= this.rules.length) {
    this.currentRule = 0;
    this.currentStep += 1;
  }
};

Simulation.prototype.validateActorProperties_ = function(properties) {
  // Check that all specified properties are valid (required or optional).
  for (var p in properties) {
    if (this.properties.indexOf(p) < 0 && this.optionalProperties.indexOf(p)) {
      // This is an invalid property.
      console.error('Found an invalid property: %s', p);
      return false;
    }
  }
  
  // Check that all simulation properties are specified.
  for (var i = 0; i < this.properties.length; i++) {
    var p = this.properties[i];
    if (properties[p] === undefined) {
      // A property is not defined.
      console.error('Required property not specified: %s', p);
      return false;
    }
  }
  return true;
};

Simulation.prototype.getProperties_ = function(rules) {
  var properties = ['label'];
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    properties = Util.appendArrays(properties, rule.getProperties());
  }
  // Remove 'total', it's not required.
  Util.removeArrayItem(properties, 'total');
  return properties;
};
