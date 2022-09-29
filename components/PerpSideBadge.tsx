import { PerpAccount, ZERO_BN } from '@blockworks-foundation/mango-client'
import SideBadge from './SideBadge'

const PerpSideBadge = ({ long }: { long: boolean }) => (
  <>
    {long? (
      <SideBadge
        side={long ? 'long' : 'short'}
      />
    ) : (
      '--'
    )}
  </>
)

export default PerpSideBadge
