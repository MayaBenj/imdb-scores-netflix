var storageObjectImdb = {};
var storageObjectRT = {};

document.getElementById('imdbButtonEnable').addEventListener('click', function() {onClickFunction('imdbButtonEnable')});
document.getElementById('imdbButtonDisable').addEventListener('click', function() {onClickFunction('imdbButtonDisable')});
document.getElementById('rottenTomatoesButtonEnable').addEventListener('click', function() {onClickFunction('rottenTomatoesButtonEnable')});
document.getElementById('rottenTomatoesButtonDisable').addEventListener('click', function() {onClickFunction('rottenTomatoesButtonDisable')});

document.getElementById('deleteStorageData').addEventListener('click', function() {deleteStorageData()});

function intilizeFromStorage() {
    chrome.storage.sync.get('imdb', function(imdbResponse){
        if (imdbResponse.imdb !== undefined && !imdbResponse.imdb){
            buttonChangeProperties(document.getElementById("imdbButtonDisable"), "imdbButtonEnable");
        }
    });
    chrome.storage.sync.get('rottenTomatoes', function(rTResponse){
        if (rTResponse.rottenTomatoes){
            document.getElementById('RTmessage').classList.add('showElement')
            document.getElementById('RTmessage').classList.remove('hideElement')
            buttonChangeProperties(document.getElementById("rottenTomatoesButtonEnable"), "rottenTomatoesButtonDisable");
        }
    });
};
intilizeFromStorage();

function onClickFunction(buttonId) {
    var button = document.getElementById(buttonId);
    if (buttonId === "imdbButtonEnable") {
        buttonChangeProperties(button, "imdbButtonDisable")
        storageObjectImdb['imdb'] = true;
        chrome.storage.sync.set(storageObjectImdb);
    }
    else if (buttonId === "imdbButtonDisable") {
        buttonChangeProperties(button, "imdbButtonEnable")
        storageObjectImdb['imdb'] = false;
        chrome.storage.sync.set(storageObjectImdb);
    }
    else if (buttonId === "rottenTomatoesButtonEnable") {
        buttonChangeProperties(button, "rottenTomatoesButtonDisable")
        storageObjectRT['rottenTomatoes'] = true;
        chrome.storage.sync.set(storageObjectRT);
        document.getElementById('RTmessage').classList.add('showElement')
        document.getElementById('RTmessage').classList.remove('hideElement')
    }
    else if (buttonId === "rottenTomatoesButtonDisable") {
        buttonChangeProperties(button, "rottenTomatoesButtonEnable")
        storageObjectRT['rottenTomatoes'] = false;
        chrome.storage.sync.set(storageObjectRT);
        document.getElementById('RTmessage').classList.add('hideElement')
        document.getElementById('RTmessage').classList.remove('showElement')
    }
}

// firstButton: The button that was clicked on - We give it ButtonOn style and disable it
// secondButtonId: Id of the corresponding button - We give it ButtonOff style and enable it
function buttonChangeProperties(firstButton, secondButtonId) {
    firstButton.classList.add('btnOn');
    firstButton.classList.remove('btnOff');
    var secondButton = document.getElementById(secondButtonId)
    secondButton.classList.add('btnOff');
    secondButton.classList.remove('btnOn');
    firstButton.setAttribute("disabled", true)
    secondButton.removeAttribute("disabled");
}

function deleteStorageData() {
    chrome.storage.sync.clear() 
}