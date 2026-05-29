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
	{ type: "Tarkistusnuotit", url: "richardrobinsonbook.js" },
	{ type: "Tarkistusnuotit", url: "FinnishTunes.js" },
	{ type: "Tarkistusnuotit", url: "sekalaista01.js" },
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
	{ type: "Sekalaiset", url: "esavelmat_hs1.js" },
	{ type: "Sekalaiset", url: "esavelmat_ls1.js" },
	{ type: "Sekalaiset", url: "esavelmat_ls2.js" },
	{ type: "Sekalaiset", url: "esavelmat_ls3.js" },
	{ type: "Sekalaiset", url: "esavelmat_ls4.js" },
	{ type: "Sekalaiset", url: "FinnishTunes2.js" },
	{ type: "Sekalaiset", url: "swedish2.js" },
	{ type: "Sekalaiset", url: "norway1.js" },
	{ type: "Sekalaiset", url: "norway1.js" },
	{ type: "Sekalaiset", url: "dansk1.js" },
	{ type: "Sekalaiset", url: "nordbeck.js" },
	{ type: "Sekalaiset", url: "richardrobinsonbook.js" },
	{ type: "Folkwikisetit", url: "folkwikiExtra.js" },
        { type: "Folkwikisetit", url: "folkwikiSet1.js" },
        { type: "Folkwikisetit", url: "folkwikiSet2.js" },
        { type: "Folkwikisetit", url: "folkwikiSet3.js" },
	    { type: "VPS", url: "esavelmat_kansantanssit.js" },
	{ type: "KJS", url: "esavelmat_kjs.js" },
	{ type: "Runonlaulumelodiat", url: "esavelmat_rs1.js" },
	{ type: "Runonlaulumelodiat", url: "esavelmat_rs2.js" },
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
    // Haetaan nykyiset soitinasetukset (esim. transponointi)
    var audioParams = window.getAudioOptions();

    // Ladataan nuotit ohjaimeen asetuksilla
    synthControl.setTune(visualObj, false, audioParams).then(function() {
        console.log("🎵 Nuotit ladattu soittimeen.");
    }).catch(function(err) {
        console.warn("Virhe asetettaessa nuotteja ohjaimelle:", err);
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

// --- GLOBAALI ÄÄNIRAKENNE JA KAIKU (REVERB) ---
window.sharedAudioContext = null;
var reverbNode = null;
var reverbGain = null;
var dryGain = null;

// Funktio, joka luo kaiun ja ääniväylän heti kun käyttäjä klikkaa tai aloittaa soiton
function varmistaAudioJaKaiku() {
    if (!window.sharedAudioContext) {
        // Luodaan yhteinen AudioContext
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        window.sharedAudioContext = new AudioCtx();
        
        var ctx = window.sharedAudioContext;

        // Luodaan solmut: kaiku, kaiun voimakkuus ja suora ääni
        reverbNode = ctx.createConvolver();
        reverbGain = ctx.createGain();
        dryGain = ctx.createGain();

        // SÄÄDÄ KAIUN MÄÄRÄÄ TÄSTÄ:
        // 0.45 = 45% kaikua (miellyttävä, iso tila), 0.7 = suora ääni
        reverbGain.gain.value = 0.45; 
        dryGain.gain.value = 0.75;

        // Generoidaan huonekaikua simuloiva valkoinen kohina (pituus 2.5 sekuntia)
        var sampleRate = ctx.sampleRate;
        var length = sampleRate * 2.5; 
        var impulse = ctx.createBuffer(2, length, sampleRate);
        var left = impulse.getChannelData(0);
        var right = impulse.getChannelData(1);

        for (var i = 0; i < length; i++) {
            var decay = Math.exp(-i / (sampleRate * 0.8)); 
            left[i] = (Math.random() * 2 - 1) * decay;
            right[i] = (Math.random() * 2 - 1) * decay;
        }
        reverbNode.buffer = impulse;

        // Kytketään suora linja kaiuttimiin
        dryGain.connect(ctx.destination);
        // Kytketään kaikulinja efektin läpi kaiuttimiin
        reverbNode.connect(reverbGain);
        reverbGain.connect(ctx.destination);
        
        console.log("🌌 Digitaalinen kaikulaite alustettu onnistuneesti!");
    }
    
    if (window.sharedAudioContext.state === 'suspended') {
        window.sharedAudioContext.resume();
    }
}

// Globaali funktio soitinasetusten hakemiseen ja kaiun kytkemiseen lennosta
window.getAudioOptions = function() {
    var instrumentSelect = document.getElementById('instrumentSelect');
    var selectedInstrument = instrumentSelect ? instrumentSelect.value : 'piano';

    varmistaAudioJaKaiku(); // Varmistetaan että ääniväylä on luotu

    if (selectedInstrument === 'flute') {
        // Jos valittu huilu, reititetään ääni sekakytkentään (Dry + Reverb)
        if (dryGain && reverbNode) {
            dryGain.gain.value = 0.75;    // Suora ääni kuuluu
            reverbGain.gain.value = 0.45; // Kaiku päällä
        }
        return {
            midiTranspose: window.currentTranspose || 0,
            program: 73,                        
            soundFontUrl: "soundfonts/",
            audioContext: window.sharedAudioContext,
            targetNode: dryGain // Pakotetaan abcjs syöttämään ääni suoraan meidän efektiketjuun
        };
    } else {
        // Jos valittu alkuperäinen piano, vaimennetaan kaiku kokonaan
        if (dryGain && reverbGain) {
            dryGain.gain.value = 1.0;     // Piano kuuluu täysillä ja kuivana
            reverbGain.gain.value = 0.0;  // Kaiku pois päältä
        }
        return {
            midiTranspose: window.currentTranspose || 0,
            audioContext: window.sharedAudioContext
            // Perus-abcjs käyttää suoraan Contextia ilman targetNodea
        };
    }
};

// Alustetaan abcjs ohjain globaalisti
synthControl = new ABCJS.synth.SynthController();

function initAudioController() {
    var currentOptions = window.getAudioOptions();
    synthControl.load("#audio", null, {
        displayLoop: true,
        displayRestart: true,
        displayPlay: true,
        displayProgress: true,
        displayWarp: false,
        options: currentOptions
    });
}

// Käynnistetään ohjain puhtaalta pöydältä
initAudioController();
processAbc();

// Kuunnellaan soitinvalikon muutoksia
function lisaaSoitinKuuntelija() {
    var instrumentSelect = document.getElementById('instrumentSelect');
    if (instrumentSelect) {
        instrumentSelect.removeEventListener('change', vaihdaSoitinLennosta);
        instrumentSelect.addEventListener('change', vaihdaSoitinLennosta);
        console.log("✅ Soitinvalikon kuuntelija aktivoitu!");
    }
}

function vaihdaSoitinLennosta() {
    console.log("🔄 Soitin vaihdettu valikosta: " + this.value);
    varmistaAudioJaKaiku();
    initAudioController();
    processAbc();
}

// Aktivoidaan kuuntelija heti ja sivun latautuessa
lisaaSoitinKuuntelija();
document.addEventListener('DOMContentLoaded', lisaaSoitinKuuntelija);
window.addEventListener('load', lisaaSoitinKuuntelija);

// Herätetään äänimoottori heti, kun käyttäjä klikkaa sivua missä tahansa
document.addEventListener('click', function() {
    varmistaAudioJaKaiku();
}, { once: false }); // Pidetään päällä, jotta herää varmasti aina
