const express = require("express");
const path = require("path");
const fs = require("fs");

app = express();
app.set("view engine", "ejs");

obGlobal = {
    obErori: null,
    obImagini: null,
    folderScss: path.join(__dirname, "resurse/scss"),
    folderCss: path.join(__dirname, "resurse/css"),
    folderBackup: path.join(__dirname, "backup"),
}

function initErori() {
    let continut = fs.readFileSync(path.join(__dirname, "json/erori.json")).toString("utf-8");
    let erori = obGlobal.obErori = JSON.parse(continut);
    let err_default = erori.eroare_default;

    err_default.imagine = path.join(erori.cale_baza, err_default.imagine);
    for (let eroare of erori.info_erori) {
        eroare.imagine = path.join(erori.cale_baza, eroare.imagine);
    }
}
initErori();

let err_default = obGlobal.obErori.eroare_default;

function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroare = obGlobal.obErori.info_erori.find((elem) => elem.identificator == identificator);
    
    let codStatus = 200;
    if (eroare && eroare.status) {
        codStatus = parseInt(identificator);
    } else if (identificator) {
        let parsedId = parseInt(identificator);
        if (!isNaN(parsedId)) codStatus = parsedId;
    } else {
        codStatus = 400; 
    }

    res.status(codStatus).render('./pagini/eroare', {
        imagine: imagine || eroare?.imagine || err_default.imagine,
        titlu: titlu || eroare?.titlu || err_default.titlu,
        text: text || eroare?.text || err_default.text,
    });
}

console.log("Folder index.js", __dirname);
console.log("Folder curent (de lucru)", process.cwd());
console.log("Cale fisier", __filename);

let vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
for(let folder of vect_foldere){ 
    let caleFolder = path.join(__dirname, folder); 
    if(!fs.existsSync(caleFolder))
        fs.mkdirSync(caleFolder); 
}

app.get(/\.ejs$/, (req, res) => {
    afisareEroare(res, 400);
});

app.use("/resurse", (req, res, next) => {
    let caleFizica = path.join(__dirname, "resurse", req.url);
    if (fs.existsSync(caleFizica)) {
        let stats = fs.statSync(caleFizica);
        if (stats.isDirectory()) {
            afisareEroare(res, 403);
            return;
        }
    }
    next();
});

app.use("/resurse", express.static(path.join(__dirname, "resurse")));

app.get("/favicon.ico", (req, res) => { 
    res.sendFile(path.join(__dirname , "resurse/imagini/favicon.ico"));
});

app.get(['/', '/index', '/home'], (req, res) => {
    res.render('./pagini/mainPage', {
        ip: req.ip
    });
});

app.get('/despre', (req, res) => {
    res.render('./pagini/secondPage');
});

app.get(/.*/, (req, res) => {
 if (req.url.includes('.')) {
        afisareEroare(res, 404);
        return;
    }
    console.log("Cale pagina ", req.url);
    res.render("pagini" + req.url, (err, rezRandare) => {
        if (err) {
            if (err.message.includes("Failed to lookup view")) {
                afisareEroare(res, 404);
                return;
            }
            afisareEroare(res);
            return;
        }
        res.send(rezRandare);
    });
});

app.listen(8080);
console.log("Serverul a pornit!");