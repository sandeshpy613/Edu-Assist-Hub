const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const path = require('path');
const multer = require('multer');
const Sentiment = require('sentiment');

// Initialize app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  }
}
connectDB();

// Student Model
const StudentSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  std_id: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fname: { type: String, required: true },
  lname: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  dob: { type: Date, required: true },
  email: { type: String, required: true },
  course: { type: String, required: true },
  branch: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  hobbies: { type: [String], required: true },
  photo: { type: String, required: true },
});

const Student = mongoose.model('Student', StudentSchema);

// Google Generative AI API Setup
const apiKey = process.env.GENAI_API_KEY;
if (!apiKey) {
  console.error("Error: API key is missing. Set GENAI_API_KEY in your environment.");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 2000,
  responseMimeType: "text/plain",
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/'); // Ensure this directory exists
  },
  filename: function (req, file, cb) {
    const std_id = req.body.std_id; // Get std_id from the form
    const ext = path.extname(file.originalname); // Get file extension
    cb(null, `${std_id}${ext}`); // Rename file to std_id + extension
  },
});

const upload = multer({ storage: storage });

// Define the History schema (flexible for both code and other pages)
const historySchema = new mongoose.Schema({
  page: { type: String, required: true },
  input: { type: String }, // Generic field for input (maps to inputCode or input)
  output: { type: String }, // Generic field for output (maps to outputCode or output)
  inputCode: { type: String }, // Optional, for older entries
  outputCode: { type: String }, // Optional, for older entries
  timestamp: { type: Date, default: Date.now }
});

// Create the History model (only once)
const History = mongoose.model('History', historySchema, 'History');

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/Project', (req, res) => {
  res.render('Project');
});

// Profile Route to Fetch User Data
app.get('/profile', async (req, res) => {
  const std_id = req.query.std_id; // Get std_id from the query parameter
  console.log('Fetching profile for std_id:', std_id); // Debugging log
  try {
    const user = await Student.findOne({ std_id: std_id }); // Fetch user data from the database
    if (!user) {
      console.log('User not found for std_id:', std_id); // Debugging log
      return res.status(404).send('User not found');
    }
    console.log('User data fetched:', user); // Debugging log
    res.render('profile', { user: user }); // Pass the user object to the profile.ejs template
  } catch (error) {
    console.error('Error fetching user data:', error); // Debugging log
    res.status(500).send('Error fetching user data');
  }
});

// Update Profile Route
app.post('/update-profile', upload.single('photo'), async (req, res) => {
  const std_id = req.body.std_id;
  const updateData = {
    username: req.body.username,
    fname: req.body.fname,
    lname: req.body.lname,
    age: req.body.age,
    gender: req.body.gender,
    dob: req.body.dob,
    email: req.body.email,
    course: req.body.course,
    branch: req.body.branch,
    phone: req.body.phone,
    address: req.body.address,
    state: req.body.state,
    pincode: req.body.pincode,
    hobbies: req.body.hobbies,
  };

  if (req.file) {
    updateData.photo = req.file.path;
  }

  try {
    await Student.updateOne({ std_id: std_id }, { $set: updateData });
    res.redirect(`/profile?std_id=${std_id}`);
  } catch (error) {
    res.status(500).send('Error updating profile');
  }
});

app.get('/profilestart', (req, res) => {
  res.render('profilestart');
});

app.get('/history', async (req, res) => {
  try {
    console.log('Route /history - Request received'); // Debug log
    const historyData = await History.find().sort({ timestamp: -1 }); // Fetch all, newest first
    console.log('Route /history - Fetched history:', historyData); // Debug log
    res.render('history', { historyData, error: null }); // Always pass error as null in success case
  } catch (error) {
    console.error('Route /history - Error fetching history:', error);
    res.render('history', { historyData: [], error: error.message }); // Pass error message if failure
  }
});

app.get('/contactus', (req, res) => {
  res.render('contactus'); // Ensure 'code.ejs' exists in the 'views' folder
});

app.get('/code', (req, res) => {
  res.render('code'); // Ensure 'code.ejs' exists in the 'views' folder
});

app.get('/mcq', (req, res) => {
  res.render('mcq'); // Ensure 'mcq.ejs' exists in the 'views' folder
});

app.get('/email', (req, res) => {
  res.render('email'); // Ensure 'email.ejs' exists in the 'views' folder
});

