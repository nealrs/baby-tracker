//require('dotenv').config(); // Load environment variables from .env file
import { Pool } from 'pg'; // PostgreSQL client
import {GoogleGenAI, Type} from '@google/genai';


/** Database helpers */
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  max: 20, // Set the maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function testDb(){
  // Test DB connection
  pool.connect((err, client, release) => {
    if (err) {
      return console.error('Error acquiring client', err.stack);
    }
    console.log('Successfully connected to PostgreSQL database!');
    client.query('SELECT NOW()', (err, result) => {
      release(); // Release the client back to the pool
      if (err) {
        return console.error('Error executing query', err.stack);
      }
      console.log('Current time from DB:', result.rows[0].now);
      //console.log('pool info:', pool);
    });
  });
}


// Convert the Unix timestamp string to an integer.
async function goodTime(ts) {
  // Convert the Unix timestamp string to an integer and then to a Date object.
  const date = new Date(parseInt(ts, 10));

  // Use Intl.DateTimeFormat to format the date for a specific time zone.
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true, // Use 12-hour format with AM/PM
    timeZone: 'America/New_York', // Set the specific timezone
  });
  // The format() method returns the formatted string directly.
  return formatter.format(date);
}

/**
 * Inserts one or more new records into the 'feeds' table in a single transaction.
 * @param {Array<Object>} records An array of feed record objects to insert.
 */
async function insertFeeds(records) {
  if (!records || records.length === 0) {
    console.log('No feed records provided to insert.');
    return;
  }
  const client = await pool.connect();
  try {
    //await client.connect();
    await client.query('BEGIN'); // Start the transaction

    for (const record of records) {
      const { source, breast_side, breast_duration, bottle_contents, bottle_volume, bottle_volume_unit, notes } = record;
      const query = `
        INSERT INTO feeds (time, source, breast_side, breast_duration, bottle_contents, bottle_volume, bottle_volume_unit, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `;
      const values = [Date.now(), source, breast_side, breast_duration, bottle_contents, bottle_volume, bottle_volume_unit, notes];
      await client.query(query, values);
    }

    await client.query('COMMIT'); // Commit the transaction
    console.log(`Successfully inserted ${records.length} feed records.`);
  } catch (error) {
    await client.query('ROLLBACK'); // Rollback on error
    console.error('Error inserting feed records:', error);
    throw error;
  } finally {
    await client.release();
  }
}

/**
 * Inserts one or more new records into the 'pumps' table in a single transaction.
 * @param {Array<Object>} records An array of pump record objects to insert.
 */
