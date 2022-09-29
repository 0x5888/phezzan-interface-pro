import { I80F48 } from '@blockworks-foundation/mango-client'
import { useCallback, useEffect, useState } from 'react'
import useMangoStore from '../stores/useMangoStore'

export default function useOraclePrice(): I80F48 | null {
  const mangoGroup = useMangoStore((s) => s.selectedMangoGroup.current)
  const mangoCache = useMangoStore((s) => s.selectedMangoGroup.cache)
  const selectedMarket = useMangoStore((s) => s.selectedMarket.config)
  const [oraclePrice, setOraclePrice] = useState<any>(null)

  const fetchOraclePrice = useCallback(() => {
    if (mangoGroup && mangoCache) {
      setOraclePrice(null)
      let marketIndex = 0
      
      
      //marketIndex = mangoGroup.getPerpMarketIndex(selectedMarket.publicKey)

      //setOraclePrice(mangoGroup.getPrice(marketIndex, mangoCache))
      setOraclePrice("6666666")
    }
  }, [mangoGroup, selectedMarket, mangoCache])

  useEffect(() => {
    fetchOraclePrice()
  }, [fetchOraclePrice])

  return oraclePrice
}
