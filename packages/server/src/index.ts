import express from "express";

const app = express();
const PORT = process.env.PORT || 3005;

app.get("/", (req, res) => {
  res.send("Hello from server");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
