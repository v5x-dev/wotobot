import { memo, useCallback, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { PARTS } from '@/model/partsCatalog'
import {
  defaultParamValue,
  matchesSearch,
  param2Options,
  paramError,
  partKey,
  PART_GROUPS,
  type PartDefinition,
  type PartParam,
} from '@/model/parts'

type Props = {
  placing: boolean
  onStartPlacing: (part: PartDefinition, param1: string, param2: string) => void
  onUpdatePlacing: (param1: string, param2: string) => void
  onStopPlacing: () => void
}

const CHANNEL = PARTS.find((part) => part.id === 'CCHL') ?? PARTS[0]

const PARTS_BY_GROUP = PART_GROUPS.map((groupName) => ({
  groupName,
  items: PARTS.filter((part) => part.group === groupName),
})).filter((group) => group.items.length > 0)

function isSidebarPartButton(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('[data-sidebar="menu-button"]'))
}

function isScenePointer(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest('canvas') || target.closest('[data-slot="scene"]'))
  )
}

function shouldKeepPopover(target: EventTarget | null) {
  return isSidebarPartButton(target) || isScenePointer(target)
}

function outsideTarget(event: { target: EventTarget | null; detail: { originalEvent: Event } }) {
  return event.detail.originalEvent.target ?? event.target
}

export function AddSidebar({
  placing,
  onStartPlacing,
  onUpdatePlacing,
  onStopPlacing,
}: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(partKey(CHANNEL))
  const [param1, setParam1] = useState(defaultParamValue(CHANNEL.param1))
  const [param2, setParam2] = useState(defaultParamValue(CHANNEL.param2))
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const selected = PARTS.find((part) => partKey(part) === selectedKey) ?? CHANNEL

  const togglePart = useCallback(
    (part: PartDefinition) => {
      const key = partKey(part)
      if (placing && key === selectedKey) {
        onStopPlacing()
        return
      }
      const nextParam1 = defaultParamValue(part.param1)
      const nextParam2 = defaultParamValue(part.param2)
      setSelectedKey(key)
      setParam1(nextParam1)
      setParam2(nextParam2)
      setError(null)
      onStartPlacing(part, nextParam1, nextParam2)
    },
    [onStartPlacing, onStopPlacing, placing, selectedKey],
  )

  function changeParam1(value: string) {
    setParam1(value)
    const nextOptions = param2Options(selected, value)
    const nextParam2 =
      nextOptions.length > 0 && !nextOptions.includes(param2) ? nextOptions[0] : param2
    if (nextParam2 !== param2) setParam2(nextParam2)
    setError(paramError(selected.param1, value) ?? paramError(selected.param2, nextParam2))
    onUpdatePlacing(value, nextParam2)
  }

  function changeParam2(value: string) {
    setParam2(value)
    setError(paramError(selected.param1, param1) ?? paramError(selected.param2, value))
    onUpdatePlacing(param1, value)
  }

  return (
    <Sidebar side="right" collapsible="icon">
      <Popover
        open={placing}
        onOpenChange={(next) => {
          if (!next && placing) onStopPlacing()
        }}
      >
        <SidebarContent>
          <div className="p-2 group-data-[collapsible=icon]:hidden">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search..."
              aria-label="Search parts"
            />
          </div>
          {PARTS_BY_GROUP.map(({ groupName, items }, groupIndex) => {
            const visible = items.filter((part) => matchesSearch(part, search))
            if (visible.length === 0) return null
            return (
            <SidebarGroup key={groupName} className="p-2">
              {groupIndex > 0 ? <SidebarSeparator className="mx-0 mb-2" /> : null}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visible.map((part) => {
                    const key = partKey(part)
                    return (
                      <PartItem
                        key={key}
                        part={part}
                        isSelected={key === selectedKey}
                        hideTooltip={placing && key === selectedKey}
                        onToggle={togglePart}
                      />
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            )
          })}
        </SidebarContent>
        <PopoverContent
          side="left"
          align="center"
          className="w-64 duration-0 data-open:animate-none data-closed:animate-none"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => {
            if (shouldKeepPopover(outsideTarget(event))) event.preventDefault()
          }}
          onFocusOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (shouldKeepPopover(outsideTarget(event))) event.preventDefault()
          }}
        >
          <PopoverHeader>
            <PopoverTitle>{selected.name}</PopoverTitle>
            <PopoverDescription>{selected.group}</PopoverDescription>
          </PopoverHeader>
          {selected.param1 ? (
            <ParamField
              param={selected.param1}
              value={param1}
              options={selected.param1.options}
              onChange={changeParam1}
            />
          ) : null}
          {selected.param2 ? (
            <ParamField
              param={selected.param2}
              value={param2}
              options={param2Options(selected, param1)}
              onChange={changeParam2}
            />
          ) : null}
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
        </PopoverContent>
      </Popover>
      <SidebarRail />
    </Sidebar>
  )
}

const PartItem = memo(function PartItem({
  part,
  isSelected,
  hideTooltip,
  onToggle,
}: {
  part: PartDefinition
  isSelected: boolean
  hideTooltip: boolean
  onToggle: (part: PartDefinition) => void
}) {
  const button = (
    <SidebarMenuButton
      isActive={isSelected}
      aria-label={part.name}
      tooltip={{
        side: 'left',
        sideOffset: 4,
        className: 'flex-col items-start gap-0.5',
        ...(hideTooltip ? { hidden: true } : {}),
        children: (
          <>
            <span>{part.name}</span>
            <span className="opacity-70">{part.group}</span>
          </>
        ),
      }}
      onClick={() => onToggle(part)}
    >
      {part.icon ? (
        <img src={part.icon} alt="" className="size-4 rounded-sm object-contain" />
      ) : (
        <span className="bg-muted size-4 rounded-sm" />
      )}
      <span>{part.name}</span>
    </SidebarMenuButton>
  )

  return (
    <SidebarMenuItem>
      {isSelected ? (
        <PopoverAnchor asChild>
          <span className="flex w-full">{button}</span>
        </PopoverAnchor>
      ) : (
        <span className="flex w-full">{button}</span>
      )}
    </SidebarMenuItem>
  )
})

function ParamField({
  param,
  value,
  options,
  onChange,
}: {
  param: PartParam
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  const label = param.unit ? `${param.name} (${param.unit})` : param.name

  if (param.custom) {
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={param.name}>{label}</Label>
        <Input
          id={param.name}
          type="number"
          min={param.min}
          max={param.max}
          step={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    )
  }

  if (options.length === 0) return null

  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
