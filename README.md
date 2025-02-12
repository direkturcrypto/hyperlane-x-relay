# Hyperlane + Relay Bridge Bot

## Description
This project is a **wash trade bridge bot** for **Hyperlane**. It automates bridging assets across multiple chains with built-in delays and ETH-to-ezETH swaps.

## Features
- Supports bridging between multiple chains:
  - **Arbitrum**
  - **Binance Smart Chain (BSC)**
  - **Base**
  - **Linea**
- **Auto delay**: Random sleep between **5 to 10 minutes** between transactions.
- **Auto swap ETH to ezETH** before bridging.

## Requirements
- Ensure you have **Node.js (latest version)** installed.
- Maintain a **minimum gas fee balance of $20** in each supported chain:
  - **Arbitrum**
  - **BSC**
  - **Base**
  - **Linea**

## Installation & Setup

### 1. Install Node.js on VPS
Ensure your VPS has Node.js installed. If not, install it using:
```sh
sudo apt update && sudo apt install -y nodejs npm
```

### 2. Clone the Repository
```sh
git clone https://github.com/direkturcrypto/hyperlane-x-relay
cd hyperlane-x-relay
```

### 3. Install Dependencies
```sh
npm install
```

### 4. Configure Private Key
Edit the `index.js` file and set your private key:
```sh
nano index.js
```
Find the line that contains:
```js
const PRIVATE_KEY = "your-private-key-here";
```
Replace it with your actual **wallet private key**.

### 5. Run the Bot
Start the bot using:
```sh
node index.js
```

The bot will now **automate bridging and swapping ETH to ezETH** while adding delays between transactions.

## Notes
- Make sure your wallet has sufficient funds for gas fees on all supported chains.
- The bot is designed for **wash trading purposes**; use it at your own risk.
- You may modify the sleep interval or chain settings inside `index.js` as needed.

## Troubleshooting
If you encounter issues, try:
1. **Checking logs**: Errors will be displayed in the terminal.
2. **Ensuring all dependencies are installed**: Run `npm install` again.
3. **Verifying gas fee balance**: Ensure your wallet has enough funds.

## Disclaimer
This bot is provided **as-is**. The author is **not responsible** for any loss of funds or misuse of the bot. Use responsibly and within legal boundaries.
