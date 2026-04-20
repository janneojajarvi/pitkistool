window.harpLibrary = [];
window.currentOctave = 0;
window.currentTranspose = 0;
// Sallitut sävelet D-pitkähuilulle
var harmonicOpen = [0, 7, 12, 16, 19, 22, 24];
var harmonicClosed = [4, 10, 14, 18, 21, 23];
var harmonicHalf = [6, 11, 15];

// Yhdistetty lista analyysiä varten
var allowedD = [...new Set(
  harmonicOpen.concat(harmonicClosed, harmonicHalf)
)];

var lastOriginalAbc = "";
var visualObj = null;
var synthControl = null;
var synth = null;
// D-pitkähuilun sallitut nuottiarvot (yläsävelsarja d1-d3)  
// var allowedD = [0, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 18, 19, 21, 22, 23, 24, 25, 26, 28, 29, 31, 33, 34, 35, 36];  

// 1. Datan lataus pyydetyistä lähteistä
async function loadGistData() {
var urls = [
	{ type: "Tarkistusnuotit", url: "tarkistusnuotit9.js" },
        { type: "Tarkistusnuotit", url: "korjaustsekki3.js" },
        { type: "Sessionsetit", url: "sessionSet01.js" },
        { type: "Sessionsetit", url: "sessionSet02.js" },
        { type: "Sessionsetit", url: "sessionSet03.js" },
        { type: "Sessionsetit", url: "sessionSet04.js" },
        { type: "Sessionsetit", url: "sessionSet05.js" },
        { type: "Sessionsetit", url: "sessionSet06.js" },
        { type: "Sessionsetit", url: "sessionSet07.js" },
        { type: "Sessionsetit", url: "sessionSet08.js" },
        { type: "Sessionsetit", url: "sessionSet09.js" },
        { type: "Sessionsetit", url: "sessionSet10.js" },
        { type: "Sessionsetit", url: "sessionSet11.js" },
        { type: "Sessionsetit", url: "sessionSet12.js" },
        { type: "Sessionsetit", url: "sessionSet13.js" },
        { type: "Sessionsetit", url: "sessionSet14.js" },
        { type: "Sessionsetit", url: "sessionSet15.js" },
        { type: "Sessionsetit", url: "sessionSet16.js" },
        { type: "Sessionsetit", url: "sessionSet17.js" },
        { type: "Sessionsetit", url: "sessionSet18.js" },
        { type: "Tarkistusnuotit", url: "extrasetti5.js" },
        { type: "Folkwikisetit", url: "folkwikiSet1.js" },
        { type: "Folkwikisetit", url: "folkwikiSet2.js" },
        { type: "Folkwikisetit", url: "folkwikiSet3.js" },
        { type: "FsFolkdiktningit", url: "fsfolkdiktning02.js" },
        { type: "FsFolkdiktningit", url: "fsfolkdiktning01.js" }
];

for (var i = 0; i < urls.length; i++) {  
    try {  
        var response = await fetch(urls[i].url);
        if (!response.ok) throw new Error("Palvelin vastasi: " + response.status);  
        var text = await response.text();  
        var startIdx = text.indexOf('[');  
        var endIdx = text.lastIndexOf(']');  
        
        if (startIdx !== -1 && endIdx !== -1) {  
            var rawList = text.substring(startIdx, endIdx + 1);  
            var data = new Function('return ' + rawList)();  
            
            if (Array.isArray(data)) {
                    data.forEach(item => {
                        item.sourceGroup = urls[i].type;
                        // Varmistetaan että abc-kenttä löytyy
                        item.abc = item.abc || item.notation || item.content || "";
                    });
                    window.harpLibrary = window.harpLibrary.concat(data);
                }  
            }  
        } catch (err) { 
            console.error("Latausvirhe linkissä: " + urls[i].url, err); 
        }  
    }
    console.log("KAIKKI LADATTU:", window.harpLibrary.length);
}

loadGistData();

window.onload = function() {
var abcInput = document.getElementById('abcInput');
var warningDiv = document.getElementById('warnings');
var octaveDisplay = document.getElementById('octaveDisplay');
var transposeDisplay = document.getElementById('transposeDisplay');
var tempoSlider = document.getElementById('tempoSlider');
var tempoDisplay = document.getElementById('tempoDisplay');
var resultsDiv = document.getElementById('searchResults');
var baseNoteSelect = document.getElementById('baseNote');

// APUFUNKTIOT
function getPitchValue(noteName) {  
    var baseMap = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };  
    var val = baseMap[noteName.toUpperCase()] || 0;  
    if (noteName === noteName.toLowerCase()) val += 12;   
    return val;  
}  

function getFilteredLibrary() {
    var filterValue = document.getElementById('sourceFilter').value;
    if (filterValue === "Kaikki") return window.harpLibrary;
    return window.harpLibrary.filter(item => item.sourceGroup === filterValue);
}

function getRelativeMajor(root, mode){
var semitones = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};
var reverse = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];

var val = semitones[root];
if (val === undefined) return root;
if (mode.includes("min") || mode === "m") val += 3;
if (mode.includes("dor")) val -= 2;
if (mode.includes("mix")) val -= 7;
if (mode.includes("lyd")) val -= 5;

val = (val + 120) % 12;

return reverse[val];
}
  
function getKeyAccidentals(key, mode) {
    mode = (mode || "").toLowerCase().trim();
    var k = key.toUpperCase();

    // Muunnettaan sävellaji vastaavaksi duuriksi ylennysten laskemista varten
    var relativeMajorKey = getRelativeMajor(k, mode);
    
    var accidentals = {};
    var sharpsOrder = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
    var flatsOrder = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

    var sharpCounts = { 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'C#': 7 };
    var flatCounts = { 'F': 1, 'Bb': 2, 'Eb': 3, 'Ab': 4, 'Db': 5, 'Gb': 6, 'Cb': 7 };

    if (sharpCounts[relativeMajorKey]) {
        for (var i = 0; i < sharpCounts[relativeMajorKey]; i++) {
            accidentals[sharpsOrder[i]] = 1;
        }
    } else if (flatCounts[relativeMajorKey]) {
        for (var i = 0; i < flatCounts[relativeMajorKey]; i++) {
            accidentals[flatsOrder[i]] = -1;
        }
    }
    
    return accidentals;
}

function getTargetTranspositions(mode) {
    var targets = [];
    mode = mode.toLowerCase();

    if (mode.includes("lyd") && !mode.includes("mix")) {
        targets = [2];
    } else if (mode.includes("mix")) {
        targets = [4];
    } else if (mode.includes("dor")) {
        targets = [9, 7]; // A ja F#
    } else if (mode.includes("min") || mode === "m") {
        targets = [2, 9, 11]; // Dm Am Hm
    } else {
        targets = [2, 9]; // D tai A
    }
    return targets;
}

