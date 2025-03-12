const { ethers } = require("ethers");
const colors = require("colors");
const readline = require("readline");
const fs = require("fs");
const displayHeader = require("../src/displayHeader.js");

displayHeader();

class RubicStaking {
  constructor(wallet, rpcUrl = "https://testnet-rpc.monad.xyz/") {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.WMON_CONTRACT = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";
    this.EXPLORER_URL = "https://testnet.monadexplorer.com/tx/";
    this.wallet = wallet;
    this.contract = new ethers.Contract(
      this.WMON_CONTRACT,
      [
        "function deposit() public payable",
        "function withdraw(uint256 amount) public"
      ],
      this.wallet
    );
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    this.backupRPCs = [
      "https://testnet-rpc.monad.xyz/",
      "https://testnet-rpc.monad.network/",
      "https://testnet-rpc.monad.io/"
    ];
    this.currentRPCIndex = 0;
  }

  async retry(fn, maxAttempts = 5, delay = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) throw error;
        
        console.log(`Attempt ${attempt} failed, retrying in ${delay/1000} seconds...`);
        if (error.code === 'SERVER_ERROR') {
          this.switchRPC();
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  switchRPC() {
    this.currentRPCIndex = (this.currentRPCIndex + 1) % this.backupRPCs.length;
    const newRPC = this.backupRPCs[this.currentRPCIndex];
    this.provider = new ethers.providers.JsonRpcProvider(newRPC);
    this.wallet = this.wallet.connect(this.provider);
    this.contract = this.contract.connect(this.wallet);
    console.log(`Switching to backup RPC: ${newRPC}`);
  }

  getRandomAmount() {
    const amount = (Math.random() * (0.05 - 0.01) + 0.01).toFixed(4);
    return ethers.utils.parseEther(amount);
  }

  getRandomDelay() {
    return Math.floor(Math.random() * (180000 - 60000 + 1) + 60000);
  }

  async wrapMON(walletIndex, amount) {
    try {
      console.log(`🔄 Wrapping ${ethers.utils.formatEther(amount)} MON into WMON...`.magenta);
      const tx = await this.retry(async () => {
        return await this.contract.deposit({ value: amount, gasLimit: 500000 });
      });
      console.log(`✅ Wrap MON → WMON successful`.green.underline);
      console.log(`➡️ Transaction: ${this.EXPLORER_URL}${tx.hash}`.yellow);
      await tx.wait();
    } catch (error) {
      console.error("⚠️ Warning: Error wrapping MON:", error);
      throw error;
    }
  }

  async unwrapMON(walletIndex, amount) {
    try {
      console.log(`🔄 Unwrapping ${ethers.utils.formatEther(amount)} WMON back to MON...`.magenta);
      const tx = await this.retry(async () => {
        return await this.contract.withdraw(amount, { gasLimit: 500000 });
      });
      console.log(`✅ Unwrap WMON → MON successful`.green.underline);
      console.log(`➡️ Transaction: ${this.EXPLORER_URL}${tx.hash}`.yellow);
      await tx.wait();
    } catch (error) {
      console.error("⚠️ Warning: Error unwrapping WMON:", error);
      throw error;
    }
  }

  async runSwapCycle(cycles, interval) {
    for (let i = 0; i < cycles; i++) {
      const amount = this.getRandomAmount();
      console.log(`Cycle ${i + 1} of ${cycles}:`.magenta);
      await this.wrapMON(0, amount);
      await this.unwrapMON(0, amount);
      
      if (i < cycles - 1) {
        const delay = interval ? interval * 3600000 : this.getRandomDelay();
        console.log(`Waiting ${delay / 60000} minute(s) before next cycle...`.yellow);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    console.log(`All ${cycles} cycles completed`.green);
  }

  async main() {
    try {
      console.log("🚀 Starting Rubic Staking operations...".green);
      
      const cycleCount = await new Promise((resolve) => {
        this.rl.question("How many swap cycles would you like to run? (Press enter for 1): ", (cycles) => {
          resolve(parseInt(cycles) || 1);
        });
      });

      const intervalHours = await new Promise((resolve) => {
        this.rl.question("How often (in hours) should the cycle run? (Press enter to skip): ", (hours) => {
          resolve(hours ? parseInt(hours) : null);
        });
      });

      if (isNaN(cycleCount) || (intervalHours !== null && isNaN(intervalHours))) {
        console.log("⚠️ Warning: Invalid input. Please enter valid numbers.".red);
        return;
      }

      console.log(`Starting ${cycleCount} swap cycles ${intervalHours ? `every ${intervalHours} hour(s)` : "immediately"}...`);
      await this.runSwapCycle(cycleCount, intervalHours);
      
      console.log(`\n✅ All ${cycleCount} cycles completed successfully!`.green.bold);
    } catch (error) {
      console.error("⚠️ Operation failed:", error.message);
    } finally {
      this.rl.close();
    }
  }
}

// Export fungsi yang dapat dijalankan langsung
module.exports = async function(wallet) {
  const rubicStaking = new RubicStaking(wallet);
  await rubicStaking.main();
};
