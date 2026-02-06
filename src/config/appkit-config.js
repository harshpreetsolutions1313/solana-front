import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { 
  // mainnet, 
  // arbitrum, 
  // sepolia 
  // bsc
  // polygonAmoy
  polygon 

} from '@reown/appkit/networks'
import { AppKitNetwork } from '@reown/appkit/networks'

// Get projectId from https://dashboard.reown.com
export const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID
// import.meta.env.REACT_APP_REOWN_PROJECT_ID
// this is a public projectId only to use on localhost

if (!projectId) {
  throw new Error('Project ID is not defined')
}

export const metadata = {
    name: 'AppKit',
    description: 'AppKit Example',
    url: 'https://reown.com', // origin must match your domain & subdomain
    icons: ['https://avatars.githubusercontent.com/u/179229932']
  }

// for custom networks visit -> https://docs.reown.com/appkit/react/core/custom-networks
// export const networks = [mainnet, arbitrum, sepolia] as [AppKitNetwork, ...AppKitNetwork[]]
export const networks = [ 
  // polygonAmoy
  polygon
  // bsc
  // mainnet, 
  // arbitrum, 
  // sepolia
];

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks
})

export const config = wagmiAdapter.wagmiConfig