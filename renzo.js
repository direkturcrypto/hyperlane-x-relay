const { ethers, parseEther, formatEther, AbiCoder } = require('ethers');

const bridgeABI = require('./abi/renzo.json')
const ercABI = require('./abi/erc20.json')

const contractsAddr = {
    'arbitrum': {
        'address': '0xB26bBfC6d1F469C821Ea25099017862e7368F4E8',
        'rpc': 'https://rpc.ankr.com/arbitrum',
        'chainId': '42161'
    },
    'base': {
        'address': '0x2552516453368e42705D791F674b312b8b87CD9e',
        'rpc': 'https://rpc.ankr.com/base',
        'chainId': '8453'
    },
    'bsc': {
        'address': '0xE00C6185a5c19219F1FFeD213b4406a254968c26',
        'rpc': 'https://rpc.ankr.com/bsc',
        'chainId': '56'
    },
    'linea': {
        'address': '0xC59336D8edDa9722B4f1Ec104007191Ec16f7087',
        'rpc': 'https://rpc.linea.build',
        'chainId': '59144'
    }
}

exports.bridge = (pk, chain, destChain, amount) => {
    return new Promise(async (resolve, reject) => {
        if (!contractsAddr[chain]) {
            console.error(`no available chain`)
            return reject('no available chain')
        }
    
        const provider = new ethers.JsonRpcProvider(contractsAddr[chain].rpc)
        const destProvider = new ethers.JsonRpcProvider(contractsAddr[destChain].rpc)
    
        const account = new ethers.Wallet(pk, provider)
        const balanceETH = await provider.getBalance(account.address)
    
        const bridgeContract = new ethers.Contract(contractsAddr[chain].address, bridgeABI, account)
        const tokenAddr = await bridgeContract.wrappedToken()
        const contractAddr = new ethers.Contract(tokenAddr, ercABI, account)
        const balanceEZ = await contractAddr.balanceOf(account.address)
        console.log(`balance: ${formatEther(balanceEZ)} ezETH, ${formatEther(balanceETH)} ETH`)
        
        const estimateFeeBridge = await bridgeContract.quoteGasPayment(contractsAddr[destChain].chainId)
        console.log(`estimateFeeBridge: ${formatEther(estimateFeeBridge)} ETH`)
    
        if (balanceEZ < amount) {
            console.error(`[x] failed: ezETH balance not enough to bridge ${formatEther(amount)} ezETH`)
            return reject(`[x] failed: ezETH balance not enough to bridge ${formatEther(amount)} ezETH`)
        }
    
        const allowance = await contractAddr.allowance(account.address, contractsAddr[chain].address)
        if (allowance < amount) {
            const approveTx = await contractAddr.approve(contractsAddr[chain].address, amount).catch((e) => ({status: 500, message: e.shortMessage}))
            if (approveTx.status == 500) {
                console.error(`[x] failed: approve ezETH Failed`)
                return reject(`[x] failed: approve ezETH Failed`)
            }
            await approveTx.wait()
            console.log(`✅ approve complete with hash: ${approveTx.hash}`)
        }
    
        const accountDest = new ethers.Wallet(pk, destProvider)
        const bridgeDestContract = new ethers.Contract(contractsAddr[destChain].address, bridgeABI, accountDest)
        const tokenDestAddr = await bridgeDestContract.wrappedToken()
        const contractDestAddr = new ethers.Contract(tokenDestAddr, ercABI, accountDest)
        const balanceDestEZ = await contractDestAddr.balanceOf(accountDest.address)

        // bridge fund
        try {
            const destAddress = new AbiCoder().encode(['address'], [account.address])
            const txBridge = await bridgeContract.transferRemote(contractsAddr[destChain].chainId, destAddress, amount, {value: estimateFeeBridge}).catch((e) => ({status: 500, message: e.shortMessage}))
            if (txBridge.status == 500) {
                console.error(`[x] failed bridge reason: ${txBridge.message}`)
                return reject(`[x] failed bridge reason: ${txBridge.message}`)
            }
            console.log(`[-] submitted bridge with hash ${txBridge.hash}`)
            await txBridge.wait()
            console.log(`✅ confirmed bridge with hash ${txBridge.hash}`)
        
            const checkBridgeDest = async () => {
                console.log(`checking ezETH balance in ${destChain}..........`)
                const newBalanceEz = await contractDestAddr.balanceOf(accountDest.address)
                console.log(`balance prev: ${formatEther(balanceDestEZ)}, balance now: ${formatEther(newBalanceEz)} ezETH`)
                if (newBalanceEz > balanceDestEZ) {
                    console.log(`✅ bridge completed, new balance ${formatEther(newBalanceEz)} ezETH`)
                    return resolve('success bridge')
                } else {
                    return setTimeout(() => {
                        return checkBridgeDest()
                    }, 10000)
                }
            }
        
            checkBridgeDest()
        } catch (e) {
            console.error(`[x] failed bridge`, e)
            return reject('[x] failed bridge', e.stack.message)
        }
    })
}
