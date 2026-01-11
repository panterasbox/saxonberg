import express from "express";

export const app = express();
const PORT = process.env.PORT || 3005;

app.get("/", (req, res) => {
  res.send("Hello from server");
});

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
