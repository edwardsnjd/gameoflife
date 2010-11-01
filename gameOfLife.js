// Class representing a rectangular board of cells with a value of true or false.
var Board = Class.create({
	initialize: function(width, height) {
		this.width = width;
		this.height = height;
		this.cells = new Array(width * height);
	},
	
	getCell: function(x, y) {
		// Return true or false depending on whether cell is alive
		var cellIndex = this._getCellIndex(x,y);
		return (this.cells &&
			x>=0 && x<this.width &&
			y>=0 && y<this.height &&
			this.cells[cellIndex] === true
		);
	},
	
	setCell: function(x, y, isAlive) {
		// Set true or false depending on whether cell is alive
		var cellIndex = this._getCellIndex(x,y);
		this.cells[cellIndex] = isAlive;
	},
	
	toggleCell: function(x, y) {
		this.setCell(x, y, !this.getCell(x, y));
	},
	
	// ------------ Private functions -------------- //
	
	_getCellIndex: function(x, y) {
		return (y * this.width) + (x * 1);
	}
});

// Class representing the game engine.
var Engine = Class.create({
	initialize: function() {		
		this.boardWidth = 50;
		this.boardHeight = 50;
		this.isRunning = false;
		this.periodDuration = 1600;
		
		this.reset();
	},
	
	// ------------------- Event names --------------------- //
	
	STATE_CHANGED_EVENT: "stateChanged",
	BOARD_CHANGED_EVENT: "boardChanged",
	
	// ------------------- Public functions ---------------- //
	
	reset: function() {
		if (!this.isRunning) {
			this.period = 0;
			this.board = new Board(this.boardWidth, this.boardHeight);
			this.populations = new Array();
			
			var cellsChanged = new Array();
			for (x=0; x<this.boardWidth; x++) {
				for (y=0; y<this.boardHeight; y++) {
					cellsChanged.push(x);
					cellsChanged.push(y);
				}
			}
			
			this._notifyStateChanged();
			this._notifyBoardChanged(cellsChanged);
		}
	},
	
	start: function() {
		if (!this.isRunning) {
			this.isRunning = true;
			this._notifyStateChanged();
			
			this._moveToNextPeriod(true);
		}
	},
	
	step: function() {
		if (!this.isRunning) {
			this.isRunning = true;
			this._notifyStateChanged();
			
			this._moveToNextPeriod(false);
			// Now stop
			this.stop();
		}
	},
	
	stop: function() { 
		if (this.isRunning) {
			this.isRunning = false;
			clearTimeout(this.periodTimeout);
			this._notifyStateChanged();
		}
	},
	
	toggleCell: function(x, y) {
		if (!this.isRunning) {
			var cellsToToggle = [x, y];
			this._toggleCells(cellsToToggle);
		}
	},
	
	// Debug function that returns a string representation of the engine state
	inspect: function() {
		return "Engine#" + this.period + "|" + this.isRunning;
	},
		
	// ---------------------- PRIVATE FUNCTIONS -------------------------- //
	
	_notifyStateChanged: function() {
		this.notify(this.STATE_CHANGED_EVENT);
	},
	
	_notifyBoardChanged: function(cellsChanged) {
		if (typeof(cellsChanged) == "undefined") {
			cellsChanged = new Array();
		}
		this.notify(this.BOARD_CHANGED_EVENT, cellsChanged);
	},
	
	_moveToNextPeriod: function(runContinuously) {
		this._updateBoard();
		if (runContinuously) {
			this.periodTimeout = setTimeout(this._moveToNextPeriod.bind(this, runContinuously), this.periodDuration);
		}
	},
	
	_toggleCells: function(cellsToToggle) {
		var copyOfCellsToToggle = cellsToToggle.clone();
		
		while (cellsToToggle.length > 0) {
			var y = cellsToToggle.pop();
			var x = cellsToToggle.pop();
			this._cellToggle(x,y);
		}
		
		this._notifyBoardChanged(copyOfCellsToToggle);
	},
	
	_cellToggle: function(x, y) {
		this.board.toggleCell(x, y);
	},
	
	_updateBoard: function() {
		// Update period and populations
		// Update current period's population
		if (this.populations.length > 1) {
			this.populations.pop();
		}
		this.populations.push(this._getPopulation());
		this.period += 1;
		
		// Find cells to change
		var cellsToToggle = new Array(0);
		for (x=0; x<this.board.width; x++) {
			for (y=0; y<this.board.height; y++) {
				if (this._doesCellNeedToToggle(x,y)) {
					cellsToToggle.push(x);
					cellsToToggle.push(y);
				}
			}
		}
		
		//  Change cells (and notify)
		this._toggleCells(cellsToToggle);
		
		// Add generation to population
		this.populations.push(this._getPopulation());
		
		this._notifyStateChanged();
	},
	
	_doesCellNeedToToggle: function(x, y) {
		var liveNeighbours = this._countLiveNeighbours(x, y);
		var isCurrentlyAlive = this.board.getCell(x, y);
		var shouldBeAlive;
		if (liveNeighbours < 2) {
			shouldBeAlive = false;
		} else if (liveNeighbours == 2) {
			shouldBeAlive = isCurrentlyAlive;
		} else if (liveNeighbours == 3) {
			shouldBeAlive = true;
		} else {
			shouldBeAlive = false;
		}
		return (shouldBeAlive != isCurrentlyAlive);
	},
	
	_countLiveNeighbours: function(x, y) {
		var c = 0;
		for (i=x-1; i<=x+1; i++) {
			for (j=y-1; j<=y+1; j++) {
				if (i != x || j != y) {
					if (this.board.getCell(i,j)) {
						c += 1;
					}
				}
			}
		}
		return c;
	},
	
	_getPopulation: function() {
		return $A(this.board.cells).findAll(
			function(cellValue) {
				return cellValue === true;
			}
		).length;
	}
});
Object.Event.extend(Engine);

