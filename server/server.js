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
       <link rel="icon" href="favico.png" type="image/png">
       <link rel="apple-touch-icon" href="favico.png">
       <title>Baby Tracker</title>
       <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1">
       <link rel="preconnect" href="https://fonts.googleapis.com">
       <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
       <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Sora:wght@500&display=swap" rel="stylesheet">
       <link rel="stylesheet" href="styles.css">
      </head>
      <body>
       <!--<h2>${process.env.BABYNAME}</h2>-->
       <div id="header" class="sticky">
        <h3><a href="#top">Feeding</a> &middot; <a href="#diaper">Diapers</a> &middot; <a href="#pump">Pumping</a></h3>
        
        <div id ="formContainer">
          <form id="form">
            <textarea id="activity" name="activity" rows="2" cols="37" required placeholder="fed from left side, 10 minutes, was very fussy"></textarea>
            <br><input type="submit" value="Log activity" id="submitbutton"/>
          </form>
        </div>
       </div>
       ${await makeTables()}
       <script src="script.js" type='text/javascript'></script>
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
