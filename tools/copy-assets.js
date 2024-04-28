const shell = require("shelljs");

shell.cp("-R", ["src/api/views", "src/api/public"], "dist/api");
