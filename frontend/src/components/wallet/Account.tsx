import React from "react"
import { useAccount, useDisconnect, useEnsAvatar, useEnsName } from 'wagmi'

const Account:React.FC = () => {
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const { data: ensName } = useEnsName({ address })
  const { data: ensAvatar } = useEnsAvatar({ name: ensName! })

  return (
    <div className="flex flex-row items-center gap-6 p-7 rounded-2xl">
      {ensAvatar && <img alt="ENS Avatar" src={ensAvatar} />}
      {address && <div>{ensName ? `${ensName} (${address?.slice(0, 6)}...)` : `${address?.slice(0, 6)}...`}</div>}
      <button onClick={() => disconnect()} className="btn btn-sm">Disconnect</button>
    </div>
  )
}

export default Account
