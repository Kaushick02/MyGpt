// dev-server.js
import app from './server.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Local server is running at http://localhost:${PORT}`);
});
