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

function loadChanges(type = 'daily', skipCommit = '') {
	return needle(allCardsFrom).then(function (data) {
		var allCards = JSON.parse(data.body.cards);
		// Get all valid cards for Friendship Data.
		validCards = [];
		for (var i=0; i < allCards.length; i++) {
			var card = allCards[i];
			if (card.typeCard === 0 && card.rarity !== "TOKEN") {
				//console.log(card.name);
				validCards.push(card);
			}
		}
		getDataForIndex(0);
	});
}

function getDataForIndex(index) {
	if (index >= validCards.length) {
		return;
	}
	var cardId = validCards[index].id;
	needle(fromPrefix + cardId).then(function (data) {
		var lb = JSON.parse(data.body.leaderboard);
		console.log(validCards[index].name, lb[0]);
		getDataForIndex(index+1);
	});
}

loadChanges(...process.argv.slice(2)).catch((e) => {
	console.error(e);
	process.exit(1);
});