import * as React from 'react'
import { useConnect } from 'wagmi'

const WalletOptions:React.FC = () => {
  const { connectors, connect } = useConnect()

  return <div className='flex gap-2'>
    {connectors.map((connector) => (
      <button className='btn btn-primary' key={connector.uid} onClick={() => connect({ connector })}>
        {connector.name}
      </button>
    ))
    }
  </div>
}

export default WalletOptions
