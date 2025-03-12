require("colors");

function displayHeader() {
  process.stdout.write("\x1Bc");
  console.log("========================================".magenta);
  console.log("=  Monad Testnet Bot by 0xinfinity101  =".magenta);
  console.log("========================================".magenta);
  console.log("");
}

module.exports = displayHeader;
