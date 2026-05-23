// Panella Game Server Entry
console.log('Server started successfully!');
setInterval(() => {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`[Runtime Info] Memory Heap Used: ${used.toFixed(2)} MB`);
}, 5000);