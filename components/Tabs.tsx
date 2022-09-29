import { FunctionComponent } from 'react'
import { useTranslation } from 'next-i18next'

interface TabsProps {
  activeTab: string
  onChange: (x) => void
  showCount?: Array<ShowCount>
  tabs: Array<string>
}

interface ShowCount {
  tabName: string
  count: number
}

const Tabs: FunctionComponent<TabsProps> = ({
  activeTab,
  onChange,
  showCount,
  tabs,
}) => {
  const { t } = useTranslation('common')

  //#00C3D2

  return (
    <div className={`relative h-10 border-b border-[#34353A] bg-[#1F2025]`}>
      <div
        className={`default-transition absolute bottom-[-1px] left-0 h-0.5 bg-[#00C3D2]`}
        style={{
          maxWidth: '176px',
          transform: `translateX(${
            tabs.findIndex((v) => v === activeTab) * 100
          }%)`,
          width: `${100 / tabs.length}%`,
        }}
      />
      <nav className="-mb-px flex h-full items-center" aria-label="Tabs">
        {tabs.map((tabName) => {
          const tabCount = showCount
            ? showCount.find((e) => e.tabName === tabName)
            : null
          return (
            <a
              key={tabName}
              onClick={() => onChange(tabName)}
              className={`default-transition relative flex cursor-pointer justify-center whitespace-nowrap font-bold hover:opacity-100
                    ${
                      activeTab === tabName
                        ? `text-[#FFFFFF]`
                        : `text-[#8D8E99] hover:text-[#FFFFFF]`
                    }
                  `}
              style={{ width: `${100 / tabs.length}%`, maxWidth: '176px' }}
            >
              {t(tabName.toLowerCase().replace(/\s/g, '-'))}
              {tabCount && tabCount.count > 0 ? (
                <Count count={tabCount.count} />
              ) : null}
            </a>
          )
        })}
      </nav>
    </div>
  )
}

export default Tabs

const Count = ({ count }) => (
  <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-th-bkg-4 p-1 text-xxs text-th-fgd-2">
    {count}
  </span>
)