app.get('/letter', (req, res) => {
  res.render('letter'); // Ensure 'letter.ejs' exists in the 'views' folder
});

app.get('/essay', (req, res) => {
  res.render('essay'); // Ensure 'essay.ejs' exists in the 'views' folder
});

app.get('/summary', (req, res) => {
  res.render('summary'); // Ensure 'summary.ejs' exists in the 'views' folder
});

app.get('/senti', (req, res) => {
  res.render('senti'); // Ensure 'senti.ejs' exists in the 'views' folder
});

// Signup Route (Redirect to /register)
app.post('/signup', (req, res) => {
  res.redirect('/register'); // Redirect to the full registration route
});

// Login Route
app.get('/login', async (req, res) => {
  const { std_id, password } = req.query;
  try {
    const student = await Student.findOne({ std_id });
    if (student && (await bcrypt.compare(password, student.password))) {
      res.render('home', { name: student.name, std_id: student.std_id });
    } else {
      res.status(401).send('Invalid Student ID or Password');
    }
  } catch (error) {
    res.status(500).send('Error: ' + error.message);
  }
});

// Logout Route
app.get('/logout', (req, res) => {
  res.render('index');
});

// Route to handle form submission
app.post('/register', upload.single('photo'), async (req, res) => {
  const {
    username,
    std_id,
    password,
    fname,
    lname,
    age,
    gender,
    dob,
    email,
    course,
    branch,
    phone,
    address,
    state,
    pincode,
    hobbies,
  } = req.body;

  const photoPath = req.file ? req.file.path : '';

  try {
    // Check if username or std_id already exists
    const existingUser = await Student.findOne({ $or: [{ username }, { std_id }] });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Username or Student ID already exists. Please login.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newStudent = new Student({
      username,
      std_id,
      password: hashedPassword,
      fname,
      lname,
      age: parseInt(age),
      gender,
      dob: new Date(dob),
      email,
      course,
      branch,
      phone,
      address,
      state,
      pincode,
      hobbies: Array.isArray(hobbies) ? hobbies : [hobbies], // Ensure hobbies is an array
      photo: photoPath,
    });

    await newStudent.save();

    // Send a success response
    res.status(200).json({ success: true, message: 'Registration successfully done!' });
  } catch (error) {
    console.error('Error saving student:', error);
    // Send an error response
    res.status(500).json({ success: false, message: 'Error saving student data. Please try again.' });
  }
});

