const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/home-chat', require('./routes/homeChat'));
app.use('/api/notes-breakdown', require('./routes/notesBreakdown'));
app.use('/api/ai-images', require('./routes/aiImages'));
app.use('/api/mcq-generator', require('./routes/mcqGenerator'));
app.use('/api/text-summarizer', require('./routes/textSummarizer'));
app.use("/api/files", require("./routes/file"));
app.use("/api/auth", require("./routes/auth"));


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
