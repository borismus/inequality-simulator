var DEFAULT_TWEEN_TIME = 200;

function Renderer(opt_params) {
  var params = opt_params || {};

  this.container = document.querySelector('div[main]');
  var camera = new THREE.PerspectiveCamera(75, 4.0/3.0, 0.1, 2000);

  var renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(window.devicePixelRatio);
  this.container.appendChild(renderer.domElement);

  //var controls = new THREE.VRControls(camera);
  //var effect = new THREE.VREffect(renderer);
  //effect.setSize(window.innerWidth, window.innerHeight);

  this.camera = camera;
  this.renderer = renderer;
  //this.effect = effect;
  //this.controls = controls;

  this.tweens = {};
  this.stackCount = params.stackCount || 2;
  this.isLandscape = !!params.isLandscape;

  this.scene = this.createScene_();
  this.scene.add(this.camera);

  this.resize();
}

Renderer.prototype.render = function(timestamp) {
  //this.controls.update();
  this.renderer.render(this.scene, this.camera);
  this.update_(timestamp);
};

Renderer.prototype.add = function(stackId, opt_amount) {
  var amount = opt_amount || 1;
  var items = this.scene.getObjectByName(stackId);
  var n = items.children.length;
  
  for (var i = 0; i < amount; i++) {
    var cube = this.createItem_();
    items.add(cube);
    cube.position.copy(this.getSourcePosition_(stackId));

    this.moveObject_(cube, this.getPosition_(n + i, stackId), DEFAULT_TWEEN_TIME);
  }
};

Renderer.prototype.remove = function(stackId, opt_amount) {
  var amount = opt_amount || 1;
  var group = this.scene.getObjectByName(stackId);
  var removing = this.scene.getObjectByName('removing');
  var items = group.children.slice();
  if (items.length == 0) {
  }

  if (items.length < amount) {
    // Fail: not enough items to remove requested amount.
    console.log('Cannot remove %d items. Only %d remain.', amount, items.length);
    return;
  }

  // Items [0...amount] are being removed, and items [amount+1...total] are
  // shifting downward.
  //
  // Move all of the remaining items down accordingly (if any more are left).
  if (items.length >= amount) {
    for (var i = amount; i < items.length; i++) {
      var curr = items[i];
      this.moveObject_(curr, this.getPosition_(i - amount, stackId), DEFAULT_TWEEN_TIME);
    }
  }

  // Move the removed items to the sink.
  for (var i = 0; i < amount; i++) {
    var item = items[i];
    removing.add(item);
    group.remove(item);
    console.log('Preparing to remove item %d', item.id);
    this.moveObject_(item, this.getSinkPosition_(stackId), DEFAULT_TWEEN_TIME, function(item) {
      console.log('Removed item %d', item.id);
      removing.remove(item);
    });
  }
};


Renderer.prototype.addShadow = function(stackId) {
  var items = this.scene.getObjectByName(stackId);
  var removing = this.scene.getObjectByName('removing');
  var n = items.children.length;
  
  var cube = this.createShadow_();
  removing.add(cube);
  cube.position.copy(this.getSourcePosition_(stackId));

  this.moveObject_(cube, this.getPosition_(n, stackId), DEFAULT_TWEEN_TIME, function() {
    removing.remove(cube);
  });
};

Renderer.prototype.removeShadow = function(stackId) {
  var removing = this.scene.getObjectByName('removing');
  var cube = this.createShadow_();
  cube.position.copy(this.getPosition_(0, stackId));
  removing.add(cube);
  this.moveObject_(cube, this.getSinkPosition_(stackId), DEFAULT_TWEEN_TIME, function() {
    removing.remove(cube);
  });
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

Renderer.prototype.createShadow_ = function() {
  var geometry = new THREE.BoxGeometry(1, 0.1, 1);
  var material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    opacity: 0.5,
    transparent: true,
  });
  var cube = new THREE.Mesh(geometry, material);
  return cube;
};

