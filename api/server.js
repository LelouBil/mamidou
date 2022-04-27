const express = require('express');
const app = express();
const fs = require("fs");
const jwt = require("jsonwebtoken")
const config = require("./configs")

app.use(express.json());

const cors = require('cors');
const ParseDate = require("date-fns/parse");

if (cors.NODE_ENV !== 'production') {
    app.use(cors())
}

const CHILDREN_FILE = __dirname + "/../data/children.json";
const DATA_FILE = __dirname + "/../data/data.json";

// ---------- LOGIN ----------
app.post("/api/login", (req, res) => {
    if (!req.body.password)
        return res.status(400)

    const password = req.body.password

    if (password === config.password) {
        const token = jwt.sign({}, config.jwt.secret, {expiresIn: config.jwt.expiration}, null)
        return res.json(token)
    } else {
        return res.status(401)
    }
})

// ---------- GET ----------
// Tous les enfants
app.get('/api/children', (req, res) => {

    fs.readFile(CHILDREN_FILE, 'utf8', function (err, data) {
        res.send(data);
    });
})

// Un enfant précis
app.get('/api/children/:child', (req, res) => {
    const child = req.params.child;

    fs.readFile(CHILDREN_FILE, 'utf8', function (err, data) {
        const json = JSON.parse(data);

        const txt = JSON.stringify(json[child], null, 2);
        res.send(txt);
    });
})

// Toutes les données
app.get('/api/data', (req, res) => {

    fs.readFile(DATA_FILE, 'utf8', function (err, data) {
        res.send(data);
    });
})

// Des données précises
app.get('/api/data/:child', (req, res) => {
    const child = req.params.child;

    fs.readFile(DATA_FILE, 'utf8', function (err, data) {
        const json = JSON.parse(data);

        const txt = JSON.stringify(json[child], null, 2);
        res.send(txt);
    });
})


// ---------- PATCH ----------
// Modifier une donnée spécifique d'un enfant
app.patch("/api/data/:child/:date", (req, res) => {
    if (!validToken(req.headers["x-access-token"]))
        return res.status(403)

    const child = req.params.child;
    const date = req.params.date.replace(/-/g, "/");

    if (!req.body.value)
        req.body.value = 0
    else if (!Number.isNaN(req.body.value))
        req.body.value = Number(req.body.value)
    else
        req.body.value = 0

    const newVal = req.body.value;

    fs.readFile(DATA_FILE, 'utf8', function (err, data) {
        let json = JSON.parse(data)
        if (json[child] && newVal)
            for (let i = 0; i < json[child].length; i++)
                if (json[child][i].date === date)
                    json[child][i].value = newVal;

        json[child].sort(dataSort)

        const txt = JSON.stringify(json, null, 2);
        fs.writeFile(DATA_FILE, txt, (err) => {
            if (err) {
                console.log(err);
                res.sendStatus(500);
            } else {
                res.send(txt);
            }
        })
    });
});

// Modifier la couleur d'un enfant
app.patch("/api/children/:child", (req, res) => {
    if (!validToken(req.headers["x-access-token"]))
        return res.status(403)

    const child = req.params.child;
    const newColor = req.body.color;

    fs.readFile(CHILDREN_FILE, 'utf8', function (err, data) {
        const json = JSON.parse(data)

        if (json[child] && newColor)
            json[child].color = newColor;

        const txt = JSON.stringify(json, null, 2);
        fs.writeFile(CHILDREN_FILE, txt, (err) => {
            if (err) {
                console.log(err);
                res.sendStatus(500);
            } else {
                res.send(txt);
            }
        })
    });
});


// ---------- PUT ----------
// Ajouter un enfant
app.put("/api/children/:child", (req, res) => {
    if (!validToken(req.headers["x-access-token"]))
        return res.status(403)

    const child = req.params.child;

    if (!req.body.date)
        req.body.date = "01/01/2022"
    if (!req.body.color)
        req.body.color = "#123456"

    const val = {"date": req.body.date, "color": req.body.color};

    fs.readFile(CHILDREN_FILE, 'utf8', function (err, data) {
        let json = JSON.parse(data)

        json[child] = val;

        const txt = JSON.stringify(json, null, 2);
        fs.writeFile(CHILDREN_FILE, txt, (err) => {
            if (err) {
                console.log(err);
                res.sendStatus(500);
            } else {
                res.send(txt);
            }
        })
    });
});

// Ajouter une donnée
app.put("/api/data/:child", (req, res) => {
    if (!validToken(req.headers["x-access-token"]))
        return res.status(403)

    const child = req.params.child;

    if (!req.body.date)
        req.body.date = "01/01/2022"

    if (!req.body.value)
        req.body.value = 0
    else if (!Number.isNaN(req.body.value))
        req.body.value = Number(req.body.value)
    else
        req.body.value = 0


    const val = {"date": req.body.date, "value": req.body.value};

    fs.readFile(DATA_FILE, 'utf8', function (err, data) {
        let json = JSON.parse(data)

        if (!json[child])
            json[child] = [];

        json[child].push(val);
        json[child].sort(dataSort)

        const txt = JSON.stringify(json, null, 2);
        fs.writeFile(DATA_FILE, txt, (err) => {
            if (err) {
                console.log(err);
                res.sendStatus(500);
            } else {
                res.send(txt);
            }
        })
    });
});


// ---------- DELETE ----------
// Éradiquer un enfant
app.delete("/api/children/:child", (req, res) => {
    if (!validToken(req.headers["x-access-token"]))
        return res.status(403)

    deleteData(req, res, CHILDREN_FILE)
});

// Supprimer les données d'un enfant
app.delete("/api/data/:child", (req, res) => {
    if (!validToken(req.headers["x-access-token"]))
        return res.status(403)

    deleteData(req, res, DATA_FILE)
});

// Supprimer une donnée d'un enfant
app.delete("/api/data/:child/:position", (req, res) => {
    if (!validToken(req.headers["x-access-token"]))
        return res.status(403)

    const child = req.params.child;
    const position = req.params.position;

    fs.readFile(DATA_FILE, 'utf8', function (err, data) {
        let json = JSON.parse(data)

        if (json[child])
            json[child].splice(position, 1);

        if (json[child].length === 0)
            delete json[child]

        const txt = JSON.stringify(json, null, 2);
        fs.writeFile(DATA_FILE, txt, (err) => {
            if (err) {
                console.log(err);
                res.sendStatus(500);
            } else {
                res.send(txt);
            }
        })
    });
});


// COMMENCER ÉCOUTE
app.listen(3000, function () {
    console.log("J'écoute");
});


// FONCTIONS
function deleteData(req, res, path) {
    const child = req.params.child;

    fs.readFile(path, 'utf8', function (err, data) {
        let json = JSON.parse(data)
        delete json[child];

        const txt = JSON.stringify(json, null, 2);
        fs.writeFile(path, txt, (err) => {
            if (err) {
                console.log(err);
                res.sendStatus(500);
            } else {
                res.send(txt);
            }
        })
    });
}

function dataSort(a, b) {
    const date1 = ParseDate(a.date, 'dd/MM/yyyy', new Date())
    const date2 = ParseDate(b.date, 'dd/MM/yyyy', new Date())

    if (date1 < date2)
        return -1
    else
        return 1
}

function validToken(token) {
    const decode = jwt.decode(token, null)
    return decode !== undefined
}