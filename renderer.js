var DEFAULT_TWEEN_TIME = 200;
var ITEM_WIDTH = 1.0;
var ITEM_HEIGHT = 0.3;
var ITEM_DEPTH = 0.1;
var MAX_STACK_HEIGHT = 50;
var DISTANCE_BETWEEN_STACKS = 3;
var DISTANCE_BETWEEN_COLS = 0.1;
var DISTANCE_BETWEEN_ROWS = 0.1;


function Renderer(opt_params) {
  var params = opt_params || {};

  this.container = document.querySelector('div[main]');
  var camera = new THREE.PerspectiveCamera(75, 4.0/3.0, 0.1, 2000);

  var renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
  renderer.setClearColor(0xCDCBCD, 1);
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
  this.isStack = !!params.isStack;

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
  var stack = this.scene.getObjectByName(stackId);
  var adding = this.scene.getObjectByName('adding');
  var n = stack.children.length;
  
  for (var i = 0; i < amount; i++) {
    var cube = this.createItem_();
    stack.add(cube);
    cube.position.copy(this.getSourcePosition_(stackId, true));
    var newPos = this.getPosition_(n + i, stackId);

    this.moveObject_(cube, newPos, DEFAULT_TWEEN_TIME, function(cube) {
    });
  }

  this.fixStacks_();
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

  if (this.isStack) {
    var removeStart = items.length - amount;
    var removeEnd = items.length;
    // No need to shift anything.
    var shiftStart = 0;
    var shiftEnd = 0;
  } else {
    var removeStart = 0;
    var removeEnd = amount;
    var shiftStart = amount;
    var shiftEnd = items.length;
  }
  // Items [0...amount] are being removed, and items [amount+1...total] are
  // shifting downward.
  //
  // Move all of the remaining items down accordingly (if any more are left).
  if (items.length >= amount) {
    for (var i = shiftStart; i < shiftEnd; i++) {
      var curr = items[i];
      this.moveObject_(curr, this.getPosition_(i - amount, stackId), DEFAULT_TWEEN_TIME);
    }
  }

  // Move the removed items to the sink.
  for (var i = removeStart; i < removeEnd; i++) {
    var item = items[i];
    item.position.copy(this.getPosition_(i, stackId, true));
    removing.add(item);
    group.remove(item);
    console.log('Preparing to remove item %d', item.id);
    this.moveObject_(item, this.getSinkPosition_(stackId), DEFAULT_TWEEN_TIME, function(item) {
      console.log('Removed item %d', item.id);
      removing.remove(item);
    });
  }

  this.fixStacks_();
};


Renderer.prototype.addShadow = function(stackId) {
  var items = this.scene.getObjectByName(stackId);
  var removing = this.scene.getObjectByName('removing');
  var n = items.children.length;
  
  var cube = this.createShadow_();
  removing.add(cube);
  cube.position.copy(this.getSourcePosition_(stackId));

  this.moveObject_(cube, this.getPosition_(n, stackId, true), DEFAULT_TWEEN_TIME, function() {
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

  // Group for items that are being removed.
  var adding = new THREE.Object3D();
  adding.name = 'adding';
  scene.add(adding);

  return scene;
};

Renderer.prototype.createItem_ = function() {
  // Create 3D objects.
  var geometry = new THREE.BoxGeometry(ITEM_WIDTH, ITEM_HEIGHT, ITEM_DEPTH);
  var material = new THREE.MeshBasicMaterial({color: '#3F6C2F'});
  //var material = new THREE.MeshNormalMaterial();
  var cube = new THREE.Mesh(geometry, material);
  return cube;
};

Renderer.prototype.createShadow_ = function() {
  var geometry = new THREE.BoxGeometry(ITEM_WIDTH, ITEM_HEIGHT, ITEM_DEPTH);
  var material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    opacity: 0.5,
    transparent: true,
  });
  var cube = new THREE.Mesh(geometry, material);
  return cube;
};

