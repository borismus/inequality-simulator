function Actor(properties) {
  for (var p in properties) {
    this[p] = properties[p];
  }
  this.total = 0;
}