function autoTransposeFromKey(abc) {
// console.log("----- AUTO TRANSPOSE DEBUG -----");
var preferD = true;
var keyMatch = abc.match(/^K:\s*([A-G][b#]?)\s*([a-zA-Z]*)/m);
if (!keyMatch) return;

var semitones = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};

var startNote = keyMatch[1];
var mode = (keyMatch[2] || "").toLowerCase().trim();
var startVal = semitones[startNote] || 0;

// console.log("Start key:", startNote, "mode:", mode);

// KÄYTETÄÄN YHTEISTÄ FUNKTIOTA TÄSSÄ
    var targets = getTargetTranspositions(mode);

// Asetetaan aluksi erittäin korkea virheaste
var bestScore = 999;
    var bestOct = 0;
    var bestTrans = 0;

    targets.forEach(targetVal => {
    // Kokeillaan kahta eri transponointisuuntaa jokaiselle kohteelle
    // Esim. G (7) -> D (2) voi olla joko -5 tai +7
    var transOptions = [
        targetVal - startVal,          // Alaspäin/Suoraan (esim. -5)
        (targetVal - startVal) + 12,   // Ylöspäin (esim. +7)
        (targetVal - startVal) - 12    // Vielä alemmas (esim. -17)
    ];

    transOptions.forEach(trans => {
        [-1, 0, 1].forEach(oct => {
            var rate = countErrorRate(abc, trans, oct);
            
            console.log(
"Target:", targetVal,
"trans:", trans,
"oct:", oct,
"rate:", rate
);
            
         

            // Lisätään pieni sakko (0.1) korkeammille oktaaveille ja kauemmas 
            // meneville transponoinneille, jotta suositaan luonnollista aluetta.
            var penalty = ((oct + 1) * 0.1) + (Math.abs(trans) * 0.01);

if (targetVal === 2) penalty -= 0.05; // suosii D-sävellajeja
            var currentScore = rate + penalty;
            
            console.log(
"Target:", targetVal,
"trans:", trans,
"oct:", oct,
"rate:", rate,
"penalty:", penalty,
"score:", currentScore
);

            if (currentScore < bestScore || (preferD && targetVal === 2 && rate === bestScore)) {
                bestScore = currentScore;
                bestOct = oct;
                bestTrans = trans;
            }
            console.log("BEST RESULT:",
"transpose:", bestTrans,
"octave:", bestOct,
"score:", bestScore
);
        });
    });
});

    window.currentOctave = bestOct;
    window.currentTranspose = bestTrans;
}

function processAbc() {
var raw = abcInput.value;
var baseShift = 2; // Kiinteä D-vire

if (octaveDisplay) octaveDisplay.innerText = window.currentOctave;  
if (transposeDisplay) transposeDisplay.innerText = window.currentTranspose;  
if (tempoDisplay) tempoDisplay.innerText = tempoSlider.value;  
  
var hasErrors = false;  
var finalAbc = "";  



// Yhdistetty lista analyysiä varten
var allowedD = harmonicOpen
  .concat(harmonicClosed)
  .concat(harmonicHalf);
  
  

// Sävellajien etumerkit (mitkä nuotit ylennetään/alennetaan automaattisesti)  
var keyAccidentals = {}; 
var barAccidentals = {}; 
  
var lines = raw.split('\n');  
for (var i = 0; i < lines.length; i++) {  
    var line = lines[i];  
    
    
    if (line.trim().startsWith('w:')) continue;  
      
    if (/^[A-Z]:/.test(line) && !line.startsWith('|:')) {  
    if (line.startsWith("Q:")) {
    finalAbc += "Q:1/4=" + tempoSlider.value + "\n";
    continue;
}  
        if (line.startsWith('K:')) {  
        
            // Tunnistetaan sävellaji (esim. D, G, Am, Dmaj)  
            var keyMatch = line.match(/^K:\s*([A-G][b#]?)\s*(.*)/i);  
            if (keyMatch) {
       var keyBase = keyMatch[1];         // Esim. "E"
        var modeStr = keyMatch[2].trim();   // Esim. "min"
               
                keyAccidentals = getKeyAccidentals(keyBase, modeStr);
            }  
            

finalAbc += line.trim() + " octave=" + window.currentOctave + "\n";
} else {
finalAbc += line + "\n";
}
continue;
}

var wLine = "w:";  
    var foundNotes = false;  
    // if (line.includes('|')) barAccidentals = {};
    var noteRegex = /([|])|([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g;  
    var match;  
      
    while ((match = noteRegex.exec(line)) !== null) {  
        foundNotes = true;  
        // Jos kyseessä on tahtiviiva (match[1]), nollataan etumerkit
    if (match[1] === '|') {
        barAccidentals = {};
        continue; // Siirrytään seuraavaan merkkiin
    }
        
        var acc = match[2]; 
   		var noteName = match[3]; 
    	var octs = match[4];  
          
        var v = getPitchValue(noteName);  
          
        // 1. Käytetään sävellajin etumerkkiä, JOS nuotilla ei ole omaa tilapäismerkkiä (^, _, =)  
        var stepInOctave = noteName.toUpperCase();

if (acc === '^') {
    v++;
    barAccidentals[stepInOctave] = 1;
}
else if (acc === '_') {
    v--;
    barAccidentals[stepInOctave] = -1;
}
else if (acc === '=') {
    barAccidentals[stepInOctave] = 0;
}
else {

    if (barAccidentals.hasOwnProperty(stepInOctave)) {
        v += barAccidentals[stepInOctave];
    }
    else if (keyAccidentals[stepInOctave]) {
        v += keyAccidentals[stepInOctave];
    }

}  

        for (var j = 0; j < octs.length; j++) {  
            if (octs[j] === ',') v -= 12; if (octs[j] === "'") v += 12;  
        }  
          
        var step = v + (window.currentOctave * 12) + window.currentTranspose - baseShift;  
          
        var sym = "×";  
        if (harmonicOpen.indexOf(step) !== -1) sym = "◯";  
        else if (harmonicClosed.indexOf(step) !== -1) sym = "⬤";  
        else if (harmonicHalf.indexOf(step) !== -1) sym = "◒";  

        if (sym === "×") hasErrors = true;  
        wLine += " " + sym;  
    }  
    finalAbc += line + "\n";  
    if (foundNotes) finalAbc += wLine + "\n";  
}  

if (!finalAbc.includes("Q:")) {
    finalAbc = finalAbc.replace(/M:[^\n]*/, function(m){
        return m + "\nQ:1/4=" + tempoSlider.value;
    });
}





if (window.ABCJS) {  

visualObj = ABCJS.renderAbc("paper", finalAbc, {  
    responsive: 'resize',  
    scale: 0.8,          // Pienentää yleisskaalaa hieman, jotta footer mahtuu
    staffwidth: 740, // Tämä on kriittinen: A4-leveys
     paddingbottom: 0,   // Jättää tilaa tabulatuureille SVG:n sisällä
    paddingtop: 20,      // Jättää tilaa yläpuolelle
    add_classes: true,  
    visualTranspose: window.currentTranspose,  
    boostOctave: window.currentOctave,  
    wrap: {
        minSpacing: 1.5,
        maxSpacing: 2.5,
        preferredMeasuresPerLine: 4 // Yrittää pitää 4 tahtia per rivi
    }
})[0];  

if (synthControl && visualObj) {  
    
    // 1. Määritetään soittimen asetukset ja kerrotaan sille transponoinnin määrä
    // HUOM: Koska olet lisännyt K:-riville "octave="-parametrin, abcjs hoitaa oktaavin 
    // todennäköisesti jo automaattisesti. Siksi annamme soittimelle vain puoliaskeleet!
    var audioParams = { 
        midiTranspose: window.currentTranspose 
    };

    // 2. Ladataan soittimen moottori uusilla asetuksilla
    synth.init({  
        audioContext: new (window.AudioContext || window.webkitAudioContext)(),  
        visualObj: visualObj,
        options: audioParams // <-- Asetetaan transponointi moottorille
    }).then(function() {  
        
        // 3. Asetetaan transponointi myös visuaaliselle soittimen ohjaimelle
        synthControl.setTune(visualObj, true, audioParams).then(function() {
            synthControl.restart(); 
        });  
        
    });

}


}
if (warningDiv) {
warningDiv.innerHTML = hasErrors ? "⚠️ Sisältää outoja säveliä" : "✅ Kaikki sävelet sopivat huilulle";
}
updateAbcDownload(finalAbc);
}

// --- Ohjaimet ---  
document.getElementById('octaveUp').onclick = function() { window.currentOctave++; processAbc(); };  
document.getElementById('octaveDown').onclick = function() { window.currentOctave--; processAbc(); };  
document.getElementById('transposeUp').onclick = function() { window.currentTranspose++; processAbc(); };  
document.getElementById('transposeDown').onclick = function() { window.currentTranspose--; processAbc(); };  
if (baseNoteSelect) baseNoteSelect.onchange = processAbc;   



document.getElementById('octaveUp').onclick = function() { window.currentOctave++; processAbc(); };  



// --- UUSI ÄLYKÄS KORJAUSFUNKTIO ---
function replaceTransposedNotesSmart(conditionFn, shiftFn) {
    var abcInput = document.getElementById('abcInput');
    if (!abcInput) return;
    
    // Tallennetaan kumoa-toimintoa varten
    window.lastOriginalAbc = abcInput.value;
    if (typeof showUndo === "function") showUndo();

    var pitchNames = ['C','^C','D','^D','E','F','^F','G','^G','A','^A','B'];
    var lines = abcInput.value.split('\n');

    var fixedLines = lines.map(function(line) {
        if (/^[A-Z]:/.test(line) || line.trim().startsWith('w:')) return line;

        return line.replace(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g, function(match, acc, note, octs, dur) {
            
            // 1. Lasketaan mikä nuotti on ruudulla (transponoituna)
            var v = getPitchValue(note);
            if (acc === '^') v++;
            if (acc === '_') v--;
            for (var j = 0; j < octs.length; j++) {
                if (octs[j] === ',') v -= 12;
                if (octs[j] === "'") v += 12;
            }
            
            var currentTransposedStep = v + (window.currentOctave * 12) + window.currentTranspose - 2;
            
            // Lasketaan sävelluokka 0-11 (D=0. Eli D=0, G=5, A=7, Bb=8, B=9)
            var pitchClass = ((currentTransposedStep % 12) + 12) % 12;

            // 2. Osuuko nuotti asettamaamme ehtoon?
            if (conditionFn(currentTransposedStep, pitchClass)) {
                
                // 3. Lasketaan uusi haluttu korkeus
                var newTransposedStep = shiftFn(currentTransposedStep, pitchClass);
                
                // 4. Luodaan uusi ABC-teksti (sama kaava kuin fixNotesBtn2:ssa!)
                var newPitch = (newTransposedStep + 2) - (window.currentOctave * 12) - window.currentTranspose;
                var absPitch = ((newPitch % 12) + 12) % 12;
                var octShift = Math.floor(newPitch / 12);
                var rawName = pitchNames[absPitch];
                
                var finalAcc = "";
                if (rawName.startsWith('^')) { 
                    finalAcc = "^"; 
                    rawName = rawName.substring(1); 
                } else {
                    // Pakotetaan palautusmerkki, jos muutetaan korotetusta/alennetusta puhtaaksi
                    if (acc === '_' || acc === '^') finalAcc = "=";
                }
                
                if (octShift > 0) { 
                    rawName = rawName.toLowerCase(); 
                    octShift--; 
                }
                var octaveMarks = (octShift > 0) ? "'".repeat(octShift) : (octShift < 0 ? ",".repeat(Math.abs(octShift)) : "");
                
                return finalAcc + rawName + octaveMarks + dur;
            }
            
            return match; // Jos ehto ei täyty, palauta alkuperäinen
        });
    });

    abcInput.value = fixedLines.join('\n');
    if (typeof processAbc === "function") processAbc();
}

// --- NAPPIEN KYTKENNÄT ---

// 1. B ja Bb -> A
const btnBtoA = document.getElementById('fixBtoA');
if (btnBtoA) {
    btnBtoA.onclick = function() { 
        replaceTransposedNotesSmart(
            // Ehto: Nuotti on Bb (pitchClass 8) tai B (pitchClass 9)
            function(step, pClass) { return pClass === 8 || pClass === 9; },
            
            // Muutos: Siirrä A:han (pitchClass 7). 
            // Jos se on B (9), pudotetaan 2. Jos Bb (8), pudotetaan 1.
            function(step, pClass) { return pClass === 9 ? step - 2 : step - 1; }
        );
    };
}

// 2. B ja Bb -> d
const btnBtoD = document.getElementById('fixBtoD');
if (btnBtoD) {
    btnBtoD.onclick = function() { 
        replaceTransposedNotesSmart(
            // Ehto: Nuotti on Bb (pitchClass 8) tai B (pitchClass 9)
            function(step, pClass) { return pClass === 8 || pClass === 9; },
            
            // Muutos: Nosta ylempään d:hen (+3 tai +4 puoliaskelta).
            // D on seuraavassa oktaavissa nolla, mihin on B:stä matkaa 3.
            function(step, pClass) { return pClass === 9 ? step + 3 : step + 4; }
        );
    };
}

// 3. g -> g#
const btnGtoGsharp = document.getElementById('fixGtoGsharp');
if (btnGtoGsharp) {
    btnGtoGsharp.onclick = function() { 
        replaceTransposedNotesSmart(
            // Ehto: Nuotti on G (pitchClass 5). 
            // HUOM: Tämä korjaa nyt sekä matalan että korkean G:n g#-nuotiksi!
            function(step, pClass) { return pClass === 5; },
            
            // Muutos: Nosta puoli sävelaskelta
            function(step, pClass) { return step + 1; }
        );
    };
}

// Arvonta 3 (randomStrictSearchLimited)
document.getElementById('randomStrictLimitedBtn').onclick = function() {
    hideUndo();
    randomStrictSearchLimited();
};

// Haku (smartSearch false)
document.getElementById('searchBtn').onclick = function() { 
    hideUndo();
    smartSearch(false); 
};
  
// Arvonta 2 (randomStrictSearch)
var randomStrictBtn = document.getElementById('randomStrictBtn');
if (randomStrictBtn) {
    randomStrictBtn.onclick = function() {
        hideUndo();
        randomStrictSearch();
    };
}
  
document.getElementById('randomBtn').onclick = function() {   
hideUndo();
smartSearch(true);

};

document.getElementById('printBtn').onclick = function() {
    window.print();
};

// Lisää tämä window.onloadin sisään:
var errorRateSlider = document.getElementById('errorRateSlider');
var errorValDisplay = document.getElementById('errorValDisplay');

if (errorRateSlider && errorValDisplay) {
    errorRateSlider.oninput = function() {
        errorValDisplay.innerText = this.value;
    };
}

// Ja varmista että nappi on kytketty:
var randomStrictLimitedBtn = document.getElementById('randomStrictLimitedBtn');
if (randomStrictLimitedBtn) {
    randomStrictLimitedBtn.onclick = function() {
        hideUndo(); // Piilottaa kumoa-napin
        randomStrictSearchLimited(); // Suorittaa itse haun
    };
}

document.getElementById('randomStrictFixBtn').onclick = function() {
    // 1. Aloitetaan puhtaalta pöydältä
    hideUndo();

    // 2. Suoritetaan haku (Arvonta 3)
    randomStrictSearchLimited();

    // 3. Korjausvaihe viiveellä
    setTimeout(function() {
        var abcInput = document.getElementById('abcInput');
        
        // Tallennetaan alkuperäinen kumoa-toimintoa varten
        lastOriginalAbc = abcInput.value;
        
        // 4. Suoritetaan Korjaa sävelet 2
        var fixBtn = document.getElementById('fixNotesBtn2');
        if (fixBtn) {
            fixBtn.onclick();
        }
        
        if (typeof processAbc === "function") processAbc();

        // --- UUSI OSA: AUTOMAATTINEN SOITTO PELKISTETYSSÄ TILASSA ---
        // Tarkistetaan onko "focus-mode" päällä
        if (document.body.classList.contains('focus-mode')) {
            // Annetaan soittimelle pieni hetki päivittää nuotit sisäisesti
            setTimeout(function() {
                if (synthControl) {
                    // Kutsutaan abcjs-soittimen omaa play-toimintoa
                    synthControl.play();
                }
            }, 100); // 100ms viive riittää yleensä nuottien päivitykseen
        }
    }, 70); 
};



// --- SUOSIKKIEN HALLINTA ---

// Apufunktio datan turvalliseen lukemiseen
function getSafeFavorites() {
    try {
        var data = JSON.parse(localStorage.getItem('harpFavorites') || '[]');
        return Array.isArray(data) ? data : [];
    } catch(e) {
        console.error("Suosikkien luku epäonnistui, nollataan lista.");
        return [];
    }
}

// Lisää suosikki
document.getElementById('addFavBtn').onclick = function() {
    var currentName = "Nimetön kappale";
    var titleMatch = abcInput.value.match(/^T:\s*(.*)/m);
    if (titleMatch) currentName = titleMatch[1].trim();

    var favorites = getSafeFavorites();
    
    if (favorites.some(f => f.abc === abcInput.value)) {
        alert("Kappale on jo suosikeissasi!");
        return;
    }

    favorites.push({
        name: currentName,
        abc: abcInput.value,
        trans: window.currentTranspose || 0,
        oct: window.currentOctave || 0
    });

    localStorage.setItem('harpFavorites', JSON.stringify(favorites));
    alert("⭐ Tallennettu suosikkeihin!");
};

// Poista suosikki
document.getElementById('remFavBtn').onclick = function() {
    var favorites = getSafeFavorites();
    var initialLength = favorites.length;
    
    favorites = favorites.filter(f => f.abc !== abcInput.value);

    if (favorites.length === initialLength) {
        alert("Tätä kappaletta ei löytynyt suosikeista.");
    } else {
        localStorage.setItem('harpFavorites', JSON.stringify(favorites));
        alert("🗑️ Poistettu suosikeista.");
    }
};

// Näytä suosikit
document.getElementById('showFavsBtn').onclick = function() {
hideUndo();
    var favorites = getSafeFavorites();
    var resultsDiv = document.getElementById('searchResults');
    
    if (favorites.length === 0) {
        resultsDiv.innerHTML = "<div style='padding:20px;'>Suosikkilistasi on tyhjä.</div>";
        resultsDiv.style.display = "block";
        return;
    }

    var formattedFavs = favorites.map(f => ({
        item: { 
            name: "⭐ " + (f.name || "Nimetön"), 
            abc: f.abc 
        },
        trans: f.trans || 0,
        oct: f.oct || 0,
        info: "Suosikki"
    }));

    resultsDiv.style.display = "block";
    renderResults(formattedFavs);
};


tempoSlider.oninput = processAbc;  
abcInput.oninput = processAbc;  
  
// 1. Varmistetaan, että undoFix on globaalisti saatavilla
window.undoFix = function() {
    if (lastOriginalAbc) {
        document.getElementById('abcInput').value = lastOriginalAbc;
        processAbc(); // Päivittää nuotit ja soittimen
        document.getElementById('undoBtn').style.display = 'none'; // Piilottaa napin
    }
};

// 2. Kytketään Kumoa-nappi tapahtumakuuntelijaan (lisää tämä muiden onclick-kytkentöjen joukkoon)
document.getElementById('undoBtn').onclick = window.undoFix;

// 3. Päivitetään showUndo-funktio varmuuden vuoksi
function showUndo() {
    var btn = document.getElementById('undoBtn');
    if (btn) btn.style.display = 'inline-block';
}

function hideUndo() {
    var btn = document.getElementById('undoBtn');
    if (btn) btn.style.display = 'none';
}


// --- SÄVELTEN KORJAUS ---  
document.getElementById('fixNotesBtn').onclick = function() {  

lastOriginalAbc = abcInput.value; 

showUndo(); 

var playable = allowedD; 

var pitchNames = ['C','^C','D','^D','E','F','^F','G','^G','A','^A','B'];  

var lines = abcInput.value.split('\n');  

var fixedLines = lines.map(function(line){  

    if (/^[A-Z]:/.test(line) || line.trim().startsWith('w:')) return line;  

    return line.replace(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g,  
    function(match, acc, note, octs, dur){  

        var v = getPitchValue(note);  

        if (acc === '^') v++;  
        if (acc === '_') v--;  

        for (var j=0;j<octs.length;j++){  
            if (octs[j]===',') v-=12;  
            if (octs[j]==="'") v+=12;  
        }  

        var step = v + (window.currentOctave*12) + window.currentTranspose - 2;

// ERIKOISSÄÄNTÖ: korkea g to g#
if (step === 17) {
    return "^g" + dur;
}

if (playable.indexOf(step) !== -1) return match;  

        var nearest = playable.reduce(function(prev,curr){  
            return Math.abs(curr-step) < Math.abs(prev-step) ? curr : prev;  
        });  

        var newPitch = (nearest + 2) - (window.currentOctave*12) - window.currentTranspose;  

        var octave = Math.floor(newPitch/12);  
        var pitch = ((newPitch%12)+12)%12;  

        var noteName = pitchNames[pitch];  

        var octaveMarks = "";  

        if (octave > 0) octaveMarks = "'".repeat(octave);  
        if (octave < 0) octaveMarks = ",".repeat(-octave);  

        return noteName + octaveMarks + dur;  
    });  

});  

abcInput.value = fixedLines.join('\n');  

processAbc();

};


// 2. UUSI "Korjaa2"-nappi (Musikaalinen logiikka)
document.getElementById('fixNotesBtn2').onclick = function() {
    // 1. TALLENNETAAN KUMOA-TIETO HETI
    lastOriginalAbc = document.getElementById('abcInput').value;
     showUndo();
    
    var abcInput = document.getElementById('abcInput');
    var playable = allowedD;
    var pitchNames = ['C','^C','D','^D','E','F','^F','G','^G','A','^A','B'];
    var lines = abcInput.value.split('\n');
    
    // 2. KERÄTÄÄN KAIKKI NUOTIT TRANSPONOITUNA (Globaali lista koko biisistä)
    var allNotesTransposed = [];
    lines.forEach(line => {
        if (/^[A-Z]:/.test(line) || line.trim().startsWith('w:')) return;
        var m;
        var noteRegex = /([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g;
        while ((m = noteRegex.exec(line)) !== null) {
            var v = getPitchValue(m[2]);
            if (m[1] === '^') v++;
            if (m[1] === '_') v--;
            for (var j=0; j<m[3].length; j++){
                if (m[3][j] === ',') v -= 12;
                if (m[3][j] === "'") v += 12;
            }
            allNotesTransposed.push(v + (window.currentOctave*12) + window.currentTranspose - 2);
        }
    });

    var globalNoteCounter = 0;
    var lastStep = null;

    // 3. KÄSITELLÄÄN RIVIT
    var fixedLines = lines.map(function(line){
        if (/^[A-Z]:/.test(line) || line.trim().startsWith('w:')) return line;

        return line.replace(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g, function(match, acc, note, octs, dur){
            var v = getPitchValue(note);
            if (acc === '^') v++;
            if (acc === '_') v--;
            for (var j=0; j<octs.length; j++){
                if (octs[j] === ',') v -= 12;
                if (octs[j] === "'") v += 12;
            }

            var step = v + (window.currentOctave*12) + window.currentTranspose - 2;
            
            // Haetaan seuraavan nuotin ennustettu arvo
            var nextStepInSong = allNotesTransposed[globalNoteCounter + 1];
            globalNoteCounter++;

            // Jos nuotti on jo soitettavissa, ei muuteta
            if (playable.indexOf(step) !== -1) {
                lastStep = step;
                return match;
            }

            // Valitaan paras korvaaja
            var bestReplacement = playable.reduce(function(prev, curr) {
                var scorePrev = Math.abs(prev - step);
                var scoreCurr = Math.abs(curr - step);

                // BONUKSET JA SAKOT
                
                // Melodian suunta
                if (lastStep !== null) {
                    var originalDir = step - lastStep; 
                    var newDir = curr - lastStep;
                    if ((originalDir > 0 && newDir > 0) || (originalDir < 0 && newDir < 0)) scoreCurr -= 1.0;
                }

                // Toiston esto (Anti-repeteetio)
                if (nextStepInSong !== undefined && curr === nextStepInSong) {
                    if (step !== nextStepInSong) scoreCurr += 10.0; // Jättisakko toistolle
                }

                // Perussävelten veto
                if (curr % 12 === 7) scoreCurr -= 1.0; // A
                if (curr % 12 === 0) scoreCurr -= 0.8; // D

                // Ylennysten välttely
                if (curr % 12 === 8 || curr % 12 === 1) scoreCurr += 1.5;

                return scoreCurr < scorePrev ? curr : prev;
            });

            lastStep = bestReplacement;

            // Muunnos takaisin ABC:ksi
            var newPitch = (bestReplacement + 2) - (window.currentOctave*12) - window.currentTranspose;
            var absPitch = ((newPitch % 12) + 12) % 12;
            var octShift = Math.floor(newPitch / 12);
            var rawName = pitchNames[absPitch];
            
            var finalAcc = "";
            if (rawName.startsWith('^')) { finalAcc = "^"; rawName = rawName.substring(1); }
            
            if (octShift > 0) {
                rawName = rawName.toLowerCase();
                octShift--;
            }
            var octaveMarks = (octShift > 0) ? "'".repeat(octShift) : (octShift < 0 ? ",".repeat(Math.abs(octShift)) : "");
            
            return finalAcc + rawName + octaveMarks + dur;
        });
    });

    // 4. PÄIVITETÄÄN RUUTU JA RENDERÖINTI
    abcInput.value = fixedLines.join('\n');
    if (typeof processAbc === "function") processAbc();
};



document.getElementById('fixNotesBtn3').onclick = function() {
    lastOriginalAbc = document.getElementById('abcInput').value;
    showUndo();
    
    var abcInput = document.getElementById('abcInput');
    var playable = allowedD;
    var pitchNames = ['C','^C','D','^D','E','F','^F','G','^G','A','^A','B'];
    var lines = abcInput.value.split('\n');
    
    var allNotesTransposed = [];
    lines.forEach(line => {
        if (/^[A-Z]:/.test(line) || line.trim().startsWith('w:')) return;
        var m;
        var noteRegex = /([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g;
        while ((m = noteRegex.exec(line)) !== null) {
            var v = getPitchValue(m[2]);
            if (m[1] === '^') v++;
            if (m[1] === '_') v--;
            for (var j=0; j<m[3].length; j++){
                if (m[3][j] === ',') v -= 12;
                if (m[3][j] === "'") v += 12;
            }
            allNotesTransposed.push(v + (window.currentOctave*12) + window.currentTranspose - 2);
        }
    });

    var globalNoteCounter = 0;
    var lastStep = null;

    var fixedLines = lines.map(function(line){
        if (/^[A-Z]:/.test(line) || line.trim().startsWith('w:')) return line;

        return line.replace(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g, function(match, acc, note, octs, dur){
            var v = getPitchValue(note);
            
            // POISTETTU: Sävellajin automaattinen ylennys. 
            // Luotetaan vain siihen, mitä koodissa lukee (+ mahdolliset ^ tai _ merkit)
            if (acc === '^') v++;
            if (acc === '_') v--;
            
            for (var j=0; j<octs.length; j++){
                if (octs[j] === ',') v -= 12;
                if (octs[j] === "'") v += 12;
            }

            var step = v + (window.currentOctave*12) + window.currentTranspose - 2;
            var nextStepInSong = allNotesTransposed[globalNoteCounter + 1];
            globalNoteCounter++;

            // --- ERITYISET PITKÄHUILU-PAKOTUKSET ---
            
            // 1. c#2 (11) -> c2 (10)
            if (step === 11) step = 10;
            
            // 2. g2 (5) -> g#2 (6)
            if (step === 5) step = 6;

            // Jos nuotti on soitettavissa, palautetaan se heti
            if (playable.indexOf(step) !== -1) {
                lastStep = step;
                return convertToAbc(step, dur, pitchNames);
            }

            // Muuten etsitään musikaalisesti järkevin vaihtoehto
            var bestReplacement = playable.reduce(function(prev, curr) {
                var scorePrev = Math.abs(prev - step);
                var scoreCurr = Math.abs(curr - step);
                
                if (lastStep !== null) {
                    var originalDir = step - lastStep; 
                    var newDir = curr - lastStep;
                    if ((originalDir > 0 && newDir > 0) || (originalDir < 0 && newDir < 0)) scoreCurr -= 1.0;
                }
                
                if (nextStepInSong !== undefined && curr === nextStepInSong) {
                    if (step !== nextStepInSong) scoreCurr += 10.0;
                }
                
                if (curr % 12 === 7) scoreCurr -= 1.0; 
                if (curr % 12 === 0) scoreCurr -= 0.8; 
                if (curr % 12 === 8 || curr % 12 === 1) scoreCurr += 1.5;
                
                return scoreCurr < scorePrev ? curr : prev;
            });

            lastStep = bestReplacement;
            return convertToAbc(bestReplacement, dur, pitchNames);
        });
    });

    function convertToAbc(pitchNum, dur, names) {
        var newPitch = (pitchNum + 2) - (window.currentOctave*12) - window.currentTranspose;
        var absPitch = ((newPitch % 12) + 12) % 12;
        var octShift = Math.floor(newPitch / 12);
        var rawName = names[absPitch];
        var finalAcc = "";
        
        // Lisätään palautusmerkki vain, jos se on tarpeen (C ja G nuoteille, jotta ne erottuvat D-duurissa)
        if (rawName === 'C') finalAcc = "=";
        if (rawName === 'G') finalAcc = "="; 
        
        if (rawName.startsWith('^')) { finalAcc = "^"; rawName = rawName.substring(1); }
        if (octShift > 0) { rawName = rawName.toLowerCase(); octShift--; }
        var octaveMarks = (octShift > 0) ? "'".repeat(octShift) : (octShift < 0 ? ",".repeat(Math.abs(octShift)) : "");
        
        return finalAcc + rawName + octaveMarks + dur;
    }

    abcInput.value = fixedLines.join('\n');
    processAbc();
};


function smartSearch(isRandom) {
    var query = document.getElementById('searchInput').value.toLowerCase().trim();
    resultsDiv.innerHTML = "Analysoidaan...";
    resultsDiv.style.display = "block";

    var candidates = getFilteredLibrary();
    
    // ARVONTA-LOGIIKKA
    if (isRandom) {
        candidates = [candidates[Math.floor(Math.random() * candidates.length)]];
    } 
    // LAAJENNETTU HAKU-LOGIIKKA (T:, O: ja S: kentät)
    else if (query !== "") {
        candidates = candidates.filter(function(f) {
            var abc = f.abc || f.notation || f.content || "";
            // Haetaan metatiedot ABC-tekstistä
            var title = (abc.match(/^T:\s*(.*)/m) || ["", ""])[1].toLowerCase();
            var origin = (abc.match(/^O:\s*(.*)/m) || ["", ""])[1].toLowerCase();
            var origin = (abc.match(/^R:\s*(.*)/m) || ["", ""])[1].toLowerCase();
            var source = (abc.match(/^S:\s*(.*)/m) || ["", ""])[1].toLowerCase();
            
            // Tarkistetaan löytyykö haku jostain näistä neljästä
            return title.includes(query) || origin.includes(query) || source.includes(query);
        });
    }
   

    var filtered = [];
    var semitones = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};

    for (var i = 0; i < candidates.length; i++) {
        var item = candidates[i];
        if (!item) continue;
        
        var abc = item.abc || item.notation || item.content || "";
        var keyMatch = abc.match(/^K:\s*([A-G][b#]?)\s*([a-zA-Z]*)/m);
        if (!keyMatch) continue;

        var startNote = keyMatch[1];
        var mode = (keyMatch[2] || "").toLowerCase().trim();
        var startVal = semitones[startNote] || 0;

        // --- TÄSSÄ ON MUUTOS: KUTSUTAAN YHTEISTÄ FUNKTIOTA ---
        var targets = getTargetTranspositions(mode);
        // -----------------------------------------------------

        var bestScore = { rate: 1.1, oct: 0, trans: 0 };

        targets.forEach(function(targetVal) {
            var transOptions = [targetVal - startVal, (targetVal - startVal) + 12, (targetVal - startVal) - 12];
            transOptions.forEach(function(trans) {
                [-1, 0, 1].forEach(function(oct) {
                    var rate = countErrorRate(abc, trans, oct);
                    if (rate < bestScore.rate) {
                        bestScore = { rate: rate, oct: oct, trans: trans };
                    }
                });
            });
        });

        // Hyväksytään kappale, jos se sopii huilulle kohtuullisen hyvin
        if (bestScore.rate < 0.5) {  // hakee biisit joiden nuoteista 50% on soitettavia
            filtered.push({ item: item, oct: bestScore.oct, trans: bestScore.trans });
        }

        // Estetään selaimen jäätyminen pitkissä listauksissa
        if (!isRandom && filtered.length > 40) break;
    }
    renderResults(filtered);
}

// --- UUSI: Hae 3 (Etsii liukusäätimen virheprosentilla ja numeroi tulokset) ---
var searchStrictLimitedBtn = document.getElementById('searchStrictLimitedBtn');
if (searchStrictLimitedBtn) {
    searchStrictLimitedBtn.onclick = function() {
        hideUndo();
        searchWithSliderLimit();
    };
}

function searchWithSliderLimit() {
    var query = document.getElementById('searchInput').value.toLowerCase().trim();
    var resultsDiv = document.getElementById('searchResults');
    var slider = document.getElementById('errorRateSlider');
    
    // Luetaan sallittu virheprosentti (esim. 10% = 0.1)
    var allowedErrorThreshold = slider ? (parseFloat(slider.value) / 100) : 0.1;

    resultsDiv.innerHTML = "Etsitään (max " + (allowedErrorThreshold * 100).toFixed(0) + "% virheitä)...";
    resultsDiv.style.display = "block";

    // Pieni viive, jotta selain ehtii piirtää "Etsitään..." -tekstin ruudulle ennen raskasta laskentaa
    setTimeout(function() {
        var candidates = getFilteredLibrary();
        
        // Jos hakukentässä on tekstiä, suodatetaan ensin sillä
        if (query !== "") {
            candidates = candidates.filter(function(f) {
                var abc = f.abc || f.notation || f.content || "";
                var title = (abc.match(/^T:\s*(.*)/m) || ["", ""])[1].toLowerCase();
                return title.includes(query);
            });
        }

        var filtered = [];
        var semitones = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};
        var resultCounter = 1; // Aloitetaan numerointi ykkösestä

        for (var i = 0; i < candidates.length; i++) {
            var item = candidates[i];
            if (!item) continue;

            var abc = item.abc || item.notation || item.content || "";
            var keyMatch = abc.match(/^K:\s*([A-G][b#]?)\s*([a-zA-Z]*)/m);
            if (!keyMatch) continue;

            var titleMatch = abc.match(/^T:\s*(.*)/m);
            var originalTitle = titleMatch ? titleMatch[1].trim() : "Nimetön kappale";

            var startNote = keyMatch[1];
            var mode = (keyMatch[2] || "").toLowerCase().trim();
            var startVal = semitones[startNote] || 0;

            var targets = getTargetTranspositions(mode);
            var bestScore = { rate: 1.1, oct: 0, trans: 0 };

            // Kokeillaan kaikki transponointivaihtoehdot
            targets.forEach(function(targetVal) {
                var transOptions = [targetVal - startVal, (targetVal - startVal) + 12, (targetVal - startVal) - 12];
                transOptions.forEach(function(trans) {
                    [-1, 0, 1].forEach(function(oct) {
                        var rate = countErrorRate(abc, trans, oct);
                        if (rate < bestScore.rate) {
                            bestScore = { rate: rate, oct: oct, trans: trans };
                        }
                    });
                });
            });

            // Jos kappaleen paras transponointi alittaa tai on yhtä suuri kuin sallittu virheprosentti
            if (bestScore.rate <= allowedErrorThreshold) {
                
                // Numeroidaan tulos ja lisätään virheprosentti näkyviin
                var displayTitle = resultCounter + ". " + originalTitle + " (" + (bestScore.rate * 100).toFixed(0) + " %)";
                
                filtered.push({ 
                    item: { name: displayTitle, abc: abc }, // Luodaan väliaikainen objekti renderöintiä varten
                    oct: bestScore.oct, 
                    trans: bestScore.trans 
                });
                resultCounter++;
            }

            // Katkaistaan haku 200 kappaleen kohdalla, ettei selain jäädy täysin valtavilla tietokannoilla
            if (filtered.length >= 200) break;
        }

        renderResults(filtered);
        
        // Lisätään huomautus, jos tuloksia oli valtavasti
        if (filtered.length === 200) {
            var notice = document.createElement('div');
            notice.style.fontSize = "0.8em";
            notice.style.color = "#666";
            notice.style.padding = "5px";
            notice.innerText = "Näytetään vain ensimmäiset 200 tulosta selaimen nopeuttamiseksi.";
            resultsDiv.appendChild(notice);
        }

    // LISÄYS: Lisätään "Lisää kaikki" -nappi tulosten alkuun, jos tuloksia löytyi
        if (filtered.length > 0) {
            var addAllBtn = document.createElement('button');
            addAllBtn.innerHTML = "⭐ Lisää kaikki hakutulokset suosikkeihin";
            addAllBtn.className = "add-all-favorites-btn"; // Voit tyylitellä CSS:llä
            addAllBtn.style = "display: block; width: 100%; margin: 10px 0; padding: 10px; background: #ffc107; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;";
            
            addAllBtn.onclick = function() {
                addAllResultsToFavorites(filtered);
            };

            // Lisätään nappi hakutulosten alkuun
            resultsDiv.insertBefore(addAllBtn, resultsDiv.firstChild);
        }
    }, 50);
}

function addAllResultsToFavorites(results) {
    if (!results || results.length === 0) return;

    // Käytetään sovelluksesi omaa tapaa hakea suosikit (getSafeFavorites)
    var favorites = (typeof getSafeFavorites === "function") 
        ? getSafeFavorites() 
        : JSON.parse(localStorage.getItem('harpFavorites') || '[]');
    
    var addedCount = 0;

    results.forEach(function(res) {
        var abcContent = res.item.abc;
        
        // Tarkistetaan duplikaatit sovelluksesi logiikalla
        if (!favorites.some(f => f.abc === abcContent)) {
            
            // Haetaan nimi ABC-tekstistä
            var currentName = "Nimetön kappale";
            var titleMatch = abcContent.match(/^T:\s*(.*)/m);
            if (titleMatch) currentName = titleMatch[1].trim();

            // Tallennetaan täsmälleen samassa muodossa kuin addFavBtn tekee
            favorites.push({
                name: currentName,
                abc: abcContent,
                trans: res.trans || 0, // Käytetään haun löytämää parasta transponointia
                oct: res.oct || 0      // Käytetään haun löytämää parasta oktaavia
            });
            addedCount++;
        }
    });

    // Tallennetaan takaisin localStorageen
    localStorage.setItem('harpFavorites', JSON.stringify(favorites));
    
    if (addedCount > 0) {
        alert("⭐ Lisätty " + addedCount + " uutta kappaletta suosikkeihin!");
        // Päivitetään suosikkinäkymä jos se on auki
        if (typeof loadFavorites === "function" && document.getElementById('searchInput').value === "") {
            loadFavorites();
        }
    } else {
        alert("Kaikki kappaleet olivat jo suosikeissasi.");
    }
}

// --- UUSI: Hae 4 (Kuten Hae 3, mutta rajoituksella max c3 / 22) ---
var searchStrictC3Btn = document.getElementById('searchStrictC3Btn');
if (searchStrictC3Btn) {
    searchStrictC3Btn.onclick = function() {
        hideUndo();
        searchWithSliderAndRangeLimit(22); // Raja: c3 (22)
    };
}

function searchWithSliderAndRangeLimit(maxNoteLimit) {
    var query = document.getElementById('searchInput').value.toLowerCase().trim();
    var resultsDiv = document.getElementById('searchResults');
    var slider = document.getElementById('errorRateSlider');
    var allowedErrorThreshold = slider ? (parseFloat(slider.value) / 100) : 0.1;

    resultsDiv.innerHTML = "Etsitään (max " + (allowedErrorThreshold * 100).toFixed(0) + "% virhettä & max c3)...";
    resultsDiv.style.display = "block";

    setTimeout(function() {
        var candidates = getFilteredLibrary();
        if (query !== "") {
            candidates = candidates.filter(function(f) {
                var abc = f.abc || f.notation || f.content || "";
                var title = (abc.match(/^T:\s*(.*)/m) || ["", ""])[1].toLowerCase();
                return title.includes(query);
            });
        }

        var filtered = [];
        var semitones = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};
        var resultCounter = 1;

        for (var i = 0; i < candidates.length; i++) {
            var item = candidates[i];
            if (!item) continue;

            var abc = item.abc || item.notation || item.content || "";
            var keyMatch = abc.match(/^K:\s*([A-G][b#]?)\s*([a-zA-Z]*)/m);
            if (!keyMatch) continue;

            var startNote = keyMatch[1];
            var mode = (keyMatch[2] || "").toLowerCase().trim();
            var startVal = semitones[startNote] || 0;
            var targets = getTargetTranspositions(mode);
            
            var bestScore = { rate: 1.1, oct: 0, trans: 0 };

            targets.forEach(function(targetVal) {
                var transOptions = [targetVal - startVal, (targetVal - startVal) + 12, (targetVal - startVal) - 12];
                transOptions.forEach(function(trans) {
                    [-1, 0, 1].forEach(function(oct) {
                        var rate = countErrorRate(abc, trans, oct);
                        
                        // --- UUSI TARKISTUS: Tarkistetaan korkein nuotti ---
                        // Tämä apufunktio varmistaa, ettei transponoitu korkein nuotti ylitä rajaa
                        if (rate < bestScore.rate) {
                            if (isNoteRangeOk(abc, trans, oct, maxNoteLimit)) {
                                bestScore = { rate: rate, oct: oct, trans: trans };
                            }
                        }
                    });
                });
            });

            if (bestScore.rate <= allowedErrorThreshold) {
                var titleMatch = abc.match(/^T:\s*(.*)/m);
                var originalTitle = titleMatch ? titleMatch[1].trim() : "Nimetön";
                var displayTitle = resultCounter + ". " + originalTitle + " (" + (bestScore.rate * 100).toFixed(0) + " %)";
                
                filtered.push({ 
                    item: { name: displayTitle, abc: abc }, 
                    oct: bestScore.oct, 
                    trans: bestScore.trans 
                });
                resultCounter++;
            }
            if (filtered.length >= 200) break;
        }
        renderResults(filtered);
   // LISÄYS: Lisätään "Lisää kaikki" -nappi tulosten alkuun, jos tuloksia löytyi
        if (filtered.length > 0) {
            var addAllBtn = document.createElement('button');
            addAllBtn.innerHTML = "⭐ Lisää kaikki hakutulokset suosikkeihin";
            addAllBtn.className = "add-all-favorites-btn"; // Voit tyylitellä CSS:llä
            addAllBtn.style = "display: block; width: 100%; margin: 10px 0; padding: 10px; background: #ffc107; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;";
            
            addAllBtn.onclick = function() {
                addAllResultsToFavorites(filtered);
            };

            // Lisätään nappi hakutulosten alkuun
            resultsDiv.insertBefore(addAllBtn, resultsDiv.firstChild);
        }
    }, 50);
}

// Apufunktio, joka tarkistaa pysyvätkö kaikki nuotit annetun rajan alapuolella ohjelman omalla asteikolla
function isNoteRangeOk(abc, trans, oct, maxNoteLimit) {
    // 1. Otetaan talteen kappaleen etumerkintä (K:) sävellajin automaattisia merkkejä varten
    var keyMatch = abc.match(/^K:\s*([A-G][b#]?)\s*([a-zA-Z]*)/m);
    var keyAccidentals = {};
    if (keyMatch) {
        var keyBase = keyMatch[1];
        var mode = keyMatch[2].toLowerCase().trim();
        keyAccidentals = getKeyAccidentals(keyBase, mode);
    }

    // 2. Haetaan kaikki kappaleen nuotit
    var notes = abc.match(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g) || [];
    if (notes.length === 0) return true;

    // 3. Käydään nuotit läpi ja lasketaan niiden absoluuttinen arvo transponoinnin jälkeen
    for (var i = 0; i < notes.length; i++) {
        var n = notes[i];
        var m = n.match(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/);
        var v = getPitchValue(m[2]);

        // Huomioidaan sävellajin etumerkit, jos nuotilla ei ole omaa tilapäistä merkkiä
        if (!m[1]) {
            var step = m[2].toUpperCase();
            if (keyAccidentals[step]) v += keyAccidentals[step];
        }

        // Huomioidaan tilapäiset ylennykset ja alennukset
        if (m[1] === '^') v++; 
        if (m[1] === '_') v--;
        
        // Huomioidaan oktaavimerkit (pilkut ja heittomerkit)
        for (var j = 0; j < m[3].length; j++) { 
            if (m[3][j] === ',') v -= 12; 
            if (m[3][j] === "'") v += 12; 
        }

        // 4. Lasketaan LOPULLINEN sävelkorkeus ohjelman D-logiikalla (baseShift = 2)
        var finalStep = v + trans + (oct * 12) - 2;

        // Jos yksikin nuotti ylittää rajan (esim. 22), hylätään heti tämä transponointivaihtoehto
        if (finalStep > maxNoteLimit) {
            return false;
        }
    }
    
    return true; // Jos looppi pääsi loppuun, yksikään nuotti ei ollut liian korkea
}

// --- MUUTETTU randomStrictSearch (Arvonta2) suodattimilla ---
function randomStrictSearch() {
    var library = getFilteredLibrary(); // Korvattu [...window.harpLibrary]
    if (!library || library.length === 0) {
        alert("Valitusta lähteestä ei löytynyt kappaleita.");
        return;
    }

    // Luodaan kopio kirjastosta ja sekoitetaan se
    var libraryCopy = [...window.harpLibrary];
    for (let i = libraryCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [libraryCopy[i], libraryCopy[j]] = [libraryCopy[j], libraryCopy[i]];
    }

    var found = false;
    var semitones = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};

    // Käydään kirjastoa läpi kunnes löytyy sopiva
    for (var i = 0; i < libraryCopy.length; i++) {
        var item = libraryCopy[i];
        var abc = item.abc || item.notation || item.content || "";
        
        // --- SUODATIN 1: Pituus (vähintään 5 tahtia) ---
        // Lasketaan pystyviivat | ABC-koodista
        var barCount = (abc.match(/\|/g) || []).length;
        if (barCount <= 5) continue; // pystyviivojen eli tahtiviivojen vähimmäismäärä

        var keyMatch = abc.match(/^K:\s*([A-G][b#]?)\s*([a-zA-Z]*)/m);
        if (!keyMatch) continue;

        var startNote = keyMatch[1];
        var mode = (keyMatch[2] || "").toLowerCase().trim();
        var startVal = semitones[startNote] || 0;

        var targets = [];
        if (mode.includes("lyd")) targets = [2];
        else if (mode.includes("mix")) targets = [4];
        else if (mode.includes("dor")) targets = [9, 7];
        else if (mode.includes("min") || mode === "m") targets = [2, 9, 11];
        else targets = [2, 9];

        var bestMatchFoundForThisSong = false;

        for (let targetVal of targets) {
            var transOptions = [targetVal - startVal, (targetVal - startVal) + 12, (targetVal - startVal) - 12];
            for (let trans of transOptions) {
                for (let oct of [-1, 0, 1]) {
                    
                    // Tarkistetaan virheaste (tavoite 100% sopivuus = 0.0)
                    var rate = countErrorRate(abc, trans, oct);
                    
                    if (rate <= 0.01) {
                        // --- SUODATIN 2: Korkein sävel (max 24) ---
                        var notes = abc.match(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g) || [];
                        var tooHigh = false;
                        
                        for (let n of notes) {
                            var m = n.match(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/);
                            var v = getPitchValue(m[2]);
                            // Yksinkertaistettu pitch-laskenta suodatusta varten
                            if (m[1] === '^') v++; if (m[1] === '_') v--;
                            for (var j=0; j<m[3].length; j++) { if (m[3][j] === ',') v-=12; if (m[3][j]==="'") v+=12; }
                            
                            var finalStep = v + trans + (oct * 12) - 2;
                            if (finalStep > 24) {    // korkein sallittu sävel 24 eli c4
                                tooHigh = true;
                                break;
                            }
                        }

                        if (!tooHigh) {
                            document.getElementById('abcInput').value = abc;
                            window.currentTranspose = trans;
                            window.currentOctave = oct;
                            processAbc();
                            found = true;
                            bestMatchFoundForThisSong = true;
                            break;
                        }
                    }
                }
                if (bestMatchFoundForThisSong) break;
            }
            if (bestMatchFoundForThisSong) break;
        }

        if (found) break;
    }

    if (!found) {
        alert("Sopivaa kappaletta ei löytynyt tällä kertaa. Yritä uudelleen.");
    }
}

// ARVONTA 3 FUNKTIO
    // Sekoitetaan vain pieni osa kirjastoa kerrallaan tai rajoitetaan läpikäyntiä
    
async function randomStrictSearchLimited() {
    var library = getFilteredLibrary();
    if (!library || library.length === 0) {
        alert("Valitusta lähteestä ei löytynyt kappaleita.");
        return;
    }
    
    // resultsDiv.innerHTML = "Arvotaan sopivaa kappaletta...";
    // resultsDiv.style.display = "block";
    
    var slider = document.getElementById('errorRateSlider');
    var allowedErrorThreshold = slider ? (parseFloat(slider.value) / 100) : 0;
    var resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = "Etsitään sopivaa...";
    resultsDiv.style.display = "block";

    // Kopioidaan ja sekoitetaan
    var pool = [...library];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    var found = false;
    var maxAttempts = Math.min(pool.length, 3000);
    const semitones = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};

    for (var i = 0; i < maxAttempts; i++) {
        var item = pool[i];
        var abc = item.abc || item.notation || item.content || "";
        if ((abc.match(/\|/g) || []).length <= 5) continue;

        var keyMatch = abc.match(/^K:\s*([A-G][b#]?)\s*([a-zA-Z]*)/m);
        if (!keyMatch) continue;

        var startNote = keyMatch[1];
        var mode = (keyMatch[2] || "").toLowerCase().trim();
        var startVal = semitones[startNote] || 0;
        var targets = (mode.includes("min") || mode === "m") ? [2, 9, 11] : [2, 9];

        for (let targetVal of targets) {
            var transOptions = [targetVal - startVal, (targetVal - startVal) + 12, (targetVal - startVal) - 12];
            for (let trans of transOptions) {
                for (let oct of [-1, 0, 1]) {
                    var rate = countErrorRate(abc, trans, oct);
                    if (rate <= allowedErrorThreshold) {
                        document.getElementById('abcInput').value = abc;
                        window.currentTranspose = trans;
                        window.currentOctave = oct;
                        processAbc();
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
            if (found) break;
        }
        if (found) break;
    }

    resultsDiv.style.display = "none";
    if (!found) alert("Ei löytynyt ehtoja vastaavaa kappaletta.");
}

async function randomStrictSearchLimited() {
    if (!window.harpLibrary || window.harpLibrary.length === 0) {
        alert("Kirjastoa ei ole vielä ladattu.");
        return;
    }

    // Luetaan liukusäätimen arvo
    var slider = document.getElementById('errorRateSlider');
    var allowedErrorThreshold = slider ? (parseFloat(slider.value) / 100) : 0;

    var resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = "Etsitään sopivaa kappaletta...";
    resultsDiv.style.display = "block";

    var library = [...window.harpLibrary];
    for (let i = library.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [library[i], library[j]] = [library[j], library[i]];
    }

    var found = false;
    const semitones = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};
    var maxAttempts = Math.min(library.length, 5000);

    for (var i = 0; i < maxAttempts; i++) {
        var item = library[i];
        var abc = item.abc || item.notation || item.content || "";
        
        if ((abc.match(/\|/g) || []).length <= 5) continue; 

        var keyMatch = abc.match(/^K:\s*([A-G][b#]?)\s*([a-zA-Z]*)/m);
        if (!keyMatch) continue;

        var rawNotes = abc.match(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g) || [];
        if (rawNotes.length === 0) continue;

        var parsedPitches = rawNotes.map(n => {
            var m = n.match(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/);
            var v = getPitchValue(m[2]);
            if (m[1] === '^') v++; if (m[1] === '_') v--;
            for (var j=0; j<m[3].length; j++) { if (m[3][j] === ',') v-=12; if (m[3][j]==="'") v+=12; }
            return v;
        });

        var startNote = keyMatch[1];
        var mode = (keyMatch[2] || "").toLowerCase().trim();
        var startVal = semitones[startNote] || 0;

        var targets = (mode.includes("min") || mode === "m") ? [2, 9, 11] : [2, 9];

        for (let targetVal of targets) {
            var transOptions = [targetVal - startVal, (targetVal - startVal) + 12, (targetVal - startVal) - 12];
            for (let trans of transOptions) {
                for (let oct of [-1, 0, 1]) {
                    let errCount = 0;
                    let tooHigh = false;
                    let shift = trans + (oct * 12) - 2;

                    for (let v of parsedPitches) {
                        let finalStep = v + shift;
                        if (finalStep > 22) { tooHigh = true; break; } // korkein sallittu sävel 22 eli c3
                        if (allowedD.indexOf(finalStep) === -1) errCount++;
                    }

                    var currentRate = errCount / parsedPitches.length;

                    if (!tooHigh && currentRate <= allowedErrorThreshold) {
                        document.getElementById('abcInput').value = abc;
                        window.currentTranspose = trans;
                        window.currentOctave = oct;
                        processAbc();
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
            if (found) break;
        }
        if (found) break;
    }
    resultsDiv.style.display = "none";
    if (!found) alert("Ei löytynyt matalaa kappaletta näillä ehdoilla.");
}




function countErrorRate(abc, trans, oct) {
var keyMatch = abc.match(/^K:\s*([A-G][b#]?)\s*([a-zA-Z]*)/m);
var keyAccidentals = {};

if (keyMatch){
    var keyBase = keyMatch[1];
    var mode = keyMatch[2].toLowerCase().trim();
    mode = mode.trim();
    keyAccidentals = getKeyAccidentals(keyBase, mode);
}
var notes = abc.match(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g) || [];  
if (notes.length === 0) return 1;  
  
  
  
var errCount = 0;  
notes.forEach(n => {  
    var m = n.match(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/);  
    var v = getPitchValue(m[2]);

if (!m[1]) {
    var step = m[2].toUpperCase();
    if (keyAccidentals[step]) v += keyAccidentals[step];
}  
    if (m[1] === '^') v++; if (m[1] === '_') v--;  
    for (var j=0; j<m[3].length; j++) { if (m[3][j] === ',') v-=12; if (m[3][j]==="'") v+=12; }  
      
   var s = v + trans + (oct * 12) - 2;  
      if (trans === 7) {
        var isAllowed = allowedD.indexOf(s) !== -1;
        console.log(`D-DUURI TESTI: Nuotti ${n} -> Arvo ${s} -> Sallittu: ${isAllowed}`);
    }
    // Tarkistetaan uutta listaa vasten  
    if (allowedD.indexOf(s) === -1) errCount++; 
});  
return errCount / notes.length;

}

document.getElementById('searchStrictBtn').onclick = async function() {
hideUndo();
    var query = document.getElementById('searchInput').value.toLowerCase().trim();
    var resultsDiv = document.getElementById('searchResults');
    
   // KORJAUS 1: Käytetään valittua kirjastoa (esim. vain Tarkistusnuotit)
    var candidates = getFilteredLibrary();

    resultsDiv.innerHTML = "Etsitään tiukalla suodatuksella (max 4s)...";
    resultsDiv.style.display = "block";

    var filtered = [];
    var semitones = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};

    // Aikarajan asetus
    var startTime = performance.now();
    var timeLimit = 4000; // 4 sekuntia millisekunteina

    for (var i = 0; i < candidates.length; i++) {
        // TARKISTUS: Onko aika loppunut?
        if (performance.now() - startTime > timeLimit) break; 

        var item = candidates[i];
        if (!item) continue;

        // KORJAUS 2: Jos query on tyhjä, päästetään kaikki läpi analyysiin. 
        // Jos queryssä on tekstiä, suodatetaan nimen perusteella.
        if (query !== "") {
            var name = (item.name || "").toLowerCase();
            if (name.indexOf(query) === -1) continue;
        }

        var abc = item.abc || item.notation || item.content || "";
        var keyMatch = abc.match(/^K:\s*([A-G][b#]?)\s*([a-zA-Z]*)/m);
        if (!keyMatch) continue;

        var startNote = keyMatch[1];
        var mode = (keyMatch[2] || "").toLowerCase().trim();
        var startVal = semitones[startNote] || 0;

        var targets = [];
        if (mode.includes("lyd")) targets = [2];
        else if (mode.includes("mix")) targets = [4];
        else if (mode.includes("dor")) targets = [9, 7, 4];
        else if (mode.includes("min") || mode === "m") targets = [2, 9, 11];
        else targets = [2, 9];

        var bestScore = { rate: 1.1, oct: 0, trans: 0 };

        targets.forEach(targetVal => {
            var transOptions = [targetVal - startVal, (targetVal - startVal) + 12, (targetVal - startVal) - 12];
            transOptions.forEach(trans => {
                [-1, 0, 1].forEach(oct => {
                    var rate = countErrorRate(abc, trans, oct);
                    if (rate < bestScore.rate) {
                        bestScore = { rate: rate, oct: oct, trans: trans };
                    }
                });
            });
        });

       // Speksien mukainen 90% raja (rate <= 0.1)
        if (bestScore.rate <= 0.1) {
            filtered.push({ 
                item: item, 
                oct: bestScore.oct, 
                trans: bestScore.trans,
                info: "Sopivuus: " + ((1 - bestScore.rate) * 100).toFixed(0) + "%" 
            });
        }
        // Estetään listaamasta tuhansia tuloksia kerralla
        if (filtered.length > 50) break;
    }

    renderResults(filtered);
    
    // Jos haku loppui kesken, lisätään pieni ilmoitus
    if (performance.now() - startTime > timeLimit) {
        var notice = document.createElement('div');
        notice.style.fontSize = "0.8em";
        notice.style.color = "#666";
        notice.style.padding = "5px";
        notice.innerText = "Näytetään vain ensimmäiset 4 sekunnin aikana löytyneet tulokset.";
        resultsDiv.prepend(notice);
    }
};

function renderResults(res) {  
    resultsDiv.innerHTML = res.length === 0 ? "Ei tuloksia." : "";  
    res.forEach(r => {  
        var d = document.createElement('div');  
        d.className = 'result-item';  
        d.innerHTML = "<strong>" + r.item.name + "</strong>";  
        d.onclick = function() {

    abcInput.value = r.item.abc || r.item.notation || r.item.content || "";

    resultsDiv.style.display = "none";

    autoTransposeFromKey(abcInput.value);

    processAbc();

};
        
        resultsDiv.appendChild(d);  
    });  
}

// --- UUSI APUFUNKTIO: Transponoi ABC-tekstin fyysisesti latausta varten ---
function getTransposedAbcText(abcText, semitones) {
    if (!semitones || semitones === 0) return abcText;

    var keys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    var sharps = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    var useSharps = [7, 2, 9, 4, 11, 6, 1, 8]; // Sävellajit, jotka suosivat ristejä

    // Perusnuottien arvot (C = 0)
    var basePitch = { 'C':0, 'D':2, 'E':4, 'F':5, 'G':7, 'A':9, 'B':11, 'c':12, 'd':14, 'e':16, 'f':17, 'g':19, 'a':21, 'b':23 };

    var lines = abcText.split('\n');
    var newLines = lines.map(function(line) {
        
        // 1. Sävellajin (K:) transponointi
        if (/^(K:\s*)([A-G][b#]?)(.*)/i.test(line)) {
            var match = line.match(/^(K:\s*)([A-G][b#]?)(.*)/i);
            var prefix = match[1];
            var root = match[2].charAt(0).toUpperCase() + match[2].slice(1);
            var suffix = match[3];

            var index = keys.indexOf(root);
            if (index === -1) index = sharps.indexOf(root);
            if (index !== -1) {
                var newIndex = ((index + semitones) % 12 + 12) % 12;
                var newRoot = useSharps.includes(newIndex) ? sharps[newIndex] : keys[newIndex];
                return prefix + newRoot + suffix;
            }
            return line;
        }

        // 2. Ohitetaan otsikot ja sanoitukset (mutta K-rivi käsiteltiin jo yllä)
        if (/^[A-Z]:/.test(line) && !line.startsWith('K:')) return line;
        if (line.trim().startsWith('w:')) return line;
        if (line.trim().startsWith('%')) return line; // Ohitetaan kommentit

        // 3. Nuottien fyysinen transponointi
        return line.replace(/([\^_=]?)([A-Ga-g])([,']*)([0-9\/]*)/g, function(match, acc, note, octs, dur) {
            if (basePitch[note] === undefined) return match; // Varmistus

            var v = basePitch[note];
            if (acc === '^') v++;
            if (acc === '_') v--;
            for (var j = 0; j < octs.length; j++) {
                if (octs[j] === ',') v -= 12;
                if (octs[j] === "'") v += 12;
            }

            // Lisätään transponointi
            v += semitones;

            // Lasketaan uusi nuotti
            var absPitch = ((v % 12) + 12) % 12;
            var octShift = Math.floor(v / 12);
            
            var rawName = sharps[absPitch]; 
            var finalAcc = "";
            
            if (rawName.length > 1) { 
                finalAcc = "^";
                rawName = rawName.charAt(0);
            } else if (acc === '_' || acc === '^') {
                finalAcc = "="; // Palautusmerkki, jos siirrytään valkoiselle koskettimelle
            }

            if (octShift > 0) {
                rawName = rawName.toLowerCase();
                octShift--; 
            }
            
            var octaveMarks = "";
            if (octShift > 0) {
                octaveMarks = "'".repeat(octShift);
            } else if (octShift < 0) {
                octaveMarks = ",".repeat(Math.abs(octShift));
            }

            return finalAcc + rawName + octaveMarks + dur;
        });
    });

    return newLines.join('\n');
}

// --- PÄIVITETTY LATAUSFUNKTIO ---
function updateAbcDownload(abc) {
    var downloadContainer = document.getElementById('abc-download'); 
    if (!downloadContainer) return;

    // 1. Symbolien korvaus
    var cleanedAbc = abc.replace(/⬤/g, "\u25CF")
                        .replace(/◯/g, "\u25CB")
                        .replace(/◒/g, "\u25D2");

    // 2. KOKONAISVALTAINEN TRANSPONOINTI LATAUSTA VARTEN
    // Oletetaan, että transponointi tallentuu window.currentTranspose -muuttujaan
    var transSemitones = window.currentTranspose || 0;
    if (transSemitones !== 0) {
        // Ajetaan teksti uuden myllyn läpi
        cleanedAbc = getTransposedAbcText(cleanedAbc, transSemitones);
    }

    // 3. Luodaan tiedosto ja latauslinkki
    var blob = new Blob([cleanedAbc], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);

    var titleMatch = cleanedAbc.match(/^T:\s*(.*)/m);
    var fileName = titleMatch ? titleMatch[1].trim().replace(/[^a-z0-9]/gi, '_') + ".abc" : "nuotit.abc";

    downloadContainer.innerHTML = `
        <a href="${url}" 
           download="${fileName}" 
           style="display:inline-block; padding:10px 20px; background:#3498db; color:white; text-decoration:none; border-radius:5px; font-weight:bold;">
           ⬇️ABC
        </a>`;
}





// 1. Luodaan "Takaisin" -nappi dynaamisesti (jos sitä ei ole)
let exitBtn = document.getElementById('exitFocusMode');
if (!exitBtn) {
    exitBtn = document.createElement('button');
    exitBtn.id = "exitFocusMode";
    exitBtn.innerHTML = "🔙 Lopeta pelkistetty tila";
    document.body.appendChild(exitBtn);
}

// 2. Hallitaan näkymän vaihtoa
const toggleBtn = document.getElementById('toggleFocusMode');

if (toggleBtn) {
    toggleBtn.onclick = function() {
        document.body.classList.add('focus-mode');
        setupFocusLayout(true);
    };
}

exitBtn.onclick = function() {
    document.body.classList.remove('focus-mode');
    setupFocusLayout(false);
};

document.getElementById('randomStrictFixBtn').onclick = function() {
    // 1. Aloitetaan puhtaalta pöydältä
    hideUndo();

    // 2. Suoritetaan haku (Arvonta 3)
    randomStrictSearchLimited();

    // 3. Korjausvaihe viiveellä
    setTimeout(function() {
        var abcInput = document.getElementById('abcInput');
        
        // Tallennetaan alkuperäinen kumoa-toimintoa varten
        lastOriginalAbc = abcInput.value;
        
        // 4. Suoritetaan Korjaa sävelet 2
        var fixBtn = document.getElementById('fixNotesBtn2');
        if (fixBtn) {
            fixBtn.onclick();
        }
        
        if (typeof processAbc === "function") processAbc();

        // --- UUSI OSA: AUTOMAATTINEN SOITTO PELKISTETYSSÄ TILASSA ---
        // Tarkistetaan onko "focus-mode" päällä
        if (document.body.classList.contains('focus-mode')) {
            // Annetaan soittimelle pieni hetki päivittää nuotit sisäisesti
            setTimeout(function() {
                if (synthControl) {
                    // Kutsutaan abcjs-soittimen omaa play-toimintoa
                    synthControl.play();
                }
            }, 100); // 100ms viive riittää yleensä nuottien päivitykseen
        }
    }, 70); 
};

function setupFocusLayout(enable) {
    const paper = document.getElementById('paper');
    const soitin = document.getElementById('audio');
    const arvontaGroup = document.getElementById('arvonta-group'); // Sisältää ❤️ ja 🎲4
    
    // Alkuperäiset kodit palautusta varten
    const searchBar = document.querySelector('.search-bar');
    const toggleBtn = document.getElementById('toggleFocusMode');
    const editorArea = document.getElementById('editor-area');

    if (enable) {
        document.body.classList.add('focus-mode');
        
        // Luodaan tai haetaan säiliö
        let container = document.getElementById('focus-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'focus-container';
            // Laitetaan säiliö nuottipaperin yläpuolelle
            paper.parentNode.insertBefore(container, paper);
        }

        // Siirretään koko ryhmä (nappi + sydän) ja soitin säiliöön
        if (arvontaGroup) container.appendChild(arvontaGroup);
        if (soitin) container.appendChild(soitin);

    } else {
        document.body.classList.remove('focus-mode');
        
        // --- PALAUTUS NORMAALIIN ---
        
        // 1. Palautetaan arvonta-group hakupalkkiin, Pelkistetty-napin eteen
        if (searchBar && arvontaGroup) {
            searchBar.insertBefore(arvontaGroup, toggleBtn);
        }
        
        // 2. Palautetaan soitin tekstikentän yläpuolelle
        if (editorArea && soitin) {
            editorArea.insertBefore(soitin, editorArea.firstChild);
        }

        // 3. Poistetaan ylimääräinen säiliö
        const container = document.getElementById('focus-container');
        if (container) container.remove();
    }

    // Päivitetään näkymä
    setTimeout(() => {
        if (typeof processAbc === "function") processAbc();
    }, 100);
}


synthControl = new ABCJS.synth.SynthController();

synthControl.load("#audio", null, {
displayLoop: true,
displayRestart: true,
displayPlay: true,
displayProgress: true,
displayWarp: false
});
synth = new ABCJS.synth.CreateSynth();
processAbc();

// Info-ikkunan hallinta
var modal = document.getElementById("infoModal");
var btn = document.getElementById("infoBtn");
var span = document.getElementById("closeModal");

// Avaa ikkunaa
btn.onclick = function() {
  modal.style.display = "block";
}

// Sulje ikkuna ruksista
span.onclick = function() {
  modal.style.display = "none";
}

// Sulje ikkuna klikkaamalla muualta kuin ikkunasta
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}
	// Rekisteröidään Service Worker, jotta "Asenna sovellus" -valinta aktivoituu
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker rekisteröity!', reg))
      .catch(err => console.log('Service Worker virhe:', err));
  });
}

};
