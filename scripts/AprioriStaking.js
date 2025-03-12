const ethers = require("ethers");
const colors = require("colors");
const axios = require("axios");
const readline = require("readline");
const fs = require("fs");
const displayHeader = require("../src/displayHeader.js");

displayHeader();

class AprioriStaking {
  constructor(wallet, rpcUrl = "https://testnet-rpc.monad.xyz/") {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.EXPLORER_URL = "https://testnet.monadexplorer.com/tx/";
    this.wallet = wallet;
    this.contractAddress = "0xb2f82D0f38dc453D596Ad40A37799446Cc89274A";
    this.gasLimits = { stake: 500000, unstake: 800000, claim: 800000 };
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    this.backupRPCs = [
      "https://testnet-rpc.monad.xyz/",
      "https://testnet-rpc.monad.network/",
      "https://testnet-rpc.monad.io/"
    ];
    this.currentRPCIndex = 0;
  }

  getRandomAmount() {
    const min = 0.01, max = 0.05;
    return ethers.utils.parseEther((Math.random() * (max - min) + min).toFixed(4));
  }

  getRandomDelay(min = 60000, max = 180000) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    console.log(`Switching to backup RPC: ${newRPC}`);
  }

  async stakeMON(cycleNumber) {
    try {
      console.log(`\n[Cycle ${cycleNumber}] Initiating MON staking...`.magenta);
      const stakeAmount = this.getRandomAmount();
      console.log(`Staking amount: ${ethers.utils.formatEther(stakeAmount)} MON`);
      
      const data = "0x6e553f65" +
        ethers.utils.hexZeroPad(stakeAmount.toHexString(), 32).slice(2) +
        ethers.utils.hexZeroPad(this.wallet.address, 32).slice(2);
      
      const txResponse = await this.retry(async () => {
        return await this.wallet.sendTransaction({
          to: this.contractAddress,
          data,
          gasLimit: ethers.utils.hexlify(this.gasLimits.stake),
          value: stakeAmount
        });
      });
      
      console.log(`Transaction sent: ${this.EXPLORER_URL}${txResponse.hash}`.yellow);
      const receipt = await txResponse.wait();
      console.log("✅ Staking successful!".green.underline);
      return { receipt, stakeAmount };
    } catch (error) {
      console.error("⚠️ Staking failed:", error.message.red);
      throw error;
    }
  }

  async executeCycle(cycleNumber) {
    try {
      console.log(`\n=== Starting Cycle ${cycleNumber} ===`.magenta.bold);
      const { stakeAmount } = await this.stakeMON(cycleNumber);
      await this.delay(this.getRandomDelay());
      console.log(`=== Cycle ${cycleNumber} completed successfully! ===`.magenta.bold);
    } catch (error) {
      console.error(`⚠️ Cycle ${cycleNumber} failed:`, error.message.red);
    }
  }

  async main() {
    try {
      console.log("🚀 Starting Apriori Staking operations...".green);
      
      const cycleCount = await new Promise((resolve) => {
        this.rl.question("Enter the number of cycles to execute: ", (cycles) => {
          resolve(parseInt(cycles) || 1);
        });
      });

      if (isNaN(cycleCount) || cycleCount <= 0) {
        console.log("⚠️ Invalid input. Please enter a valid number.".red);
        return;
      }

      for (let i = 1; i <= cycleCount; i++) {
        await this.executeCycle(i);
        if (i < cycleCount) await this.delay(this.getRandomDelay());
      }

      console.log("\n✅ All cycles completed successfully!".green.bold);
    } catch (error) {
      console.error("⚠️ Operation failed:", error.message);
    } finally {
      this.rl.close();
    }
  }
}

// Export fungsi yang dapat dijalankan langsung
module.exports = async function(wallet) {
  const aprioriStaking = new AprioriStaking(wallet);
  await aprioriStaking.main();
};
