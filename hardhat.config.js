require("@nomicfoundation/hardhat-chai-matchers");
require("@nomiclabs/hardhat-ethers");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337,
      gas: 12000000,
      blockGasLimit: 12000000,
      allowUnlimitedContractSize: true
    },
    rootstock: {
      url: "https://public-node.rsk.co",
      chainId: 30,
      gasPrice: 60000000,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    rskTestnet: {
      url: "https://public-node.testnet.rsk.co",
      chainId: 31,
      gasPrice: 60000000,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  mocha: {
    timeout: 40000
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  },
  etherscan: {
    apiKey: {
      rsk: "RSK_HAS_NO_API_KEY",
      rskTestnet: "RSK_HAS_NO_API_KEY"
    },
    customChains: [
      {
        network: "rsk",
        chainId: 30,
        urls: {
          apiURL: "https://blockscout.com/rsk/mainnet/api",
          browserURL: "https://explorer.rsk.co"
        }
      },
      {
        network: "rskTestnet",
        chainId: 31,
        urls: {
          apiURL: "https://blockscout.com/rsk/testnet/api",
          browserURL: "https://explorer.testnet.rsk.co"
        }
      }
    ]
  }
};