Renderer.prototype.getPosition_ = function(n, stackId, opt_isAbsolute) {
  if (this.isLandscape) {
    return this.getPositionLandscape_(n, stackId, opt_isAbsolute);
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
 * 3 6 
 * 2 5 8
 * 1 4 7 
 *  
 */
Renderer.prototype.getPositionLandscape_ = function(n, stackId, opt_isAbsolute) {
  var colsPerStack = 3;
  var distanceBetweenCols = 0.1;
  var distanceBetweenStacks = 1;

  var stackX = 0;
  if (!!opt_isAbsolute) {
    stackX = this.getStackOffsetX_(stackId);
  }

  var rowNum = n % MAX_STACK_HEIGHT;
  var colNum = parseInt(n / MAX_STACK_HEIGHT);

  var offsetX = colNum * ITEM_WIDTH + (colNum - 1) * DISTANCE_BETWEEN_COLS;
  var offsetY = rowNum * (ITEM_HEIGHT + DISTANCE_BETWEEN_ROWS);

  var pos = new THREE.Vector3();
  pos.x = stackX + offsetX;
  pos.y = offsetY;
  pos.z = -5;
  return pos;
};

Renderer.prototype.getStackWidth_ = function(stackId) {
  var items = this.scene.getObjectByName(stackId);
  var n = items.children.length;
  var cols = parseInt(n / MAX_STACK_HEIGHT) + 1;
  return cols * ITEM_WIDTH + (cols - 1) * DISTANCE_BETWEEN_COLS;
};

Renderer.prototype.getStackOffsetX_ = function(stackId) {
  var offset = 0;
  for (var i = 0; i < stackId; i++) {
    offset += this.getStackWidth_(i);
  }
  offset += DISTANCE_BETWEEN_STACKS * (stackId - 1);
  return offset;
};

/** 
 * Sink should be at the bottom of all stacks, centered.
 */
Renderer.prototype.getSinkPosition_ = function(stackId, opt_isAbsolute) {
  var bbox = this.getCachedBoundingBox_();
  var pos = bbox.center();
  pos.y = bbox.min.y;
  pos.y -= 5;
  if (!!opt_isAbsolute) {
    pos.x += this.getStackOffsetX_(stackId);
  }
  return pos;
};

/**
 * Source should be on top of all of the stacks, centered.
 */
Renderer.prototype.getSourcePosition_ = function(stackId, opt_isAbsolute) {
  var bbox = this.getCachedBoundingBox_();
  var pos = bbox.center();
  pos.y = bbox.max.y;
  pos.y += 2;
  if (!!opt_isAbsolute) {
    pos.x -= this.getStackOffsetX_(stackId);
  }
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

Renderer.prototype.getCachedBoundingBox_ = function() {
  if (!this.cachedBoundingBox) {
    this.cachedBoundingBox = this.getBoundingBox_();
  }
  return this.cachedBoundingBox;
};

Renderer.prototype.invalidateCachedBoundingBox = function() {
  delete this.cachedBoundingBox;
};

Renderer.prototype.getBoundingBox_ = function(opt_root) {
  var stack = opt_root ? opt_root : this.scene;
  var bbox = new THREE.BoundingBoxHelper(stack, 0xffffff);
  bbox.update();
  return bbox.box;
};

Renderer.prototype.updateCamera = function(opt_callback) {
  var box = this.getBoundingBox_();
  var center = box.center();
  var halfAngle = THREE.Math.degToRad(this.camera.fov/2);
  var size = box.size();
  var maxDim = Math.max(size.x, size.y);
  var dist = maxDim / (2 * Math.tan(halfAngle));

  // TODO: Tween these movements, and only correct camera if new parameters have
  // changed a lot.
  if (center.distanceTo(this.camera.position) > 0) {
    var camera = this.camera;
    // Where the camera is now.
    var pos = new THREE.Vector3();
    pos.copy(camera.position);

    var target = new THREE.Vector3();
    target.copy(center);
    target.z = dist;

    var tween = new TWEEN.Tween(pos)
        .to(target, 200)
        .onUpdate(function() {
          camera.position.copy(this);
        })
        .onComplete(function() {
          if (opt_callback) {
            opt_callback();
          }
        })
        .start();
  }
};

Renderer.prototype.fixStacks_ = function() {
  // Go through each stack, and assign the correct offset to the group.
  for (var i = 0; i < this.stackCount; i++) {
    var items = this.scene.getObjectByName(i);
    var end = new THREE.Vector3();
    end.copy(items.position);
    end.x = this.getStackOffsetX_(i);
    new TWEEN.Tween(items.position).to(end, 500).start();
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

/**
 * Given a stack, project its 3D position to 2D. Used to label each stack.
 */
Renderer.prototype.get2DStackPosition = function(stackId) {
  var stack = this.scene.getObjectByName(stackId);
  // Get the bounding box for this stack.
  var bbox = this.getBoundingBox_(stack);

  // Calculate the bottom middle point.
  var vector = bbox.center();
  vector.y = bbox.min.y - 0.1;
  //vector.x = (bbox.max.x - bbox.min.x)/2;

  // Map to normalized device coordinate (NDC) space.
  vector.project(this.camera);

  // Map to screen space.
  var size = this.renderer.getSize();
  vector.x = Math.round(( vector.x + 1) * size.width / 2);
  vector.y = Math.round((-vector.y + 1) * size.height / 2);
  
  return vector;
};

Renderer.prototype.renderBoundingBox = function(stackId) {
  var stack = stackId !== undefined ? this.scene.getObjectByName(stackId) : this.scene;
  var bbox = new THREE.BoundingBoxHelper(stack, 0xffffff);
  bbox.update();
  this.scene.add(bbox);
};
