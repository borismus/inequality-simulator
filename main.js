var Simulation = require('./simulation.js');
var Household = require('./household.js');

var MAX_ROWS = 30;
var TICK_FPS = 3;

window.simulation = new Simulation();

// Discretionary incomes from http://goo.gl/Wak8Mc.
var poor = new Household({
  discretionaryIncome: 20,
  investmentAbility: 0.03
});
var average = new Household({
  discretionaryIncome: 20,
  investmentAbility: 0.03
});
var rich = new Household({
  discretionaryIncome: 20,
  investmentAbility: 0.03
});

simulation.households = [poor, average, rich];

// For debugging, give each household a name and attach events.
poor.label = 'poor';
average.label = 'average';
rich.label = 'rich';

var hh = simulation.households;
for (var i = 0; i < hh.length; i++) {
  hh[i].on('earn', onEarn);
  hh[i].on('invest', onInvest);
}
simulation.on('tick', onTick);

setInterval(function() {
  simulation.tick();
}, 1000/TICK_FPS);

function onEarn(e) {
  //console.log('%s earned $%d', e.household.label, e.amount);
}

function onInvest(e) {
  //console.log('%s got $%d from investment income', e.household.label, e.amount);
}

function onTick(e) {
  draw();
}

function getPercentages(houses) {
  var out = [];
  var totalNetWorth = 0;
  for (var i = 0; i < houses.length; i++) {
    totalNetWorth += houses[i].netWorth;
  }
  for (var i = 0; i < houses.length; i++) {
    var h = houses[i];
    out.push(h.netWorth / totalNetWorth);
  }
  return out;
}

function draw() {
  var houses = simulation.households;
  var percents = getPercentages(houses);
  for (var i = 0; i < houses.length; i++) {
    houses[i].percent = percents[i];
  }
  drawRow(houses);
}

var history = document.querySelector('#history');
function drawRow(houses) {
  var table = document.createElement('table');
  var row = document.createElement('tr');
  for (var i = 0; i < houses.length; i++) {
    var h = houses[i];
    var col = document.createElement('th');
    col.className = h.label;
    col.width = (h.percent * 100) + '%';
    row.appendChild(col);
  }
  table.appendChild(row);
  history.insertBefore(table, history.firstChild);

  if (history.children.length > MAX_ROWS) {
    history.removeChild(history.children[MAX_ROWS]);
  }
}


function createGui() {
  // Make a DAT.gui for changing parameters of each household.
  var gui = new dat.GUI();
  gui.add(simulation, 'wealthTaxRate', 0, 0.1);
  gui.add(simulation, 'wealthTaxThreshold', 0, 5000);
  gui.add(simulation, 'isSocialist');

  var hh = simulation.households;
  for (var i = 0; i < hh.length; i++) {
    var h = hh[i];
    var folder = gui.addFolder(h.label);
    folder.add(h, 'discretionaryIncome', 0, 200);
    folder.add(h, 'investmentAbility', 0, 0.1);
  }
}

createGui();
