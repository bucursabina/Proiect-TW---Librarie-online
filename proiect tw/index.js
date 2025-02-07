const express = require('express');
const path = require('path');
const fs = require('fs');
const sass = require('sass');


const app = express();


app.set('view engine', 'ejs');


//5.3
// Se vor defini în obiectul global două proprietăți folderScss și 
// folderCss care conțin căile din folderul de 
// resurse (depinzând de __dirname)
global.obGlobal = {
    obErori: {},
    folderBackup: path.join(__dirname, "backup"),
    folderScss: path.join(__dirname, "resurse/scss"),
    folderCss: path.join(__dirname, "resurse/css")
}

//5.3
// 
let vectorFoldere = ["temp", "backup"];
vectorFoldere.forEach(folder => {
    let folderPath = path.join(__dirname, folder);
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }
});

//Funcția de compilare a scss-urilor. Se va face o 
// funcție compileazaScss(caleScss, caleCss){} 
// care compileaza un fișier scss în fișier css.   
// Primii 2 parametrii reprezintă căile către fișierul scss 
// (inputul funcției) și fisierul css (outputul funcției). 
// Dacă avem căi absolute se iau fișierele de la cele 
// două căi, iar dacă sunt relative se vor considera 
// relative la folderScss, respectiv folderCss. 
// compilarea se va face cu ajutorul pachetului sass. 
// Dacă numele/calea fișierului css lipsește, se va 
// salva în folderCss rezultatul compilarii folosind 
// numele fișierului scss, dar cu extensia css
function compileazaScss(caleScss, caleCss) {
    if (!caleCss) {
        const numeBaza = path.basename(caleScss, '.scss') + '.css';
        caleCss = path.join(global.obGlobal.folderCss, numeBaza);
    }

    const caleAbsolutaScss = path.isAbsolute(caleScss)
        ? caleScss
        : path.join(global.obGlobal.folderScss, caleScss);
    const caleAbsolutaCss = path.isAbsolute(caleCss)
        ? caleCss
        : path.join(global.obGlobal.folderCss, caleCss);
    //Salvare în backup. În cadrul funcției compileazaScss, 
    // înainte de compilarea automată a scss-ului în fișierul 
    // css asociat, fișierul css vechi cu același nume va fi 
    // copiat în subcalea resurse/css a folderului backup. 
    // Orice folder din această subcale va fi creat dacă 
    // nu există deja. Se va afișa un mesaj de eroare 
    // în cazul eșecului copierii.
    const folderBackup = path.join(global.obGlobal.folderBackup, 'resurse/css');
    if (!fs.existsSync(folderBackup)) {
        fs.mkdirSync(folderBackup, { recursive: true });
    }

    if (fs.existsSync(caleAbsolutaCss)) {
        const dataTimp = new Date().toISOString().replace(/[:.]/g, '-');
        const fisierBackup = path.join(folderBackup, `${path.basename(caleAbsolutaCss, '.css')}_${dataTimp}.css`);
        try {
            fs.copyFileSync(caleAbsolutaCss, fisierBackup);
        } catch (eroare) {
            console.error("Eroare la copierea pentru backup:", eroare);
        }
    }

    const rezultat = sass.compile(caleAbsolutaScss, { sourceMap: true });
    fs.writeFileSync(caleAbsolutaCss, rezultat.css);
}


//Compilare inițială. La pornirea serverului, toate fisierele 
// scss din folderScss trebuie să fie compilate în fișierele 
// css cu același nume folosind funcția compileazaScss. 
// Înainte de suprascrierea fișierului css, acesta va fi 
// copiat în folderul backup (suprascriind un backup cu același 
// nume - sau dacă vreți să păstrați backup-urile anterioare 
// puteți integra în nume o informație cu privire la timpul creării.
fs.readdirSync(global.obGlobal.folderScss)
    .filter(fisier => fisier.endsWith('.scss'))
    .forEach(fisier => compileazaScss(fisier));

