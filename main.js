var Simulation = require('./simulation.js');
var Household = require('./household.js');

var MAX_ROWS = 30;
var TICK_FPS = 30;

window.simulation = new Simulation();

// Discretionary incomes from http://goo.gl/Wak8Mc.
var poor = new Household({
  discretionaryIncome: 9699,
  lifespan: 50,
  spendingPercent: 0.4,
  investmentAbility: 0.03
});
var average = new Household({
  discretionaryIncome: 21657,
  lifespan: 50,
  spendingPercent: 0.4,
  investmentAbility: 0.03
});
var rich = new Household({
  discretionaryIncome: 62110,
  lifespan: 50,
  spendingPercent: 0.4,
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
  hh[i].on('spend', onSpend);
  hh[i].on('invest', onInvest);
  hh[i].on('bequest', onBequest);
  hh[i].on('inflate', onInflate);
}
simulation.on('tick', onTick);
simulation.on('welfare', onWelfare);

setInterval(function() {
  simulation.tick();
}, 1000/TICK_FPS);

function onEarn(e) {
  //console.log('%s earned $%d', e.household.label, e.amount);
}

function onIncomeTax(e) {
  //console.log('%s paid $%d in income tax', e.household.label, e.amount);
}

function onSpend(e) {
  //console.log('%s spent $%d on living costs', e.household.label, e.amount);
}

function onInvest(e) {
  //console.log('%s got $%d from investment income', e.household.label, e.amount);
}

function onBequest(e) {
  console.log('%s inherited $%d', e.household.label, e.household.netWorth);
}

function onInflate(e) {
}

function onTick(e) {
  draw();
}

function onWelfare(e) {
  //console.log('%s got $%d of welfare from government.', e.household.label, e.amount);
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
  gui.add(simulation, 'estateTaxRate', 0, 0.5);
  gui.add(simulation, 'wealthTaxRate', 0, 0.1);
  gui.add(simulation, 'inflationRate', 0, 0.1);

  var hh = simulation.households;
  for (var i = 0; i < hh.length; i++) {
    var h = hh[i];
    var folder = gui.addFolder(h.label);
    folder.add(h, 'discretionaryIncome');
    folder.add(h, 'lifespan', 0, 100).step(1);
    folder.add(h, 'spendingPercent', 0, 1);
    folder.add(h, 'investmentAbility', 0, 0.1);
  }
}

createGui();