var GraphicsEngine = Class.create({
	initialize: function(board, resetButton, startButton, stepButton, stopButton, periodInput, graph, engine) {
		this.board = board;
		this.resetButton = resetButton;
		this.startButton = startButton;
		this.stepButton = stepButton;
		this.stopButton = stopButton;
		this.periodInput = periodInput;
		this.graph = graph;
		this.engine = engine;
		// Create board ui
		var boardInnerHTML = "";
		for (y=0; y<this.engine.boardHeight; y++) {
			boardInnerHTML += "<div class='row'>";
			for (x=0; x<this.engine.boardWidth; x++) {
				var cellId = this._getCellId(x,y);
				boardInnerHTML += "<div id='" + cellId + "' class='cell' ></div>";
			}
			boardInnerHTML += "</div>";
		}
		this.board.innerHTML = boardInnerHTML;
		// Set up engine state listeners
		this.engine.observe(this.engine.STATE_CHANGED_EVENT, this.stateChanged.bind(this));
		this.engine.observe(this.engine.BOARD_CHANGED_EVENT, this.boardChanged.bind(this));
		// Set up button event listeners
		Event.observe(this.resetButton, "click", this.engine.reset.bind(this.engine));
		Event.observe(this.startButton, "click", this.engine.start.bind(this.engine));
		Event.observe(this.stepButton, "click", this.engine.step.bind(this.engine));
		Event.observe(this.stopButton, "click", this.engine.stop.bind(this.engine));
		Event.observe(this.board, "click", this.cellToggleClick.bind(this));
		// Init display
		this.stateChanged();
	},
	
	stateChanged: function() {
		var isRunning = this.engine.isRunning;
		if (this.resetButton && isRunning) {
			this.resetButton.disable();
		} else {
			this.resetButton.enable();
		} 
		if (this.startButton && isRunning) {
			this.startButton.disable();
		} else {
			this.startButton.enable();
		} 
		if (this.stepButton && isRunning) {
			this.stepButton.disable();
		} else {
			this.stepButton.enable();
		} 
		if (this.stopButton && isRunning) {
			this.stopButton.enable();
		} else {
			this.stopButton.disable();
		} 
		if (this.periodInput) {
			this.periodInput.value = this.engine.period;
		}
		if (this.graph) {
			var max = this.engine.populations.max();
			var period = this.engine.period;
			var adjusted = this.engine.populations.collect(
				function(value) {
					return Math.round(value / max * 100);
				}
			);
			var imgUrl = "http://chart.apis.google.com/chart?cht=lc&chs=250x100&chtt=Population&chxt=x,x,y,y&chxl=0:|0|" +period+ "|1:||Period||2:|0|" + max + "|3:||Individuals|&chd=t:" + adjusted.join();
			this.graph.src = imgUrl;
		}
	},
	
	boardChanged: function(cellsChanged) {
		if (this.board) {
			while (cellsChanged.length > 0) {
				var y = cellsChanged.pop();
				var x = cellsChanged.pop();
				if (this.engine.board.getCell(x,y)) {
					$(this._getCellId(x,y)).classNames().add("alive");
				} else {
					$(this._getCellId(x,y)).classNames().remove("alive");
				}
			}
		}
	},
	
	cellToggleClick: function(event) {
		var targetCellId = event.target.id;
		var parts = targetCellId.split(",");
		if (parts.length == 2) {
			this.cellToggle(parts[0], parts[1]);
		}
	},
	
	cellToggle: function(x,y) {
		this.engine.toggleCell(x,y);
	},
	
	// --------------- Private functions -------------- //
	_getCellId: function(x, y) {
		return x + "," + y;
	}	
});

var Controller = {
	init: function() {
		var e = new Engine();
		var g = new GraphicsEngine(
			$("board"),
			$("resetButton"),
			$("startButton"),
			$("stepButton"),
			$("stopButton"),
			$("period"),
			$("theGraph"),
			e
		);
	}
};

Event.observe(window, "load", Controller.init);
