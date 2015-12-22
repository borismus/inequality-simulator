function Actor(params) {
  for (var p in params) {
    this[p] = params[p];
  }
  this.total = params.total || 0;
}
