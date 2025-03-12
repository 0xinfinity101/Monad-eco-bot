const { ethers } = require("ethers");
const colors = require("colors");
const readline = require("readline");
const fs = require("fs");
const displayHeader = require("../src/displayHeader.js");

displayHeader();

class IzumiStaking {
  constructor(wallet, rpcUrl = "https://testnet-rpc.monad.xyz/") {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.WMON_CONTRACT = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";
    this.EXPLORER_URL = "https://testnet.monadexplorer.com/tx/";
    this.wallet = wallet;
    this.contract = new ethers.Contract(
      this.WMON_CONTRACT,
      ["function deposit() public payable", "function withdraw(uint256 amount) public"],
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
    const min = 0.01, max = 0.05;
    return ethers.utils.parseEther((Math.random() * (max - min) + min).toFixed(4));
  }

  getRandomDelay() {
    const minDelay = 1 * 60 * 1000, maxDelay = 3 * 60 * 1000;
    return Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay);
  }

  async wrapMON(amount) {
    try {
      console.log(`⏳ Wrapping ${ethers.utils.formatEther(amount)} MON into WMON...`.magenta);
      const tx = await this.retry(async () => {
        return await this.contract.deposit({ value: amount, gasLimit: 500000 });
      });
      console.log(`[+] Wrap MON → WMON successful`.green.underline);
      console.log(`➡️  Transaction sent: ${this.EXPLORER_URL}${tx.hash}`.yellow);
      await tx.wait();
    } catch (error) {
      console.error("⚠️ Error wrapping MON: ".red, error);
      throw error;
    }
  }

  async unwrapMON(amount) {
    try {
      console.log(`⏳ Unwrapping ${ethers.utils.formatEther(amount)} WMON back to MON...`.magenta);
      const tx = await this.retry(async () => {
        return await this.contract.withdraw(amount, { gasLimit: 500000 });
      });
      console.log(`[+] Unwrap WMON → MON successful`.green.underline);
      console.log(`➡️  Transaction sent: ${this.EXPLORER_URL}${tx.hash}`.yellow);
      await tx.wait();
    } catch (error) {
      console.error("⚠️ Error unwrapping WMON: ".red, error);
      throw error;
    }
  }

  async executeCycle(cycleCount, totalCycles) {
    const amount = this.getRandomAmount();
    const delay = this.getRandomDelay();

    console.log(`Cycle ${cycleCount + 1} of ${totalCycles}:`.magenta);
    await this.wrapMON(amount);
    await this.unwrapMON(amount);

    if (cycleCount < totalCycles - 1) {
      console.log(`Waiting for ${delay / 1000 / 60} minute(s) before next cycle...`.yellow);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  async runSwapCycle(cycles) {
    for (let i = 0; i < cycles; i++) {
      await this.executeCycle(i, cycles);
    }
    console.log(`All ${cycles} cycles completed`.green);
  }

  async main() {
    try {
      console.log("🚀 Starting Izumi Staking operations...".green);
      
      const cycleCount = await new Promise((resolve) => {
        this.rl.question("How many swap cycles would you like to run? ", (cycles) => {
          resolve(parseInt(cycles) || 1);
        });
      });

      if (isNaN(cycleCount) || cycleCount <= 0) {
        console.log("⚠️ Invalid input. Please enter a valid number.".red);
        return;
      }

      console.log(`Starting ${cycleCount} swap cycles immediately...`);
      await this.runSwapCycle(cycleCount);
      
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
  const izumiStaking = new IzumiStaking(wallet);
  await izumiStaking.main();
};
