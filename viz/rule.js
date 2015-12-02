function Rule(actionExpr, opt_conditionalExprs) {
  this.actionExpr = actionExpr;
  this.conditionalExprs = opt_conditionalExprs || [];
}

function Expression(value, property) {
  this.value = value;
  this.property = property;
};
