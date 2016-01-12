function Rule(params) {
  this.label = params.label;
  this.action = new Expression(params.action);
  this.conditionals = [];
  var cond = params.condition;
  if (cond) {
    if (typeof(cond) == 'string') {
      this.conditionals = [new Expression(cond)];
    } else if (cond.length) {
      for (var i = 0; i < cond.length; i++) {
        this.conditionals.push(new Expression(cond[i]));
      }
    }
  }

  this.hidden = !!params.hidden;
  this.version = params.version;
}

Rule.prototype.getProperties = function() {
  var props = this.action.getProperties();
  for (var i = 0; i < this.conditionals.length; i++) {
    var cond = this.conditionals[i];
    props = Util.appendArrays(props, cond.getProperties());
  }
  return props;
};

function Expression(value) {
  this.value = value;
};

Expression.prototype.getProperties = function() {
  // Get all of the words from the expression that start with 'this'.
  var props = this.value.match(/this.([a-zA-Z]+)/g) || [];

  // Unique-ify the list.
  props = Util.uniquifyArray(props);

  // Drop the 'this' prefix.
  return props.map(function(item) {
    return item.substring('this.'.length);
  });
};

Expression.prototype.evaluate = function(actor) {
  // Convert all strings to actor.strings.
  var output = this.evalHelper_(this.value, actor);
  console.log('Evaluated expression %s. Output: %s', this.value, output);
  return output;
};

Expression.prototype.evalHelper_ = function(expr, actor) {
  return (function() {
    return eval(expr);
  }).call(actor);
};