// Compilare pe parcurs. Se va scrie cod (folosind fs.watch()) astfel 
// încât să se urmărească modificările din folderul de fișiere scss. 
// La modificarea/crearea unui fișier acesta va fi compilat automat 
// în css. Fișierul css va acea același nume cu fișierul 
// scss, având doar extensia scss schimbată în css. Înainte de 
// suprascrierea fișierului css, acesta va fi copiat în folderul 
// backup (suprascriind un backup cu același nume - sau dacă 
// vreți să păstrați backup-urile anterioare puteți integra în 
// nume o informație cu privire la timpul creării
fs.watch(global.obGlobal.folderScss, (modificareFisier, numeFisier) => {
    if (numeFisier && (modificareFisier === 'change' || modificareFisier === 'rename')) {
        const caleFisier = path.join(global.obGlobal.folderScss, numeFisier);
        if (fs.existsSync(caleFisier)) {
            compileazaScss(caleFisier);
        } 
    }
});


// 4.3 Să se afișeze calea folderului în care se găsește fișierul index.js (__dirname), calea fișierului (__filename) și folderul curent de lucru (process.cwd()). Sunt __dirname și process.cwd() același lucru întotdeauna?


console.log("Calea folderului index.js:", __dirname);
console.log("Calea fisierului index.js:", __filename);
console.log("Folderul curent de lucru:", process.cwd());

// 4.6 bun folder special cu toate resursele site-ului (toate fișierele statice, precum imagini, fișiere de stil, videoclipuri etc în folderul "resurse")
// Se va defini în program acest folder ca fiind static

app.use("/resurse", express.static(path.join(__dirname, "resurse")));

app.get(["/", "/index", "/home"], (req, res) => {
    res.render("pagini/index", { titlu: "Universul Cărților", ip: req.ip });
});

app.get("/Biografii", (req, res) => {
    res.render("pagini/Biografii", { titlu: "Universul Cărților", ip: req.ip });
});
//4.17 La o cerere către o cale din /resurse fără fișier specificat se va returna eroarea 403 Forbidden.
app.get(/^\/resurse\/[a-zA-Z0-9\/]*\/$/, function (req, res) {
    afisareEroare(res, 403);
});

//4.18 La cererea oricărui fișier cu extensia ejs se va transmite o eroare de tip 400 Bad Request.
app.get("/*.ejs", function (req, res) {
    afisareEroare(res, 400);
});

app.get("/favicon.ico", function (req, res) {
    res.sendFile(path.join(__dirname, "resurse", "ico", "favicon.ico"));
});


app.get("/*", function (req, res) {
    let pagina = "pagini" + req.url;

    res.render(pagina, function (err, rezultatRandare) {
        if (err) {
            console.error("Eroare la randare:", err.message);

            if (err.message.startsWith("Failed to lookup view")) {
                afisareEroare(res, 404, "Pagina negăsită", "Pagina pe care o cauți nu există!");
            } else {
                afisareEroare(res, -1);
            }
        } else {
            res.send(rezultatRandare);
        }
    });
});



function initErori() {
    let caleJson = path.join(__dirname, "resurse/json/erori.json");

    
        let continut = fs.readFileSync(caleJson, "utf-8");
        obGlobal.obErori = JSON.parse(continut);

        obGlobal.obErori.eroare_default.imagine = obGlobal.obErori.cale_baza + obGlobal.obErori.eroare_default.imagine;

        for (let eroare of obGlobal.obErori.info_erori) {
            eroare.imagine = obGlobal.obErori.cale_baza + eroare.imagine;
        }

        console.log("Erori încărcate cu succes:", obGlobal.obErori);
    } 




initErori();

// Funcția de afișare a erorilor
function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroare = obGlobal.obErori.info_erori.find(function(elem) {
        return elem.identificator==identificator
    });

    if (!eroare) {
        eroare = obGlobal.obErori.eroare_default;
    }

    
    var titluFinal = titlu || eroare.titlu;
    var textFinal = text || eroare.text;
    var imagineFinal = imagine || eroare.imagine;

    
    if(eroare){
        if(eroare.status)
            res.status(identificator)
        var titluCustom=titlu || eroare.titlu;
        var textCustom=text || eroare.text;
        var imagineCustom=imagine || eroare.imagine;


    }

    res.render("pagini/eroare", {
        titlu: titluFinal,
        text: textFinal,
        imagine: imagineFinal
    });
}




// etapa 4.2 În el se va crea un obiect server express care va asculta pe portul 8080. (sau alt port daca aveti deja folosit 8080)

app.listen(8080, () => {
    console.log("Serverul a pornit pe portul 8080");
});