// API Request for Generating Code Output
app.post('/generate-code', async (req, res) => {
  const userCodeInput = req.body.code;
  if (!userCodeInput || userCodeInput.trim() === '') {
    return res.status(400).json({ error: 'No input provided' });
  }
  try {
    const codeChatSession = model.startChat({
      generationConfig,
      history: [
        {
          role: 'user',
          parts: [{ text: userCodeInput }],
        },
      ],
    });

    const codeDefaultStatement =
      "so i am doing the coding here is my code below, please help me with complete my program, take given code and help for coding which language, errors in code, actual program in the given language, output, and i don't want output if only program question is asked! only take if program is there and give output for that program: 'I need only 4 things' 1. Code Language: (in one word) 2. Errors in the Code: (mention each error in one line sentence as list of errors) 3. Corrected Program: (full correct code in the given language) 4. Output: (expected output when code runs) end the solution! I don't want conclusion";

    const codeResult = await codeChatSession.sendMessage(`${codeDefaultStatement} ${userCodeInput}`);
    let codeOutput = codeResult.response.text();
    codeOutput = codeOutput.replace(/[`*]+/g, '').replace(/["']+/g, '').trim();
    res.json({ codeOutput });
  } catch (error) {
    console.error('Error generating code response:', error);
    res.status(500).json({ error: 'Failed to process the request. Please try again later.' });
  }
});

// API Request for Generating MCQ Output
app.post('/generate-mcq', async (req, res) => {
  const userTopicInput = req.body.topic; // Matches front-end key 'topic'
  if (!userTopicInput || userTopicInput.trim() === '') {
    return res.status(400).json({ error: 'No input provided' });
  }
  try {
    const mcqChatSession = model.startChat({
      generationConfig, // Uses the same generationConfig as /generate-code
      history: [
        {
          role: 'user',
          parts: [{ text: userTopicInput }],
        },
      ],
    });

    const mcqDefaultStatement =
      "Generate 10 multiple choice questions with ans and 1 line explaination for the given topic:";

    const mcqResult = await mcqChatSession.sendMessage(`${mcqDefaultStatement} ${userTopicInput}`);
    let mcqOutput = mcqResult.response.text();
    mcqOutput = mcqOutput.replace(/[`*]+/g, '').replace(/["']+/g, '').trim();
    res.json({ mcqOutput }); // Matches the response key 'mcqOutput' from front-end
  } catch (error) {
    console.error('Error generating MCQ response:', error);           
    res.status(500).json({ error: 'Failed to process the request. Please try again later.' });
  }
});

// API Request for Generating Email Template
app.post('/generate-email-template', async (req, res) => {
  const userPurposeInput = req.body.purpose;
  if (!userPurposeInput || userPurposeInput.trim() === '') {
    return res.status(400).json({ error: 'No input provided' });
  }
  try {
    const emailChatSession = model.startChat({
      generationConfig,
      history: [
        {
          role: 'user',
          parts: [{ text: userPurposeInput }],
        },
      ],
    });

    const emailDefaultStatement =
      'Help me generate a one professional email template for the given purpose. The email should include a subject line, a proper greeting, body content, and a closing. Make it formal and concise.';

    const emailResult = await emailChatSession.sendMessage(`${emailDefaultStatement} ${userPurposeInput}`);
    let emailOutput = emailResult.response.text();
    emailOutput = emailOutput.replace(/[`*]+/g, '').replace(/["']+/g, '').trim();
    res.json({ emailOutput });
  } catch (error) {
    console.error('Error generating email template response:', error);
    res.status(500).json({ error: 'Failed to process the request. Please try again later.' });
  }
});

// API Request for Generating Letter
app.post('/generate-letter', async (req, res) => {
  const userLetterInput = req.body.letter; // Expects 'letter' key
  if (!userLetterInput || userLetterInput.trim() === '') {
    return res.status(400).json({ error: 'No input provided' });
  }
  try {
    const letterChatSession = model.startChat({
      generationConfig,
      history: [
        {
          role: 'user',
          parts: [{ text: userLetterInput }],
        },
      ],
    });

    const letterDefaultStatement =
      'Help me generate only one formal letter for topic:';

    const letterResult = await letterChatSession.sendMessage(`${letterDefaultStatement} ${userLetterInput}`);
    let letterOutput = letterResult.response.text();
    letterOutput = letterOutput.replace(/[`*]+/g, '').replace(/["']+/g, '').trim();
    res.json({ letterOutput });
  } catch (error) {
    console.error('Error generating letter response:', error);
    res.status(500).json({ error: 'Failed to process the request. Please try again later.' });
  }
});

// API Request for Generating Essay
app.post('/generate-essay', async (req, res) => {
  const userEssayInput = req.body.essay; // Expects 'essay' key
  if (!userEssayInput || userEssayInput.trim() === '') {
    return res.status(400).json({ error: 'No input provided' });
  }
  try {
    const essayChatSession = model.startChat({
      generationConfig,
      history: [
        {
          role: 'user',
          parts: [{ text: userEssayInput }],
        },
      ],
    });

    const essayDefaultStatement =
      'Give me the details eassay for the below topic:';

    const essayResult = await essayChatSession.sendMessage(`${essayDefaultStatement} ${userEssayInput}`);
    let essayOutput = essayResult.response.text();
    essayOutput = essayOutput.replace(/[`*]+/g, '').replace(/["']+/g, '').trim();
    res.json({ essayOutput });
  } catch (error) {
    console.error('Error generating essay response:', error);
    res.status(500).json({ error: 'Failed to process the request. Please try again later.' });
  }
});

// API Request for Generating Summary
app.post('/generate-summary', async (req, res) => {
  const userSummaryInput = req.body.uiInput; // Expects 'uiInput' key (matching front-end)
  if (!userSummaryInput || userSummaryInput.trim() === '') {
    return res.status(400).json({ error: 'No input provided' });
  }
  try {
    const summaryChatSession = model.startChat({
      generationConfig,
      history: [
        {
          role: 'user',
          parts: [{ text: userSummaryInput }],
        },
      ],
    });

    const summaryDefaultStatement =
      'take the below given link as input and give what is the website about or tell the user';

    const summaryResult = await summaryChatSession.sendMessage(`${summaryDefaultStatement} ${userSummaryInput}`);
    let summaryOutput = summaryResult.response.text();
    summaryOutput = summaryOutput.replace(/[`*]+/g, '').replace(/["']+/g, '').trim();
    res.json({ summaryOutput });
  } catch (error) {
    console.error('Error generating summary response:', error);
    res.status(500).json({ error: 'Failed to process the request. Please try again later.' });
  }
});

// Sentiment Analysis
app.post('/analyze-sentiment', (req, res) => {
  const text = req.body.text; // Get the text input from the front end
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Invalid input. Please provide a valid text.' });
  }

  // Perform sentiment analysis
  const sentiment = new Sentiment();
  const result = sentiment.analyze(text);

  // Determine sentiment classification
  let sentimentLabel;
  if (result.score > 0) {
    sentimentLabel = 'Positive';
  } else if (result.score < 0) {
    sentimentLabel = 'Negative';
  } else {
    sentimentLabel = 'Neutral';
  }

  // Calculate sentiment percentage
  const maxScore = result.tokens.length * 5; // Assuming max score per word is 5
  const sentimentPercentage = ((result.score + maxScore) / (2 * maxScore)) * 100;

  // Prepare the output
  const sentimentOutput = {
    score: result.score, // Overall sentiment score
    comparative: result.comparative, // Comparative score
    tokens: result.tokens, // Tokenized words
    words: result.words, // Words with sentiment
    positive: result.positive, // Positive words
    negative: result.negative, // Negative words
    sentimentLabel, // Sentiment classification (Positive, Negative, Neutral)
    sentimentPercentage: sentimentPercentage.toFixed(2), // Sentiment percentage
  };

  // Send the result back to the front end
  res.json({ sentimentOutput });
});

// Middleware to parse JSON bodies (already present, no need to add again)
app.use(express.json());

// Consolidated /save-code route (replacing all duplicates)
app.post('/save-code', async (req, res) => {
  const { page, input, output, inputCode, outputCode } = req.body;

  // Normalize the input/output fields (use input/inputCode and output/outputCode interchangeably)
  const finalInput = input || inputCode;
  const finalOutput = output || outputCode;

  // Validate request body
  if (!page || !finalInput || !finalOutput) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    // Create a new History document
    const historyEntry = new History({
      page,
      input: finalInput,
      output: finalOutput
    });

    // Save to the History collection
    await historyEntry.save();
    console.log('Saved to History collection:', historyEntry); // Debug log
    res.json({ success: true, message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error saving to History collection:', error);
    res.status(500).json({ success: false, message: 'Server error while saving data', error: error.message });
  }
});

// Route to test database connectivity
app.get('/test-db', async (req, res) => {
  try {
    console.log('Route /test-db - Testing database connectivity');
    const count = await History.countDocuments();
    console.log('Route /test-db - Total documents in History collection:', count);
    res.json({ success: true, message: `Database connected. Found ${count} documents in History collection.` });
  } catch (error) {
    console.error('Route /test-db - Error connecting to database:', error);
    res.status(500).json({ success: false, message: 'Error connecting to database', error: error.message });
  }
});

// Route to delete a single history entry using GET with query parameter
app.get('/delete-history', async (req, res) => {
  const id = req.query.id; // Get the _id from the query parameter

  if (!id) {
    console.log('Route /delete-history - No ID provided');
    return res.status(400).json({ success: false, message: 'No ID provided for deletion' });
  }

  try {
    console.log('Route /delete-history - Deleting ID:', id); // Debug log
    const result = await History.deleteOne({ _id: id });
    console.log('Route /delete-history - Deletion result:', result); // Debug log
    if (result.deletedCount > 0) {
      console.log('Route /delete-history - Successfully deleted ID:', id);
      // Redirect back to the history page after successful deletion
      res.redirect('/history');
    } else {
      console.log('Route /delete-history - No row found with ID:', id);
      res.status(400).json({ success: false, message: 'No row was deleted' });
    }
  } catch (error) {
    console.error('Route /delete-history - Error deleting history:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting history', error: error.message });
  }
});

// Start the Server
app.listen(port, () => {
  console.log(`Main server running on port ${port}`);
});