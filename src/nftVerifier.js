const { ethers } = require("ethers");


const NFT_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)"
];

class NFTVerifier {
    constructor(provider, nftAddress) {
        this.backupRPCs = [
            "https://testnet-rpc.monad.xyz/",
            "https://testnet-rpc.monad.network/",
            "https://testnet-rpc.monad.io/"
        ];
        this.currentRPCIndex = 0;
        this.provider = new ethers.providers.JsonRpcProvider(provider || this.backupRPCs[0]);
        this.nftAddress = nftAddress;
    }

    async retry(fn, maxAttempts = 5, delay = 1000) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxAttempts) throw error;
                
                console.log(`Attempt ${attempt} failed, retrying in ${delay/1000} seconds...`);
                if (error.code === 'SERVER_ERROR' || error.code === 'CALL_EXCEPTION') {
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
        console.log(`Switching to backup RPC: ${newRPC}`);
    }

    createWalletFromPrivateKey(privateKey) {
        const wallet = new ethers.Wallet(privateKey, this.provider);
        return wallet;
    }

    async verifyNFTOwnership(wallet) {
        try {
            const nftContract = new ethers.Contract(
                this.nftAddress,
                ["function balanceOf(address owner) view returns (uint256)"],
                this.provider
            );

            const balance = await this.retry(async () => {
                try {
                    const result = await nftContract.balanceOf(wallet.address);
                    return result;
                } catch (error) {
                    console.log(`Error checking balance, retrying with different RPC...`);
                    throw error;
                }
            });

            const hasNFT = balance.gt(0);
            if (hasNFT) {
                console.log(`✅ NFT verification successful for wallet: ${wallet.address}`);
            } else {
                console.log(`❌ No NFT found for wallet: ${wallet.address}`);
            }

            return {
                hasNFT,
                wallet: wallet
            };
        } catch (error) {
            console.error("Error verifying NFT ownership:", error.message);
            throw error;
        }
    }
}

module.exports = NFTVerifier; 
