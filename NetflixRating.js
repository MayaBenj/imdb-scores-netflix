const NEW_LINE = '\n';
const SPACE = ' ';
const UNDERSCORE = '_';
const EMPTY_SPACE = '';
const RIGHT_CURLY_BRACKET = '}';
const AMPERSAND = "&";
const AND = "and";
const DIV = 'div';
const CLASS = 'class';
const IMG = 'img';
const NA = 'N/A';
const GET = 'GET';
const IMDB_SCORE = 'imdb-score';
const ROTTEN_TOMATO_SCORE = 'rotten-tomato-score';
const IMDB = 'imdb';
const ROTTENTOMATOES = 'RottenTomatoes';
const PROXY_URL = "https://cors-anywhere.herokuapp.com/";
const RT_TV_URI = "https://www.rottentomatoes.com/tv/";
const RT_MOVIE_URI = "https://www.rottentomatoes.com/m/";

var urlSent = new Set();
var urlResolved = new Set();

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
  }

function request(method, url) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.onload = function () {resolve(JSON.parse(xhr.response))};
        xhr.onerror = function () {reject()};
        xhr.send();
    });
}

function requestCORS(method, url) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, PROXY_URL + url, true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.onload = function () {
            if (xhr.status === 200){
                resolve(xhr.response)
            }
            else { 
                resolve(NA);
            }
        };
        xhr.onreadystatechange = function() {
            if (xhr.status !== 200 && !urlResolved.has(url)) {
                urlResolved.add(url);
                resolve(url);
            };
        };
        xhr.onerror = function () {resolve(NA)};
        xhr.send();
    });
}

