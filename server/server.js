// Import necessary modules
const express = require('express');
const path = require('path');
const {testDb, analayzeText, makeTables, saveData  } = require('./helpers');

// --- Initialization ---
const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
// Parse incoming JSON requests, needed for webhooks & Parse URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MAIN WEBAPP ENTRY POINT
app.get('/', async (req, res) => {
  try {
    res.status(200).send(`
      <!doctype html>
      <html lang="en">
      <head>
       <meta charset="utf-8">
       <title>${process.env.BABYNAME}</title>
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <link rel="preconnect" href="https://fonts.googleapis.com">
       <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
       <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Sora:wght@500&display=swap" rel="stylesheet">
       <link rel="stylesheet" href="styles.css">
      </head>
      <body>
       <!--<h2>${process.env.BABYNAME}</h2>-->
       <h3 class="sticky"><a href="#feed">Feeding</a> &middot; <a href="#diaper">Diapers</a> &middot; <a href="#pump">Pumping</a></h3>
       ${await makeTables()}
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Error ', err);
    res.status(500).send('Error doing something');
  }
});

/* --- Webhooks --- */
app.post('/', async (req, res) => {
  console.log('BEGIN DATA RECEIVED HOOK');
  //console.debug(JSON.stringify(req.body, null, 2));

  const text = req.body.text;
  console.debug(text);
  try {
    const data = await analayzeText(text); // save agent data to db
    const save = await saveData(data); // save customer data to db
  } catch(err){
    console.error(`WEBHOOK ${err}:`);
    res.status(500).send({ message: 'ERROR - Try that again?' });
  }
  console.log('END DATA RECEIVED HOOK');
  res.status(200).send({ message: 'SUCCESS! We got you fam!' });
});

// --- Server Start ---
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