async function insertPumps(records) {
  if (!records || records.length === 0) {
    console.log('No pump records provided to insert.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const record of records) {
      const { breast_side, pump_volume, pump_volume_unit, notes } = record;
      const query = `
        INSERT INTO pumps (time, breast_side, volume, volume_unit, notes)
        VALUES ($1, $2, $3, $4, $5);
      `;
      const values = [Date.now(), breast_side, pump_volume, pump_volume_unit, notes];
      await client.query(query, values);
    }

    await client.query('COMMIT');
    console.log(`Successfully inserted ${records.length} pump records.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inserting pump records:', error);
    throw error;
  } finally {
    await client.release();
  }
}

/**
 * Inserts one or more new records into the 'diapers' table in a single transaction.
 * @param {Array<Object>} records An array of diaper record objects to insert.
 */
async function insertDiapers(records) {
  if (!records || records.length === 0) {
    console.log('No diaper records provided to insert.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const record of records) {
      const { diaper_type, diaper_color, notes } = record;
      const query = `
        INSERT INTO diapers (time, type, color, notes)
        VALUES ($1, $2, $3, $4);
      `;
      const values = [Date.now(), diaper_type, diaper_color, notes];
      await client.query(query, values);
    }

    await client.query('COMMIT');
    console.log(`Successfully inserted ${records.length} diaper records.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inserting diaper records:', error);
    throw error;
  } finally {
    await client.release();
  }
}

/**
 * Iterates through the organized data object and inserts each record
 * into the appropriate PostgreSQL table.
 *
 * @param {object} organizedData An object with 'feeds', 'pumps', and 'diapers' arrays.
 * @returns {Promise<void>} A promise that resolves when all insertions are complete.
 */
async function saveData(organizedData) {
  try {
    const { feeds, pumps, diapers } = organizedData;

    console.log(`Starting to save ${feeds.length} feeds, ${pumps.length} pumps, and ${diapers.length} diapers.`);

    // Insert all records for each activity in a single transaction
    await insertFeeds(feeds);
    await insertPumps(pumps);
    await insertDiapers(diapers);

    console.log('All data saved successfully!');
  } catch (error) {
    console.error('An error occurred during data saving:', error);
    // You can choose to re-throw the error or handle it gracefully
    throw error;
  }
}

/**
 * Retrieves all records from the 'feeds' table.
 * @returns {Array<Object>} An array of feed record objects.
 */
async function getFeeds() {
  const client = await pool.connect();
  console.log('Connected to the database to retrieve feeds.');

  try {
    const query = 'SELECT * FROM feeds ORDER BY time DESC;';
    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error retrieving feeds:', error);
    return [];
  } finally {
    await client.release();
    console.log('Connection to the database closed.');
  }
}

/**
 * Retrieves all records from the 'pumps' table.
 * @returns {Array<Object>} An array of pump record objects.
 */
async function getPumps() {
  const client = await pool.connect();
  console.log('Connected to the database to retrieve pumps.');

  try {
    const query = 'SELECT * FROM pumps ORDER BY time DESC;';
    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error retrieving pumps:', error);
    return [];
  } finally {
    await client.release();
    console.log('Connection to the database closed.');
  }
}

/**
 * Retrieves all records from the 'diapers' table.
 * @returns {Array<Object>} An array of diaper record objects.
 */
async function getDiapers() {
  const client = await pool.connect();
  console.log('Connected to the database to retrieve diapers.');
  
  try {
    const query = 'SELECT * FROM diapers ORDER BY time DESC;';
    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error retrieving diapers:', error);
    return [];
  } finally {
    await client.release();
    console.log('Connection to the database closed.');
  }
}

/**
 * Organizes a mixed array of infant activity records into a structured object
 * with separate arrays for each activity type (feeds, pumps, diapers).
 *
 * @param {Array<Object>} allRecords An array of objects, where each object
 * represents a single activity.
 * @returns {Object} A new object with three arrays: 'feeds', 'pumps', and 'diapers'.
 */
function organizeRecords(allRecords) {
  // Initialize the final structure to hold the organized data.
  const organizedData = {
    feeds: [],
    pumps: [],
    diapers: [],
  };

  // Loop through each record in the input array.
  for (const record of allRecords) {
    // Check the 'activity' property to determine where to place the record.
    switch (record.activity) {
      case 'feed':
        organizedData.feeds.push(record);
        break;
      case 'pump':
        organizedData.pumps.push(record);
        break;
      case 'diaper':
        organizedData.diapers.push(record);
        break;
      default:
        // Optional: Handle records with an unknown activity type.
        console.warn('Found a record with an unknown activity type:', record.activity);
        break;
    }
  }

  return organizedData;
}

/** HTML BUILDING FUNCTIONS */
/**
 * Retrieves all feeds and generates an HTML table.
 * @returns {string} An HTML string representing the feeds table.
 */
async function feedTable() {
  const feeds = await getFeeds();
  if (feeds.length === 0) {
    return '<h3 id="feed">Feeding</h3><p>No data found</p>';
  }

  let tableHtml = '<h3 id="feed">Feeding</h3><table>';
  tableHtml += '<thead><tr><th>Time</th><th>Method</th><th>Amount</th><!--<th>Notes</th>--></tr></thead>';
  tableHtml += '<tbody>';

  for (const feed of feeds) {
    const displayTime = await goodTime(feed.time);
    const source = feed.source;
    const sideOrContent = source === 'breast' ? feed.breast_side : feed.bottle_contents;
    const durationOrVolume = source === 'breast' ? `${feed.breast_duration ? feed.breast_duration : ""} min` : `${feed.bottle_volume ? feed.bottle_volume : ""} ${feed.bottle_volume_unit ? feed.bottle_volume_unit : ""}`;
    
    tableHtml += `<tr class="stripe">
      <td>${displayTime}</td>
      <td>${source}, ${sideOrContent ? sideOrContent : '?'}</td>
      <td>${durationOrVolume}</td>
      <!--<td>${feed.notes ? feed.notes : ""}</td>-->
    </tr>
    ${feed.notes ? `<tr><td colspan="3" class="notes">${feed.notes}</td></tr>` : ""}
    `;
  }

  tableHtml += '</tbody></table>';
  return tableHtml;
}

/**
 * Retrieves all pumps and generates an HTML table.
 * @returns {string} An HTML string representing the pumps table.
 */
async function pumpTable() {
  const pumps = await getPumps();
  if (pumps.length === 0) {
    return '<h3 id="pump">Pumping</h3><p>No pump data found</p>';
  }

  let tableHtml = '<h3 id="pump">Pumping</h3><table>';
  tableHtml += '<thead><tr><th>Time</th><th>Side</th><th>Volume</th><!--<th>Notes</th>--></tr></thead>';
  tableHtml += '<tbody>';

  for (const pump of pumps) {
    const displayTime = await goodTime(pump.time);
    tableHtml += `<tr class="stripe">
      <td>${displayTime}</td>
      <td>${pump.breast_side ? pump.breast_side : "?"}</td>
      <td>${pump.volume ? pump.volume : ""} ${pump.volume_unit ? pump.volume_unit : "?"}</td>
      <!--<td>${pump.notes ? pump.notes : ""}</td>-->
    </tr>
    ${pump.notes ? `<tr><td colspan="3" class="notes">${pump.notes}</td></tr>` : ""}
    `;
  }

  tableHtml += '</tbody></table>';
  return tableHtml;
}

/**
 * Retrieves all diapers and generates an HTML table.
 * @returns {string} An HTML string representing the diapers table.
 */
async function diaperTable() {
  const diapers = await getDiapers();
  if (diapers.length === 0) {
    return '<h3 id="diaper">Diapers</h3><p>No diaper data found</p>';
  }

  let tableHtml = '<h3 id="diaper">Diapers</h3><table>';
  tableHtml += '<thead><tr><th>Time</th><th>Type</th><th>Color</th><!--<th>Notes</th>--></tr></thead>';
  tableHtml += '<tbody>';

  for (const diaper of diapers) {
    const displayTime = await goodTime(diaper.time);
    tableHtml += `<tr class="stripe">
      <td>${displayTime}</td>
      <td>${diaper.type}</td>
      <td>${diaper.color ? diaper.color: ""}</td>
      <!--<td>${diaper.notes ? diaper.notes: ""}</td>-->
    </tr>
    ${diaper.notes ? `<tr><td colspan="3" class="notes">${diaper.notes}</td></tr>` : ""}
    `;
  }

  tableHtml += '</tbody></table>';
  return tableHtml;
}

/**
 * Build and assemble all tables into one HTML string
 * @returns {string} An HTML string representing the diapers table.
 */
async function makeTables() {
  const html = `
    ${await feedTable()}
    ${await diaperTable()} 
    ${await pumpTable()} 
  `;
  
  return html;
}

/** GEMINI AI STUFF */

/**
 * Extracts a clean JSON string from a Gemini API response.
 * @param {string} responseText The raw response text from the Gemini API.
 * @returns {string} The cleaned JSON string.
 */
async function cleanJSON(responseText) {
  let cleanJsonString = responseText.trim();
  if (cleanJsonString.startsWith('```json')) {
    cleanJsonString = cleanJsonString.substring(cleanJsonString.indexOf('\n') + 1);
  }
  if (cleanJsonString.endsWith('```')) {
    cleanJsonString = cleanJsonString.substring(0, cleanJsonString.lastIndexOf('```'));
  }
  return JSON.parse(cleanJsonString);
}

/**
 * Actually run the damn request and get some JSON back
 * @returns {Array<Object>} of data we can use for inserts later.
 */

async function analayzeText(text){
  const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

  // The system prompt defines the persona and rules for the model.
  const systemPrompt = "You are an expert post partum duala and data analyst. Your job is to help new parents track the health and wellbeing of newborns. Your input is transcribed audio from parents describing an activity they did, such as feeding the baby, changing the baby's diaper, or pumping breast milk. You will help them organize and summarize this information effectively by identifiying key details and activities. Your task is to extract the key activity detials and format them into a JSON array based on the provided schema.";

  // The return instructions can guide the model's output format.
  const returnInstructions = "Format your responses as objects in a JSON array. Each event should correspond to single 'row' and and adhere to the provided schema. Some fields may be blank for each activity, that's ok. Ensure all field names and enum values match the schema exactly.";

  const prompt = `${systemPrompt} Transcribe the following baby activity: "${text}" | ${returnInstructions} `;

  // const userPrompt = `Transcribe the following baby activity: "${text}" and return a JSON array that strictly adheres to the provided schema. Ensure all field names and enum values match the schema exactly.`;


  // The JSON schema defines the required output structure.
  const infantActivitySchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
          activity: {
              type: Type.STRING,
              enum: ["feed", "pump", "diaper"],
              description: "The type of activity."
          },
          source: {
              type: Type.STRING,
              enum: ["bottle", "breast"],
              description: "For 'feed' activity, the source of the milk."
          },
          breast_side: {
              type: Type.STRING,
              enum: ["left", "right", "both"],
              description: "For 'feed' or 'pump' activity, the breast side used."
          },
          breast_duration: {
              type: Type.NUMBER,
              description: "For 'feed' activity from the breast, duration in minutes (float)."
          },
          bottle_contents: {
              type: Type.STRING,
              enum: ["breast", "formula"],
              description: "For 'feed' activity from a bottle, the contents."
          },
          bottle_volume: {
              type: Type.NUMBER,
              description: "For 'feed' activity from a bottle, the volume (float)."
          },
          bottle_volume_unit: {
              type: Type.STRING,
              enum: ["oz", "mL"],                
              description: "For 'feed' activity from a bottle, the unit of volume."
          },
          pump_volume: {
              type: Type.NUMBER,
              description: "For 'pump' activity, the volume of milk pumped (float)."
          },
          pump_volume_unit: {
              type: Type.STRING,
              enum: ["oz", "mL"],
              description: "For 'pump' activity, the unit of volume."
          },
          diaper_type: {
              type: Type.STRING,
              enum: ["pee", "poop", "mixed", "dry"],
              description: "For 'diaper' activity, the type of diaper content."
          },
          diaper_color: {
              type: Type.STRING,
              description: "For 'diaper' activity, a plain text indication of color."
          },
          notes: {
              type: Type.STRING,
              description: "Any additional plaintext notes."
          }
      }
    }
  };

  const generationConfig = {
    responseMimeType: "application/json",
    responseSchema: infantActivitySchema,
    temperature: 0.5,
  };
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: generationConfig,
    });
    console.debug(res.text);

    const data = await cleanJSON(res.text);
    console.debug('GEMINI RESPONSE:', JSON.stringify(data, null, 2));
    
    return organizeRecords(data); // sort it into buckets for db inserts.

  } catch (error) {
      console.error('GEMINI ERROR:', error);
      return null;
      //res.status(500).json({ error: 'Failed to process request with Gemini API.', details: error.message });
  }
}

export { 
  testDb, analayzeText, makeTables, saveData 
};