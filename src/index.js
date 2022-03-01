const fs = require('fs');
const needle = require('needle');
	
const {
	access,
	readFile,
	writeFile,
	mkdir,
} = fs.promises;

const allCardsFrom = "https://undercards.net/AllCards"
const fromPrefix = "https://undercards.net/Leaderboard?action=friendship&idCard=";

var validCards = [];
var usersData = {};

function loadChanges(type = 'daily', skipCommit = '') {
	return needle(allCardsFrom).then(function (data) {
		var allCards = JSON.parse(data.body.cards);
		// Get all valid cards for Friendship Data.
		validCards = [];
		usersData = {};
		for (var i=0; i < allCards.length; i++) {
			var card = allCards[i];
			if (card.typeCard === 0 && card.rarity !== "TOKEN") {
				//console.log(card.name);
				validCards.push(card);
			}
		}
		var lbPromise = new Promise((resolve, reject) => {
			getDataForIndex(0, resolve);
		});
		
		lbPromise.then(function () {
			console.log("All leaderboard data processed!");
			fs.writeFile('testdrive.txt', JSON.stringify(usersData), function (err) {
				if (err) throw err;
				console.log('Saved!');
			});
		});
	});
}

function getDataForIndex(index, resolve) {
	if (index >= validCards.length) {
		resolve(index);
		return;
	}
	var cardId = validCards[index].id;
	needle(fromPrefix + cardId).then(function (data) {
		var lb = JSON.parse(data.body.leaderboard);
		for (var i=0; i < lb.length; i++) {
			addLbDataToUser(lb[i], i+1);
		}
		//console.log(validCards[index].name, lb[0].user.username, lb[0].xp);
		getDataForIndex(index+1, resolve);
	});
}

function addLbDataToUser(data, rank) {
	var uid = data.user.id;
	var obj = {
		xp : data.xp,
		rank : rank,
		cardId : data.idCard
	};
	if (!usersData[uid]) {
		usersData[uid] = [];
	}
	usersData[uid].push(obj);
}

loadChanges(...process.argv.slice(2)).catch((e) => {
	console.error(e);
	process.exit(1);
});