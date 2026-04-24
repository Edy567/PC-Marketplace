const express = require("express");
const path = require("path");
const fs = require("fs");
const sass = require("sass");
const sharp = require("sharp");

const app = express();
app.set("view engine", "ejs");

const obGlobal = {
    obErori: null,
    obImagini: null,
    folderScss: path.join(__dirname, "resurse/scss"),
    folderCss: path.join(__dirname, "resurse/css"),
    folderBackup: path.join(__dirname, "backup"),
};

function getDateGalerie() {
    const oraCurenta = new Date().getHours();
    let imaginiFiltrate = [];
    if (obGlobal.obImagini) {
        imaginiFiltrate = obGlobal.obImagini.imagini.filter(img => 
            img.intervale_ore.some(inter => oraCurenta >= inter[0] && oraCurenta <= inter[1])
        );
        if (imaginiFiltrate.length % 2 !== 0) imaginiFiltrate.pop();
    }
    return {
        imagini: imaginiFiltrate,
        caleBaza: obGlobal.obImagini?.cale_galerie || ""
    };
}

function verificareImagini() {
    const caleJSON = path.join(__dirname, "json/imagini.json");
    if (!fs.existsSync(caleJSON)) return;
    try {
        let continut = fs.readFileSync(caleJSON, "utf-8");
        obGlobal.obImagini = JSON.parse(continut);
        const caleAbsolutaGalerie = path.join(__dirname, obGlobal.obImagini.cale_galerie);
        if (!fs.existsSync(caleAbsolutaGalerie)) {
            console.error(`[EROARE] Folder galerie inexistent: ${caleAbsolutaGalerie}`);
        } else {
            obGlobal.obImagini.imagini.forEach(img => {
                const caleImagine = path.join(caleAbsolutaGalerie, img.cale_relativa);
                if (!fs.existsSync(caleImagine)) {
                    console.error(`[EROARE] Lipseste fisierul: ${img.cale_relativa}`);
                }
            });
        }
    } catch (err) { console.error(err.message); }
}

async function proceseazaImagini() {
    if (!obGlobal.obImagini || !obGlobal.obImagini.cale_galerie) return;
    const caleImagini = path.join(__dirname, obGlobal.obImagini.cale_galerie);
    const caleImaginiMici = path.join(caleImagini, "mic");
    if (!fs.existsSync(caleImaginiMici)) fs.mkdirSync(caleImaginiMici, { recursive: true });

    for (let img of obGlobal.obImagini.imagini) {
        const caleSursa = path.join(caleImagini, img.cale_relativa);
        if (!fs.existsSync(caleSursa)) continue;
        const numeFisier = path.parse(img.cale_relativa).name + ".webp";
        const caleDestinatie = path.join(caleImaginiMici, numeFisier);
        if (!fs.existsSync(caleDestinatie)) {
            try { await sharp(caleSursa).resize(300).toFile(caleDestinatie); } catch (err) { console.error(err); }
        }
        img.cale_mica = "/" + obGlobal.obImagini.cale_galerie + "/mic/" + numeFisier;
    }
}

function initErori() {
    let cale = path.join(__dirname, "json/erori.json");
    if (fs.existsSync(cale)) {
        let continut = fs.readFileSync(cale).toString("utf-8");
        obGlobal.obErori = JSON.parse(continut);
        let err_default = obGlobal.obErori.eroare_default;
        err_default.imagine = path.join(obGlobal.obErori.cale_baza, err_default.imagine);
        for (let eroare of obGlobal.obErori.info_erori) {
            eroare.imagine = path.join(obGlobal.obErori.cale_baza, eroare.imagine);
        }
    }
}

function afisareEroare(res, identificator, titlu, text, imagine) {
    let err_default = obGlobal.obErori.eroare_default;
    let eroare = obGlobal.obErori.info_erori.find((elem) => elem.identificator == identificator);
    res.status(parseInt(identificator) || 400).render('./pagini/eroare', {
        imagine: imagine || eroare?.imagine || err_default.imagine,
        titlu: titlu || eroare?.titlu || err_default.titlu,
        text: text || eroare?.text || err_default.text,
    });
}

function compileazaScss(caleScss, caleCss) {
    if (!path.isAbsolute(caleScss)) caleScss = path.join(obGlobal.folderScss, caleScss);
    let numeFisier = path.basename(caleScss, ".scss");
    if (!caleCss) caleCss = path.join(obGlobal.folderCss, numeFisier + '.css');

    if (fs.existsSync(caleCss)) {
        try {
            let caleBackupCss = path.join(obGlobal.folderBackup, "resurse/css");
            if (!fs.existsSync(caleBackupCss)) fs.mkdirSync(caleBackupCss, { recursive: true });
            fs.copyFileSync(caleCss, path.join(caleBackupCss, `${numeFisier}_${Date.now()}.css`));
        } catch (err) {}
    }
    try {
        let rezultat = sass.compile(caleScss);
        fs.writeFileSync(caleCss, rezultat.css);
    } catch (err) {}
}

initErori();
verificareImagini();
proceseazaImagini();

let vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
for(let folder of vect_foldere){ 
    let caleFolder = path.join(__dirname, folder); 
    if(!fs.existsSync(caleFolder)) fs.mkdirSync(caleFolder); 
}

if (fs.existsSync(obGlobal.folderScss)) {
    fs.readdirSync(obGlobal.folderScss).forEach(f => {
        if (path.extname(f) === ".scss") compileazaScss(f);
    });
}

fs.watch(obGlobal.folderScss, (ev, nume) => {
    if (nume && path.extname(nume) === '.scss') compileazaScss(nume);
});

app.use("/resurse", (req, res, next) => {
    let caleFizica = path.join(__dirname, "resurse", req.url);
    if (fs.existsSync(caleFizica) && fs.statSync(caleFizica).isDirectory()) return afisareEroare(res, 403);
    next();
});

app.use("/resurse", express.static(path.join(__dirname, "resurse")));

app.get("/favicon.ico", (req, res) => res.sendFile(path.join(__dirname , "resurse/imagini/favicon.ico")));

app.get(['/', '/index', '/home'], (req, res) => {
    let date = getDateGalerie();
    res.render('./pagini/mainPage', { 
        ip: req.ip, 
        imagini: date.imagini, 
        caleBaza: date.caleBaza 
    });
});

app.get('/despre', (req, res) => {
    let date = getDateGalerie();
    res.render('./pagini/secondPage', {
        imagini: date.imagini, 
        caleBaza: date.caleBaza 
    });
});

app.get(/\.ejs$/, (req, res) => afisareEroare(res, 400));

app.get(/.*/, (req, res) => {
    if (req.url.includes('.')) return afisareEroare(res, 404);
    let date = getDateGalerie();
    res.render("pagini" + req.url, { 
        imagini: date.imagini, 
        caleBaza: date.caleBaza 
    }, (err, rez) => {
        if (err) return afisareEroare(res, err.message.includes("Failed to lookup view") ? 404 : 500);
        res.send(rez);
    });
});

app.listen(8080, () => console.log("Server pornit la http://localhost:8080"));