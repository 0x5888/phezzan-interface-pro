import { useMemo, useState } from 'react'
import { SwitchHorizontalIcon } from '@heroicons/react/solid'
import { getWeights } from '@blockworks-foundation/mango-client'
import { useTheme } from 'next-themes'
import useMangoStore from '../../stores/useMangoStore'
import AdvancedTradeForm from './AdvancedTradeForm'
import SimpleTradeForm from './SimpleTradeForm'
import {
  FlipCard,
  FlipCardBack,
  FlipCardFront,
  FlipCardInner,
} from '../FlipCard'
import FloatingElement from '../FloatingElement'
import ButtonGroup from '../ButtonGroup'
import { useWallet } from '@solana/wallet-adapter-react'

export default function TradeForm() {
  const [showAdvancedForm, setShowAdvancedForm] = useState(true)
  const { connected } = useWallet()
  const { theme, setTheme } = useTheme()

  const marketConfig = useMangoStore((s) => s.selectedMarket.config)
  const mangoGroup = useMangoStore((s) => s.selectedMangoGroup.current)

  const handleFormChange = () => {
    setShowAdvancedForm(!showAdvancedForm)
  }

  const initLeverage = useMemo(() => {
    if (!mangoGroup || !marketConfig) return 1

    const ws = getWeights(mangoGroup, marketConfig.marketIndex, 'Init')
    const w =
      marketConfig.kind === 'perp' ? ws.perpAssetWeight : ws.spotAssetWeight
    return Math.round((100 * -1) / (w.toNumber() - 1)) / 100
  }, [mangoGroup, marketConfig])


  return (
    <FlipCard>
      <FlipCardInner flip={showAdvancedForm}>
        {showAdvancedForm ? (
          <FlipCardFront>
            <FloatingElement className="fadein-floating-element h-5/6 px-1 py-0 bg-[#1F2025] md:px-4 md:py-4">
              {/* <div className={`${!connected ? 'filter blur-sm' : ''}`}> */}
              {/* <button
                  onClick={handleFormChange}
                  className="absolute hidden md:flex items-center justify-center right-4 rounded-full bg-th-bkg-3 w-8 h-8 hover:text-th-primary focus:outline-none"
                >
                  <SwitchHorizontalIcon className="w-5 h-5" />
                </button> */}
              <AdvancedTradeForm initLeverage={initLeverage} />
              {/* </div> */}
            </FloatingElement>

            <FloatingElement className="h-1/6 fadein-floating-element p-0 md:p-0">
              <div className="flex flex-col h-full">
              <FloatingElement className="fadein-floating-element grow px-1 py-0 p-0 md:p-0 bg-[#0A0B0D]">
              <div className="md:py-4 bg-[#000000]">
                <div className="flex justify-around">
                  <button
                    onClick={() => {
                      setTheme("Dark")
                    }}
                    className={
                      `flex h-8 w-40 items-center justify-center rounded-lg border
                      border-transparent bg-[#1F2025] text-[#818599] text-xs
                      hover:border-[#FFFFFF] hover:text-[#FFFFFF]
                      ${theme === "Dark" ? "border-[#FFFFFF] text-[#FFFFFF]" : ""}
                      `
                    }
                  >
                    <img
                      alt=""
                      width="24"
                      height="24"
                      src={`/assets/icons/dark_mode_icon@2x.png`}
                      className={`mr-2`}
                    />
                    Dark Mode
                  </button>
                  <button
                    onClick={() => {
                      setTheme("Light")
                    }}
                    className={`
                      flex h-8 w-40 items-center justify-center rounded-lg
                      border border-transparent bg-[#1F2025] text-[#818599]
                      text-xs hover:border-[#FFFFFF] hover:text-[#FFFFFF]
                      ${theme === "Light" ? "border-[#FFFFFF] text-[#FFFFFF]" : ""}`
                    }
                  >
                    <img
                      alt=""
                      width="24"
                      height="24"
                      src={`/assets/icons/light_mode_icon@2x.png`}
                      className={`mr-2`}
                    />
                    Light Mode
                  </button>
                </div>
              </div>
            </FloatingElement>
            <FloatingElement className="fadein-floating-element h-12 border-b-0 p-0 md:p-0 bg-[#0A0B0D]">
                <div className="flex h-full">
                  <a
                    className="flex justify-center items-center h-full flex-1 border-[#34353A] border-r items-center"
                    href=""
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      alt=""
                      width="32"
                      height="32"
                      src={`/assets/icons/twitter_icon@2x.png`}
                    />            
                  </a>
                  <a
                    className="flex justify-center items-center flex-1 h-full border-[#34353A] border-r items-center"
                    href=""
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      alt=""
                      width="32"
                      height="32"
                      src={`/assets/icons/discord_icon@2x.png`}
                    />            
                  </a>
                  <a
                    className="flex justify-center items-center flex-1 border-[#34353A] border-r"
                    href=""
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      alt=""
                      width="32"
                      height="32"
                      src={`/assets/icons/tel_icon@2x.png`}
                    />            
                  </a>
                  <a
                    className="flex justify-center items-center flex-1 items-center border-[#34353A] border-r"
                    href=""
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      alt=""
                      width="32"
                      height="32"
                      src={`/assets/icons/chat_icon@2x.png`}
                      className={`mr-2`}
                    />             
                  </a>
                  <a
                    className="flex justify-center items-center flex-1 items-center border-[#34353A] border-r"
                    href=""
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      alt=""
                      width="32"
                      height="32"
                      src={`/assets/icons/book_icon@2x.png`}
                      className={`mr-2`}
                    />             
                  </a>
                </div>
            </FloatingElement>
              </div>
            </FloatingElement>
          </FlipCardFront>
        ) : (
          <FlipCardBack>
            <FloatingElement className="fadein-floating-element h-full px-1 md:px-4">
              <div className={`${!connected ? 'blur-sm filter' : ''}`}>
                <button
                  onClick={handleFormChange}
                  className="absolute right-4 flex h-8 w-8 items-center justify-center rounded-full bg-th-bkg-3 hover:text-th-primary focus:outline-none"
                >
                  <SwitchHorizontalIcon className="h-5 w-5" />
                </button>
                <SimpleTradeForm initLeverage={initLeverage} />
              </div>
            </FloatingElement>
          </FlipCardBack>
        )}
      </FlipCardInner>
    </FlipCard>
  )
}
