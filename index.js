const express = require("express");
const path = require("path");
const fs = require("fs");
const sass = require("sass");


app = express();
app.set("view engine", "ejs")

obGlobal = {
    obErori: null,
    obImagini: null,
    folderScss: path.join(__dirname, "resurse/scss"),
    folderCss: path.join(__dirname, "resurse/css"),
    folderBackup: path.join(__dirname, "backup"),
}

function initErori() {
    let continut = fs.readFileSync(path.join(__dirname, "json/erori.json")).toString("utf-8");
    let erori = obGlobal.obErori = JSON.parse(continut)
    let err_default = erori.eroare_default

    err_default.imagine = path.join(erori.cale_baza, err_default.imagine)
    for (let eroare of erori.info_erori) {
        eroare.imagine = path.join(erori.cale_baza, eroare.imagine)
    }

}
initErori()
let err_default = obGlobal.obErori.eroare_default;
function afisareEroare(res, identficator, titlu, text, imagine) {
    let eroare = obGlobal.obErori.info_erori.find((elem) => elem.identficator == identficator);
    res.render('./pagini/eroare', {
        imagine: imagine || eroare?.imagine || err_default.imagine,
        titlu: titlu || eroare?.titlu || err_default.titlu,
        text: text || eroare?.text || err_default.text,
    })
}

console.log("Folder index.js", __dirname);
console.log("Folder curent (de lucru)", process.cwd());
console.log("Cale fisier", __filename);

app.use("/resurse", express.static(path.join(__dirname, "resurse")));

let vect_foldere = [ "temp", "logs", "backup", "fisiere_uploadate"] ;
for(let folder of vect_foldere){ 
    let caleFolder = path.join(__dirname, folder); 
    if( !fs.existsSync(caleFolder))
        fs.mkdirSync(caleFolder); 
}


app.get('./:a/:b', (req, res) => {
    console.log(parseInt(req.params.a) + parseInt(req.params.b));
})

app.get("/favicon.ico", (req, res) => { res.sendFile(path.join(__dirname , "resurse/imagini/favicon"))})

app.get(['/', '/index', '/home'], (req, res, next) => {

    res.render('./pagini/mainPage', {
        ip: req.ip
    });
})

app.get('/despre', (req, res) => {
    res.render('./pagini/secondPage');
})
/*
app.get("/*pagina", (req, res) => {

    console.log("Cale pagina ", req.url);
    res.render("pagini" + req.url, (err, rezRandare) => {
        if (err) {
            if (err.message.includes("Failed to lookup view")) {
                afisareEroare(res, 404);
                return
            }

            afisareEroare(res);
            return;
        }
    });

})
*/
app.get('/cale/:a/:b', (req, res) => {
    res.send(parseInt(req.params.a) + parseInt(req.params.b));
})

app.get('/eroare', (req, res) => {
    afisareEroare(res, "404");
})
app.listen(8080);
console.log("Serverul a pornit!");