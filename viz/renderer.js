function Renderer() {
  var container = document.querySelector('body');
  var aspect = window.innerWidth / window.innerHeight;
  var camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 200);

  var renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  //var controls = new THREE.VRControls(camera);
  //var effect = new THREE.VREffect(renderer);
  //effect.setSize(window.innerWidth, window.innerHeight);

  this.camera = camera;
  this.renderer = renderer;
  //this.effect = effect;
  //this.controls = controls;

  this.sourcePosition = new THREE.Vector3(0, 5, -5);
  this.sinkPosition = new THREE.Vector3(0, -5, -5);

  this.tweens = {};
  this.stackCount = 2;

  this.scene = this.createScene_();
  this.scene.add(this.camera);
}

Renderer.prototype.render = function(timestamp) {
  //this.controls.update();
  this.renderer.render(this.scene, this.camera);
  this.update_(timestamp);
};

Renderer.prototype.add = function(stackId) {
  var items = this.scene.getObjectByName(stackId);
  var n = items.children.length;
  
  var cube = this.createItem_();
  items.add(cube);

  this.moveObject_(cube.id, this.getSourcePosition_(stackId), this.getPosition_(n, stackId), 1000);

  this.updateCamera_();
};

Renderer.prototype.remove = function(stackId) {
  var group = this.scene.getObjectByName(stackId);
  var removing = this.scene.getObjectByName('removing');
  var items = group.children;
  if (items.length == 0) {
    console.log('No more items to remove');
    return;
  }

  // Move all of the remaining items down accordingly.
  if (items.length > 1) {
    for (var i = 1; i < items.length; i++) {
      var curr = items[i];
      this.moveObject_(curr.id, curr.position, this.getPosition_(i - 1, stackId), 500);
    }
  }

  // Move the removed item to the sink.
  var item = items[0];
  removing.add(item);
  group.remove(item);
  this.moveObject_(item.id, item.position, this.getSinkPosition_(stackId), 500, function() {
    removing.remove(item);
    //console.log('Removed item %d', item.id);
  });

  this.updateCamera_();
};


/** 
 *
 *
 *
 * Private.
 *
 *
 *
 */

Renderer.prototype.update_ = function(ts) {
  TWEEN.update(ts);
};

Renderer.prototype.createScene_ = function() {
  var scene = new THREE.Scene();

  // Add a light.
  scene.add(new THREE.PointLight(0xFFFFFF));

  // Add a placeholder for all items in a few groups.
  for (var i = 0; i < this.stackCount; i++) {
    var items = new THREE.Object3D();
    items.name = i;
    scene.add(items);
  }

  // Group for items that are being removed.
  var removing = new THREE.Object3D();
  removing.name = 'removing';
  scene.add(removing);

  return scene;
};

Renderer.prototype.createItem_ = function() {
  // Create 3D objects.
  var geometry = new THREE.BoxGeometry(1, 0.1, 1);
  var material = new THREE.MeshNormalMaterial();
  var cube = new THREE.Mesh(geometry, material);
  return cube;
};

Renderer.prototype.getPosition_ = function(n, stackId) {
  var pos = new THREE.Vector3();
  pos.x = stackId == 0 ? -1 : 1;
  pos.y = 0.2 * n - 3;
  pos.z = -5;
  return pos;
};

Renderer.prototype.getSinkPosition_ = function(stackId) {
  return this.sinkPosition;
};

Renderer.prototype.getSourcePosition_ = function(stackId) {
  return this.sourcePosition;
};

Renderer.prototype.moveObject_ = function(id, start, end, duration, opt_callback) {
  // Check if a tween already exists for this object.
  var tweens = this.tweens;
  if (tweens[id]) {
    //console.log('found tween %d already', id);
    tweens[id].stop();
    delete tweens[id];
  }
  //console.log('starting tween of %d from %f to %f', id, start.y, end.y);
  var pos = new THREE.Vector3();
  pos.copy(start);

  var scene = this.scene;
  var tween = new TWEEN.Tween(pos)
      .to(end, duration)
      .onUpdate(function() {
        //console.log('Updating position of %d to %f', id, this.y);
        var obj = scene.getObjectById(id);
        if (obj) {
          obj.position.copy(this);
        }
      })
      .onComplete(function() {
        delete tweens[id]
        if (opt_callback) {
          opt_callback();
        }
      })
      .start();

  tweens[id] = tween;
};

Renderer.prototype.getBoundingBox_ = function() {
  var points = [];
  // Get the min and max position of each stack.
  for (var i = 0; i < this.stackCount; i++) {
    var items = this.scene.getObjectByName(i);
    // Ignore the stack if there are no children.
    if (!items.children.length) {
      continue;
    }
    var stackId = i;
    // Push the extreme points.
    points.push(this.getPosition_(0, stackId));
    points.push(this.getPosition_(items.children.length - 1, stackId));
  }

  var box = new THREE.Box3();
  box.setFromPoints(points);
  return box;
};

Renderer.prototype.updateCamera_ = function() {
  var box = this.getBoundingBox_();
  var center = box.center();
  var halfAngle = THREE.Math.degToRad(this.camera.fov/2);
  var size = box.size();
  var maxSize = Math.max(size.y, size.z);
  var z = maxSize * Math.tan(halfAngle);

  // TODO: Tween these movements, and only correct camera if things can't be
  // seen (add hysterisis).
  this.camera.position.copy(center);
  this.camera.position.z = z;
  this.camera.lookAt(center);
};