function getImdbScore(name)
{
    return new Promise(function(resolve, reject) {
        uri = "https://www.omdbapi.com/?t=" + encodeURIComponent(name) + "&apikey=######"
        request(GET, uri)
        .then(function (jsonResponse) {
            if (jsonResponse.Response == "True") {
                resolve (jsonResponse.imdbRating)
            }
            else if (name.includes(SPACE)) {
                getImdbScore(name.substr(0, name.lastIndexOf(SPACE)).split(/[!@#$%^&*(),.?":{}|<>]$/g)[0])
                .then(function(imdbRating) {
                    resolve (imdbRating)
                });
            }
            else {
                resolve(NA);
            }
        })
    });
}

function nameToRTStandard(name){
    var splitSpecialCharsBeg = name.split(/^[!@#$%^&*(),.?":{}|<>]/g);      // remove special chars from beginning
    if (splitSpecialCharsBeg[1] !== undefined) {
        name = splitSpecialCharsBeg[1]
    }
    var splitSpecialCharsEnd = name.split(/[!@#$%^&*(),.?":{}|<>]$/g);      // remove special chars from ending
    if (splitSpecialCharsEnd[1] !== undefined) {
        name = splitSpecialCharsEnd[0]
    }
    name = name.split(SPACE).join(UNDERSCORE)  // replace spaces with underscores
    name = name.replace(AMPERSAND, AND) // replace & with 'and'
    name = name.replace(/[:\']/g, EMPTY_SPACE) // remove colons and apostophes
    return name;
}

function getRTScore(name)
{
    var parser = new DOMParser();
    return new Promise(function(resolve, reject) {
        fixedName = nameToRTStandard(name);
        requestCORS(GET,  RT_TV_URI + fixedName)
        .then(function (htmlResponse) {
            if (htmlResponse.length < 100 && htmlResponse.includes(RT_TV_URI) && !urlSent.has(htmlResponse)) {
                urlSent.add(htmlResponse);
                requestCORS(GET, htmlResponse.replace(RT_TV_URI, RT_MOVIE_URI))
                .then(function (htmlResponse) {
                    if (htmlResponse.includes(RT_MOVIE_URI)) { // if the uri was returned the request failed
                        resolve(NA)
                    }
                    else {
                        var rTDocument = parser.parseFromString(htmlResponse, "text/html");
                        var rTRScript =  rTDocument.firstElementChild.firstElementChild.getElementsByTagName("script")[0].text.split("ratingValue\":")[1]
                        if (rTRScript !== undefined){
                            var ratingValue = rTRScript.slice(0,rTRScript.indexOf(RIGHT_CURLY_BRACKET))
                            if (ratingValue !== "null") {
                                resolve(ratingValue + "%")
                            }
                            else {
                                resolve(NA)
                            }
                        }
                    };
                });
            }
            else {
                if (htmlResponse === NA) {
                    resolve(NA)
                }
                else {
                    var rTDocument = parser.parseFromString(htmlResponse, "text/html");
                    var rTRScript =  rTDocument.firstElementChild.firstElementChild.getElementsByTagName("script")[0].text.split("ratingValue\":")[1]
                    if (rTRScript !== undefined){
                        var ratingValue = rTRScript.slice(0,rTRScript.indexOf(RIGHT_CURLY_BRACKET))
                        if (ratingValue !== "null") {
                            resolve(ratingValue.replace("\"", "") + '%')
                        }
                        else {
                            resolve(NA)
                        }
                    }
                }
            }
        });
    }).catch(function(e) {
        return new Promise(function(resolve, reject) {
            resolve(NA);
        });
    });
}

function getAllScores(name, hasProgress = false)
{
    const imdbPromise = new Promise(function(resolve, reject) {
        chrome.storage.sync.get(IMDB, function(imdbResponse){
            if (imdbResponse.imdb === undefined || (imdbResponse.imdb)){
                var nameImdbSuffix = name + IMDB;
                chrome.storage.sync.get(nameImdbSuffix, function(storgeRating){
                    if (!isEmpty(storgeRating)) {
                        resolve(storgeRating[nameImdbSuffix])
                    }
                    else {
                        getImdbScore(name)
                        .then(function(imdbRating) {
                            if (imdbRating !== NA) {
                                var storageRatingImdb = {};
                                storageRatingImdb[nameImdbSuffix] = imdbRating
                                chrome.storage.sync.set(storageRatingImdb);
                            }
                            resolve(imdbRating);
                        });
                    }
                });
            }
            else {resolve('');}
        });
    });

    const rTPromise = new Promise(function(resolve, reject) {
        chrome.storage.sync.get('rottenTomatoes', function(rTResponse) {
            if (rTResponse !== undefined && rTResponse.rottenTomatoes) {
                var nameRTSuffix = name + ROTTENTOMATOES;
                chrome.storage.sync.get(nameRTSuffix, function(storgeRating){
                    if (!isEmpty(storgeRating)) {
                        resolve(storgeRating[nameRTSuffix])
                    }
                    else {
                        getRTScore(name)
                        .then(function(rtRating) {
                            if (rtRating !== NA) {
                                var storageRatingRT = {};
                                storageRatingRT[nameRTSuffix] = rtRating;
                                chrome.storage.sync.set(storageRatingRT);   
                            }                         
                            resolve(rtRating)
                        })
                    }
                });
            }
            else {resolve('')}
        });
    });
        
    return new Promise(function(resolve, reject) {
        Promise.all([imdbPromise, rTPromise])
        .then(function(ratings) {
            var scoresDict = {IMDB:ratings[0], ROTTENTOMATOES:ratings[1]};
            resolve (createScoreElements(scoresDict, hasProgress));
        });
    });
};

function createScoreElements(scoresDict, hasProgress)
{
    var scoreElement = document.createElement(DIV);
    if (!hasProgress) {
        scoreElement.style.display = "flex"
    }
    if (scoresDict.IMDB !== "") {
        // FOR IMDB
        var imdbElement = document.createElement(DIV);
        // set icon
        var imdbIconElement = document.createElement(IMG);
        imdbIconElement.src = chrome.runtime.getURL("images/starIcon.png");
        imdbIconElement.style.verticalAlign = "-20%"
        imdbIconElement.style.marginRight = "2px"
        imdbElement.appendChild(imdbIconElement)
        // set rating data
        var imdbRatingElement = document.createElement(IMDB_SCORE);
        imdbRatingElement.textContent = scoresDict.IMDB
        imdbRatingElement.style.fontSize = "x-small"
        imdbRatingElement.style.marginRight = "5px"
        imdbElement.appendChild(imdbRatingElement)
        scoreElement.appendChild(imdbElement);
    }

    if (scoresDict.ROTTENTOMATOES !== "") {
        //FOR ROTTEN TOMATOES
        var rTElement = document.createElement(DIV);
        // set icon
        var rtIconElement = document.createElement(IMG);
        rtIconElement.src = chrome.runtime.getURL("images/tomatoIcon.png");
        rtIconElement.style.verticalAlign = "-20%"
        rtIconElement.style.marginRight = "2px"
        rTElement.appendChild(rtIconElement)
        // set rating data
        var rtRatingElement = document.createElement(ROTTEN_TOMATO_SCORE);
        rtRatingElement.textContent = scoresDict.ROTTENTOMATOES
        rtRatingElement.style.fontSize = "x-small"
        rTElement.appendChild(rtRatingElement)
        scoreElement.appendChild(rTElement);
    }
    return scoreElement;
}

// Handeling the 3 first rows when loading main screen
var sliderContent = document.getElementsByClassName("sliderContent row-with-x-columns");
for (var rowItems of sliderContent) {
    var childSliderContent = rowItems.children;
    for(i=0; i<6; i++){
        let item = childSliderContent.item(i)
        if(item !== null) {
            var hasProgress = (item.getElementsByClassName("progress ").length > 0);
            getAllScores(item.innerText, hasProgress)
            .then(function(element) {
                item.append(element);
            });
        }
    }
}

MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
var observer = new MutationObserver(function(mutations, observer) {
    mutations.forEach( function (mutation) {
        mutation.addedNodes.forEach( function (addedNode) {
            if (addedNode.firstChild !== null) {
                // Handeling the 3 first rows when redirecting back to main screen
                if (mutation.addedNodes[0].getElementsByClassName("mainView").length > 0 ||
                mutation.addedNodes[0].getElementsByClassName("lolomoRow lolomoRow_title_card").length > 0) {
                    var sliderContent = Array.from(document.getElementsByClassName("sliderContent row-with-x-columns")).slice(0,3);
                    for (var rowItems of sliderContent) {
                        var childSliderContent = rowItems.children;
                        for(i=0; i<6; i++){
                            let item = childSliderContent.item(i)
                            if(item !== null) {
                                var hasProgress = (item.getElementsByClassName("progress ").length > 0);
                                getAllScores(item.innerText, hasProgress)
                                .then(function(element) {
                                    item.append(element);
                                });
                            }
                        }
                    }
                }
                 // Handeling all rows starting from the 4th and grid view
                if (addedNode.firstChild.className === "rowHeader" ||
                addedNode.className === "galleryLockups" ||
                addedNode.className === "rowContainer rowContainer_title_card" ||
                addedNode.className === "gallery row-with-x-columns search") {
                    var sliderContent = addedNode.getElementsByClassName("sliderContent row-with-x-columns");
                    for (var rowItems of sliderContent) {
                        var childSliderContent = rowItems.children;
                        var length = (rowItems.children.length < 6) ? rowItems.children.length : 6;
                        for(i=0; i<length; i++) {
                            let item = childSliderContent.item(i)
                            if(item !== null) {
                                // Netflix Original loads differently, we don't want to disrupt the images
                                if(item.getElementsByClassName("boxart-size-1x2 boxart-tall-panel boxart-container").length == 0) {
                                    if (item.innerText.includes(NEW_LINE)) item.innerText = item.innerText.split(NEW_LINE)[0];
                                    var hasProgress = (item.getElementsByClassName("progress ").length > 0);
                                    getAllScores(item.innerText, hasProgress)
                                    .then(function(element) {
                                        item.append(element);
                                    });
                                }
                            }
                        }
                    }
                }
                // Handeling caret navigation within a row
                else if (addedNode.firstChild.className === "title-card-container ltr-0") {
                    var item = addedNode.getElementsByClassName("title-card-container")[0];
                    var hasProgress = (item.getElementsByClassName("progress ").length > 0);
                    getAllScores(item.innerText, hasProgress)
                    .then(function(element) {
                        item.append(element);
                    });
                }
            }
        });
    });
});

observer.observe(document, {
    childList: true,
    subtree:true
  });