Renderer.prototype.getPosition_ = function(n, stackId) {
  if (this.isLandscape) {
    return this.getPositionLandscape_(n, stackId);
  }
  var pos = new THREE.Vector3();
  pos.x = stackId * 1.3;
  pos.y = 0.2 * n;
  pos.z = -5;
  return pos;
};

/**
 * Gets the position of the nth block in the specified stack. This function
 * returns the landscape-orientation position, so that each actors' stack is
 * actually multiple stacks. For example, the following layout:
 *
 * 7 8
 * 4 5 6   4
 * 1 2 3   1 2 3   1 2
 * S1      S2      S3
 *  
 */
Renderer.prototype.getPositionLandscape_ = function(n, stackId) {
  var colsPerStack = 3;
  var distanceBetweenCols = 0.1;
  var distanceBetweenStacks = 0.5;
  var colWidth = 1;
  var itemHeight = 0.1;
  var distanceBetweenItems = 0.1;

  var stackWidth = colsPerStack * colWidth +
      (colsPerStack - 1) * distanceBetweenCols;
  var stackX = stackId * stackWidth + (stackId - 1) * distanceBetweenStacks;

  var colNum = n % colsPerStack;
  var rowNum = parseInt(n / colsPerStack);
  var offsetX = colNum * colWidth + (colNum - 1) * distanceBetweenCols;
  var offsetY = rowNum * (itemHeight + distanceBetweenItems);

  var pos = new THREE.Vector3();
  pos.x = stackX + offsetX;
  pos.y = offsetY;
  pos.z = -5;
  return pos;
};

/** 
 * Sink should be at the bottom of all stacks, centered.
 */
Renderer.prototype.getSinkPosition_ = function(stackId) {
  var bbox = this.getBoundingBox_();
  var pos = bbox.center();
  pos.y = bbox.min.y;
  pos.y -= 1;
  return pos;
};

/**
 * Source should be on top of all of the stacks, centered.
 */
Renderer.prototype.getSourcePosition_ = function(stackId) {
  var bbox = this.getBoundingBox_();
  var pos = bbox.center();
  pos.y = bbox.max.y;
  pos.y += 2;
  return pos;
};

Renderer.prototype.moveObject_ = function(obj, end, duration, opt_callback) {
  var id = obj.id;
  // Check if a tween already exists for this object.
  var tweens = this.tweens;
  if (tweens[id]) {
    console.log('found tween %d already', id);
    tweens[id].stop();
  }
  //console.log('starting tween of %d from %f to %f', id, obj.position.y, end.y);

  var scene = this.scene;
  var tween = new TWEEN.Tween(obj.position)
      .to(end, duration)
      .onComplete(function() {
        delete tweens[id]
        if (opt_callback) {
          opt_callback(obj);
        }
      })
      .onStop(function() {
        delete tweens[id]
        if (opt_callback) {
          opt_callback(obj);
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

Renderer.prototype.updateCamera = function() {
  console.log('updateCamera');
  var box = this.getBoundingBox_();
  var center = box.center();
  var halfAngle = THREE.Math.degToRad(this.camera.fov/2);
  var size = box.size();
  var maxSize = Math.max(size.y, size.z);
  var z = maxSize * Math.tan(halfAngle);

  // TODO: Tween these movements, and only correct camera if new parameters have
  // changed a lot.
  if (center.distanceTo(this.camera.position) > 3) {
    var camera = this.camera;
    // Where the camera is now.
    var pos = new THREE.Vector3();
    pos.copy(camera.position);

    var target = new THREE.Vector3();
    target.copy(center);
    target.z = z;

    var tween = new TWEEN.Tween(pos)
        .to(target, 500)
        .onUpdate(function() {
          camera.position.copy(this);
        })
        .start();
  }
};

Renderer.prototype.resize = function() {
  // Set the canvas size.
  //var width = window.innerWidth;
  //var height = window.innerHeight;
  var width = this.container.offsetWidth;
  var height = this.container.offsetHeight;
  this.renderer.setSize(width, height);
  var aspect = width / height;
  this.camera.aspect = aspect;
};
