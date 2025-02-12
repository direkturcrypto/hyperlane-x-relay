// Required libraries
const axios = require('axios');
const { ethers, parseEther, formatEther } = require('ethers');
const { bridge } = require('./renzo');
const { swapBridge } = require('./relay');
const ERC20ABI = require('./abi/erc20.json')

// Configuration
const PRIVATE_KEY = 'YOUR_PRIVATE_KEY_HERE'; // Replace with your private key
const destChainList = {
    'arbitrum': {
        'address': '0xB26bBfC6d1F469C821Ea25099017862e7368F4E8',
        'rpc': 'https://rpc.ankr.com/arbitrum',
        'chainId': '42161',
        'minGas': '0.001'
    },
    'base': {
        'address': '0x2552516453368e42705D791F674b312b8b87CD9e',
        'rpc': 'https://base.llamarpc.com',
        'chainId': '8453',
        'minGas': '0.001'
    },
    'bsc': {
        'address': '0xE00C6185a5c19219F1FFeD213b4406a254968c26',
        'rpc': 'https://binance.llamarpc.com',
        'chainId': '56',
        'minGas': '0.005'
    },
    'linea': {
        'address': '0xC59336D8edDa9722B4f1Ec104007191Ec16f7087',
        'rpc': 'https://rpc.linea.build',
        'chainId': '59144',
        'minGas': '0.001'
    }
}

// bridge(PRIVATE_KEY, 'arbitrum', 'base', parseEther("0.001"))
const getRandomChain = () => {
    const keys = Object.keys(destChainList); // Ambil semua key (nama chain)
    const randomKey = keys[Math.floor(Math.random() * keys.length)]; // Pilih key acak
    return { name: randomKey, ...destChainList[randomKey] }; // Return dengan nama chain
};

const initialChain = destChainList['arbitrum'] // initial fund from chain arbitrum, you can change it

const infinityBridge = async () => {
    const ezETHAddr = "0x2416092f143378750bb29b79ed961ab195cceea5"
    const rpcOrigin = initialChain.rpc
    let providerOrigin = new ethers.JsonRpcProvider(rpcOrigin)
    let wallet = new ethers.Wallet(PRIVATE_KEY, providerOrigin)

    // const selectedOriginChain = {name: 'arbitrum', ...destChainList['arbitrum']}
    // const selectedDestChain = {name: 'bsc', ...destChainList['bsc']}
    const selectedOriginChain = getRandomChain()
    const selectedDestChain = getRandomChain()

    console.log(`origin chain: ${selectedOriginChain.name}, destination chain: ${selectedDestChain.name}`)
    if (selectedDestChain.chainId == selectedOriginChain.chainId) {
        console.log(`[!] failed select destination chain`)
        return infinityBridge()
    }

    providerOrigin = new ethers.JsonRpcProvider(selectedOriginChain.rpc)
    const providerDest = new ethers.JsonRpcProvider(selectedDestChain.rpc)
    wallet = new ethers.Wallet(PRIVATE_KEY, providerOrigin)
    walletDest = new ethers.Wallet(PRIVATE_KEY, providerDest)

    const ezContract = new ethers.Contract(ezETHAddr, ERC20ABI, wallet)
    const ezContractDest = new ethers.Contract(ezETHAddr, ERC20ABI, walletDest)

    let balanceEzETH = await ezContract.balanceOf(wallet.address)
    let balanceEzETHDest = await ezContractDest.balanceOf(wallet.address)
    const initialAmount = parseEther("0.01")
    const minimumAmount = parseFloat(initialAmount) * 0.9

    if (balanceEzETH < BigInt(minimumAmount) && balanceEzETHDest < BigInt(minimumAmount)) {
        console.log("=================== SWAP ETH TO ezETH ===================")
        const swapped = await swapBridge(PRIVATE_KEY, initialChain.rpc, {
            originChainId: initialChain.chainId,
            destinationChainId: selectedOriginChain.chainId,
            amount: initialAmount,
            originCurrency: "0x0000000000000000000000000000000000000000",
            destinationCurrency: ezETHAddr
        }).catch((e) => ({status: 500, message: e.stack.message})) // SWAP ETH TO EZETH

        if (swapped.status == 500) {
            console.error(`[x] failed swap, try again`)
            return infinityBridge()
        }
        console.log("======================================")
    }

    balanceEzETH = await ezContract.balanceOf(wallet.address)
    if (balanceEzETH > BigInt(minimumAmount)) {
        console.log(`=================== BRIDGE ezETH from ${selectedOriginChain.name} to destination chain ===================`)
        console.log(`balance ezETH ${selectedOriginChain.name}: ${formatEther(balanceEzETH)} ezETH`)
    
        await bridge(PRIVATE_KEY, selectedOriginChain.name, selectedDestChain.name, balanceEzETH) // bridge ezETH from arbitrum to base
        console.log("======================================")
    }

    balanceEzETHDest = await ezContractDest.balanceOf(wallet.address)
    if (balanceEzETHDest > BigInt(minimumAmount)) {
        console.log(`=================== SWAP ezETH TO ETH and BRIDGE TO ARBITRUM ===================`)
        console.log(`balance ezETH ${selectedDestChain.name}: ${formatEther(balanceEzETHDest)} ezETH`)
    
        await swapBridge(PRIVATE_KEY, selectedDestChain.rpc, {
            originChainId: selectedDestChain.chainId,
            destinationChainId: initialChain.chainId,
            amount: balanceEzETHDest,
            originCurrency: ezETHAddr,
            destinationCurrency: "0x0000000000000000000000000000000000000000"
        }) // bridge ezETH > ETH from base to arbitrum
        console.log("======================================")
    }

    const delay = Math.floor(Math.random() * (600000 - 300000 + 1)) + 300000;
    console.log(`take a rest ${parseFloat((delay/1000)/60)} minutes`)
    setTimeout(infinityBridge, delay)
}

infinityBridge()
