export type Pack = 'lucide' | 'phosphor' | 'iconoir'

export type Icon = {
  id: string
  pack: Pack
  name: string
  tags: string[]
  categories: string[]
  svg: string
  tokens: string[]
  neighbors: string[]
}

export type IconIndex = {
  version: number
  generatedAt: string
  count: number
  icons: Icon[]
}
