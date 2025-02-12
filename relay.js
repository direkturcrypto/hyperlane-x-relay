const { ethers, parseEther, formatEther } = require('ethers');
const axios = require('axios')

const checkBridgeStatus = async (endPointId) => {
    const options = {
        url: 'https://api.relay.link' + endPointId,
        method: 'GET'
    }
    const data = await axios(options).catch((e) => ({status: e.status, message: e.response.data?e.response.data.message:e.message}))
    if (data.status != 200) {
        return console.error(`[x] failed fetch data ${data.message}`)
    }

    let dataBridge = data.data
    return dataBridge
}

exports.swapBridge = (pk, rpc, options) => {
    return new Promise(async (resolve, reject) => {
        const provider = new ethers.JsonRpcProvider(rpc)
        const account = new ethers.Wallet(pk, provider)
        const balanceETH = await provider.getBalance(account.address)
        console.log(`balance: ${formatEther(balanceETH)} ETH`)
    
        const optionsRequest = {
            amount: options.amount.toString(),
            originChainId: options.originChainId,
            originCurrency: options.originCurrency,
            destinationChainId: options.destinationChainId,
            destinationCurrency: options.destinationCurrency,
            tradeType: 'EXACT_INPUT',
            user: account.address
        }
        // console.log(optionsRequest)
        const data = await axios({
            url: 'https://api.relay.link/quote',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: optionsRequest
        }).catch((e) => ({status: e.status, message: e.response.data?e.response.data.message:e.message}))
    
        if (data.status != 200) {
            console.error(`[x] failed fetch quote ${data.message}`)
            return reject(`[x] failed fetch quote ${data.message}`)
        }
    
        const steps = data.data.steps
        for (let i=0; i<steps.length; i++) {
            // call txns
            const step = steps[i]
            // console.log(step)
            for (let t=0; t<step.items.length; t++) {
                const callData = step.items[t].data
                console.log(`calldata: ${step.id} - ${step.kind}, ${step.description}`)
                // console.log(callData)
    
                const tx = await account.sendTransaction(callData).catch((e) => ({status: 500, message: e.info?e.info.error.message:e.shortMessage}))
    
                if (tx.status == 500) {
                    console.error(`[x] failed tx ${tx.message}`)
                } else {
                    await tx.wait()
                    console.log(`✅ tx submitted with hash ${tx.hash}`)
    
                    // check bridge status
                    const check = async () => {
                        if (step.items[t].check) {
                            let bridgeStatus = await checkBridgeStatus(step.items[t].check.endpoint)
                            if (!bridgeStatus) {
                                return setTimeout(check, 5000)
                            }
                            if (bridgeStatus.status != 'success') {
                                return setTimeout(check, 5000)
                            }
                        }
    
                        console.log(`✅ success execute`)
                        return resolve(`✅ success execute`)
                    }

                    console.log(`checking request status.....`)
                    await check()
                }
            }
        }
    })
}
