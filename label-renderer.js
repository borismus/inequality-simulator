/**
 * Handles rendering labels for the visualization.
 * Also, each label is hoverable, and shows more information about the actor.
 */
function LabelRenderer(simulation, renderer) {
  var labels = document.querySelector('[main] .labels');

  this.els = [];

  for (var i = 0; i < simulation.actors.length; i++) {
    var actor = simulation.actors[i];
    var el = document.createElement('actor-label');
    el.actor = actor;
    el.expanded = false;
    this.els.push(el);

    // Add the element to the correct place.
    labels.appendChild(el);
  }
}

LabelRenderer.prototype.updateLabels = function() {
  MOVE_THRESHOLD = 0;
  for (var i = 0; i < this.els.length; i++) {
    var newPosition = renderer.get2DStackPosition(i);
    var oldPosition = this.els[i].position;

    if (!oldPosition || newPosition.distanceTo(oldPosition) > MOVE_THRESHOLD) {
      this.els[i].position = newPosition;
    }
  }
};

LabelRenderer.prototype.setVisibility = function(isVisible) {
  for (var i = 0; i < this.els.length; i++) {
    this.els[i].visibility = isVisible;
  }
};
