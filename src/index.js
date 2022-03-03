const fs = require('fs');
const needle = require('needle');
const queue = require('better-queue');
	
const {
	access,
	readFile,
	writeFile,
	mkdir,
} = fs.promises;

const allCardsFrom = "https://undercards.net/AllCards";
const fromPrefix = "https://undercards.net/Leaderboard?action=friendship&idCard=";

var allCards = [];
var validCards = [];
var usersData = {};

const maxNumOfReq = 5;
var numOfReq = 0;
var reqIndex = 0;
var timestamp;

function loadChanges(type = 'daily', skipCommit = '') {
	return needle(allCardsFrom).then(function (data) {
		allCards = JSON.parse(data.body.cards);
		// Get all valid cards for Friendship Data.
		validCards = [];
		usersData = {};
		timestamp = Date.now();
		for (var i=0; i < allCards.length; i++) {
			var card = allCards[i];
			if (card.typeCard === 0 && card.rarity !== "TOKEN") {
				//console.log(card.name);
				validCards.push(card);
			}
		}
		reqIndex = 0;
		var lbPromise = new Promise((resolve, reject) => {
			for (var i=0; i < maxNumOfReq; i++) {
				getDataForNextIndex(resolve);
			}
		});

		lbPromise.then(function () {
			console.log("All leaderboard data processed!");
			writeLatestCommitFile(writeFiles);
		});
	});
}

function getDataForNextIndex(resolve) {
	if (reqIndex >= validCards.length) {
		if (numOfReq <= 0) {
			resolve();
		}
		return;
	}
	numOfReq++;
	var cardId = validCards[reqIndex].id;
	var cardName = validCards[reqIndex].name;
	needle(fromPrefix + cardId).then(function (data) {
		var lb = JSON.parse(data.body.leaderboard);
		for (var i=0; i < lb.length; i++) {
			addLbDataToUser(lb[i], i+1);
		}
		console.log("Data processed for: " + cardName);
		//console.log(validCards[index].name, lb[0].user.username, lb[0].xp);
		numOfReq--;
		getDataForNextIndex(resolve);
	}, function (err) {
		throw err;
	});
	reqIndex++;
}

function addLbDataToUser(data, rank) {
	var uid = data.user.id;
	var obj = {
		xp : data.xp,
		rank : rank,
		cardId : data.idCard
	};
	if (!usersData[uid]) {
		usersData[uid] = {
			lastUpdated: timestamp,
			username: data.user.username,
			scores: []
		};
	}
	usersData[uid].scores.push(obj);
}

function writeLatestCommitFile(cb) {
	var obj = {};
	obj.lastUpdated = timestamp;
	obj.validCardsLength = validCards.length;
	obj.allCardsLength = allCards.length;
	obj.usersDataLength = usersData.length;
	fs.writeFile("latestCommit.json", JSON.stringify(obj), function (err) {
		if (err) throw err;
		cb();
	});
}

function writeFiles() {
	var q = new queue(function(key, cb) {
		fs.writeFile("data/" + key + ".json", JSON.stringify(usersData[key]), function (err) {
			if (err) throw err;
			cb(null, err);
		});
	});
	for (var key in usersData) {
		q.push(key);
	}
	q.on("finish", function() {
		console.log("All files written!");
	});
	q.on("failed", function() {
		console.log("File writing failed!");
	})
}

loadChanges(...process.argv.slice(2)).catch((e) => {
	console.error(e);
	process.exit(1);
});